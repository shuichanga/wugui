import { and, eq } from 'drizzle-orm'
import { householdMembers } from '~/drizzle/schema'

// 切换当前住所（写 cookie，所有业务 API 按此 cookie 过滤）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const householdId = getRouterParam(event, 'householdId') ?? ''

  const db = getDB(event)
  const membership = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, user.id), eq(householdMembers.householdId, householdId)))
  if (!membership.length) {
    throw createError({ statusCode: 403, statusMessage: '你不是该住所成员' })
  }

  setCookie(event, COOKIE_HOUSEHOLD, householdId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return { ok: true, householdId }
})
