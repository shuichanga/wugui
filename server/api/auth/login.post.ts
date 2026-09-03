import { eq } from 'drizzle-orm'
import { users, householdMembers } from '~/drizzle/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const db = getDB(event)
  const found = await db.select().from(users).where(eq(users.email, email))
  if (!found.length || !verifyPassword(password, found[0].passwordHash)) {
    throw createError({ statusCode: 401, statusMessage: '邮箱或密码错误' })
  }

  const user = found[0]
  const memberships = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
  const householdId = memberships[0]?.householdId ?? ''

  const token = await signSession(event, { id: user.id, email: user.email })
  await setAuthCookies(event, token, householdId)
  return { user: { id: user.id, email: user.email, displayName: user.displayName }, householdId }
})
