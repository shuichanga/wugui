import { and, eq } from 'drizzle-orm'
import { users, householdMembers } from '~/drizzle/schema'

// 列出指定家庭的成员（需为该家庭成员）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const householdId = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const self = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, user.id), eq(householdMembers.householdId, householdId)))
  if (!self.length) throw createError({ statusCode: 403, statusMessage: '你不是该家庭成员' })

  return db
    .select({
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.joinedAt,
      email: users.email,
      displayName: users.displayName,
    })
    .from(householdMembers)
    .innerJoin(users, eq(users.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, householdId))
})
