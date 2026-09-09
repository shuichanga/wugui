import { eq, inArray } from 'drizzle-orm'
import { households, items, itemTags, locations, users } from '~/drizzle/schema'

// 全量导出当前住所数据（空间树 + 物品含标签），供备份 / 二次加工
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const db = getDB(event)

  const [hh] = await db
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(eq(households.id, householdId))
  if (!hh) throw createError({ statusCode: 404, statusMessage: '住所不存在' })

  const [locRows, itemRows] = await Promise.all([
    db
      .select({ id: locations.id, parentId: locations.parentId, level: locations.level, name: locations.name })
      .from(locations)
      .where(eq(locations.householdId, householdId)),
    db
      .select({
        id: items.id, name: items.name, quantity: items.quantity, notes: items.notes,
        locationId: items.locationId, ownerId: items.ownerId, createdAt: items.createdAt, updatedAt: items.updatedAt,
      })
      .from(items)
      .where(eq(items.householdId, householdId)),
  ])

  const [tagRows, ownerRows] = await Promise.all([
    itemRows.length
      ? db.select().from(itemTags).where(inArray(itemTags.itemId, itemRows.map(r => r.id)))
      : Promise.resolve([] as { itemId: string; tag: string }[]),
    itemRows.length
      ? db.select({ id: users.id, displayName: users.displayName, email: users.email })
          .from(users).where(inArray(users.id, [...new Set(itemRows.map(r => r.ownerId))]))
      : Promise.resolve([] as { id: string; displayName: string | null; email: string }[]),
  ])

  // 空间完整路径（"客厅 / 电视柜"）
  const byId = new Map(locRows.map(l => [l.id, l]))
  const pathOf = (id: string): string => {
    const parts: string[] = []
    let cur = byId.get(id)
    while (cur) {
      parts.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return parts.join(' / ')
  }
  const ownerBy = new Map(ownerRows.map(o => [o.id, o.displayName ?? o.email.split('@')[0]!]))
  const tagsBy = new Map<string, string[]>()
  for (const t of tagRows) tagsBy.set(t.itemId, [...(tagsBy.get(t.itemId) ?? []), t.tag])

  return {
    household: { id: hh.id, name: hh.name, exportedAt: new Date().toISOString() },
    locations: locRows.map(l => ({
      id: l.id,
      parentId: l.parentId,
      level: l.level,
      name: l.name,
      path: pathOf(l.id),
    })),
    items: itemRows.map(r => ({
      name: r.name,
      quantity: r.quantity,
      notes: r.notes,
      tags: tagsBy.get(r.id) ?? [],
      locationPath: pathOf(r.locationId),
      ownerName: ownerBy.get(r.ownerId) ?? '未知成员',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  }
})
