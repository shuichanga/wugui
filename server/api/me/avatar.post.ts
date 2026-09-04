import { eq } from 'drizzle-orm'
import { users } from '~/drizzle/schema'

const MAX_SIZE = 2 * 1024 * 1024

// 上传/更新我的头像（multipart，前端已压缩到 256px JPEG，固定 key 直接覆盖旧图）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = getDB(event)

  const parts = await readMultipartFormData(event)
  const filePart = parts?.find(p => p.name === 'file')
  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: '缺少文件' })
  }
  if (filePart.data.length > MAX_SIZE) {
    throw createError({ statusCode: 413, statusMessage: '头像超过 2MB 限制' })
  }

  const key = `wugui/avatars/${user.id}.jpg`
  const bucket = getR2(event)
  await bucket.put(key, filePart.data, {
    httpMetadata: { contentType: filePart.type || 'image/jpeg' },
  })

  await db.update(users)
    .set({ avatarKey: key, updatedAt: new Date().toISOString() })
    .where(eq(users.id, user.id))

  return { ok: true, avatarUrl: `/api/avatars/${user.id}` }
})
