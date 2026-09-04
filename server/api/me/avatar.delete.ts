import { eq } from 'drizzle-orm'
import { users } from '~/drizzle/schema'

// 移除我的头像：删 R2 对象 + 清空字段（回退为首字母头像）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = getDB(event)

  const found = await db
    .select({ avatarKey: users.avatarKey })
    .from(users)
    .where(eq(users.id, user.id))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '用户不存在' })

  const avatarKey = found[0]!.avatarKey
  if (avatarKey) {
    const bucket = getR2(event)
    await bucket.delete(avatarKey)
    await db.update(users)
      .set({ avatarKey: null, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
  }

  return { ok: true }
})
