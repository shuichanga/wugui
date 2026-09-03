import { eq } from 'drizzle-orm'
import { users, households, householdMembers } from '~/drizzle/schema'

export default defineEventHandler(async (event) => {
  const session = await requireUser(event)
  const db = getDB(event)

  const found = await db.select().from(users).where(eq(users.id, session.id))
  if (!found.length) throw createError({ statusCode: 401, statusMessage: '用户不存在' })
  const user = found[0]

  const rows = await db
    .select({
      id: households.id,
      name: households.name,
      role: householdMembers.role,
      inviteCode: households.inviteCode,
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, session.id))

  const currentCookie = getCookie(event, COOKIE_HOUSEHOLD)
  const currentHouseholdId = rows.find(r => r.id === currentCookie)?.id ?? rows[0]?.id ?? null

  return {
    user: { id: user.id, email: user.email, displayName: user.displayName },
    households: rows.map(r => ({
      ...r,
      // 邀请码仅 owner 可见
      inviteCode: r.role === 'owner' ? r.inviteCode : undefined,
    })),
    currentHouseholdId,
  }
})
