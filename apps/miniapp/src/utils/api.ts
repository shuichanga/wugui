// 跨端 API client：小程序端注入 uni.request 传输（微信运行时没有 fetch/Response）
import { ApiClient, type ApiClientError } from '@wugui/core'
import { API_BASE } from '../config'

const rawTransport = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) =>
  new Promise<{ status: number; json: () => Promise<unknown> }>((resolve, reject) => {
    // wx.request 默认自动补 content-type: application/json——无 body 的 DELETE/GET
    // 会被服务端 Fastify 判为 FST_ERR_CTP_EMPTY_JSON_BODY(400)，需显式覆盖为非 JSON 类型
    const header = init.body === undefined
      ? { 'content-type': 'text/plain', ...init.headers }
      : init.headers
    uni.request({
      url,
      method: init.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      header,
      data: init.body ?? undefined,
      success: res => resolve({ status: res.statusCode as number, json: async () => res.data }),
      fail: err => reject(new Error(err.errMsg || '网络请求失败')),
    })
  })

function readToken(): string | null {
  const raw = uni.getStorageSync('wugui:auth')
  if (!raw) return null
  try {
    return (JSON.parse(raw) as { token: string }).token ?? null
  } catch {
    return null
  }
}

// ---- 401 静默重登 ----
// JWT 有效期有限（服务端默认 7 天）：几天没打开小程序后 token 过期，所有请求 401，
// 表现为"同步永远卡在旧时间、删掉小程序重开才恢复"。这里在传输层拦截 401，
// 触发一次静默微信重登（wx.login 对用户无感）换新 token 后重试原请求。
// 钩子由 App.vue 注册 useAuth.silentWechatRelogin——避免 utils ↔ composables 循环 import。
let reloginHook: (() => Promise<boolean>) | null = null
export function setReloginHook(fn: () => Promise<boolean>): void {
  reloginHook = fn
}

/** 并发 401 只触发一次重登，其余请求等同一份结果 */
let reloginInFlight: Promise<boolean> | null = null
function reloginOnce(): Promise<boolean> {
  if (!reloginHook) return Promise.resolve(false)
  if (!reloginInFlight) {
    reloginInFlight = reloginHook().finally(() => { reloginInFlight = null })
  }
  return reloginInFlight
}

const transport = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
  let res = await rawTransport(url, init)
  // /auth/* 自身的 401（如账号密码错误）不触发重登，避免登录页误触循环
  if (res.status === 401 && !url.includes('/auth/')) {
    const ok = await reloginOnce()
    if (ok) {
      const token = readToken()
      // 重试用 rawTransport 直发（不递归），失败就让 401 正常抛给调用方
      res = await rawTransport(url, {
        ...init,
        headers: token ? { ...init.headers, Authorization: `Bearer ${token}` } : init.headers,
      })
    }
  }
  return res
}

const client = new ApiClient({
  baseUrl: API_BASE,
  transport,
  getToken: readToken,
})

export { client as api, ApiClientError }

/** 从 ApiClientError 提取展示文案（对齐服务端 { statusCode, statusMessage }） */
export function errMsg(e: unknown): string {
  const err = e as { statusMessage?: string; message?: string }
  return err?.statusMessage || err?.message || ''
}
