// 住所路由：/api/households*（含 join / :id / :id/members / :id/invite/reset）
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import { SessionService } from '../auth/session.service'
import type { SessionUser } from '../auth/session.types'
import { HouseholdsService } from './households.service'

@Controller('households')
export class HouseholdsController {
  constructor(
    private readonly service: HouseholdsService,
    private readonly session: SessionService,
  ) {}

  /** GET /api/households —— 列出我的住所 */
  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.service.list(user.id)
  }

  /** POST /api/households —— 创建新住所（cookie + token 双通道，多端统一） */
  @HttpCode(200)
  @Post()
  async create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.service.create(user.id, String(body.name ?? '').trim())
    this.session.setAuthCookie(reply, result.token)
    return result
  }

  /** POST /api/households/join —— 邀请码加入 */
  @HttpCode(200)
  @Post('join')
  async join(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.service.join(user, String(body.inviteCode ?? '').trim().toUpperCase())
    this.session.setAuthCookie(reply, result.token)
    return result
  }

  /** PATCH /api/households/:id —— 改名（仅 owner） */
  @Patch(':id')
  rename(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.rename(user, id, String(body.name ?? '').trim())
  }

  /** POST /api/households/:id/invite/reset —— 重置邀请码（仅 owner） */
  @HttpCode(200)
  @Post(':id/invite/reset')
  resetInvite(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.resetInvite(user, id)
  }

  /** GET /api/households/:id/members —— 列出成员 */
  @Get(':id/members')
  members(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.members(user, id)
  }

  /** DELETE /api/households/:id/members/me —— 退出住所（必须放在 :userId 之前，否则 me 会被当作 userId 匹配） */
  @Delete(':id/members/me')
  async leave(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.service.leave(user, id, householdId)
    this.session.setAuthCookie(reply, result.token)
    return result
  }

  /** DELETE /api/households/:id/members/:userId —— 移除成员（仅 owner） */
  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: SessionUser) {
    return this.service.removeMember(user, id, userId)
  }
}
