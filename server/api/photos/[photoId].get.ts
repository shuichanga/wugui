import { and, eq } from 'drizzle-orm'
import { items, itemPhotos } from '~/drizzle/schema'

// 照片读取：校验住所归属后从 R2 流式返回
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const photoId = getRouterParam(event, 'photoId') ?? ''

  const db = getDB(event)
  const rows = await db
    .select({ r2Key: itemPhotos.r2Key })
    .from(itemPhotos)
    .innerJoin(items, eq(items.id, itemPhotos.itemId))
    .where(and(eq(itemPhotos.id, photoId), eq(items.householdId, householdId)))
    .limit(1)
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: '照片不存在' })

  const bucket = getR2(event)
  const obj = await bucket.get(rows[0]!.r2Key)
  if (!obj) throw createError({ statusCode: 404, statusMessage: '照片文件不存在' })

  setHeader(event, 'Content-Type', obj.httpMetadata?.contentType ?? 'image/jpeg')
  // photoId 与内容一一对应（删除重传会生成新 ID），可长缓存；刷新/切页时照片秒出
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
  // h3 v1 会把裸 ArrayBuffer JSON 序列化成 {}，必须包一层 Buffer
  return Buffer.from(await obj.arrayBuffer())
})
