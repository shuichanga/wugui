// 管理后台业务：数据看板统计 / 用户管理 / 订阅开通
// 所有路由经 AdminGuard（JWT sub ∈ ADMIN_USER_IDS），详见 admin.controller.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray, isNull, like, ne, or, sql } from 'drizzle-orm'
import { households, householdMembers, itemPhotos, items, locations, subscriptions, users } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { SubscriptionService } from '../subscription/subscription.service'

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
}
