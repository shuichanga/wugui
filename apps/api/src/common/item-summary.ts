// 物品列表装饰：tags / 首图 / 空间路径 / 拥有者（items 与 recent-views 共用）
import { asc, inArray } from 'drizzle-orm'
import { itemPhotos, itemTags, users } from '../db/schema'
import type { DB } from '../db/database.service'

export interface ItemSummary {
  id: string
  name: string
  quantity: number
  notes: string | null
  locationId: string
  locationPath: string
  ownerId: string
  ownerName: string
  ownerAvatarUrl: string | null
  tags: string[]
  photoUrl: string | null
  createdAt: Date | string
}

// 给一组物品填充 tags / 首图 / 空间路径 / 拥有者
export async function decorateItems(
  db: DB,
  rows: {
    id: string
    name: string
    quantity: number
    notes: string | null
    locationId: string
    ownerId: string
    createdAt: Date | string
  }[],
  pathMap: Map<string, string>,
): Promise<ItemSummary[]> {
  if (!rows.length) return []
  const ids = rows.map(r => r.id)

  const [tagRows, photoRows, ownerRows] = await Promise.all([
    db.select().from(itemTags).where(inArray(itemTags.itemId, ids)),
    db.select().from(itemPhotos).where(inArray(itemPhotos.itemId, ids)).orderBy(asc(itemPhotos.sortOrder)),
    db
      .select({ id: users.id, displayName: users.displayName, username: users.username, email: users.email, avatarKey: users.avatarKey })
      .from(users)
      .where(inArray(users.id, [...new Set(rows.map(r => r.ownerId))])),
  ])

  const tagsBy = new Map<string, string[]>()
  for (const t of tagRows) {
    tagsBy.set(t.itemId, [...(tagsBy.get(t.itemId) ?? []), t.tag])
  }
  const photoBy = new Map<string, string>()
  for (const p of photoRows) {
    if (!photoBy.has(p.itemId)) photoBy.set(p.itemId, p.id)
  }
  const nameOf = (o: { displayName: string | null; username: string | null; email: string | null }) =>
    o.displayName ?? o.username ?? (o.email ? o.email.split('@')[0] : '未知成员')
  const ownerBy = new Map(ownerRows.map(o => [o.id, nameOf(o)]))
  const ownerAvatarBy = new Map(ownerRows.map(o => [o.id, o.avatarKey ? `/api/avatars/${o.id}` : null]))

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity,
    notes: r.notes,
    locationId: r.locationId,
    locationPath: pathMap.get(r.locationId) ?? '未知空间',
    ownerId: r.ownerId,
    ownerName: ownerBy.get(r.ownerId) ?? '未知成员',
    ownerAvatarUrl: ownerAvatarBy.get(r.ownerId) ?? null,
    tags: tagsBy.get(r.id) ?? [],
    // 照片经 /api/photos/:id 读取（API 校验住所归属后流式返回）
    photoUrl: photoBy.has(r.id) ? `/api/photos/${photoBy.get(r.id)}` : null,
    createdAt: r.createdAt,
  }))
}
