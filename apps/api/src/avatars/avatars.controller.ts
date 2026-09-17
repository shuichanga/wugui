// 头像路由：直传凭证 / 上传确认 / 删除（me 前缀）+ 读取 302（avatars 前缀）
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { CurrentUser } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { AvatarsService } from './avatars.service'

@Controller('me')
export class MeAvatarController {
  constructor(private readonly service: AvatarsService) {}

  /** POST /api/me/avatar/sign —— 签发头像直传凭证 */
  @HttpCode(200)
  @Post('avatar/sign')
  sign(@Body() body: Record<string, unknown>, @CurrentUser() user: SessionUser) {
    return this.service.sign(user.id, body?.contentType ? String(body.contentType) : undefined)
  }

  /** POST /api/me/avatar/confirm —— 客户端直传成功后落库（替换旧头像） */
  @HttpCode(200)
  @Post('avatar/confirm')
  confirm(@Body() body: Record<string, unknown>, @CurrentUser() user: SessionUser) {
    return this.service.confirm(user.id, String(body?.key ?? ''))
  }

  /** DELETE /api/me/avatar —— 删除头像（DB 引用 + OSS 对象） */
  @Delete('avatar')
  remove(@CurrentUser() user: SessionUser) {
    return this.service.remove(user.id)
  }
}

@Controller('avatars')
export class AvatarsProxyController {
  constructor(private readonly service: AvatarsService) {}

  /**
   * GET /api/avatars/:userId —— 校验同住权限后 302 到 OSS 签名 URL。
   * 契约来源：/api/auth/me 返回的 user.avatarUrl = /api/avatars/{userId}，
   * 前端 <img src> 直接用，无需携带 Authorization（登录 cookie 已够）。
   */
  @Get(':userId')
  async get(
    @Param('userId') userId: string,
    @CurrentUser() user: SessionUser,
    @Res() reply: FastifyReply,
  ) {
    const url = await this.service.signedUrlFor(user.id, userId)
    return reply.redirect(url, 302)
  }
}
