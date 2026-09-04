import { eq } from 'drizzle-orm'
import { households, householdMembers } from '~/drizzle/schema'

// 列出当前用户的所有住所（邀请码仅 owner 可见）
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = getDB(event)

  const rows = await db
    .select({
      id: households.id,
      name: households.name,
      role: householdMembers.role,
      inviteCode: households.inviteCode,
      joinedAt: householdMembers.joinedAt,
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(eq(householdMembers.userId, user.id))

  return rows.map(r => ({ ...r, inviteCode: r.role === 'owner' ? r.inviteCode : undefined }))
})
