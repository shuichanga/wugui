// 物归 API client 抽象层
// 设计目标：让 Web / 小程序 / 安卓 / 鸿蒙 都能注入不同的 fetch 实现
// Web: 用 window.fetch；小程序: 用 wx.request 封装；App: 用 axios / uni.request

export interface ApiClientConfig {
  /** API 根地址，如 https://wugui.shuichanga.cn */
  baseUrl: string
  /** 从 localStorage / wx.getStorageSync / secureStorage 读 token */
  getToken?: () => string | null
  /** 401 时的回调（跳登录、清缓存等） */
  onUnauthorized?: () => void
}

export interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** JSON body */
  body?: unknown
  /** 手动带 header */
  headers?: Record<string, string>
  /** 是否带 cookie（Web 端走 cookie，客户端走 Authorization header） */
  credentials?: boolean
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code?: string,
    public detail?: unknown,
  ) {
    super(`API ${status}: ${code ?? 'unknown'}`)
    this.name = 'ApiClientError'
  }
}

/**
 * 最小可用 API client
 * Web 端直接用它；小程序端 Phase 3 会用 wx.request 重写一份同接口的适配器
 */
export class ApiClient {
  constructor(private readonly config: ApiClientConfig) {}

  async request<T = unknown>(
    path: string,
    opts: ApiClientOptions = {},
  ): Promise<T> {
    const { baseUrl, getToken } = this.config
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    }

    const token = getToken?.()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${baseUrl}/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      credentials: opts.credentials ? 'include' : 'omit',
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })

    if (!res.ok) {
      if (res.status === 401) this.config.onUnauthorized?.()
      let code: string | undefined
      let detail: unknown
      try {
        const json = await res.json()
        code = json.code
        detail = json.detail
      } catch {
        // ignore
      }
      throw new ApiClientError(res.status, code, detail)
    }

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' })
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body })
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body })
  }
  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

// 默认 Web 实例（Nuxt 或浏览器端可用）
let defaultClient: ApiClient | null = null
export function getClient(config?: ApiClientConfig): ApiClient {
  if (config) defaultClient = new ApiClient(config)
  if (!defaultClient) {
    defaultClient = new ApiClient({
      baseUrl:
        typeof process !== 'undefined' && process.env?.NUXT_PUBLIC_API_BASE_URL
          ? process.env.NUXT_PUBLIC_API_BASE_URL
          : 'http://localhost:3000',
    })
  }
  return defaultClient
}
