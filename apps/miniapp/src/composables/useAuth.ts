// 登录态：token / 用户 / 当前住所 + 我的住所列表，持久化在本地存储
// 住所列表用于首页「切换住所」下拉（对齐 Web 端 stores/auth.ts 的 households 契约）
import { computed, reactive } from 'vue'
import { api } from '../utils/api'

const KEY = 'wugui:auth'

export interface AuthUser {
  id: string
  username: string | null
  email: string | null
  displayName: string | null
}

/** 住所（服务端契约：id / name / role / inviteCode? / joinedAt） */
export interface Household {
  id: string
  name: string
  role: 'owner' | 'member'
  inviteCode?: string
  joinedAt?: string
}

interface AuthState {
  token: string
  user: AuthUser | null
  householdId: string
  households: Household[]
}

const EMPTY: AuthState = { token: '', user: null, householdId: '', households: [] }

function load(): AuthState {
  const raw = uni.getStorageSync(KEY)
  if (!raw) return { ...EMPTY }
  try {
    const p = JSON.parse(raw) as Partial<AuthState>
    return {
      token: p.token ?? '',
      user: p.user ?? null,
      householdId: p.householdId ?? '',
      households: Array.isArray(p.households) ? p.households : [],
    }
  } catch {
    return { ...EMPTY }
  }
}

const state = reactive<AuthState>(load())

function persist() {
  uni.setStorageSync(KEY, JSON.stringify(state))
}

/** 拉取「我的住所」列表（不覆盖 token，失败静默——离线时保留缓存） */
async function fetchHouseholds() {
  if (!state.token) return
  try {
    state.households = await api.get<Household[]>('/households')
  } catch {
    // 静默：下拉菜单保留上次缓存
  }
}

export function useAuth() {
  /** 当前住所（下拉里高亮勾选的那项） */
  const currentHousehold = computed(() => state.households.find(h => h.id === state.householdId) ?? null)

  return {
    state,
    currentHousehold,
    get isLogged() {
      return !!state.token
    },
    /** 保存登录结果（微信登录 / 账号密码登录通用） */
    save(raw: { token: string; user: AuthUser; householdId: string }) {
      state.token = raw.token
      state.user = raw.user
      state.householdId = raw.householdId || ''
      persist()
    },
    /** 切换当前住所：服务端重签 token（householdId 在 JWT 里，多端统一） */
    async switchHousehold(id: string) {
      const res = await api.post<{ householdId: string; token: string }>(`/auth/switch/${id}`)
      state.householdId = id
      state.token = res.token
      persist()
    },
    fetchHouseholds,
    logout() {
      state.token = ''
      state.user = null
      state.householdId = ''
      state.households = []
      uni.removeStorageSync(KEY)
      uni.reLaunch({ url: '/pages/login/login' })
    },
  }
}

/** 微信一键登录：uni.login 拿 code → /api/auth/wechat 换会话 */
export async function wechatLogin() {
  const { code } = await uni.login({ provider: 'weixin' })
  const res = await api.post<{ token: string; user: AuthUser; householdId: string; isNew: boolean }>(
    '/auth/wechat',
    { code },
  )
  useAuth().save(res)
  void fetchHouseholds()
  return res
}

/** 绑定已有 Web 账号：账号密码登录拿到会话后，把当前微信 openid 绑上去 */
export async function bindExistingAccount(account: string, password: string) {
  const { code } = await uni.login({ provider: 'weixin' })
  const login = await api.post<{ token: string; user: AuthUser; householdId: string }>(
    '/auth/login',
    { account, password },
  )
  useAuth().save(login)
  void fetchHouseholds()
  const bind = await api.post<{ ok: boolean }>('/auth/wechat/bind', { code })
  return { ...login, bind }
}
