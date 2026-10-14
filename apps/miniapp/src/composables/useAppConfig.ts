// 公开运营配置（GET /api/config，无需登录）：广告位 ID 等
// storage 缓存：冷启动先用缓存，联网后以服务端为准（复用 useMembership 持久化模式）
import { ref } from 'vue'
import { api } from '../utils/api'

const KEY = 'wugui:app-config'

export interface AppConfigState {
  /** 微信流量主广告位 id：空串 = 未配置（不渲染广告） */
  adUnitId: string
}

function load(): AppConfigState {
  try {
    const raw = uni.getStorageSync(KEY)
    if (raw) return JSON.parse(raw) as AppConfigState
  } catch { /* ignore */ }
  return { adUnitId: '' }
}

const state = ref<AppConfigState>(load())

function persist() {
  try { uni.setStorageSync(KEY, JSON.stringify(state.value)) } catch { /* ignore */ }
}

let fetching = false

export function useAppConfig() {
  return {
    state,
    get adUnitId() { return state.value.adUnitId },
    /** 拉取公开配置（AdBanner 挂载时触发；失败静默保留缓存） */
    async refresh() {
      if (fetching) return
      fetching = true
      try {
        const res = await api.get<AppConfigState>('/config')
        state.value = { adUnitId: res.adUnitId ?? '' }
        persist()
      } catch {
        // 静默：离线保留缓存
      } finally {
        fetching = false
      }
    },
  }
}
