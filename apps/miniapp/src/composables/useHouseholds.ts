// 住所管理：
// 「我的」页新建/加入/改名/重置邀请码、首页下拉切换、物品页页头住所名，
// 全部读写同一份模块级响应式状态，持久化在本地存储。
//
// 数据命名空间约定：currentHouseholdId 是数据分片的唯一事实源（syncAuth 镜像到
// auth.state.householdId 供 currentStore / engine 消费）。登出保留 current 与列表
// = 回到本地模式，数据原地可见；登录时服务端列表整体替换（防跨账号串显），
// 游客住所（伪 id）的名字与数据并入账号住所。
import { computed, ref } from 'vue'
import { api } from '../utils/api'
import { useAuth, type Household as AuthHousehold } from './useAuth'
import { ANON_NAMESPACE, migrateNamespaceToHousehold } from './useLocalData'
import { syncOnHouseholdSwitch } from './useSync'

export interface Household {
  id: string
  name: string
  role: 'owner' | 'member'
  inviteCode?: string
}

const STORAGE_KEY = 'wugui:households'
const STORAGE_CURRENT = 'wugui:current-household'

// 模块级状态：所有组件共享同一份
const households = ref<Household[]>([])
const currentHouseholdId = ref('')
let loaded = false

function persist() {
  uni.setStorageSync(STORAGE_KEY, JSON.stringify(households.value))
  // 一律写盘（包括空串）：删光住所时必须清掉残留的 current，
  // 否则下次启动会把"已删除住所的 id"复活成当前住所，
  // 无住所态录入的数据就会写进死命名空间而不是 anon，迁移时永远找不到
  uni.setStorageSync(STORAGE_CURRENT, currentHouseholdId.value)
}

/** 本地伪住所 id（游客住所 / 历史本地模式所建），登录后需并入账号住所 */
export function isPseudoId(id: string): boolean {
  return id === ANON_NAMESPACE || id.startsWith('local-') || id.startsWith('joined-')
}

/** 把当前住所写回登录态（数据命名空间跟随切换） */
function syncAuth() {
  const auth = useAuth()
  if (auth.state.householdId !== currentHouseholdId.value) {
    auth.setHouseholdId(currentHouseholdId.value)
  }
}

/**
 * 服务端住所列表对齐（登录收口 / 前台刷新调用）：
 * 整体替换（不合并，防跨账号串显）；当前住所仍有效则保留选择。
 * 替换前把本地伪住所（游客住所/历史本地所建）的数据并入账号住所（幂等），避免数据"消失"。
 */
function alignFromServer(list: AuthHousehold[], fallbackHid: string) {
  const serverIds = new Set(list.map(h => h.id))
  if (fallbackHid) {
    for (const p of households.value) {
      if (!serverIds.has(p.id)) migrateNamespaceToHousehold(p.id, fallbackHid)
    }
    // anon 暂存（未建游客住所直接录入的数据）一并清扫（空则幂等跳过）
    migrateNamespaceToHousehold(ANON_NAMESPACE, fallbackHid)
  }
  households.value = list.map(h => ({
    id: h.id,
    name: h.name,
    role: h.role,
    inviteCode: h.inviteCode,
  }))
  if (!households.value.some(h => h.id === currentHouseholdId.value)) {
    currentHouseholdId.value = fallbackHid || households.value[0]?.id || ''
  }
  persist()
  syncAuth()
}

/**
 * 登录收口：等服务端住所列表就绪 → 游客住所名带入（可选 PATCH）→ 列表整体替换。
 * 登录页 await 本函数后再进首页，消除"列表未就绪播种失败"的竞速。
 */
export async function settleAfterLogin(): Promise<void> {
  const auth = useAuth()
  await auth.fetchHouseholds()
  const serverList = auth.state.households
  const targetHid = auth.state.householdId
  const serverIds = new Set(serverList.map(h => h.id))

  // 游客住所名带入：本地改过名 + 账号住所还是默认名 + 是 owner → 同步到服务端
  const pseudo = households.value.find(h => !serverIds.has(h.id))
  const target = serverList.find(h => h.id === targetHid)
  if (pseudo && target && target.role === 'owner' && target.name === '我的住所' && pseudo.name && pseudo.name !== '我的住所') {
    try {
      await api.patch(`/households/${targetHid}`, { name: pseudo.name })
      target.name = pseudo.name
    } catch {
      // 静默：改名失败保持服务端默认名（联网后可在「我的」页手动改）
    }
  }

  alignFromServer(serverList, targetHid)
}

/** 前台静默刷新住所列表（App onShow）：多端新建/被邀请可见；失败保留缓存 */
export async function refreshHouseholds(): Promise<void> {
  const auth = useAuth()
  if (!auth.isLogged) return
  await auth.fetchHouseholds()
  if (auth.state.households.length) {
    alignFromServer(auth.state.households, auth.state.householdId)
  }
}

