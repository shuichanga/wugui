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
