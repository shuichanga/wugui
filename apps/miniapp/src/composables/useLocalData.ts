// 本地数据仓库：物品 / 空间 / 最近查看，全部读写走本地（离线优先）
// M2：写操作同时追加进 Outbox 队列（订阅住所由 useSync 后台 push/pull），接口保持不变
// 已同步数据的删除走软删（deletedAt 墓碑），匿名（anon）数据不入队、不同步
//
// 无住所（首次登录、未新建/加入）时，读写落到 "anon" 命名空间：
//   用户可以先建房间/物品，后续在「我的」页新建/加入住所时，
//   这些数据会通过 migrateAnonToHousehold 自动归入新住所，不会成为孤立数据。
import { createKVLocalStore, createOutbox, newId, nowIso, type LocalRecord, type LocalStore, type Outbox } from '@wugui/core'
import { kvDriver } from '../utils/kv'
import { useAuth } from './useAuth'

export interface LocalItem extends LocalRecord {
  name: string
  quantity: number
  notes: string | null
  locationId: string
  tags: string[]
  /** 本地照片路径数组（未上传 OSS 的本地暂存） */
  photoPaths: string[]
  /** 云端照片引用（pull 回流 + 上传 confirm 后回填），展示优先级：photoPaths > photoRefs */
  photoRefs?: Array<{ photoId: string; ossKey: string; sortOrder?: number }>
  /** 首次录入时间（区别于 updatedAt，用于详情页显示"添加于"） */
  createdAt: string
}

export type LocationLevel = 'room' | 'furniture' | 'compartment'

export interface LocalLocation extends LocalRecord {
  name: string
  /** 上级空间 id；空为房间 */
  parentId: string | null
  /** 层级：room（房间）→ furniture（家具）→ compartment（格位） */
  level: LocationLevel
  /** 云端回流字段（小程序本地创建时为 null/0） */
  icon?: string | null
  sortOrder?: number
}

/** 空间树节点（附物品计数） */
export interface LocationTreeNode extends LocalLocation {
  itemCount: number
  children: LocationTreeNode[]
}

export interface LocalRecentView extends LocalRecord {
  itemId: string
  /** 查看时间戳（ISO） */
  viewedAt: string
}

export const ITEM = 'items'
export const LOCATION = 'locations'
export const RECENT = 'recent-views'
export const MAX_RECENT = 20
export const MAX_PHOTOS = 3

/** 无住所时的暂存命名空间 */
export const ANON_NAMESPACE = 'anon'

/** 取当前 store：有住所走 household namespace，无住所回退到 anon namespace */
function currentStore(): LocalStore {
  const auth = useAuth()
  const namespace = auth.state.householdId || ANON_NAMESPACE
  return createKVLocalStore(kvDriver, namespace)
}

/** 取当前住所的 Outbox；anon 命名空间返回 null（永不同步） */
export function currentOutbox(): Outbox | null {
  const auth = useAuth()
  const hid = auth.state.householdId
  if (!hid) return null
  return createOutbox(kvDriver, hid)
}

// 本地写操作后的同步钩子（由 useSync 注册 scheduleSync，避免循环 import）
let onLocalWrite: (() => void) | null = null
export function setOnLocalWrite(fn: () => void): void {
  onLocalWrite = fn
}
function notifyWrite(): void {
  try { onLocalWrite?.() } catch { /* ignore */ }
}

