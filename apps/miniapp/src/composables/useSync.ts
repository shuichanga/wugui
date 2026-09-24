// 云同步宿主：把 @wugui/core 的 SyncEngine 接到小程序（uni storage / api 单例 / 会员判定）
// 触发时机：App onShow、网络恢复、写操作后防抖 3s、设置页手动
// 执行条件：已登录 && 有住所 && 住所云同步已解锁（canCloudSync，家庭共享也算）
import { createOutbox, createKVLocalStore, createSyncEngine, ApiClientError, type Outbox, type SyncEngine, type SyncState } from '@wugui/core'
import { ref } from 'vue'
import { api } from '../utils/api'
import { kvDriver } from '../utils/kv'
import { uploadPendingPhotos } from '../utils/photo-uploader'
import { useAuth } from './useAuth'
import { useMembership } from './useMembership'
import {
  ITEM, LOCATION, currentOutbox, enqueueAllLocal, migrateAnonToHousehold, setOnLocalWrite,
  type LocalItem, type LocalLocation,
} from './useLocalData'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'blocked'

interface EngineBundle {
  hid: string
  engine: SyncEngine
}

let bundle: EngineBundle | null = null

/** 模块级响应式同步状态（设置页/首页角标可展示） */
export const syncState = ref<SyncState & { status: SyncStatus }>({ status: 'idle', lastSyncAt: null })

/** 写后防抖定时器 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function setEngineState(next: SyncState) {
  syncState.value = { ...next, status: next.status as SyncStatus }
}

/** 按当前住所取（并缓存）engine；住所变化时重建 */
function getEngine(): SyncEngine | null {
  const auth = useAuth()
  const hid = auth.state.householdId
  if (!auth.isLogged || !hid) return null
  if (bundle && bundle.hid === hid) return bundle.engine

  const store = createKVLocalStore(kvDriver, hid)
  const outbox: Outbox = createOutbox(kvDriver, hid)
  const engine = createSyncEngine({
    store,
    outbox,
    api,
    driver: kvDriver,
    getHouseholdId: () => hid,
    mapSnapshot: (kind, raw) => mapSnapshotRecord(store, kind, raw),
    mapChange: (entity, entityId, clientTimestamp, data) =>
      mapChangeRecord(store, entity, entityId, clientTimestamp, data),
    onPhotoChange: (photoId, op, data) => applyPhotoChange(store, photoId, op, data),
    onState: setEngineState,
  })
  bundle = { hid, engine }
  return engine
}

/** 立即同步（互斥由 engine 保证）；返回是否真正执行了同步 */
export async function syncNow(): Promise<boolean> {
  const auth = useAuth()
  const membership = useMembership()
  if (!auth.isLogged || !auth.state.householdId) return false
  if (!membership.canCloudSync) {
    syncState.value = { status: 'blocked', lastSyncAt: syncState.value.lastSyncAt }
    return false
  }
  const engine = getEngine()
  if (!engine || engine.isSyncing()) return false
  try {
    await engine.syncNow()
    // push 成功后 item 已在服务端：补传本地暂存照片（异步，不阻塞状态复位）
    void uploadPendingPhotos().then(({ uploaded }) => {
      if (uploaded > 0) uni.showToast({ title: `已同步 ${uploaded} 张照片`, icon: 'none' })
    })
  } catch (e) {
    // 订阅被取消/过期：刷新会员态并提示（本地数据不丢，outbox 继续积累）
    if (e instanceof ApiClientError && e.code === 'SUBSCRIPTION_REQUIRED') {
      await membership.refresh()
      uni.showToast({ title: '开通订阅后即可云同步', icon: 'none' })
    }
    // 其他错误已在 onState 记录，静默重试交给下次触发
  }
  return true
}

/** 写操作后调用：3s 防抖合并连续编辑，避免高频请求 */
export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void syncNow()
  }, 3000)
}

/** App onShow / 网络恢复时调用：刷新会员态后尝试同步 */
export async function syncOnForeground(): Promise<void> {
  const auth = useAuth()
  if (!auth.isLogged) return
  await useMembership().refresh()
  await syncNow()
}

/** 登录成功 / 新建或加入住所后调用：anon 试用数据并入账号 + 全量上行 + 立即同步 */
export async function syncAfterHouseholdChange(): Promise<void> {
  const auth = useAuth()
  // 登录后当前住所已有服务端 id：把未登录期间本地试用的数据（anon 命名空间）并入，数据跟着账号走
  if (auth.isLogged && auth.state.householdId) {
    const migrated = migrateAnonToHousehold(auth.state.householdId)
    if (migrated > 0) {
      uni.showToast({ title: `已并入 ${migrated} 条本地数据`, icon: 'none' })
    }
  }
  enqueueAllLocal()
  bundle = null // 强制重建 engine（hid 可能已变）
  await useMembership().refresh()
  await syncNow()
}

/** 切换住所后调用：重建 engine（新 hid 的 store/outbox/游标），立即同步 */
export async function syncOnHouseholdSwitch(): Promise<void> {
  bundle = null
  await useMembership().refresh()
  await syncNow()
}

/** 登出时调用：引擎与状态复位（本地数据与 outbox 保留） */
export function resetSync(): void {
  bundle = null
  syncState.value = { status: 'idle', lastSyncAt: null }
}

let initialized = false
/** 前台定时 pull（实时同步阶段一）：App onShow 启动 / onHide 停止 */
let pollTimer: ReturnType<typeof setInterval> | null = null
const POLL_INTERVAL = 30_000

