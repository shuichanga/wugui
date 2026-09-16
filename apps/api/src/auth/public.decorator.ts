import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/** 标记路由为公开（免登录）：注册、登录、健康检查 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
