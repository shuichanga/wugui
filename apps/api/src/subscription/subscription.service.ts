// 订阅业务：有效订阅判定 / 住所云同步判定（家庭共享）/ 状态查询 / manual 开通 / 微信虚拟支付（道具直购）
// 发货以「发货推送」为主，query_order 查单兜底（官方文档 5.4 节），前端 success 回调不作发货依据
import { BadRequestException, Injectable, Logger, NotFoundException, NotImplementedException, UnauthorizedException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { and, desc, eq, lt, ne } from 'drizzle-orm'
import { subscriptions, users, householdMembers, wechatPayOrders } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import type { AppConfig } from '../config'
import { AppConfigService } from '../app-config/app-config.service'
import {
  buildSignData,
  calcPaySig,
  calcUserSignature,
  genOutTradeNo,
  parseWechatXml,
  verifyPushSignature,
} from './vpay'

/** 云同步永久会员（后续 plan 扩展在此追加） */
export const PAID_PLANS = ['cloud_sync_permanent'] as const
export type PaidPlan = (typeof PAID_PLANS)[number]

/** 虚拟支付商品（道具直购）：productId 须与 MP 后台「道具管理」配置一致；goodsPrice 为内置默认价（分），
 *  运营现价可在管理后台「运营配置」下发（读 app_config，未配置时回退此默认，两处须与 MP 后台道具价一致） */
export const VPAY_PRODUCTS: Record<PaidPlan, { productId: string; goodsPrice: number }> = {
  cloud_sync_permanent: { productId: 'cloud_sync_permanent', goodsPrice: 990 },
}

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
  /** 在售商品（payEnabled 时下发，供支付前确认弹窗与按钮展示价格）；金额单位分，originalPrice 为划线原价 */
  product: { planType: PaidPlan; goodsPrice: number; originalPrice: number | null } | null
}

type WxPayOrder = typeof wechatPayOrders.$inferSelect

