// 管理后台路由：/api/admin（全部需 AdminGuard；AdminGuard 在全局 AuthGuard 之后执行）
import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../common/admin.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { AdminService } from './admin.service'

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  /** GET /api/admin/stats —— 总览看板 */
  @Get('stats')
  stats() {
    return this.service.stats()
  }

  /** GET /api/admin/stats/trend?days=30 —— 按天注册/物品新增趋势 */
  @Get('stats/trend')
  trend(@Query('days') days: string) {
    return this.service.trend(Number(days))
  }

  /** GET /api/admin/users?query=&page= —— 用户分页列表 */
  @Get('users')
  users(
    @Query('query') query: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.service.listUsers(query, Number(page), Number(pageSize))
  }

  /** GET /api/admin/users/:id —— 用户详情 */
  @Get('users/:id')
  userDetail(@Param('id') id: string) {
    return this.service.userDetail(id)
  }

  /** POST /api/admin/users/:id/subscription —— 开通（planType）/取消（null）订阅 */
  @HttpCode(200)
  @Post('users/:id/subscription')
  setSubscription(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    const planType = body?.planType === null ? null : String(body?.planType ?? '')
    return this.service.setSubscription(user.id, id, planType)
  }
}