export function genInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function useHouseholds() {
  if (!loaded) {
    loaded = true
    try {
      households.value = JSON.parse(uni.getStorageSync(STORAGE_KEY) || '[]')
    } catch {
      households.value = []
    }
    currentHouseholdId.value = uni.getStorageSync(STORAGE_CURRENT) || households.value[0]?.id || ''
    // 校验：当前住所 id 必须仍存在于列表里（历史版本可能在删光住所后
    // 残留 STORAGE_CURRENT）。失效则回退为空 → 无住所态，数据落 anon 命名空间
    if (!households.value.some(h => h.id === currentHouseholdId.value)) {
      currentHouseholdId.value = households.value[0]?.id ?? ''
      persist()
    }
    syncAuth()
  }

  const currentHousehold = computed(
    () => households.value.find(h => h.id === currentHouseholdId.value) ?? null,
  )
  /** 无住所时返回空串（调用方自行决定兜底文案） */
  const householdName = computed(() => currentHousehold.value?.name ?? '')

  /** 切换当前住所；id 不存在返回 false（切后 engine 重建 + 补签 token + 立即同步） */
  function switchTo(id: string): boolean {
    if (!households.value.some(h => h.id === id)) return false
    currentHouseholdId.value = id
    persist()
    syncAuth()
    void syncOnHouseholdSwitch()
    return true
  }

  /** 新建 / 加入：总是切换到该住所（"建完停留旧住所→界面空数据"的修复） */
  function upsert(h: Household) {
    const i = households.value.findIndex(x => x.id === h.id)
    if (i >= 0) households.value[i] = h
    else households.value.push(h)
    currentHouseholdId.value = h.id
    persist()
    syncAuth()
  }

  function rename(id: string, name: string) {
    const h = households.value.find(x => x.id === id)
    if (!h) return
    h.name = name
    persist()
    // 服务端住所改名同步（游客/本地伪住所仅本地；离线失败保留本地值，联网后可在设置页重试）
    const auth = useAuth()
    if (auth.isLogged && !isPseudoId(id)) {
      void api.patch(`/households/${id}`, { name }).catch(() => {})
    }
  }

  function resetInvite(id: string) {
    const h = households.value.find(x => x.id === id)
    if (!h) return
    h.inviteCode = genInviteCode()
    persist()
  }

  /** 退出 / 删除；若删的是当前住所则回退到第一个（删后同样重建同步引擎） */
  function remove(id: string) {
    households.value = households.value.filter(x => x.id !== id)
    if (currentHouseholdId.value === id) {
      currentHouseholdId.value = households.value[0]?.id ?? ''
    }
    persist()
    syncAuth()
    void syncOnHouseholdSwitch()
  }

  /** 重新从本地存储读（其他视图可能改过） */
  function reload() {
    loaded = false
    useHouseholds()
  }

  return {
    households,
    currentHouseholdId,
    currentHousehold,
    householdName,
    switchTo,
    upsert,
    rename,
    resetInvite,
    remove,
    reload,
  }
}

// ---- 建所引导弹窗（美观自定义弹窗，由 home.vue 挂载的 HouseholdOnboard 渲染） ----
export const onboardVisible = ref(false)
let onboardResolve: ((ok: boolean) => void) | null = null
let onboardPending: Promise<boolean> | null = null
let autoOnboardDone = false

/** 打开建所弹窗（已有住所直接放行）；重复调用复用同一个 Promise */
export function openOnboard(): Promise<boolean> {
  if (households.value.length && currentHouseholdId.value) return Promise.resolve(true)
  if (onboardPending) return onboardPending
  onboardPending = new Promise<boolean>((resolve) => {
    onboardResolve = resolve
    onboardVisible.value = true
  })
  return onboardPending
}

/** 弹窗确认：创建游客住所（anon 本地命名空间），登录后名字与数据自动并入账号住所 */
export function confirmOnboard(rawName: string): void {
  const name = (rawName || '').trim().slice(0, 20) || '我的住所'
  useHouseholds().upsert({ id: ANON_NAMESPACE, name, role: 'owner' })
  onboardVisible.value = false
  onboardResolve?.(true)
  onboardPending = null
  onboardResolve = null
}

/** 弹窗取消/关闭 */
export function dismissOnboard(): void {
  onboardVisible.value = false
  onboardResolve?.(false)
  onboardPending = null
  onboardResolve = null
}

/**
 * 开屏自动建所引导：每次会话最多自动弹一次。
 * 首次启动由 OnboardGuide 关闭时触发（避免两弹窗叠加）；再次启动由 home onShow 触发。
 * 取消后不再自动弹，首页引导卡可随时再次唤起。
 */
export function maybeAutoOnboard(): void {
  useHouseholds() // 确保 storage 装载完成
  if (autoOnboardDone) return
  if (households.value.length && currentHouseholdId.value) {
    autoOnboardDone = true
    return
  }
  autoOnboardDone = true
  void openOnboard()
}

/** 建所门禁：无住所时打开引导弹窗，创建后放行（空间/物品/导入等所有入口统一走这里） */
export function ensureHousehold(): Promise<boolean> {
  return openOnboard()
}
