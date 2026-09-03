import { and, eq } from 'drizzle-orm'
import { items, itemTags, locations } from '~/drizzle/schema'

// 编辑物品：名称/数量/备注/位置/标签（整体替换）
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<Record<string, unknown>>(event) ?? {}

  const db = getDB(event)
  const found = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '物品不存在' })

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) throw createError({ statusCode: 400, statusMessage: '物品名称不能为空' })
    if (name.length > 100) throw createError({ statusCode: 400, statusMessage: '物品名称最多 100 字' })
    updates.name = name
  }
  if (body.quantity !== undefined) {
    updates.quantity = Math.max(1, Math.floor(Number(body.quantity) || 1))
  }
  if (body.notes !== undefined) {
    updates.notes = String(body.notes).trim().slice(0, 500) || null
  }
  if (body.locationId !== undefined) {
    const locationId = String(body.locationId)
    const loc = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.householdId, householdId)))
    if (!loc.length) throw createError({ statusCode: 404, statusMessage: '收纳位置不存在' })
    updates.locationId = locationId
  }
  if (body.tags !== undefined) {
    const tags = Array.isArray(body.tags)
      ? [...new Set(body.tags.map(t => String(t).trim()).filter(t => t && t.length <= 20))].slice(0, 10)
      : []
    await db.delete(itemTags).where(eq(itemTags.itemId, id))
    if (tags.length) {
      await db.insert(itemTags).values(tags.map(tag => ({ itemId: id, tag })))
    }
  }

  await db.update(items).set(updates).where(eq(items.id, id))
  return { ok: true, id }
})