export function useStore(): {
  store: LocalStore
  items: () => LocalItem[]
  locations: () => LocalLocation[]
  recentViews: () => LocalRecentView[]
} {
  return {
    // store 必须用 getter 惰性解析：首页容器里的 tab 组件常驻不销毁，
    // 若在 setup 时一次性捕获 store，新建/切换住所后仍读旧命名空间，
    // 表现为"数据没归入新住所"。getter 让每次访问都解析当前住所。
    get store() { return currentStore() },
    // 列表读取过滤软删墓碑（同步用户与免费用户统一行为）
    items: () => currentStore().list<LocalItem>(ITEM).filter(r => !r.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    locations: () => currentStore().list<LocalLocation>(LOCATION).filter(r => !r.deletedAt).sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    recentViews: () => currentStore().list<LocalRecentView>(RECENT).sort((a, b) => b.viewedAt.localeCompare(a.viewedAt)),
  }
}

/**
 * 把 "anon" 暂存命名空间下的房间 / 物品 / 最近查看，迁移到目标住所命名空间。
 * 记录 id 保持不变，物品.locationId / 空间.parentId 内部引用天然生效。
 *
 * 用于：新建住所 / 加入住所 之后立即调用一次，避免"用户在无住所状态下
 * 提前录入的临时数据变成孤立数据"。目标住所已存在同类 id 时按 id 覆盖（幂等）。
 *
 * @returns 迁移的记录条数（rooms + items）
 */
export function migrateAnonToHousehold(targetHouseholdId: string): number {
  if (!targetHouseholdId) return 0
  const anonStore = createKVLocalStore(kvDriver, ANON_NAMESPACE)
  const targetStore = createKVLocalStore(kvDriver, targetHouseholdId)

  // 目标 store 已有同 id 时按 id 覆盖（迁移幂等，不会重复）
  let migrated = 0
  const mergeAnon = <T extends LocalRecord>(collection: string) => {
    const anonRows = anonStore.list<T>(collection)
    if (!anonRows.length) return
    const existing = targetStore.list<T>(collection)
    const existingMap = new Map(existing.map(r => [r.id, r]))
    for (const row of anonRows) existingMap.set(row.id, row)
    targetStore.replaceAll(collection, [...existingMap.values()])
    // 迁移完清理 anon 副本，避免下次新建住所又被合并一次
    anonStore.replaceAll(collection, [])
    migrated += anonRows.length
  }

  mergeAnon<LocalLocation>(LOCATION)
  mergeAnon<LocalItem>(ITEM)
  mergeAnon<LocalRecentView>(RECENT)
  return migrated
}

export function createItem(input: {
  name: string
  quantity: number
  notes: string | null
  locationId: string
  tags: string[]
  photoPaths: string[]
}): string {
  const { store } = useStore()
  const id = newId()
  const now = nowIso()
  const record: LocalItem = {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...input,
  }
  store.put<LocalItem>(ITEM, record)
  // M2：入 Outbox（sync push 上行）；anon 命名空间自动跳过
  currentOutbox()?.enqueue({
    entity: 'items',
    entityId: id,
    op: 'create',
    data: {
      name: record.name,
      locationId: record.locationId,
      quantity: record.quantity,
      notes: record.notes,
      tags: record.tags,
      createdAt: record.createdAt,
    },
    clientTimestamp: now,
  })
  notifyWrite()
  return id
}

export function updateItem(id: string, input: Partial<{
  name: string
  quantity: number
  notes: string | null
  locationId: string
  tags: string[]
  photoPaths: string[]
  photoRefs: Array<{ photoId: string; ossKey: string; sortOrder?: number }>
}>) {
  const { store } = useStore()
  const old = store.get<LocalItem>(ITEM, id)
  if (!old) return
  const now = nowIso()
  const merged = { ...old, ...input, updatedAt: now }
  store.put<LocalItem>(ITEM, merged)
  // 全量字段契约（服务端按 data 整体覆盖），photoPaths/photoRefs 是本地概念不入队
  currentOutbox()?.enqueue({
    entity: 'items',
    entityId: id,
    op: 'update',
    data: {
      name: merged.name,
      locationId: merged.locationId,
      quantity: merged.quantity,
      notes: merged.notes,
      tags: merged.tags,
      createdAt: merged.createdAt,
    },
    clientTimestamp: now,
  })
  notifyWrite()
}

export function deleteItem(id: string) {
  const { store } = useStore()
  const old = store.get<LocalItem>(ITEM, id)
  if (!old) return
  const now = nowIso()
  // M2：软删墓碑（已同步数据硬删会让其他设备丢失删除意图）
  store.put<LocalItem>(ITEM, { ...old, deletedAt: now, updatedAt: now })
  currentOutbox()?.enqueue({
    entity: 'items',
    entityId: id,
    op: 'delete',
    data: null,
    clientTimestamp: now,
  })
  // 同步清除最近查看（纯 UX 数据，物理清）
  const { recentViews } = useStore()
  for (const v of recentViews()) {
    if (v.itemId === id) store.remove<LocalRecentView>(RECENT, v.id)
  }
  notifyWrite()
}

export function getItem(id: string): LocalItem | null {
  const { store } = useStore()
  return store.get<LocalItem>(ITEM, id)
}

export function createLocation(name: string, parentId?: string | null): string {
  const { store } = useStore()
  const id = newId()
  const pid = parentId?.trim() || null
  // level 由父级推导：无父 → room；room 下 → furniture；furniture 下 → compartment
  let level: LocationLevel = 'room'
  if (pid) {
    const parent = store.get<LocalLocation>(LOCATION, pid)
    if (!parent) throw new Error('父级空间不存在')
    const pLevel = parent.level ?? 'room'
    level = pLevel === 'room' ? 'furniture' : 'compartment'
  }
  const now = nowIso()
  const record: LocalLocation = {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    name: name.slice(0, 30),
    parentId: pid,
    level,
  }
  store.put<LocalLocation>(LOCATION, record)
  currentOutbox()?.enqueue({
    entity: 'locations',
    entityId: id,
    op: 'create',
    data: { name: record.name, parentId: record.parentId, level: record.level, icon: null, sortOrder: 0 },
    clientTimestamp: now,
  })
  notifyWrite()
  return id
}

export function deleteLocation(id: string): { ok: boolean; reason?: string } {
  const { store, locations, items } = useStore()
  const target = store.get<LocalLocation>(LOCATION, id)
  if (!target) return { ok: false, reason: '空间不存在' }
  const hasChildren = locations().some(l => l.parentId === id)
  if (hasChildren) return { ok: false, reason: '请先删除子空间' }
  const hasItems = items().some(i => i.locationId === id)
  if (hasItems) return { ok: false, reason: '请先移出该空间下的物品' }
  const now = nowIso()
  // M2：软删墓碑
  store.put<LocalLocation>(LOCATION, { ...target, deletedAt: now, updatedAt: now })
  currentOutbox()?.enqueue({
    entity: 'locations',
    entityId: id,
    op: 'delete',
    data: null,
    clientTimestamp: now,
  })
  notifyWrite()
  return { ok: true }
}

/**
 * 把当前住所命名空间下全部存活 items / locations 入 Outbox（op=create，全量上行）。
 * 用于 anon→登录迁移、新建/加入住所后首次 push：服务端此前不知道这些本地数据。
 * 幂等：Outbox 合并策略保证重复 enqueue 不会产生重复条目。
 */
export function enqueueAllLocal(): void {
  const outbox = currentOutbox()
  if (!outbox) return
  const { store } = useStore()
  const now = nowIso()
  for (const l of store.list<LocalLocation>(LOCATION)) {
    if (l.deletedAt) continue
    outbox.enqueue({
      entity: 'locations',
      entityId: l.id,
      op: 'create',
      data: { name: l.name, parentId: l.parentId, level: l.level, icon: l.icon ?? null, sortOrder: l.sortOrder ?? 0 },
      clientTimestamp: l.updatedAt || now,
    })
  }
  for (const it of store.list<LocalItem>(ITEM)) {
    if (it.deletedAt) continue
    outbox.enqueue({
      entity: 'items',
      entityId: it.id,
      op: 'create',
      data: {
        name: it.name,
        locationId: it.locationId,
        quantity: it.quantity,
        notes: it.notes,
        tags: it.tags,
        createdAt: it.createdAt,
      },
      clientTimestamp: it.updatedAt || now,
    })
  }
}

export function getLocation(id: string): LocalLocation | null {
  const { store } = useStore()
  return store.get<LocalLocation>(LOCATION, id)
}

/** 构建空间树（含物品计数），仅返回 room 顶层 */
export function buildLocationTree(): LocationTreeNode[] {
  const { locations, items } = useStore()
  const all = locations()
  const itemCountByLoc = new Map<string, number>()
  for (const it of items()) {
    itemCountByLoc.set(it.locationId, (itemCountByLoc.get(it.locationId) ?? 0) + 1)
  }
  const nodeMap = new Map<string, LocationTreeNode>()
  for (const loc of all) {
    // 兼容历史数据：无 level/parentId 视为 room
    const level: LocationLevel = loc.level ?? 'room'
    const parentId = loc.parentId ?? null
    nodeMap.set(loc.id, {
      ...loc,
      level,
      parentId,
      itemCount: itemCountByLoc.get(loc.id) ?? 0,
      children: [],
    })
  }
  const roots: LocationTreeNode[] = []
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  // 自底向上聚合：itemCount = 直挂数 + 所有后代直挂数（对齐 API 端 location-tree.ts）
  const aggregate = (node: LocationTreeNode): number => {
    let total = node.itemCount
    for (const child of node.children) total += aggregate(child)
    node.itemCount = total
    return total
  }
  roots.forEach(aggregate)
  // 每层按名称 zh 排序，与 useStore().locations() 一致
  const sortTree = (nodes: LocationTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    nodes.forEach(n => sortTree(n.children))
  }
  sortTree(roots)
  return roots
}

/** 获取某空间的完整路径（含祖先），如 "主卧 / 衣柜 / 抽屉" */
export function getLocationPath(id: string): string {
  const { store } = useStore()
  const segs: string[] = []
  let cur = store.get<LocalLocation>(LOCATION, id)
  let guard = 0
  while (cur && guard < 10) {
    segs.unshift(cur.name)
    cur = cur.parentId ? store.get<LocalLocation>(LOCATION, cur.parentId) : null
    guard++
  }
  return segs.join(' / ')
}

/** 记录一次物品浏览（供首页"最近查看"） */
export function recordRecentView(itemId: string) {
  const { store, recentViews } = useStore()
  const now = nowIso()
  // 去重：同一 item 已存在则移除后重插（刷新到列表首）
  for (const v of recentViews()) {
    if (v.itemId === itemId) store.remove<LocalRecentView>(RECENT, v.id)
  }
  const id = newId()
  store.put<LocalRecentView>(RECENT, { id, itemId, viewedAt: now, updatedAt: now, deletedAt: null })

  // 上限：超出则移除最旧的
  const all = recentViews()
  if (all.length > MAX_RECENT) {
    for (const v of all.slice(MAX_RECENT)) store.remove<LocalRecentView>(RECENT, v.id)
  }
}
