// 带 401 自动跳登录的 fetch 封装
export function apiFetch<T>(url: string, opts?: Record<string, unknown>): Promise<T> {
  return $fetch<T>(url, {
    ...opts,
    onResponseError({ response }) {
      if (response.status === 401) {
        navigateTo('/login')
      }
    },
  }) as Promise<T>
}

// stale-while-revalidate 缓存策略：客户端导航进入页面时用上次数据立即渲染（不发请求、不阻塞），
// 手动 refresh（cause=refresh:manual）才真正拉取最新数据
export function swrCache(key: string, nuxtApp: { payload: { data: Record<string, unknown> } }, ctx: { cause?: string }): unknown {
  return ctx.cause === 'initial' ? nuxtApp.payload.data[key] : undefined
}
