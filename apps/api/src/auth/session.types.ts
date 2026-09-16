// 会话与请求上下文类型
export interface SessionUser {
  id: string
  username: string | null
  email: string | null
}

export interface SessionPayload {
  sub: string
  username?: string
  email?: string
  hid?: string
}

/** 挂在 Fastify request 上的认证上下文（由 AuthGuard 注入） */
export interface AuthedRequest {
  user: SessionUser
  householdId: string
}
