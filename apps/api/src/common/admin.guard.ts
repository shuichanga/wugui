// 管理员守卫：JWT sub 必须在 ADMIN_USER_IDS 环境变量列表内
// 用法：@UseGuards(AdminGuard)（全局 AuthGuard 先行注入 req.user，本守卫在其后执行）
import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { FastifyRequest } from 'fastify'
import type { AuthedRequest } from '../auth/session.types'
import type { AppConfig } from '../config'

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<FastifyRequest & Partial<AuthedRequest>>()
    const userId = req.user?.id ?? ''
    const admins = this.config.get<AppConfig>('app')?.adminUserIds ?? []
    if (!userId || !admins.includes(userId)) {
      throw new ForbiddenException('无管理员权限')
    }
    return true
  }
}
