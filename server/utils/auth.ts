import { scrypt } from '@noble/hashes/scrypt'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { SignJWT, jwtVerify } from 'jose'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { householdMembers } from '~/drizzle/schema'

export const COOKIE_TOKEN = 'wugui_token'
export const COOKIE_HOUSEHOLD = 'wugui_household'

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

export interface SessionUser {
  id: string
  email: string
}

// ---- 密码哈希：scrypt（@noble/hashes，Workers 兼容） ----

export function hashPassword(password: string): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = scrypt(password, salt, { N: 16384, r: 8, p: 1, dkLen: 32 })
  return `scrypt$16384$8$1$${bytesToHex(salt)}$${bytesToHex(hash)}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltHex, hashHex] = parts
  try {
    const hash = scrypt(password, hexToBytes(saltHex), { N: +n, r: +r, p: +p, dkLen: 32 })
    return bytesToHex(hash) === hashHex
  } catch {
    return false
  }
}

// ---- JWT 会话 ----

function getSecret(event: H3Event): Uint8Array {
  const env = (event.context.cloudflare as { env?: { JWT_SECRET?: string } } | undefined)?.env
  const secret = env?.JWT_SECRET ?? process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me'
  return new TextEncoder().encode(secret)
}

export async function signSession(event: H3Event, user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret(event))
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, COOKIE_TOKEN)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(event))
    return { id: payload.sub as string, email: payload.email as string }
  } catch {
    return null
  }
}

export async function requireUser(event: H3Event): Promise<SessionUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '请先登录' })
  return user
}

export async function setAuthCookies(event: H3Event, token: string, householdId: string) {
  setCookie(event, COOKIE_TOKEN, token, COOKIE_OPTS)
  setCookie(event, COOKIE_HOUSEHOLD, householdId, COOKIE_OPTS)
}

export async function clearAuthCookies(event: H3Event) {
  setCookie(event, COOKIE_TOKEN, '', { ...COOKIE_OPTS, maxAge: 0 })
  setCookie(event, COOKIE_HOUSEHOLD, '', { ...COOKIE_OPTS, maxAge: 0 })
}

// ---- 当前住所上下文 ----

export async function requireHousehold(event: H3Event): Promise<{
  user: SessionUser
  householdId: string
  role: 'owner' | 'member'
}> {
  const user = await requireUser(event)
  const db = getDB(event)
  const memberships = await db
    .select()
    .from(householdMembers)
    .where(eq(householdMembers.userId, user.id))
  if (!memberships.length) {
    throw createError({ statusCode: 400, statusMessage: '请先创建或加入一个住所' })
  }
  const cookieHid = getCookie(event, COOKIE_HOUSEHOLD)
  const current = memberships.find(m => m.householdId === cookieHid) ?? memberships[0]
  return { user, householdId: current.householdId, role: current.role }
}

// ---- 邀请码 ----

const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function genInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, b => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')
}
