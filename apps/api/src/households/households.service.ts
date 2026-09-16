// 住所业务：创建 / 加入 / 列表 / 改名 / 邀请码重置 / 成员管理 / 退出
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, asc, eq } from 'drizzle-orm'
import { households, householdMembers, users } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { SessionService } from '../auth/session.service'
import type { SessionPayload, SessionUser } from '../auth/session.types'

/** 成员信息（前端契约：userId / username / email / displayName / role / joinedAt） */
export interface HouseholdMemberRow {
  userId: string
  username: string | null
  email: string | null
  displayName: string | null
  role: string
  joinedAt: Date | string
}

/** 住所列表项（前端契约：id / name / role / inviteCode?） */
export interface HouseholdRow {
  id: string
  name: string
  role: string
  inviteCode?: string
  joinedAt: Date | string
}

const MAX_MEMBERS = 10
const NAME_MAX = 20

@Injectable()
export class HouseholdsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly session: SessionService,
  ) {}

  /** GET /api/households —— 列出当前用户所有住所（邀请码仅 owner 可见） */
  async list(userId: string) {
    const rows = await this.drizzle.db
      .select({
        id: households.id,
        name: households.name,
        role: householdMembers.role,
        inviteCode: households.inviteCode,
        joinedAt: householdMembers.joinedAt,
      })
      .from(householdMembers)
      .innerJoin(households, eq(households.id, householdMembers.householdId))
      .where(eq(householdMembers.userId, userId))

    return rows.map(r => ({
      ...r,
      inviteCode: r.role === 'owner' ? r.inviteCode : undefined,
    })) as HouseholdRow[]
  }

  /** POST /api/households —— 创建新住所（owner） */
  async create(userId: string, name: string) {
    if (!name) throw new BadRequestException('住所名称不能为空')
    if (name.length > NAME_MAX) throw new BadRequestException(`住所名称最多 ${NAME_MAX} 字`)

    const db = this.drizzle.db
    const now = new Date()
    const id = crypto.randomUUID()

    await db.insert(households).values({
      id,
      name,
      inviteCode: this.session.genInviteCode(),
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(householdMembers).values({
      householdId: id,
      userId,
      role: 'owner',
      joinedAt: now,
    })

    // 重签 token 把新住所写进 JWT（多端统一：Web 走 cookie，小程序/安卓走 Bearer）
    const user = await this.loadUserPayload(userId)
    const token = await this.session.signSession({
      sub: userId,
      username: user.username ?? undefined,
      email: user.email ?? undefined,
      hid: id,
    })

    return { id, name, role: 'owner', token }
  }

  /** POST /api/households/join —— 用邀请码加入住所（member） */
  async join(user: SessionUser, inviteCode: string) {
    if (!inviteCode) throw new BadRequestException('请输入邀请码')

    const db = this.drizzle.db
    const found = await db.select().from(households).where(eq(households.inviteCode, inviteCode))
    if (!found.length) throw new NotFoundException('邀请码无效')
    const target = found[0]

    const existing = await db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, target.id), eq(householdMembers.userId, user.id)))
    if (existing.length) throw new ConflictException('你已是该住所成员')

    // 成员上限 10
    const countRows = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.householdId, target.id))
    if (countRows.length >= MAX_MEMBERS) {
      throw new ConflictException(`住所成员已达上限（${MAX_MEMBERS} 人）`)
    }

    await db.insert(householdMembers).values({
      householdId: target.id,
      userId: user.id,
      role: 'member',
      joinedAt: new Date(),
    })

    const payload = await this.loadUserPayload(user.id)
    const token = await this.session.signSession({
      sub: user.id,
      username: payload.username ?? undefined,
      email: payload.email ?? undefined,
      hid: target.id,
    })

    return { ok: true, householdId: target.id, name: target.name, token }
  }

  /** PATCH /api/households/:id —— 仅 owner 可改名（目标住所在 URL） */
  async rename(user: SessionUser, householdId: string, name: string) {
    if (!name) throw new BadRequestException('住所名称不能为空')
    if (name.length > NAME_MAX) throw new BadRequestException(`住所名称最多 ${NAME_MAX} 字`)

    const membership = await this.requireMembership(user.id, householdId)
    if (membership.role !== 'owner') throw new ForbiddenException('仅住所创建者可改名')

    await this.drizzle.db
      .update(households)
      .set({ name, updatedAt: new Date() })
      .where(eq(households.id, householdId))

    return { ok: true, name }
  }

  /** POST /api/households/:id/invite/reset —— 仅 owner 可重置邀请码 */
  async resetInvite(user: SessionUser, householdId: string) {
    const membership = await this.requireMembership(user.id, householdId)
    if (membership.role !== 'owner') {
      throw new ForbiddenException('仅住所创建者可重置邀请码')
    }

    const inviteCode = this.session.genInviteCode()
    await this.drizzle.db
      .update(households)
      .set({ inviteCode, updatedAt: new Date() })
      .where(eq(households.id, householdId))

    return { ok: true, inviteCode }
  }

  /** GET /api/households/:id/members —— 列出成员（需为成员） */
  async members(user: SessionUser, householdId: string) {
    await this.requireMembership(user.id, householdId)

    const rows = await this.drizzle.db
      .select({
        userId: householdMembers.userId,
        role: householdMembers.role,
        joinedAt: householdMembers.joinedAt,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
      })
      .from(householdMembers)
      .innerJoin(users, eq(users.id, householdMembers.userId))
      .where(eq(householdMembers.householdId, householdId))
      .orderBy(asc(householdMembers.joinedAt))

    return rows as HouseholdMemberRow[]
  }

  /** DELETE /api/households/:id/members/:userId —— 仅 owner，不能删 owner 和自己 */
  async removeMember(user: SessionUser, householdId: string, targetUserId: string) {
    if (!targetUserId) throw new BadRequestException('缺少成员 ID')

    const membership = await this.requireMembership(user.id, householdId)
    if (membership.role !== 'owner') throw new ForbiddenException('仅住所创建者可移除成员')

    const target = await this.drizzle.db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, targetUserId)))
    if (!target.length) throw new NotFoundException('该用户不是住所成员')
    if (target[0].role === 'owner') throw new ForbiddenException('不能移除住所创建者')

    await this.drizzle.db
      .delete(householdMembers)
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, targetUserId)))

    return { ok: true }
  }

  /**
   * DELETE /api/households/:id/members/me —— 自己退出住所
   * 返回 token 让客户端更新（切回剩余的第一个住所；若无剩余则 hid 为空）
   */
  async leave(user: SessionUser, householdId: string, currentHouseholdId: string) {
    const self = await this.requireMembership(user.id, householdId)
    if (self.role === 'owner') {
      throw new ForbiddenException('住所创建者不能退出，请先转让或解散住所')
    }

    await this.drizzle.db
      .delete(householdMembers)
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, user.id)))

    // 若退出的是当前住所，切回剩余的第一个
    const payload = await this.loadUserPayload(user.id)
    let nextHid = currentHouseholdId
    if (currentHouseholdId === householdId) {
      const rest = await this.session.getMemberships(this.drizzle.db, user.id)
      nextHid = rest[0]?.householdId ?? ''
    }
    const token = await this.session.signSession({
      sub: user.id,
      username: payload.username ?? undefined,
      email: payload.email ?? undefined,
      hid: nextHid || undefined,
    })

    return { ok: true, householdId: nextHid, token }
  }

  // ---- helpers ----

  private async requireMembership(userId: string, householdId: string) {
    const rows = await this.drizzle.db
      .select()
      .from(householdMembers)
      .where(and(eq(householdMembers.userId, userId), eq(householdMembers.householdId, householdId)))
    if (!rows.length) throw new ForbiddenException('你不是该住所成员')
    return rows[0]
  }

  private async loadUserPayload(userId: string): Promise<SessionPayload> {
    const rows = await this.drizzle.db.select().from(users).where(eq(users.id, userId))
    if (!rows.length) throw new NotFoundException('用户不存在')
    const u = rows[0]
    return { sub: u.id, username: u.username ?? undefined, email: u.email ?? undefined }
  }
}
