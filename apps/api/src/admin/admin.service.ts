// 管理后台业务：数据看板统计 / 用户管理（增删改查）/ 订阅开通
// 所有路由经 AdminGuard（JWT sub ∈ ADMIN_USER_IDS），详见 admin.controller.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray, isNull, like, ne, or, sql } from 'drizzle-orm'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { ConfigService } from '@nestjs/config'
import {
  households,
  householdMembers,
  itemPhotos,
  itemTags,
  items,
  locations,
  recentViews,
  subscriptions,
  syncChanges,
  users,
} from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { OssService } from '../oss/oss.service'
import { SessionService } from '../auth/session.service'
import { SubscriptionService } from '../subscription/subscription.service'
import type { AppConfig } from '../config'

// 与 auth.service 注册校验保持一致（auth.service 未导出，此处对齐复制）
const USERNAME_RE = /^[a-zA-Z0-9_]{2,20}$/

/** GET /api/admin/stats 总览 */
export interface AdminStats {
  users: number
  households: number
  items: number
  locations: number
  photos: number
  activeSubscriptions: number
  todayNewUsers: number
  todayNewItems: number
}

/** GET /api/admin/stats/trend?days=30 趋势 */
export interface TrendPoint {
  date: string
  users: number
  items: number
}

/** GET /api/admin/users 列表行 */
export interface AdminUserRow {
  id: string
  username: string | null
  email: string | null
  displayName: string | null
  provider: string
  createdAt: string
  householdCount: number
  itemCount: number
  planType: string
  isPro: boolean
}

