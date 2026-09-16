import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { AuthService } from './auth.service'
import { SessionService } from './session.service'
import { Public } from './public.decorator'
import { CurrentUser } from './current-user.decorator'
import type { SessionUser } from './session.types'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly session: SessionService,
  ) {}

  /** 注册：username + password（+ 可选 email）→ 自动创建自己的住所 */
  @Public()
  @Post('register')
  // passthrough: true 是必须的——否则 @Res() 会进入手动响应模式，
  // return 的值不会写进 HTTP 响应体，导致请求永远挂起直到网关超时
  async register(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.register({
      username: String(body.username ?? '').trim(),
      password: String(body.password ?? ''),
      email: body.email ? String(body.email).trim().toLowerCase() : null,
      displayName: body.displayName ? String(body.displayName).trim() : null,
    })
    this.session.setAuthCookie(reply, result.token)
    return result
  }

  /** 登录：account = username 或 email */
  @Public()
  @HttpCode(200)
  @Post('login')
  async login(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.login({
      account: String(body.account ?? body.email ?? body.username ?? ''),
      password: String(body.password ?? ''),
    })
    this.session.setAuthCookie(reply, result.token)
    return result
  }

  /** 当前会话：用户 + 住所成员关系 */
  @Get('me')
  async me(@CurrentUser() user: SessionUser) {
    return this.authService.me(user.id)
  }

  /** 登出：清 cookie（多端 Bearer 模式由客户端自行删 token） */
  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    this.session.clearAuthCookie(reply)
    return { ok: true }
  }

  /** 切换当前住所：重签 token（householdId 进 JWT，多端统一） */
  @HttpCode(200)
  @Post('switch/:householdId')
  async switchHousehold(
    @Param('householdId') householdId: string,
    @CurrentUser() user: SessionUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.switchHousehold(user.id, householdId)
    this.session.setAuthCookie(reply, result.token)
    return result
  }
}
