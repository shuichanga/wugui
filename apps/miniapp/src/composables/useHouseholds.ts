// 住所管理（M1 本地模式单一数据源）：
// 「我的」页新建/加入/改名/重置邀请码、首页下拉切换、物品页页头住所名，
// 全部读写同一份模块级响应式状态，持久化在本地存储。
// M2 上云同步时，这里换成服务端 /api/households + /auth/switch，消费方不变。
//
// 切换住所会同步 auth.state.householdId（useStore 以它做数据命名空间），
// 物品/空间/最近查看随住所自动隔离。
import { computed, ref } from 'vue'
import { useAuth } from './useAuth'

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

/** 服务端有住所（Web 端建的）而本地为空时，用服务端列表初始化一次 */
function seedFromServer() {
  const auth = useAuth()
  if (!households.value.length && auth.state.households.length) {
    households.value = auth.state.households.map(h => ({
      id: h.id,
      name: h.name,
      role: h.role,
      inviteCode: h.inviteCode,
    }))
    if (!currentHouseholdId.value) {
      currentHouseholdId.value = auth.state.householdId || households.value[0]?.id || ''
    }
    persist()
  }
}

export function genInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

/** 把当前住所写回登录态（数据命名空间跟随切换） */
function syncAuth() {
  const auth = useAuth()
  if (auth.state.householdId !== currentHouseholdId.value) {
    auth.setHouseholdId(currentHouseholdId.value)
  }
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
    seedFromServer()
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

  /** 切换当前住所；id 不存在返回 false */
  function switchTo(id: string): boolean {
    if (!households.value.some(h => h.id === id)) return false
    currentHouseholdId.value = id
    persist()
    syncAuth()
    return true
  }

  /** 新建 / 加入 */
  function upsert(h: Household) {
    const i = households.value.findIndex(x => x.id === h.id)
    if (i >= 0) households.value[i] = h
    else households.value.push(h)
    if (!currentHouseholdId.value) currentHouseholdId.value = h.id
    persist()
    syncAuth()
  }

  function rename(id: string, name: string) {
    const h = households.value.find(x => x.id === id)
    if (!h) return
    h.name = name
    persist()
  }

  function resetInvite(id: string) {
    const h = households.value.find(x => x.id === id)
    if (!h) return
    h.inviteCode = genInviteCode()
    persist()
  }

  /** 退出 / 删除；若删的是当前住所则回退到第一个 */
  function remove(id: string) {
    households.value = households.value.filter(x => x.id !== id)
    if (currentHouseholdId.value === id) {
      currentHouseholdId.value = households.value[0]?.id ?? ''
    }
    persist()
    syncAuth()
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
