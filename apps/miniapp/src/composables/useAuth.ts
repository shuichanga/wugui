// 登录态：token / 用户 / 当前住所，持久化在本地存储
import { reactive } from 'vue'
import { api } from '../utils/api'

const KEY = 'wugui:auth'

export interface AuthUser {
  id: string
  username: string | null
  email: string | null
  displayName: string | null
}

interface AuthState {
  token: string
  user: AuthUser | null
  householdId: string
}

function load(): AuthState {
  const raw = uni.getStorageSync(KEY)
  if (!raw) return { token: '', user: null, householdId: '' }
  try {
    return JSON.parse(raw) as AuthState
  } catch {
    return { token: '', user: null, householdId: '' }
  }
}

const state = reactive<AuthState>(load())

function persist() {
  uni.setStorageSync(KEY, JSON.stringify(state))
}

export function useAuth() {
  return {
    state,
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
    logout() {
      state.token = ''
      state.user = null
      state.householdId = ''
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
  const bind = await api.post<{ ok: boolean }>('/auth/wechat/bind', { code })
  return { ...login, bind }
}
