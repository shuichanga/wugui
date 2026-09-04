import { asc, eq, inArray } from 'drizzle-orm'
import { items, itemPhotos, itemTags, locations, users } from '~/drizzle/schema'
import type { LocationTreeNode } from '~/server/utils/locations'

export interface ItemSummary {
  id: string
  name: string
  quantity: number
  notes: string | null
  locationId: string
  locationPath: string
  ownerId: string
  ownerName: string
  tags: string[]
  photoUrl: string | null
  createdAt: string
}

// 全住所位置 id → 完整路径（"客厅 / 电视柜 / 第2抽屉"）
export async function getLocationPathMap(db: DB, householdId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: locations.id, parentId: locations.parentId, name: locations.name })
    .from(locations)
    .where(eq(locations.householdId, householdId))
  const byId = new Map(rows.map(r => [r.id, r]))
  const pathOf = (id: string): string => {
    const parts: string[] = []
    let cur = byId.get(id)
    while (cur) {
      parts.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return parts.join(' / ')
  }
  return new Map(rows.map(r => [r.id, pathOf(r.id)]))
}

// 给一组物品填充 tags / 首图 / 位置路径 / 拥有者
export async function decorateItems(
  db: DB,
  rows: {
    id: string; name: string; quantity: number; notes: string | null
    locationId: string; ownerId: string; createdAt: string
    ownerName?: string
  }[],
  pathMap: Map<string, string>,
): Promise<ItemSummary[]> {
  if (!rows.length) return []
  const ids = rows.map(r => r.id)

  const [tagRows, photoRows, ownerRows] = await Promise.all([
    db.select().from(itemTags).where(inArray(itemTags.itemId, ids)),
    db.select().from(itemPhotos).where(inArray(itemPhotos.itemId, ids)).orderBy(asc(itemPhotos.sortOrder)),
    db.select({ id: users.id, displayName: users.displayName, email: users.email }).from(users).where(inArray(users.id, [...new Set(rows.map(r => r.ownerId))])),
  ])

  const tagsBy = new Map<string, string[]>()
  for (const t of tagRows) {
    tagsBy.set(t.itemId, [...(tagsBy.get(t.itemId) ?? []), t.tag])
  }
  const photoBy = new Map<string, string>()
  for (const p of photoRows) {
    if (!photoBy.has(p.itemId)) photoBy.set(p.itemId, p.id)
  }
  const ownerBy = new Map(ownerRows.map(o => [o.id, o.displayName ?? o.email.split('@')[0]!]))

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity,
    notes: r.notes,
    locationId: r.locationId,
    locationPath: pathMap.get(r.locationId) ?? '未知位置',
    ownerId: r.ownerId,
    ownerName: r.ownerName ?? ownerBy.get(r.ownerId) ?? '未知成员',
    ownerAvatarUrl: ownerAvatarBy.get(r.ownerId) ?? null,
    tags: tagsBy.get(r.id) ?? [],
    // 照片经 /api/photos/:id 读取（Worker 校验住所归属后流式返回）
    photoUrl: photoBy.has(r.id) ? `/api/photos/${photoBy.get(r.id)}` : null,
    createdAt: r.createdAt,
  }))
}

// 常用位置：树上按直挂物品数取前 6 个
export function topLocations(tree: LocationTreeNode[], n = 6): { id: string; name: string; count: number }[] {
  const all: { id: string; name: string; count: number }[] = []
  const walk = (nodes: LocationTreeNode[]) => {
    for (const node of nodes) {
      all.push({ id: node.id, name: node.name, count: node.itemCount })
      walk(node.children ?? [])
    }
  }
  walk(tree)
  return all.sort((a, b) => b.count - a.count).slice(0, n)
}
