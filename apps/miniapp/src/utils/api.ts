// 跨端 API client：小程序端注入 uni.request 传输（微信运行时没有 fetch/Response）
import { ApiClient, type ApiClientError } from '@wugui/core'
import { API_BASE } from '../config'

const transport = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) =>
  new Promise<{ status: number; json: () => Promise<unknown> }>((resolve, reject) => {
    uni.request({
      url,
      method: init.method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
      header: init.headers,
      data: init.body ?? undefined,
      success: res => resolve({ status: res.statusCode as number, json: async () => res.data }),
      fail: err => reject(new Error(err.errMsg || '网络请求失败')),
    })
  })

const client = new ApiClient({
  baseUrl: API_BASE,
  transport,
  getToken: () => {
    const raw = uni.getStorageSync('wugui:auth')
    if (!raw) return null
    try {
      return (JSON.parse(raw) as { token: string }).token ?? null
    } catch {
      return null
    }
  },
})

export { client as api, ApiClientError }

/** 从 ApiClientError 提取展示文案（对齐服务端 { statusCode, statusMessage }） */
export function errMsg(e: unknown): string {
  const err = e as { statusMessage?: string; message?: string }
  return err?.statusMessage || err?.message || ''
}
