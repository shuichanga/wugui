// 认证业务：注册（开放注册即建家）/ 登录（username 或 email）/ 会话 / 切换住所
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { eq, or } from 'drizzle-orm'
import { users, households, householdMembers } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { SessionService } from './session.service'
import type { SessionPayload } from './session.types'

const USERNAME_RE = /^[a-zA-Z0-9_]{2,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RegisterInput {
  username: string
  password: string
  email?: string | null
  displayName?: string | null
}

export interface LoginInput {
  account: string // username 或 email
  password: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly session: SessionService,
  ) {}

  /**
   * 注册（开放注册）：创建用户 + 自动创建自己的住所（owner）
   * 邀请码不再是注册入口；"邀请家人"走 households 接口
   */
  async register(input: RegisterInput) {
    const { username, password, email, displayName } = input

    if (!USERNAME_RE.test(username)) {
      throw new BadRequestException('用户名需 2-20 位字母、数字或下划线')
    }
    if (password.length < 8) {
      throw new BadRequestException('密码至少 8 位')
    }
    if (email && !EMAIL_RE.test(email)) {
      throw new BadRequestException('邮箱格式不正确')
    }

    const db = this.drizzle.db

    // 唯一性预检（并发场景由 unique 索引兜底）
    const dupUser = await db.select({ id: users.id }).from(users).where(eq(users.username, username))
    if (dupUser.length) throw new ConflictException('用户名已被占用')
    if (email) {
      const dupEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
      if (dupEmail.length) throw new ConflictException('该邮箱已注册')
    }

    const now = new Date()
    const userId = crypto.randomUUID()
    const householdId = crypto.randomUUID()

    // 事务：用户 + 住所 + 成员关系（注册即建家，owner）
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        username,
        email: email ?? null,
        passwordHash: this.session.hashPassword(password),
        provider: 'email',
        displayName: displayName ?? username,
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(households).values({
        id: householdId,
        name: '我的住所',
        inviteCode: this.session.genInviteCode(),
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(householdMembers).values({
        householdId,
        userId,
        role: 'owner',
        joinedAt: now,
      })
    })

    const token = await this.issueToken({
      id: userId,
      username,
      email: email ?? null,
      hid: householdId,
    })

    return {
      user: { id: userId, username, email: email ?? null, displayName: displayName ?? username },
      householdId,
      role: 'owner',
      token,
    }
  }

  /** 登录：account = username 或 email */
  async login(input: LoginInput) {
    const account = input.account.trim()
    if (!account || !input.password) throw new BadRequestException('请输入账号和密码')

    const db = this.drizzle.db
    const found = await db
      .select()
      .from(users)
      .where(or(eq(users.username, account), eq(users.email, account)))
    if (!found.length || !found[0].passwordHash) {
      throw new UnauthorizedException('账号或密码错误')
    }
    const user = found[0]
    const stored = user.passwordHash
    if (!stored || !this.session.verifyPassword(input.password, stored)) {
      throw new UnauthorizedException('账号或密码错误')
    }

    const memberships = await this.session.getMemberships(db, user.id)
    const hid = memberships[0]?.householdId ?? ''
    const token = await this.issueToken({ id: user.id, username: user.username, email: user.email, hid })

    return {
      user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
      householdId: hid,
      token,
    }
  }

  /** 当前会话信息：用户 + 所有住所成员关系 */
  async me(userId: string) {
    const db = this.drizzle.db
    const found = await db.select().from(users).where(eq(users.id, userId))
    if (!found.length) throw new NotFoundException('用户不存在')
    const user = found[0]
    const memberships = await this.session.getMemberships(db, userId)
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarKey: user.avatarKey,
      },
      householdId: memberships[0]?.householdId ?? '',
      memberships,
    }
  }

  /** 切换当前住所（重签 token，Web 多住所 / 多端统一入口） */
  async switchHousehold(userId: string, householdId: string) {
    const db = this.drizzle.db
    const memberships = await this.session.getMemberships(db, userId)
    const target = memberships.find(m => m.householdId === householdId)
    if (!target) throw new ForbiddenException('你不在这个住所中')

    const found = await db.select().from(users).where(eq(users.id, userId))
    const user = found[0]
    const token = await this.issueToken({
      id: user.id,
      username: user.username,
      email: user.email,
      hid: householdId,
    })
    return { householdId, role: target.role, token }
  }

  private async issueToken(base: { id: string; username: string | null; email: string | null; hid: string }) {
    const payload: SessionPayload = {
      sub: base.id,
      username: base.username ?? undefined,
      email: base.email ?? undefined,
      hid: base.hid || undefined,
    }
    return this.session.signSession(payload)
  }
}