@Injectable()
export class AdminService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly subscription: SubscriptionService,
    private readonly session: SessionService,
    private readonly oss: OssService,
    private readonly config: ConfigService,
  ) {}

  async stats(): Promise<AdminStats> {
    const db = this.drizzle.db
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const count = async (query: Promise<Array<{ n: number }>>) => {
      const [row] = await query
      return Number(row?.n ?? 0)
    }

    const [
      usersN, householdsN, itemsN, locationsN, photosN, subsN, todayUsers, todayItems,
    ] = await Promise.all([
      count(db.select({ n: sql<number>`count(*)` }).from(users)),
      count(db.select({ n: sql<number>`count(*)` }).from(households)),
      count(db.select({ n: sql<number>`count(*)` }).from(items).where(isNull(items.deletedAt))),
      count(db.select({ n: sql<number>`count(*)` }).from(locations).where(isNull(locations.deletedAt))),
      count(db.select({ n: sql<number>`count(*)` }).from(itemPhotos)),
      count(db.select({ n: sql<number>`count(distinct ${subscriptions.userId})` }).from(subscriptions)
        .where(and(ne(subscriptions.planType, 'free'), eq(subscriptions.status, 'active')))),
      count(db.select({ n: sql<number>`count(*)` }).from(users).where(sql`${users.createdAt} >= ${todayStart}`)),
      count(db.select({ n: sql<number>`count(*)` }).from(items)
        .where(and(isNull(items.deletedAt), sql`${items.createdAt} >= ${todayStart}`))),
    ])

    return {
      users: usersN,
      households: householdsN,
      items: itemsN,
      locations: locationsN,
      photos: photosN,
      activeSubscriptions: subsN,
      todayNewUsers: todayUsers,
      todayNewItems: todayItems,
    }
  }

  async trend(days: number): Promise<TrendPoint[]> {
    const d = Math.min(90, Math.max(7, Math.floor(days) || 30))
    const start = new Date()
    start.setDate(start.getDate() - d)
    start.setHours(0, 0, 0, 0)

    // 递归 CTE 生成日期序列，再左连统计（MySQL 8）
    const rows = await this.drizzle.rawQuery<{ d: string; users: number; items: number }>(sql`
      WITH RECURSIVE days AS (
        SELECT DATE(${start}) AS d
        UNION ALL
        SELECT d + INTERVAL 1 DAY FROM days WHERE d + INTERVAL 1 DAY <= CURDATE()
      )
      SELECT DATE_FORMAT(d, '%Y-%m-%d') AS d,
        (SELECT count(*) FROM users u WHERE DATE(u.created_at) = days.d) AS users,
        (SELECT count(*) FROM items i WHERE DATE(i.created_at) = days.d AND i.deleted_at IS NULL) AS items
      FROM days ORDER BY d
    `)
    return rows.map(r => ({ date: r.d, users: Number(r.users), items: Number(r.items) }))
  }

  async listUsers(query: string, page: number, pageSize = 20) {
    const db = this.drizzle.db
    const p = Math.max(1, Math.floor(page) || 1)
    const size = Math.min(100, Math.max(5, Math.floor(pageSize) || 20))
    const q = (query ?? '').trim()

    const where = q
      ? or(like(users.username, `%${q}%`), like(users.email, `%${q}%`), like(users.displayName, `%${q}%`))
      : undefined

    const [rows, [countRow]] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          provider: users.provider,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(sql`${users.createdAt} DESC`)
        .limit(size)
        .offset((p - 1) * size),
      db.select({ count: sql<number>`count(*)` }).from(users).where(where),
    ])
    if (!rows.length) {
      return { users: [], total: Number(countRow?.count ?? 0), page: p, pageSize: size }
    }

    const ids = rows.map(r => r.id)
    const [hhRows, itemRows, subRows] = await Promise.all([
      db
        .select({ userId: householdMembers.userId, n: sql<number>`count(*)` })
        .from(householdMembers)
        .where(inArray(householdMembers.userId, ids))
        .groupBy(householdMembers.userId),
      db
        .select({ ownerId: items.ownerId, n: sql<number>`count(*)` })
        .from(items)
        .where(and(isNull(items.deletedAt), inArray(items.ownerId, ids)))
        .groupBy(items.ownerId),
      db
        .select({ userId: subscriptions.userId, planType: subscriptions.planType, status: subscriptions.status, expiresAt: subscriptions.expiresAt })
        .from(subscriptions)
        .where(inArray(subscriptions.userId, ids)),
    ])

    const hhBy = new Map(hhRows.map(r => [r.userId, Number(r.n)]))
    const itemBy = new Map(itemRows.map(r => [r.ownerId, Number(r.n)]))
    // 每用户最新一条订阅记录
    const subBy = new Map<string, { planType: string; status: string; expiresAt: Date | null }>()
    for (const s of subRows) {
      const existing = subBy.get(s.userId)
      const active = s.status === 'active' && (s.expiresAt === null || s.expiresAt > new Date())
      const isPaid = s.planType !== 'free' && active
      if (isPaid || !existing) subBy.set(s.userId, { planType: s.planType, status: s.status, expiresAt: s.expiresAt })
    }

    return {
      users: rows.map(r => {
        const sub = subBy.get(r.id)
        const isPro = !!sub && sub.planType !== 'free' && sub.status === 'active' && (sub.expiresAt === null || sub.expiresAt > new Date())
        return {
          ...r,
          createdAt: r.createdAt.toISOString(),
          householdCount: hhBy.get(r.id) ?? 0,
          itemCount: itemBy.get(r.id) ?? 0,
          planType: sub?.planType ?? 'free',
          isPro,
        }
      }) as AdminUserRow[],
      total: Number(countRow?.count ?? 0),
      page: p,
      pageSize: size,
    }
  }

  async userDetail(userId: string) {
    const db = this.drizzle.db
    const found = await db.select().from(users).where(eq(users.id, userId))
    if (!found.length) throw new NotFoundException('用户不存在')
    const u = found[0]

    const [householdRows, itemCountRows, photoCountRows, subRows] = await Promise.all([
      db
        .select({ id: households.id, name: households.name, role: householdMembers.role, joinedAt: householdMembers.joinedAt })
        .from(householdMembers)
        .innerJoin(households, eq(households.id, householdMembers.householdId))
        .where(eq(householdMembers.userId, userId)),
      db.select({ n: sql<number>`count(*)` }).from(items).where(and(eq(items.ownerId, userId), isNull(items.deletedAt))),
      db
        .select({ n: sql<number>`count(*)` })
        .from(itemPhotos)
        .innerJoin(items, eq(items.id, itemPhotos.itemId))
        .where(eq(items.ownerId, userId)),
      db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(sql`${subscriptions.updatedAt} DESC`),
    ])

    const current = subRows[0] ?? null
    return {
      user: {
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        provider: u.provider,
        createdAt: u.createdAt.toISOString(),
      },
      households: householdRows.map(h => ({ ...h, joinedAt: h.joinedAt.toISOString() })),
      itemCount: Number(itemCountRows[0]?.n ?? 0),
      photoCount: Number(photoCountRows[0]?.n ?? 0),
      subscription: current
        ? { planType: current.planType, status: current.status, expiresAt: current.expiresAt?.toISOString() ?? null, paymentProvider: current.paymentProvider }
        : null,
    }
  }

  /** 管理端开通/取消订阅（与 subscription/manual/activate 共用 service） */
  async setSubscription(adminUserId: string, targetUserId: string, planType: string | null) {
    if (!targetUserId) throw new BadRequestException('缺少 targetUserId')
    void adminUserId
    return this.subscription.manualActivate(targetUserId, planType)
  }

  /** POST /api/admin/users —— 管理员创建用户（对齐注册行为：建号即建"我的住所"） */
  async createUser(input: { username: string; password: string; displayName?: string | null }) {
    const username = (input.username ?? '').trim()
    if (!USERNAME_RE.test(username)) {
      throw new BadRequestException('用户名需 2-20 位字母、数字或下划线')
    }
    const password = input.password ?? ''
    if (password.length < 8) throw new BadRequestException('密码至少 8 位')

    const db = this.drizzle.db
    const dup = await db.select({ id: users.id }).from(users).where(eq(users.username, username))
    if (dup.length) throw new BadRequestException('用户名已被占用')

    const now = new Date()
    const id = crypto.randomUUID()
    const householdId = crypto.randomUUID()

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id,
        username,
        passwordHash: this.session.hashPassword(password),
        provider: 'email',
        displayName: input.displayName?.trim().slice(0, 64) || username,
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(households).values({
        id: householdId,
        name: '我的住所',
        inviteCode: this.session.genInviteCode(),
        createdBy: id,
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(householdMembers).values({
        householdId,
        userId: id,
        role: 'owner',
        joinedAt: now,
      })
    })

    return { ok: true, userId: id, username }
  }

  /** PATCH /api/admin/users/:id —— 编辑昵称 / 用户名 / 重置密码（字段可选，至少传一个） */
  async updateUser(targetUserId: string, body: { displayName?: string | null; username?: string | null; password?: string | null }) {
    const db = this.drizzle.db
    const found = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, targetUserId))
    if (!found.length) throw new NotFoundException('用户不存在')

    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (body.username !== undefined) {
      const username = (body.username ?? '').trim()
      if (!USERNAME_RE.test(username)) throw new BadRequestException('用户名需 2-20 位字母、数字或下划线')
      if (username !== found[0].username) {
        const dup = await db.select({ id: users.id }).from(users).where(eq(users.username, username))
        if (dup.length) throw new BadRequestException('用户名已被占用')
        updates.username = username
      }
    }
    if (body.displayName !== undefined) {
      updates.displayName = body.displayName?.trim().slice(0, 64) || null
    }
    if (body.password !== undefined && body.password !== null && body.password !== '') {
      if (body.password.length < 8) throw new BadRequestException('密码至少 8 位')
      updates.passwordHash = this.session.hashPassword(body.password)
    }
    if (Object.keys(updates).length === 1) {
      throw new BadRequestException('没有需要更新的字段')
    }

    await db.update(users).set(updates).where(eq(users.id, targetUserId))
    return { ok: true, userId: targetUserId }
  }

  /**
   * DELETE /api/admin/users/:id —— 删除用户（管理员不可删自己）。
   * 级联：其创建的住所整体删除（物品/标签/照片记录/空间/浏览记录/同步日志 + OSS 照片对象），
   * 在他人住所的成员身份与个人物品一并清理；订阅、头像文件、用户行最后删。
   */
  async removeUser(adminUserId: string, targetUserId: string) {
    if (!targetUserId) throw new BadRequestException('缺少 targetUserId')
    if (adminUserId === targetUserId) throw new BadRequestException('不能删除当前登录的管理员账号')

    const db = this.drizzle.db
    const found = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId))
    if (!found.length) throw new NotFoundException('用户不存在')

    // ① 其为 owner 的住所：整体清（其他成员的 membership 也在其中）
    const ownedRows = await db
      .select({ householdId: households.id })
      .from(households)
      .where(eq(households.createdBy, targetUserId))
    for (const { householdId } of ownedRows) {
      await this.removeHouseholdData(householdId)
    }

    // ② 其在他人住所的物品（ownerId=target，住所还活着）：删记录 + OSS
    const itemRows = await db
      .select({ id: items.id, ossKey: itemPhotos.ossKey })
      .from(items)
      .leftJoin(itemPhotos, eq(itemPhotos.itemId, items.id))
      .where(and(eq(items.ownerId, targetUserId), isNull(items.deletedAt)))
    const ownItemIds = [...new Set(itemRows.map((r) => r.id))]
    if (ownItemIds.length) {
      await db.delete(itemTags).where(inArray(itemTags.itemId, ownItemIds))
      await db.delete(itemPhotos).where(inArray(itemPhotos.itemId, ownItemIds))
      await db.delete(items).where(inArray(items.id, ownItemIds))
      await this.deleteOssObjects(itemRows.map((r) => r.ossKey).filter((k): k is string => !!k))
    }

    // ③ 剩余成员身份（他人住所）、个人浏览/订阅/同步日志、用户行
    await db.delete(householdMembers).where(eq(householdMembers.userId, targetUserId))
    await db.delete(recentViews).where(eq(recentViews.userId, targetUserId))
    await db.delete(subscriptions).where(eq(subscriptions.userId, targetUserId))
    await db.delete(syncChanges).where(eq(syncChanges.userId, targetUserId))
    await db.delete(users).where(eq(users.id, targetUserId))

    // ④ 头像目录（best-effort，磁盘文件）
    const avatarDir = this.config.get<AppConfig>('app')?.avatarDir ?? 'data/avatars'
    try {
      await rm(join(avatarDir, targetUserId), { recursive: true, force: true })
    } catch (e) {
      console.warn(`[admin] 头像目录删除失败 ${targetUserId}:`, e)
    }

    return { ok: true, userId: targetUserId }
  }

  /** 删除整个住所的数据（owner 删除用户 / 未来"解散住所"共用）：顺序为子表 → 主表 → OSS */
  private async removeHouseholdData(householdId: string) {
    const db = this.drizzle.db
    const itemRows = await db
      .select({ id: items.id, ossKey: itemPhotos.ossKey })
      .from(items)
      .leftJoin(itemPhotos, eq(itemPhotos.itemId, items.id))
      .where(eq(items.householdId, householdId))
    const itemIds = itemRows.map((r) => r.id)

    if (itemIds.length) {
      await db.delete(itemTags).where(inArray(itemTags.itemId, itemIds))
      await db.delete(itemPhotos).where(inArray(itemPhotos.itemId, itemIds))
      await db.delete(recentViews).where(inArray(recentViews.itemId, itemIds))
    }
    await db.delete(syncChanges).where(eq(syncChanges.householdId, householdId))
    await db.delete(items).where(eq(items.householdId, householdId))
    await db.delete(locations).where(eq(locations.householdId, householdId))
    await db.delete(householdMembers).where(eq(householdMembers.householdId, householdId))
    await db.delete(households).where(eq(households.id, householdId))
    await this.deleteOssObjects(itemRows.map((r) => r.ossKey).filter((k): k is string => !!k))
  }

  /** OSS 对象批量尽力删（失败只告警，孤儿对象由清理任务兜底） */
  private async deleteOssObjects(ossKeys: string[]) {
    for (const key of ossKeys) {
      try {
        await this.oss.deleteObject(key)
      } catch (e) {
        console.warn(`[admin] OSS 删除失败 ${key}:`, e)
      }
    }
  }
}