@Injectable()
export class SubscriptionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionService.name)
  /** access_token 内存缓存（stable_token，提前 5 分钟过期） */
  private accessToken: { token: string; expiresAt: number } | null = null
  /** 兜底查单定时器（推送丢失时每 5 分钟扫描 pending 单） */
  private fallbackTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly config: ConfigService,
    private readonly appConfig: AppConfigService,
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

    const payEnabled = !!this.config.get<AppConfig>('app')?.wechat?.offerId
    // 现价/原价来自管理后台运营配置；现价未配置回退内置默认价（须与 MP 后台道具价一致）
    const [cfgPrice, cfgOriginal] = await Promise.all([this.appConfig.getPriceCurrent(), this.appConfig.getPriceOriginal()])
    return {
      isPro,
      planType: current?.planType ?? 'free',
      expiresAt: current?.expiresAt ?? null,
      canCloudSync,
      cloudSyncSource,
      payEnabled,
      product: payEnabled
        ? {
            planType: 'cloud_sync_permanent',
            goodsPrice: cfgPrice ?? VPAY_PRODUCTS.cloud_sync_permanent.goodsPrice,
            originalPrice: cfgOriginal,
          }
        : null,
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

  // ---- 微信虚拟支付（道具直购，mode=short_series_goods） ----

  /**
   * 下单：签发 wx.requestVirtualPayment 所需支付参数。
   * body.code 为小程序下单前 wx.login 新取的 code——用户态签名需要 sessionKey，
   * 每次下单现取（官方：sessionKey 通过 code2Session 获取），不落库不缓存。
   */
  async createWechatPay(userId: string, code: string) {
    const wechat = this.config.get<AppConfig>('app')!.wechat
    if (!wechat.offerId || !wechat.payAppKey) throw new NotImplementedException('虚拟支付暂未开放，请稍后再试')
    if (!code) throw new BadRequestException('缺少 wx.login code')

    const db = this.drizzle.db
    const found = await db.select().from(users).where(eq(users.id, userId))
    if (!found.length) throw new UnauthorizedException('登录已失效，请重新登录')
    const user = found[0]
    if (!user.openid) throw new BadRequestException('当前账号未绑定微信，请使用微信登录后购买')

    const session = await this.codeToSessionFull(code)
    if (user.openid !== session.openid) throw new BadRequestException('微信账号与登录账号不一致，请重新登录')

    const product = VPAY_PRODUCTS.cloud_sync_permanent
    // 下单金额以管理后台运营现价为准（未配置回退内置默认）；须与 MP 后台道具价一致，否则微信拒付
    const goodsPrice = (await this.appConfig.getPriceCurrent()) ?? product.goodsPrice
    const outTradeNo = genOutTradeNo()
    const attach = JSON.stringify({ userId, planType: product.productId })
    const signData = buildSignData({
      offerId: wechat.offerId,
      productId: product.productId,
      goodsPrice,
      outTradeNo,
      attach,
    })

    const now = new Date()
    await db.insert(wechatPayOrders).values({
      id: crypto.randomUUID(),
      userId,
      outTradeNo,
      openid: session.openid,
      productId: product.productId,
      planType: product.productId,
      goodsPrice,
      quantity: 1,
      attach,
      env: 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    return {
      mode: 'short_series_goods' as const,
      signData,
      paySig: calcPaySig(wechat.payAppKey, 'requestVirtualPayment', signData),
      signature: calcUserSignature(session.sessionKey, signData),
      outTradeNo,
    }
  }

  /** MP 后台消息推送验签（明文模式）：sha1(sort(token, timestamp, nonce)) */
  verifyPushSignatureQuery(q: { signature?: string; timestamp?: string; nonce?: string }): boolean {
    const token = this.config.get<AppConfig>('app')!.wechat.notifyToken
    return verifyPushSignature(token, q.timestamp ?? '', q.nonce ?? '', q.signature ?? '')
  }

  /**
   * 虚拟支付事件分发（发货 / 退款 / 其他）。
   * 返回 null=受理成功；string=失败原因（控制器按推送格式回 ErrCode 非 0，微信最多重试 15 次）
   */
  async handleNotifyEvent(raw: string): Promise<string | null> {
    const trimmed = raw.trim()
    let event: Record<string, unknown>
    if (trimmed.startsWith('{')) {
      try {
        event = JSON.parse(trimmed) as Record<string, unknown>
      } catch {
        return 'json parse failed'
      }
    } else {
      const parsed = parseWechatXml(trimmed)
      // 微信 XML 推送根节点为 <xml>，解析结果包一层：{ xml: {...} } → 解包取事件字段
      const inner = (parsed as Record<string, unknown>).xml
      event = (inner && typeof inner === 'object' ? inner : parsed) as Record<string, unknown>
    }

    const eventName = String(event.Event ?? '')
    if (eventName === 'xpay_goods_deliver_notify') {
      const outTradeNo = String(event.OutTradeNo ?? '')
      if (!outTradeNo) return 'missing OutTradeNo'
      const pay = (event.WeChatPayInfo ?? {}) as { MchOrderNo?: string; PaidTime?: number | string }
      const paidAt = pay.PaidTime ? new Date(Number(pay.PaidTime) * 1000) : null
      const ok = await this.deliverOrder(outTradeNo, pay.MchOrderNo ?? null, paidAt).catch((e: unknown) => {
        this.logger.error(`发货推送处理失败 ${outTradeNo}: ${String(e)}`)
        return false
      })
      return ok ? null : 'deliver failed'
    }

    if (eventName === 'xpay_refund_notify') {
      const outTradeNo = String(event.OutTradeNo ?? '')
      if (!outTradeNo) return 'missing OutTradeNo'
      const pay = (event.WeChatPayInfo ?? {}) as { MchOrderNo?: string }
      await this.markRefunded(outTradeNo, pay.MchOrderNo ?? null).catch((e: unknown) => {
        this.logger.error(`退款推送处理失败 ${outTradeNo}: ${String(e)}`)
        return null
      })
      return null
    }

    // 投诉/风控等其他事件：仅记录，按成功受理
    this.logger.log(`忽略虚拟支付推送事件: ${eventName || '(unknown)'}`)
    return null
  }

  /** 客户端订单状态查询：pending 单触发微信侧 query_order 兜底（success 回调丢失时的自愈路径） */
  async getOrderStatus(userId: string, outTradeNo: string): Promise<{ status: string; wxOrderId: string | null }> {
    const db = this.drizzle.db
    const rows = await db
      .select()
      .from(wechatPayOrders)
      .where(and(eq(wechatPayOrders.outTradeNo, outTradeNo), eq(wechatPayOrders.userId, userId)))
    if (!rows.length) throw new NotFoundException('订单不存在')
    const order = rows[0]
    const status = await this.syncOrder(order)
    const current = await db
      .select({ wxOrderId: wechatPayOrders.wxOrderId })
      .from(wechatPayOrders)
      .where(eq(wechatPayOrders.id, order.id))
    return { status, wxOrderId: current[0]?.wxOrderId ?? null }
  }

  /** 兜底轮询：发货推送丢失时每 5 分钟扫描 2 分钟前的 pending 单（官方建议 5 分钟一次） */
  onModuleInit() {
    this.fallbackTimer = setInterval(() => {
      void this.syncPendingOrders()
    }, 5 * 60 * 1000)
  }

  onModuleDestroy() {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer)
  }

  private async syncPendingOrders() {
    try {
      // 超过 24h 未支付的挂单直接关单（用户放弃/平台已关），避免兜底轮询永久空扫
      const expireAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await this.drizzle.db
        .update(wechatPayOrders)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(and(eq(wechatPayOrders.status, 'pending'), lt(wechatPayOrders.createdAt, expireAt)))

      const cutoff = new Date(Date.now() - 2 * 60 * 1000)
      const rows = await this.drizzle.db
        .select()
        .from(wechatPayOrders)
        .where(and(eq(wechatPayOrders.status, 'pending'), lt(wechatPayOrders.createdAt, cutoff)))
        .limit(20)
      for (const order of rows) {
        await this.syncOrder(order).catch((e: unknown) => {
          this.logger.warn(`兜底查单失败 ${order.outTradeNo}: ${String(e)}`)
        })
      }
    } catch (e) {
      this.logger.warn(`兜底查单扫描失败: ${String(e)}`)
    }
  }

  /**
   * 同步单笔订单：pending → 向微信 query_order，按平台状态推进本地订单。
   * 平台 status：2=已支付待发货 3=发货中 4=已发货；5/7/8=退款相关；6=已关闭
   */
  private async syncOrder(order: WxPayOrder): Promise<string> {
    if (order.status !== 'pending') return order.status
    const remote = await this.queryWxOrder(order.openid, order.outTradeNo).catch((e: unknown) => {
      this.logger.warn(`query_order ${order.outTradeNo} 异常: ${String(e)}`)
      return null
    })
    if (!remote || remote.status === undefined) return order.status

    if (remote.status >= 2 && remote.status <= 4) {
      const ok = await this.deliverOrder(order.outTradeNo, remote.wxOrderId ?? null, null).catch((e: unknown) => {
        this.logger.error(`补发货失败 ${order.outTradeNo}: ${String(e)}`)
        return false
      })
      return ok ? 'delivered' : order.status
    }
    if (remote.status === 5 || remote.status === 7 || remote.status === 8) {
      await this.markRefunded(order.outTradeNo, remote.wxOrderId ?? null)
      return 'refunded'
    }
    if (remote.status === 6) {
      const now = new Date()
      await this.drizzle.db
        .update(wechatPayOrders)
        .set({ status: 'closed', updatedAt: now })
        .where(eq(wechatPayOrders.id, order.id))
      return 'closed'
    }
    return order.status
  }

  /**
   * 发货（幂等，事务）：置订单 delivered + 开通/升级订阅（cloud_sync_permanent 永久有效）。
   * 同一订单重复通知只发一次货（以本地订单状态去重，wxOrderId 入库留痕）。
   */
  private async deliverOrder(outTradeNo: string, wxOrderId: string | null, paidAt: Date | null): Promise<boolean> {
    const db = this.drizzle.db
    return db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(wechatPayOrders)
        .where(eq(wechatPayOrders.outTradeNo, outTradeNo))
        .for('update')
      if (!rows.length) return false
      const order = rows[0]
      if (order.status === 'delivered') return true

      const now = new Date()
      await tx
        .update(wechatPayOrders)
        .set({
          status: 'delivered',
          wxOrderId: wxOrderId ?? order.wxOrderId,
          paidAt: order.paidAt ?? paidAt,
          deliveredAt: now,
          updatedAt: now,
        })
        .where(eq(wechatPayOrders.id, order.id))
      this.logger.log(`发货成功: ${outTradeNo} wx_order_id=${wxOrderId ?? order.wxOrderId ?? 'null'}`)

      // 订阅 upsert（与 manualActivate 同构）：expiresAt=null 永久有效
      const current = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, order.userId))
        .orderBy(desc(subscriptions.updatedAt))
        .limit(1)
      const sub = current[0]
      if (sub) {
        await tx
          .update(subscriptions)
          .set({
            planType: order.planType,
            status: 'active',
            paymentProvider: 'wechat_virtual',
            transactionId: wxOrderId ?? sub.transactionId,
            expiresAt: null,
            updatedAt: now,
          })
          .where(eq(subscriptions.id, sub.id))
      } else {
        await tx.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId: order.userId,
          planType: order.planType,
          status: 'active',
          paymentProvider: 'wechat_virtual',
          transactionId: wxOrderId,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        })
      }
      return true
    })
  }

  /** 退款处理：标记订单 + 当前订阅正是该单开通的则降级为 free */
  private async markRefunded(outTradeNo: string, wxOrderId: string | null) {
    const db = this.drizzle.db
    const rows = await db.select().from(wechatPayOrders).where(eq(wechatPayOrders.outTradeNo, outTradeNo))
    if (!rows.length) return
    const order = rows[0]
    if (order.status !== 'delivered' && order.status !== 'paid') return

    const now = new Date()
    await db
      .update(wechatPayOrders)
      .set({ status: 'refunded', wxOrderId: wxOrderId ?? order.wxOrderId, updatedAt: now })
      .where(eq(wechatPayOrders.id, order.id))

    const sub = await this.findCurrent(order.userId)
    const effectiveWxOrderId = wxOrderId ?? order.wxOrderId
    if (
      sub &&
      sub.planType === 'cloud_sync_permanent' &&
      sub.paymentProvider === 'wechat_virtual' &&
      (!sub.transactionId || sub.transactionId === effectiveWxOrderId)
    ) {
      await db
        .update(subscriptions)
        .set({ planType: 'free', paymentProvider: null, transactionId: null, updatedAt: now })
        .where(eq(subscriptions.id, sub.id))
    }
    this.logger.log(`订单已退款并回收订阅: ${outTradeNo}`)
  }

  /** jscode2session（含 sessionKey，虚拟支付用户态签名必需）；网络/微信侧失败统一 400 提示重试 */
  private async codeToSessionFull(code: string): Promise<{ openid: string; sessionKey: string }> {
    const appid = this.config.get<string>('app.wechat.appId')
    const secret = this.config.get<string>('app.wechat.appSecret')
    if (!appid || !secret) throw new BadRequestException('微信支付未配置')

    const url =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}` +
      `&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    let res: { openid?: string; session_key?: string; errcode?: number; errmsg?: string }
    try {
      res = await (await fetch(url)).json() as typeof res
    } catch {
      throw new BadRequestException('微信登录失败，请重试')
    }
    if (!res.openid || !res.session_key) throw new BadRequestException('微信登录失败，请重试')
    return { openid: res.openid, sessionKey: res.session_key }
  }

  /** access_token（stable_token，内存缓存，提前 5 分钟过期） */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now()) return this.accessToken.token
    const appid = this.config.get<string>('app.wechat.appId')
    const secret = this.config.get<string>('app.wechat.appSecret')
    if (!appid || !secret) throw new NotImplementedException('虚拟支付暂未开放，请稍后再试')

    const res = await fetch('https://api.weixin.qq.com/cgi-bin/stable_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credential', appid, secret }),
    }).then(r => r.json() as Promise<{ access_token?: string; expires_in?: number; errcode?: number; errmsg?: string }>)
    if (!res.access_token) throw new Error(`获取 access_token 失败: ${res.errcode} ${res.errmsg}`)
    this.accessToken = {
      token: res.access_token,
      expiresAt: Date.now() + ((res.expires_in ?? 7200) - 300) * 1000,
    }
    return res.access_token
  }

  /** 微信侧查单：POST /xpay/query_order（pay_sig 挂 query 参数） */
  private async queryWxOrder(openid: string, outTradeNo: string): Promise<{ status?: number; wxOrderId?: string } | null> {
    const wechat = this.config.get<AppConfig>('app')!.wechat
    const token = await this.getAccessToken()
    const body = JSON.stringify({ openid, env: 0, order_id: outTradeNo })
    const paySig = calcPaySig(wechat.payAppKey, '/xpay/query_order', body)
    const url = `https://api.weixin.qq.com/xpay/query_order?access_token=${token}&pay_sig=${paySig}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }).then(
      r => r.json() as Promise<{ errcode?: number; errmsg?: string; order?: { status?: number; wx_order_id?: string } }>,
    )
    if (res.errcode !== 0 || !res.order) {
      this.logger.warn(`query_order ${outTradeNo} 失败: ${res.errcode} ${res.errmsg}`)
      return null
    }
    return { status: res.order.status, wxOrderId: res.order.wx_order_id }
  }
}
