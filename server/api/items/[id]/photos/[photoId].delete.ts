import { and, eq } from 'drizzle-orm'
import { items, itemPhotos } from '~/drizzle/schema'

// 删除照片：删 D1 记录 + R2 对象（校验物品的住所归属）
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''
  const photoId = getRouterParam(event, 'photoId') ?? ''

  const db = getDB(event)
  const found = await db
    .select({ photoId: itemPhotos.id, r2Key: itemPhotos.r2Key })
    .from(itemPhotos)
    .innerJoin(items, eq(items.id, itemPhotos.itemId))
    .where(and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, id), eq(items.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '照片不存在' })

  await db.delete(itemPhotos).where(eq(itemPhotos.id, photoId))

  const bucket = getR2(event)
  await bucket.delete(found[0]!.r2Key)

  return { ok: true }
})
