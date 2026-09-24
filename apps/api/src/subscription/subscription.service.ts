// 订阅业务：有效订阅判定 / 住所云同步判定（家庭共享）/ 状态查询 / manual 开通 / 微信虚拟支付骨架
import { BadRequestException, Injectable, NotImplementedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { and, desc, eq, ne } from 'drizzle-orm'
import { subscriptions, users, householdMembers } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import type { AppConfig } from '../config'

/** 云同步永久会员（后续 plan 扩展在此追加） */
export const PAID_PLANS = ['cloud_sync_permanent'] as const
export type PaidPlan = (typeof PAID_PLANS)[number]

/** GET /api/subscription/status 响应 */
export interface SubscriptionStatus {
  /** 用户自己有有效订阅（关广告用，与住所解锁无关） */
  isPro: boolean
  planType: string
  expiresAt: Date | string | null
  /** 住所级云同步判定：住所任一成员（含自己）有有效订阅即解锁 */
  canCloudSync: boolean
  /** 解锁来源：self=自己订阅；member=家庭成员订阅（家庭共享） */
  cloudSyncSource: 'self' | 'member'
  /** 虚拟支付是否已开通（WECHAT_OFFER_ID 已配置）：未开通时客户端隐藏购买入口（审核要求） */
  payEnabled: boolean
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
  ) {}

  /** 用户是否有有效订阅（isPro 唯一判定源） */
  async hasActive(userId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), ne(subscriptions.planType, 'free')))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1)
    if (!rows.length) return false
    const sub = rows[0]
    if (sub.status !== 'active') return false
    return sub.expiresAt === null || sub.expiresAt > new Date()
  }

  /** 取用户当前订阅记录（无则 null） */
  async findCurrent(userId: string) {
    const rows = await this.drizzle.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(1)
    return rows[0] ?? null
  }

  /**
   * 住所级云同步判定（唯一判定源）：
   * 住所内任一成员有有效订阅 → 解锁。订阅用户自己的所有住所天然被覆盖。
   */
  async householdHasCloudSync(householdId: string): Promise<boolean> {
    const rows = await this.drizzle.db
      .select({ planType: subscriptions.planType, status: subscriptions.status, expiresAt: subscriptions.expiresAt })
      .from(householdMembers)
      .innerJoin(
        subscriptions,
        and(eq(subscriptions.userId, householdMembers.userId), ne(subscriptions.planType, 'free')),
      )
      .where(eq(householdMembers.householdId, householdId))
    return rows.some(r => r.status === 'active' && (r.expiresAt === null || r.expiresAt > new Date()))
  }

  /** 当前用户订阅状态（小程序/Web 设置页与会员页契约） */
  async status(userId: string, householdId: string): Promise<SubscriptionStatus> {
    const current = await this.findCurrent(userId)
    const isPro = current
      ? current.planType !== 'free' && current.status === 'active' && (current.expiresAt === null || current.expiresAt > new Date())
      : false

    let canCloudSync = isPro
    let cloudSyncSource: SubscriptionStatus['cloudSyncSource'] = 'self'
    if (!canCloudSync && householdId) {
      // 自己未订阅：住所被其他成员解锁 → 家庭共享
      const unlocked = await this.householdHasCloudSync(householdId)
      if (unlocked) cloudSyncSource = 'member'
      canCloudSync = unlocked
    }

    return {
      isPro,
      planType: current?.planType ?? 'free',
      expiresAt: current?.expiresAt ?? null,
      canCloudSync,
      cloudSyncSource,
      payEnabled: !!this.config.get<AppConfig>('app')?.wechat?.offerId,
    }
  }

  /**
   * manual 开通/取消（管理员操作）：
   * planType=null 取消（置 free）；否则开通/升级为对应付费计划（每用户一条当前记录，upsert）
   */
  async manualActivate(targetUserId: string, planType: string | null) {
    const db = this.drizzle.db
    const found = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId))
    if (!found.length) throw new BadRequestException('目标用户不存在')

    if (planType !== null && !(PAID_PLANS as readonly string[]).includes(planType)) {
      throw new BadRequestException(`无效的计划类型：${planType}`)
    }

    const now = new Date()
    const current = await this.findCurrent(targetUserId)
    if (current) {
      await db
        .update(subscriptions)
        .set({
          planType: planType ?? 'free',
          status: 'active',
          paymentProvider: planType ? 'manual' : null,
          transactionId: null,
          expiresAt: null, // manual 永久有效；限时计划接入支付后再扩展
          updatedAt: now,
        })
        .where(eq(subscriptions.id, current.id))
    } else {
      await db.insert(subscriptions).values({
        id: crypto.randomUUID(),
        userId: targetUserId,
        planType: planType ?? 'free',
        status: 'active',
        paymentProvider: planType ? 'manual' : null,
        expiresAt: null,
        createdAt: now,
        updatedAt: now,
      })
    }

    return { ok: true, userId: targetUserId, planType: planType ?? 'free' }
  }

  /**
   * 微信虚拟支付骨架（Phase 4）：小程序备案+认证、微信后台开通虚拟支付后接入。
   * offerId 未配置时返回 501，前端据此显示"暂未开放"。
   */
  async wechatPayStub(userId: string) {
    const offerId = this.config.get<AppConfig>('app')?.wechat?.offerId
    if (!offerId) {
      throw new NotImplementedException('虚拟支付暂未开放，请稍后再试')
    }
    // 预留：wx.requestVirtualPayment 需要的支付参数在此签发（签名/订单号/回调校验）
    void userId
    throw new NotImplementedException('虚拟支付暂未开放，请稍后再试')
  }
}
