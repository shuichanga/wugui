import { and, eq } from 'drizzle-orm'
import { items } from '~/drizzle/schema'

// 删除物品。item_tags / item_photos 由外键级联删除；
// 已上传 R2 的照片文件会在 Day 8 统一加清理逻辑
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const found = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '物品不存在' })

  await db.delete(items).where(eq(items.id, id))
  return { ok: true }
})
