import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyRequest } from 'fastify'
import { IS_PUBLIC_KEY } from './public.decorator'
import { SessionService, COOKIE_TOKEN } from './session.service'
import type { AuthedRequest } from './session.types'

/**
 * 全局认证守卫：
 *  - @Public() 装饰的路由放行
 *  - Token 来源优先级：Authorization: Bearer（小程序/安卓） > cookie wugui_token（Web）
 *  - 验证通过后把 user / householdId 挂到 request
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly session: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    const req = ctx.switchToHttp().getRequest<FastifyRequest & Partial<AuthedRequest>>()

    let token: string | undefined
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    } else {
      const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies
      token = cookies?.[COOKIE_TOKEN]
    }
    if (!token) throw new UnauthorizedException('请先登录')

    const payload = await this.session.verifySession(token)
    if (!payload) throw new UnauthorizedException('登录已过期，请重新登录')

    req.user = { id: payload.sub, username: payload.username ?? null, email: payload.email ?? null }
    req.householdId = payload.hid ?? ''
    return true
  }
}
