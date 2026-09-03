import { households, householdMembers } from '~/drizzle/schema'

// 创建新家庭，调用者自动成为 owner 并切换过去
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '家庭名称不能为空' })
  if (name.length > 20) throw createError({ statusCode: 400, statusMessage: '家庭名称最多 20 字' })

  const db = getDB(event)
  const now = new Date().toISOString()
  const householdId = crypto.randomUUID()

  await db.insert(households).values({
    id: householdId,
    name,
    inviteCode: genInviteCode(),
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(householdMembers).values({ householdId, userId: user.id, role: 'owner', joinedAt: now })

  setCookie(event, COOKIE_HOUSEHOLD, householdId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return { id: householdId, name, role: 'owner' }
})
