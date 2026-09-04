import { and, eq, inArray } from 'drizzle-orm'
import { users, householdMembers } from '~/drizzle/schema'

// 读取用户头像：要求请求者与目标用户在同一住所（家庭成员可见）
export default defineEventHandler(async (event) => {
  const viewer = await requireUser(event)
  const targetId = getRouterParam(event, 'userId') ?? ''

  const db = getDB(event)

  // 请求者所在的所有住所
  const myHouseholds = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, viewer.id))

  // 目标用户必须在其中至少一个住所里
  const shared = myHouseholds.length
    ? await db
        .select({ userId: householdMembers.userId })
        .from(householdMembers)
        .where(and(
          eq(householdMembers.userId, targetId),
          inArray(householdMembers.householdId, myHouseholds.map(r => r.householdId)),
        ))
        .limit(1)
    : []
  if (!shared.length) throw createError({ statusCode: 404, statusMessage: '头像不存在' })

  const found = await db
    .select({ avatarKey: users.avatarKey })
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1)
  if (!found.length || !found[0]!.avatarKey) {
    throw createError({ statusCode: 404, statusMessage: '头像不存在' })
  }

  const bucket = getR2(event)
  const obj = await bucket.get(found[0]!.avatarKey)
  if (!obj) throw createError({ statusCode: 404, statusMessage: '头像文件不存在' })

  setHeader(event, 'Content-Type', obj.httpMetadata?.contentType ?? 'image/jpeg')
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  return Buffer.from(await obj.arrayBuffer())
})
