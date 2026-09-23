// 会员/订阅状态：isPro（关广告，仅自己订阅）与 canCloudSync（住所级云同步开关）分离
// 持久化缓存：离线时仍显示会员态，refresh 联网后更新（复用 useTheme 持久化模式）
import { ref } from 'vue'
import { api } from '../utils/api'
import { useAuth } from './useAuth'

const KEY = 'wugui:membership'

export interface MembershipState {
  isPro: boolean
  planType: string
  expiresAt: string | null
  canCloudSync: boolean
  /** 解锁来源：self=自己订阅；member=家庭成员订阅（家庭共享） */
  cloudSyncSource: 'self' | 'member'
}

function load(): MembershipState {
  try {
    const raw = uni.getStorageSync(KEY)
    if (raw) return JSON.parse(raw) as MembershipState
  } catch { /* ignore */ }
  return { isPro: false, planType: 'free', expiresAt: null, canCloudSync: false, cloudSyncSource: 'self' }
}

const state = ref<MembershipState>(load())

function persist() {
  try { uni.setStorageSync(KEY, JSON.stringify(state.value)) } catch { /* ignore */ }
}

function reset() {
  state.value = { isPro: false, planType: 'free', expiresAt: null, canCloudSync: false, cloudSyncSource: 'self' }
  persist()
}

export function useMembership() {
  return {
    state,
    get isPro() { return state.value.isPro },
    get canCloudSync() { return state.value.canCloudSync },
    /** 拉取订阅状态（登录后 / onShow / 订阅变更后调用），未登录直接清空 */
    async refresh() {
      const auth = useAuth()
      if (!auth.isLogged) {
        reset()
        return
      }
      try {
        state.value = await api.get<MembershipState>('/subscription/status')
        persist()
      } catch {
        // 静默：保留缓存（离线时同步判定用缓存值）
      }
    },
    reset,
  }
}
