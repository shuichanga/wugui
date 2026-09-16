import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthedRequest } from './session.types'

/** 获取当前登录用户（AuthGuard 注入） */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return (ctx.switchToHttp().getRequest() as AuthedRequest).user
})

/** 获取当前住所 ID（JWT 内携带，switch 时重签） */
export const CurrentHouseholdId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return (ctx.switchToHttp().getRequest() as AuthedRequest).householdId ?? ''
})
