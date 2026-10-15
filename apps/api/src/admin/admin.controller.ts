// 管理后台路由：/api/admin（全部需 AdminGuard；AdminGuard 在全局 AuthGuard 之后执行）
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminGuard } from '../common/admin.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { AppConfigService, parseFen } from '../app-config/app-config.service'
import { AdminService } from './admin.service'

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** GET /api/admin/config —— 读取运营配置（广告位 ID/广告开关/会员价格等） */
  @Get('config')
  async getConfig() {
    return this.appConfig.getOpsConfig()
  }

  /**
   * PUT /api/admin/config —— 更新运营配置。
   * body: { adUnitId?, adEnabled?, priceCurrent?, priceOriginal?, purgeGraceDays? }；
   * priceCurrent/priceOriginal 单位分，null/空 = 清除（现价清除后回退内置默认价）。
   * 现价须与 MP 后台「道具管理」道具价格一致，否则下单会被微信拒绝；
   * purgeGraceDays 为住所全体成员失去订阅后云端数据保留天数（改动须同步小程序弹窗文案）
   */
  @HttpCode(200)
  @Put('config')
  async updateConfig(@Body() body: Record<string, unknown>) {
    const patch: Parameters<AppConfigService['setOpsConfig']>[0] = {}
    if (body?.adUnitId !== undefined) patch.adUnitId = String(body.adUnitId ?? '')
    if (body?.adEnabled !== undefined) patch.adEnabled = !!body.adEnabled
    if (body?.priceCurrent !== undefined) patch.priceCurrent = parseFen(body.priceCurrent)
    if (body?.priceOriginal !== undefined) patch.priceOriginal = parseFen(body.priceOriginal)
    if (body?.purgeGraceDays !== undefined) {
      const days = Math.floor(Number(body.purgeGraceDays))
      if (Number.isFinite(days) && days >= 1) patch.purgeGraceDays = days
    }
    return { ok: true, ...(await this.appConfig.setOpsConfig(patch)) }
  }

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

  /** POST /api/admin/users —— 管理员创建用户（username/password/displayName） */
  @HttpCode(200)
  @Post('users')
  createUser(@Body() body: Record<string, unknown>) {
    return this.service.createUser({
      username: String(body?.username ?? ''),
      password: String(body?.password ?? ''),
      displayName: body?.displayName == null ? null : String(body.displayName),
    })
  }

  /** GET /api/admin/users/:id —— 用户详情 */
  @Get('users/:id')
  userDetail(@Param('id') id: string) {
    return this.service.userDetail(id)
  }

  /** PATCH /api/admin/users/:id —— 编辑昵称/用户名/重置密码 */
  @HttpCode(200)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateUser(id, {
      displayName: body?.displayName === undefined ? undefined : (body.displayName as string | null),
      username: body?.username === undefined ? undefined : String(body?.username ?? ''),
      password: body?.password === undefined ? undefined : String(body?.password ?? ''),
    })
  }

  /** DELETE /api/admin/users/:id —— 删除用户（级联住所/物品/订阅/头像，管理员不可删自己） */
  @Delete('users/:id')
  removeUser(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.removeUser(user.id, id)
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
