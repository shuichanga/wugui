// 订阅路由：/api/subscription
import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { AdminGuard } from '../common/admin.guard'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import { Public } from '../auth/public.decorator'
import type { SessionUser } from '../auth/session.types'
import { SubscriptionService } from './subscription.service'
import { jsonNotifyError, NOTIFY_OK, xmlNotifyError } from './vpay'

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly service: SubscriptionService) {}

  /** GET /api/subscription/status —— 当前用户订阅状态（isPro 与 canCloudSync 分离） */
  @Get('status')
  status(@CurrentUser() user: SessionUser, @CurrentHouseholdId() householdId: string) {
    return this.service.status(user.id, householdId)
  }

  /** POST /api/subscription/manual/activate —— 管理员 manual 开通/取消订阅（body: { targetUserId, planType | null }） */
  @HttpCode(200)
  @Post('manual/activate')
  @UseGuards(AdminGuard)
  manualActivate(@Body() body: Record<string, unknown>) {
    const targetUserId = String(body?.targetUserId ?? '')
    const planType = body?.planType === null ? null : String(body?.planType ?? '')
    return this.service.manualActivate(targetUserId, planType)
  }

  /**
   * POST /api/subscription/wechat/pay —— 虚拟支付下单：签发 wx.requestVirtualPayment 支付参数。
   * body: { code }，code 为小程序下单前 wx.login() 新取的 code（服务端换 sessionKey 做用户态签名）
   */
  @HttpCode(200)
  @Post('wechat/pay')
  wechatPay(@CurrentUser() user: SessionUser, @Body() body: Record<string, unknown>) {
    return this.service.createWechatPay(user.id, String(body?.code ?? ''))
  }

  /** GET /api/subscription/wechat/notify —— MP 后台消息推送 URL 验证（验证通过回传 echostr） */
  @Public()
  @Get('wechat/notify')
  notifyVerify(@Query() query: Record<string, string>) {
    return this.service.verifyPushSignatureQuery(query) ? String(query.echostr ?? '') : ''
  }

  /**
   * POST /api/subscription/wechat/notify —— 虚拟支付事件推送（发货/退款等，明文模式 XML 或 JSON）。
   * 受理成功回 `success`；处理失败回 ErrCode 非 0（微信最多重试 15 次），发货逻辑幂等可安全重试
   */
  @Public()
  @Post('wechat/notify')
  async notify(
    @Req() req: FastifyRequest,
    @Query() query: Record<string, string>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (!this.service.verifyPushSignatureQuery(query)) {
      reply.code(401)
      return 'unauthorized'
    }

    // XML 推送经 main.ts 注册的 content-type parser 保留原始字符串；JSON 推送已被默认解析为对象
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    const err = await this.service.handleNotifyEvent(raw)
    if (err === null) {
      reply.type('text/plain')
      return NOTIFY_OK
    }

    const isJson = raw.startsWith('{')
    reply.type(isJson ? 'application/json' : 'text/xml')
    return isJson ? jsonNotifyError(err) : xmlNotifyError(err)
  }

  /** GET /api/subscription/wechat/order/:outTradeNo —— 客户端订单状态（pending 单触发微信侧兜底查单） */
  @Get('wechat/order/:outTradeNo')
  async orderStatus(@CurrentUser() user: SessionUser, @Param('outTradeNo') outTradeNo: string) {
    return this.service.getOrderStatus(user.id, outTradeNo)
  }
}
