// 认证业务：注册（开放注册即建家）/ 登录（username 或 email）/ 会话 / 切换住所
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { eq, or } from 'drizzle-orm'
import { users, households, householdMembers } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { SessionService } from './session.service'
import type { SessionPayload } from './session.types'
import type { AppConfig } from '../config'

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
    private readonly config: ConfigService,
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

  /**
   * 当前会话信息（前端 stores/auth.ts 契约）：
   *   user: { id, email, displayName, avatarUrl }
   *   households: [{ id, name, role, inviteCode? }]  —— 邀请码仅 owner 可见
   *   currentHouseholdId: JWT 里的 hid
   */
  async me(userId: string, currentHouseholdId: string) {
    const db = this.drizzle.db
    const found = await db.select().from(users).where(eq(users.id, userId))
    // 401（而非 404）：JWT 有效但用户已不存在（如清库/注销）= 会话失效，
    // Web 端 apiFetch 收到 401 会自动清会话跳登录，避免页面卡在"加载中"
    if (!found.length) throw new UnauthorizedException('登录已失效，请重新登录')
    const user = found[0]

    const rows = await db
      .select({
        id: households.id,
        name: households.name,
        role: householdMembers.role,
        inviteCode: households.inviteCode,
      })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .where(eq(householdMembers.userId, userId))

    // 前端契约：currentHouseholdId 优先取 JWT 里的 hid；若失效（切换过）则回落到第一个
    const current = rows.some(r => r.id === currentHouseholdId) ? currentHouseholdId : (rows[0]?.id ?? '')

    return {
      user: {
        id: user.id,
        email: user.email ?? '',
        displayName: user.displayName ?? null,
        // v=文件名（每次上传换 uuid 文件名）→ 头像更换时浏览器缓存自动失效
        avatarUrl: user.avatarKey ? `/api/avatars/${user.id}?v=${user.avatarKey}` : null,
      },
      households: rows.map(r => ({
        ...r,
        inviteCode: r.role === 'owner' ? r.inviteCode : undefined,
      })),
      currentHouseholdId: current,
      // 管理后台入口判定（服务端 AdminGuard 同源）
      isAdmin: this.config.get<AppConfig['adminUserIds']>('app')?.includes(user.id) ?? false,
    }
  }

  /** 更新当前用户昵称（displayName）：小程序微信用户默认为"微信用户"，可在此修改 */
  async updateDisplayName(userId: string, displayName: string) {
    const name = (displayName ?? '').trim().slice(0, 64)
    if (!name) throw new BadRequestException('昵称不能为空')

    const db = this.drizzle.db
    const found = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
    // 同 me()：用户已不存在 = 会话失效，返回 401 触发前端重新登录
    if (!found.length) throw new UnauthorizedException('登录已失效，请重新登录')

    await db.update(users).set({ displayName: name, updatedAt: new Date() }).where(eq(users.id, userId))
    return { displayName: name }
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

  /** 微信小程序登录：code2Session 换 openid → 已绑定则登录，未绑定自动建号（注册即建家） */
  async wechatLogin(code: string, nickname: string | null) {
    if (!code) throw new BadRequestException('缺少 code')
    const wx = await this.codeToSession(code)

    const db = this.drizzle.db
    const found = await db.select().from(users).where(eq(users.openid, wx.openid))
    if (found.length) {
      const user = found[0]
      const memberships = await this.session.getMemberships(db, user.id)
      const hid = memberships[0]?.householdId ?? ''
      const token = await this.issueToken({ id: user.id, username: user.username, email: user.email, hid })
      return {
        user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName },
        householdId: hid,
        token,
        isNew: false,
      }
    }

    // 自动建号：与 register 同构（用户 + 住所 + owner 成员关系）
    const now = new Date()
    const userId = crypto.randomUUID()
    const householdId = crypto.randomUUID()
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        provider: 'wechat',
        openid: wx.openid,
        unionid: wx.unionid ?? null,
        displayName: (nickname ?? '').trim().slice(0, 64) || '微信用户',
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
      await tx.insert(householdMembers).values({ householdId, userId, role: 'owner', joinedAt: now })
    })
    const token = await this.issueToken({ id: userId, username: null, email: null, hid: householdId })
    return {
      user: { id: userId, username: null, email: null, displayName: (nickname ?? '').trim() || '微信用户' },
      householdId,
      token,
      isNew: true,
    }
  }

  /** 绑定微信到已有账号：登录态下把当前微信 openid 写到该用户（另一账号已占用则拒绝） */
  async bindWechat(userId: string, code: string) {
    if (!code) throw new BadRequestException('缺少 code')
    const wx = await this.codeToSession(code)

    const db = this.drizzle.db
    const dup = await db.select({ id: users.id }).from(users).where(eq(users.openid, wx.openid))
    if (dup.length && dup[0].id !== userId) {
      throw new ConflictException('该微信已绑定其他账号')
    }
    await db
      .update(users)
      .set({ openid: wx.openid, unionid: wx.unionid ?? null, updatedAt: new Date() })
      .where(eq(users.id, userId))
    return { ok: true }
  }

  /** code2Session：wx.login 的 code 换 openid/unionid；网络/微信侧失败统一为 401 提示重试 */
  private async codeToSession(code: string): Promise<{ openid: string; unionid: string | null }> {
    const appid = this.config.get<string>('app.wechat.appId')
    const secret = this.config.get<string>('app.wechat.appSecret')
    if (!appid || !secret) throw new BadRequestException('微信登录未配置')

    const url =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}` +
      `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    let session: { openid?: string; unionid?: string; errcode?: number; errmsg?: string }
    try {
      session = await (await fetch(url)).json() as typeof session
    } catch {
      throw new UnauthorizedException('微信登录失败，请重试')
    }
    if (!session.openid) {
      // 40029 code 无效 / 45011 频率限制等——对端一律提示重试
      throw new UnauthorizedException('微信登录失败，请重试')
    }
    return { openid: session.openid, unionid: session.unionid ?? null }
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
