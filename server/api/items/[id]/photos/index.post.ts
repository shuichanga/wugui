import { and, eq } from 'drizzle-orm'
import { items, itemPhotos } from '~/drizzle/schema'

const MAX_SIZE = 2 * 1024 * 1024
const KEY_PREFIX = 'wugui/items'

// multipart 直传：Worker 中转写入 R2（压缩后 JPEG 约 100-200KB，流式 I/O 不吃 CPU）
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const found = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '物品不存在' })

  const existing = await db
    .select({ id: itemPhotos.id })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id))
  if (existing.length >= 3) {
    throw createError({ statusCode: 409, statusMessage: '最多只能上传 3 张照片' })
  }

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(p => p.name === 'file')
  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: '缺少文件' })
  }
  if (filePart.data.length > MAX_SIZE) {
    throw createError({ statusCode: 413, statusMessage: '照片超过 2MB 限制' })
  }

  const photoId = crypto.randomUUID()
  const key = `${KEY_PREFIX}/${id}/${photoId}.jpg`
  const bucket = getR2(event)
  await bucket.put(key, filePart.data, {
    httpMetadata: { contentType: 'image/jpeg' },
  })

  const sortOrder = existing.length
  await db.insert(itemPhotos).values({
    id: photoId,
    itemId: id,
    r2Key: key,
    sortOrder,
    createdAt: new Date().toISOString(),
  })

  return { ok: true, photoId, sortOrder, url: `/api/photos/${photoId}` }
})
