// 物归 API client 抽象层
// 设计目标：让 Web / 小程序 / 安卓 / 鸿蒙 都能注入不同的传输实现
// Web: 不传 transport，走全局 fetch；小程序: 注入 uni.request 封装；App: 同理

export interface ApiClientConfig {
  /** API 根地址（不含 /api），如 https://wugui.shuichanga.cn */
  baseUrl: string
  /** 从 localStorage / wx.getStorageSync / secureStorage 读 token */
  getToken?: () => string | null
  /** 401 时的回调（跳登录、清缓存等） */
  onUnauthorized?: () => void
  /**
   * 跨端传输注入。Web 端不传则用全局 fetch；
   * 小程序端注入 uni.request 封装（微信运行时没有 fetch/Response 全局对象）
   */
  transport?: ApiTransport
}

/** 平台无关的最小传输契约：返回原始 status + json 解析器即可 */
export type ApiTransport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; json: () => Promise<unknown> }>

export interface ApiClientOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** JSON body */
  body?: unknown
  /** 手动带 header */
  headers?: Record<string, string>
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code?: string,
    public detail?: unknown,
    /** 服务端错误格式 { statusCode, statusMessage } 的展示文案 */
    public statusMessage?: string,
  ) {
    super(`API ${status}: ${statusMessage ?? code ?? 'unknown'}`)
    this.name = 'ApiClientError'
  }
}

function webTransport(url: string, init: { method: string; headers: Record<string, string>; body?: string }) {
  return fetch(url, {
    method: init.method,
    headers: init.headers,
    credentials: 'omit',
    body: init.body,
  })
}

/**
 * 跨端 API client：一个实现，注入不同 transport
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

    const doFetch = this.config.transport ?? webTransport
    const res = await doFetch(`${baseUrl}/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    })

    if (res.status === 401) this.config.onUnauthorized?.()

    if (res.status >= 400) {
      interface ErrorPayload { code?: string; detail?: unknown; statusMessage?: string }
      let payload: ErrorPayload | null = null
      try {
        payload = (await res.json()) as ErrorPayload
      } catch {
        // 非 JSON 错误体（如网关 HTML 错误页）
      }
      throw new ApiClientError(res.status, payload?.code, payload?.detail, payload?.statusMessage)
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

// 默认实例（跨端安全：不在 core 里读 process/globalThis，交给调用方注入）
let defaultClient: ApiClient | null = null
export function getClient(config: ApiClientConfig): ApiClient {
  defaultClient = new ApiClient(config)
  return defaultClient
}
