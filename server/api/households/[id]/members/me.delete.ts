import { and, eq } from 'drizzle-orm'
import { householdMembers } from '~/drizzle/schema'

// 自己退出住所（owner 不可退出自己创建的住所）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const householdId = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const self = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, user.id)))
  if (!self.length) throw createError({ statusCode: 404, statusMessage: '你不是该住所成员' })
  if (self[0].role === 'owner') {
    throw createError({ statusCode: 403, statusMessage: '住所创建者不能退出，请先转让或解散住所' })
  }

  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, user.id)))

  // 若退出的正是当前住所，切回剩余的第一个住所
  if (getCookie(event, COOKIE_HOUSEHOLD) === householdId) {
    const rest = await db.select().from(householdMembers).where(eq(householdMembers.userId, user.id))
    setCookie(event, COOKIE_HOUSEHOLD, rest[0]?.householdId ?? '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  }
  return { ok: true }
})
