import { and, eq } from 'drizzle-orm'
import { households } from '~/drizzle/schema'

// 重置邀请码（仅 owner）
export default defineEventHandler(async (event) => {
  const { householdId, role } = await requireHousehold(event)
  if (role !== 'owner') throw createError({ statusCode: 403, statusMessage: '仅家庭创建者可重置邀请码' })

  const db = getDB(event)
  const inviteCode = genInviteCode()
  await db.update(households)
    .set({ inviteCode, updatedAt: new Date().toISOString() })
    .where(and(eq(households.id, householdId)))

  return { ok: true, inviteCode }
})