/** App onLaunch 调用一次：注册写后钩子 + 网络恢复监听 */
export function initSync(): void {
  if (initialized) return
  initialized = true
  // useLocalData 写操作尾部触发（useLocalData 反向注册，避免循环 import）
  setOnLocalWrite(scheduleSync)
  // 断网恢复后立即同步（Outbox 里离线积累的变更上行 + 拉取离线期间的云端变更）
  uni.onNetworkStatusChange(res => {
    if (res.isConnected) void syncNow()
  })
}

/** App onShow：启动前台定时 pull（他端变更最迟 30s 可见） */
export function startForegroundPolling(): void {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    void syncNow()
  }, POLL_INTERVAL)
}

/** App onHide：停掉定时 pull（后台不耗流量） */
export function stopForegroundPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ---- 快照 / 增量记录映射（core 通用引擎 ↔ 小程序 LocalItem/LocalLocation） ----

function mapSnapshotRecord(
  store: ReturnType<typeof createKVLocalStore>,
  kind: 'items' | 'locations',
  raw: Record<string, unknown>,
): LocalItem | LocalLocation {
  if (kind === 'items') {
    const id = String(raw.id)
    const existing = store.get<LocalItem>(ITEM, id)
    const photos = Array.isArray(raw.photos) ? raw.photos : []
    return {
      id,
      updatedAt: String(raw.updatedAt ?? ''),
      deletedAt: null,
      name: String(raw.name ?? ''),
      quantity: Math.max(1, Math.floor(Number(raw.quantity) || 1)),
      notes: raw.notes == null ? null : String(raw.notes),
      locationId: String(raw.locationId ?? ''),
      tags: Array.isArray(raw.tags) ? raw.tags.map(t => String(t)) : [],
      // 保留本地未上传的照片路径；photoRefs 以云端为准（本地上传 confirm 后也会回填）
      photoPaths: existing?.photoPaths ?? [],
      photoRefs: photos.map(p => ({
        photoId: String(p.photoId ?? ''),
        ossKey: String(p.ossKey ?? ''),
        sortOrder: Number(p.sortOrder ?? 0),
      })),
      createdAt: String(raw.createdAt ?? raw.updatedAt ?? ''),
    }
  }
  return {
    id: String(raw.id),
    updatedAt: String(raw.updatedAt ?? ''),
    deletedAt: null,
    name: String(raw.name ?? ''),
    parentId: raw.parentId == null ? null : String(raw.parentId),
    level: (raw.level ?? 'room') as LocalLocation['level'],
    icon: raw.icon == null ? null : String(raw.icon),
    sortOrder: Number(raw.sortOrder ?? 0),
  }
}

function mapChangeRecord(
  store: ReturnType<typeof createKVLocalStore>,
  entity: 'items' | 'locations',
  entityId: string,
  clientTimestamp: string,
  data: Record<string, unknown> | null,
): LocalItem | LocalLocation | null {
  if (!data) return null
  if (entity === 'items') {
    const existing = store.get<LocalItem>(ITEM, entityId)
    return {
      // 保留本地字段（photoPaths/photoRefs/createdAt），云端字段覆盖业务字段
      ...(existing ?? { photoPaths: [], createdAt: clientTimestamp }),
      id: entityId,
      updatedAt: clientTimestamp,
      deletedAt: null,
      name: String(data.name ?? ''),
      quantity: Math.max(1, Math.floor(Number(data.quantity) || 1)),
      notes: data.notes == null ? null : String(data.notes),
      locationId: String(data.locationId ?? existing?.locationId ?? ''),
      tags: Array.isArray(data.tags) ? data.tags.map(t => String(t)) : existing?.tags ?? [],
    }
  }
  const existingLoc = store.get<LocalLocation>(LOCATION, entityId)
  return {
    ...(existingLoc ?? {}),
    id: entityId,
    updatedAt: clientTimestamp,
    deletedAt: null,
    name: String(data.name ?? ''),
    parentId: data.parentId == null ? null : String(data.parentId),
    level: (data.level ?? existingLoc?.level ?? 'room') as LocalLocation['level'],
    icon: data.icon == null ? null : String(data.icon),
    sortOrder: Number(data.sortOrder ?? existingLoc?.sortOrder ?? 0),
  }
}

/** 云端照片变更回流：维护本地 item.photoRefs（M2.5 展示用） */
function applyPhotoChange(
  store: ReturnType<typeof createKVLocalStore>,
  photoId: string,
  op: 'create' | 'update' | 'delete',
  data: Record<string, unknown> | null,
): void {
  const itemId = data?.itemId ? String(data.itemId) : null
  if (!itemId) return
  const item = store.get<LocalItem>(ITEM, itemId)
  if (!item) return

  const refs = [...(item.photoRefs ?? [])]
  const idx = refs.findIndex(r => r.photoId === photoId)
  if (op === 'delete') {
    if (idx >= 0) refs.splice(idx, 1)
  } else if (idx >= 0) {
    refs[idx] = { ...refs[idx], ossKey: String(data?.ossKey ?? refs[idx].ossKey) }
  } else {
    refs.push({
      photoId,
      ossKey: String(data?.ossKey ?? ''),
      sortOrder: Number(data?.sortOrder ?? refs.length),
    })
  }
  store.put<LocalItem>(ITEM, { ...item, photoRefs: refs, updatedAt: item.updatedAt }, { lww: true })
}
