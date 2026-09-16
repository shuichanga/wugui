// 会话基础设施：密码哈希、JWT 签发/验证、cookie 读写、邀请码
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { scrypt } from '@noble/hashes/scrypt'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import type { FastifyReply } from 'fastify'
import { householdMembers } from '../db/schema'
import type { DB } from '../db/database.service'
import type { SessionPayload } from './session.types'

export const COOKIE_TOKEN = 'wugui_token'
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

@Injectable()
export class SessionService {
  private secret: Uint8Array

  constructor(private readonly config: ConfigService) {
    this.secret = new TextEncoder().encode(this.config.get<string>('app.jwtSecret')!)
  }

  // ---- 密码哈希：scrypt（格式与旧 D1 版一致：scrypt$N$r$p$saltHex$hashHex） ----

  hashPassword(password: string): string {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const hash = scrypt(password, salt, { N: 16384, r: 8, p: 1, dkLen: 32 })
    return `scrypt$16384$8$1$${bytesToHex(salt)}$${bytesToHex(hash)}`
  }

  verifyPassword(password: string, stored: string): boolean {
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

  // ---- JWT（多端统一：Web 走 cookie，小程序/安卓走 Bearer header） ----

  async signSession(payload: SessionPayload): Promise<string> {
    const expires = this.config.get<string>('app.jwtExpires') ?? '7d'
    return new SignJWT({ username: payload.username, email: payload.email, hid: payload.hid })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(this.secret)
  }

  async verifySession(token: string): Promise<SessionPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret)
      if (!payload.sub) return null
      return payload as unknown as SessionPayload
    } catch {
      return null
    }
  }

  setAuthCookie(reply: FastifyReply, token: string) {
    reply.setCookie(COOKIE_TOKEN, token, COOKIE_OPTS)
  }

  clearAuthCookie(reply: FastifyReply) {
    reply.clearCookie(COOKIE_TOKEN, { path: '/' })
  }

  // ---- 住所成员 ----

  getMemberships(db: DB, userId: string) {
    return db.select().from(householdMembers).where(eq(householdMembers.userId, userId))
  }

  // ---- 邀请码（保留：邀请家人加入已有住所） ----

  genInviteCode(): string {
    const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(6))
    return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
  }
}
