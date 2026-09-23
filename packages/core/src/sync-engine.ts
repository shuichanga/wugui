// 云同步引擎：push（Outbox 分批上行）+ pull（增量游标 / 首次快照）
// 约束：syncNow 互斥（进行中调用直接忽略）；push 全部成功才 pull（快照 replaceAll 前提是 Outbox 已清空）
import type { ApiClient } from './api-client'
import { toSyncChange, type Outbox, type OutboxEntry } from './outbox'
import type { KVDriver, LocalRecord, LocalStore } from './local-store'
import type { SyncEntity } from './types'

const PUSH_BATCH = 50
const PULL_PAGE = 500

/** GET /sync/pull 增量分页响应 */
interface PullPage {
  changes?: Array<{
    entity: SyncEntity
    entityId: string
    op: string
    data: Record<string, unknown> | null
    clientTimestamp: string
  }>
  serverTime: string
}

export type SyncStatus = 'idle' | 'syncing' | 'error'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  /** error=true 时携带展示文案（如"开通订阅后即可同步"） */
  message?: string
}

export interface SyncEngineDeps {
  store: LocalStore
  outbox: Outbox
  api: ApiClient
  /** 游标等引擎自身状态存这里（与数据分片同 KV） */
  driver: KVDriver
  getHouseholdId: () => string
  /** 快照行 → LocalRecord（宿主负责映射出 LocalItem/LocalLocation 结构） */
  mapSnapshot: (kind: 'items' | 'locations', raw: Record<string, unknown>) => LocalRecord
  /** 增量变更 → LocalRecord（updatedAt = clientTimestamp；返回 null 跳过该条） */
  mapChange: (
    entity: 'items' | 'locations',
    entityId: string,
    clientTimestamp: string,
    data: Record<string, unknown> | null,
  ) => LocalRecord | null
  /** item_photos 变更回调（照片引用由宿主维护，M2.5） */
  onPhotoChange?: (photoId: string, op: 'create' | 'update' | 'delete', data: Record<string, unknown> | null) => void
  onState?: (state: SyncState) => void
}

export interface SyncEngine {
  syncNow(): Promise<void>
  isSyncing(): boolean
}

export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  let syncing = false

  const setState = (state: SyncState) => deps.onState?.(state)

  const syncNow = async (): Promise<void> => {
    if (syncing) return
    syncing = true
    setState({ status: 'syncing', lastSyncAt: readLastSync() })

    try {
      await flushOutbox()
      await pullChanges()
      const now = new Date().toISOString()
      writeLastSync(now)
      setState({ status: 'idle', lastSyncAt: now })
    } catch (e) {
      const message = e instanceof Error ? e.message : '同步失败'
      setState({ status: 'error', lastSyncAt: readLastSync(), message })
      throw e
    } finally {
      syncing = false
    }
  }

  /** push：locations 先于 items，50 条/批；accepted 与 stale 都移除（stale 由 pull 回填服务端版本） */
  async function flushOutbox() {
    const entries = deps.outbox.list()
    if (!entries.length) return

    const ordered = orderEntries(entries)
    for (let i = 0; i < ordered.length; i += PUSH_BATCH) {
      const batch = ordered.slice(i, i + PUSH_BATCH)
      const resp = await deps.api.post<{ results: Array<{ entity: SyncEntity; entityId: string; op: string; status: string }>; serverTime: string }>(
        '/sync/push',
        { changes: batch.map(toSyncChange) },
      )
      const doneIds = new Set<string>()
      for (const r of resp.results) {
        const entry = batch.find(e => e.entity === r.entity && e.entityId === r.entityId)
        if (!entry) continue
        // stale：LWW 输了或目标已达成但被拒 —— 移除条目，本地记录交给 pull 覆盖/回填
        doneIds.add(entry.id)
        if (r.status === 'stale' && entry.op !== 'delete') {
          deps.store.remove(entry.entity, entry.entityId)
        } else if (r.status === 'stale' && entry.op === 'delete') {
          // 删除被拒（如空间仍有挂载）：本地墓碑保留无意义，移除等 pull 回填服务端状态
          deps.store.remove(entry.entity, entry.entityId)
        }
      }
      deps.outbox.removeMany([...doneIds])
    }
  }

  /** pull：无游标 → 快照 replaceAll（Outbox 已清空）；有游标 → 增量分页 LWW 合并 */
  async function pullChanges() {
    const hid = deps.getHouseholdId()
    const cursorKey = `wugui:sync:${hid}:cursor`
    let cursor = deps.driver.get(cursorKey) || null

    if (!cursor) {
      const snap = await deps.api.get<{
        snapshot: { locations: Array<Record<string, unknown>>; items: Array<Record<string, unknown>> }
        serverTime: string
      }>('/sync/pull')
      const locations = snap.snapshot.locations
        .map(raw => deps.mapSnapshot('locations', raw))
        .filter((r): r is LocalRecord => r !== null)
      const items = snap.snapshot.items
        .map(raw => deps.mapSnapshot('items', raw))
        .filter((r): r is LocalRecord => r !== null)
      deps.store.replaceAll('locations', locations)
      deps.store.replaceAll('items', items)
      deps.driver.set(cursorKey, snap.serverTime)
      return
    }

    // 增量分页：服务端单页上限 500，拉满继续
    let since: string = cursor
    for (;;) {
      const resp: PullPage = await deps.api.get<PullPage>(`/sync/pull?since=${encodeURIComponent(since)}`)

      for (const change of resp.changes ?? []) {
        if (change.entity === 'item_photos') {
          deps.onPhotoChange?.(change.entityId, change.op as 'create' | 'update' | 'delete', change.data)
          continue
        }
        if (change.entity !== 'items' && change.entity !== 'locations') continue

        if (change.op === 'delete') {
          deps.store.remove(change.entity, change.entityId)
          continue
        }
        const record = deps.mapChange(change.entity, change.entityId, change.clientTimestamp, change.data)
        if (record) deps.store.put(change.entity, record, { lww: true })
      }

      since = resp.serverTime
      deps.driver.set(cursorKey, resp.serverTime)
      if ((resp.changes?.length ?? 0) < PULL_PAGE) break
    }
  }

  function readLastSync(): string | null {
    return deps.driver.get(`wugui:sync:${deps.getHouseholdId()}:last`) || null
  }
  function writeLastSync(iso: string) {
    deps.driver.set(`wugui:sync:${deps.getHouseholdId()}:last`, iso)
  }

  return { syncNow, isSyncing: () => syncing }
}

/** flush 顺序：locations 先于 items（外键依赖：item.locationId 指向 location） */
function orderEntries(entries: OutboxEntry[]): OutboxEntry[] {
  const rank = (e: OutboxEntry) => (e.entity === 'locations' ? 0 : 1)
  return [...entries].sort((a, b) => rank(a) - rank(b))
}
