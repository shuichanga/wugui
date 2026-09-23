// 订阅路由：/api/subscription
import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../common/admin.guard'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { SubscriptionService } from './subscription.service'

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

  /** POST /api/subscription/wechat/pay —— 微信虚拟支付骨架（offerId 未配置返回 501） */
  @HttpCode(200)
  @Post('wechat/pay')
  wechatPay(@CurrentUser() user: SessionUser) {
    return this.service.wechatPayStub(user.id)
  }
}
