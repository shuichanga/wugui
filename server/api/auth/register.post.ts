import { eq } from 'drizzle-orm'
import { users, households, householdMembers } from '~/drizzle/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const displayName = String(body.displayName ?? '').trim() || null
  const inviteCode = String(body.inviteCode ?? '').trim().toUpperCase() || null

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: '密码至少 8 位' })
  }

  const db = getDB(event)

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
  if (existing.length) {
    throw createError({ statusCode: 409, statusMessage: '该邮箱已注册' })
  }

  const now = new Date().toISOString()
  const userId = crypto.randomUUID()
  let householdId: string
  let role: 'owner' | 'member'

  // 邀请码先校验，避免插入用户后才发现无效留下孤儿账号
  if (inviteCode) {
    const found = await db.select({ id: households.id }).from(households).where(eq(households.inviteCode, inviteCode))
    if (!found.length) {
      throw createError({ statusCode: 404, statusMessage: '邀请码无效' })
    }
    householdId = found[0].id
    role = 'member'
  } else {
    householdId = crypto.randomUUID()
    role = 'owner'
  }

  // 先建用户（households.created_by 外键依赖 users）
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash: hashPassword(password),
    displayName,
    createdAt: now,
    updatedAt: now,
  })

  if (role === 'owner') {
    await db.insert(households).values({
      id: householdId,
      name: '我的家',
      inviteCode: genInviteCode(),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  }

  await db.insert(householdMembers).values({ householdId, userId, role, joinedAt: now })

  const token = await signSession(event, { id: userId, email })
  await setAuthCookies(event, token, householdId)
  return { user: { id: userId, email, displayName }, householdId, role }
})
