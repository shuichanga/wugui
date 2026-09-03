import { and, eq } from 'drizzle-orm'
import { households, householdMembers } from '~/drizzle/schema'

// 用邀请码加入家庭：永远是 member
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const inviteCode = String(body.inviteCode ?? '').trim().toUpperCase()
  if (!inviteCode) throw createError({ statusCode: 400, statusMessage: '请输入邀请码' })

  const db = getDB(event)
  const found = await db.select().from(households).where(eq(households.inviteCode, inviteCode))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '邀请码无效' })

  const householdId = found[0].id
  const existing = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, user.id)))
  if (existing.length) throw createError({ statusCode: 409, statusMessage: '你已是该家庭成员' })

  await db.insert(householdMembers).values({
    householdId,
    userId: user.id,
    role: 'member',
    joinedAt: new Date().toISOString(),
  })

  setCookie(event, COOKIE_HOUSEHOLD, householdId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return { ok: true, householdId, name: found[0].name }
})
