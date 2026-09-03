import { and, eq } from 'drizzle-orm'
import { householdMembers } from '~/drizzle/schema'

// 踢出成员（仅 owner，且不能踢 owner）
export default defineEventHandler(async (event) => {
  const { householdId, role } = await requireHousehold(event)
  if (role !== 'owner') throw createError({ statusCode: 403, statusMessage: '仅家庭创建者可移除成员' })

  const targetId = getRouterParam(event, 'userId') ?? ''
  if (!targetId) throw createError({ statusCode: 400, statusMessage: '缺少成员 ID' })

  const db = getDB(event)
  const target = await db
    .select()
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, targetId)))
  if (!target.length) throw createError({ statusCode: 404, statusMessage: '该用户不是家庭成员' })
  if (target[0].role === 'owner') throw createError({ statusCode: 403, statusMessage: '不能移除家庭创建者' })

  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, targetId)))
  return { ok: true }
})
