import { Body, Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { AuthService } from './auth.service'
import { SessionService } from './session.service'
import { Public } from './public.decorator'
import { CurrentUser, CurrentHouseholdId } from './current-user.decorator'
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

  /** 微信小程序登录：wx.login 的 code 换会话；未绑定 openid 自动建号（小程序 Bearer token） */
  @Public()
  @HttpCode(200)
  @Post('wechat')
  async wechat(@Body() body: Record<string, unknown>, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.authService.wechatLogin(
      String(body.code ?? ''),
      body.nickname ? String(body.nickname) : null,
    )
    this.session.setAuthCookie(reply, result.token)
    return result
  }

  /** 绑定微信到当前登录账号（家人用 Web 账号密码 + 小程序 openid 双通道登录） */
  @HttpCode(200)
  @Post('wechat/bind')
  bindWechat(@Body() body: Record<string, unknown>, @CurrentUser() user: SessionUser) {
    return this.authService.bindWechat(user.id, String(body.code ?? ''))
  }

  /** 当前会话：用户 + 住所成员关系（前端 stores/auth.ts 契约） */
  @Get('me')
  async me(@CurrentUser() user: SessionUser, @CurrentHouseholdId() householdId: string) {
    return this.authService.me(user.id, householdId)
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
