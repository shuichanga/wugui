import { eq } from 'drizzle-orm'
import { users, households, householdMembers } from '~/drizzle/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const displayName = String(body.displayName ?? '').trim() || null
  const inviteCode = String(body.inviteCode ?? '').trim().toUpperCase() || null
  // 携带邀请码时可选仅注册（不加入住所），默认加入
  const joinHousehold = body.joinHousehold !== false

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: '邮箱格式不正确' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: '密码至少 8 位' })
  }

  const db = getDB(event)

  // role = 该用户最终在 householdId 住所中的角色；null = 仅注册（未加入任何住所）
  let role: 'owner' | 'member' | null = null
  let householdId: string | null = null

  if (inviteCode) {
    // 邀请码先校验，避免插入用户后才发现无效留下孤儿账号
    const found = await db.select({ id: households.id }).from(households).where(eq(households.inviteCode, inviteCode))
    if (!found.length) {
      throw createError({ statusCode: 404, statusMessage: '邀请码无效' })
    }
    if (joinHousehold) {
      householdId = found[0].id
      role = 'member'
    }
  } else {
    // 纯邀请制：无邀请码仅允许空库引导（数据库没有任何用户时的第一人）
    const anyUser = await db.select({ id: users.id }).from(users).limit(1)
    if (anyUser.length) {
      throw createError({ statusCode: 403, statusMessage: '当前仅支持邀请码注册，请向住所成员索取邀请码' })
    }
    householdId = crypto.randomUUID()
    role = 'owner'
  }

  const now = new Date().toISOString()
  const userId = crypto.randomUUID()

  // 先建用户（households.created_by 外键依赖 users）
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash: hashPassword(password),
    displayName,
    createdAt: now,
    updatedAt: now,
  })

  if (role === 'owner' && householdId) {
    await db.insert(households).values({
      id: householdId,
      name: '我的住所',
      inviteCode: genInviteCode(),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (role && householdId) {
    await db.insert(householdMembers).values({ householdId, userId, role, joinedAt: now })
  }

  const token = await signSession(event, { id: userId, email })
  await setAuthCookies(event, token, householdId ?? '')
  return { user: { id: userId, email, displayName }, householdId, role }
})
