// 统一从 Nuxt/H3 错误中提取展示信息，替代各处 catch 里的 err as {...} 断言
export function errMsg(e: unknown): string {
  const err = e as { data?: { statusMessage?: string } }
  return err?.data?.statusMessage ?? ''
}

// 提取状态码（兼容顶层 statusCode 与 data.statusCode 两种形态），用于 404 视为成功等特判
export function errStatus(e: unknown): number | undefined {
  const err = e as { statusCode?: number; data?: { statusCode?: number } }
  return err?.data?.statusCode ?? err?.statusCode
}
