import { and, eq } from 'drizzle-orm'
import { households, householdMembers } from '~/drizzle/schema'

// 重置邀请码（仅该住所的 owner）。注意：目标是 URL 中的 [id] 住所，
// 不是 cookie 里的当前住所——否则多住所用户会重置错对象或被误判 403
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const membership = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, id), eq(householdMembers.userId, user.id)))
  if (!membership.length) throw createError({ statusCode: 404, statusMessage: '住所不存在' })
  if (membership[0].role !== 'owner') {
    throw createError({ statusCode: 403, statusMessage: '仅住所创建者可重置邀请码' })
  }

  const inviteCode = genInviteCode()
  await db.update(households)
    .set({ inviteCode, updatedAt: new Date().toISOString() })
    .where(eq(households.id, id))

  return { ok: true, inviteCode }
})
