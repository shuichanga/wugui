// 本地数据仓库：物品 / 空间 / 最近查看，全部读写走本地（离线优先）
// M2 接入同步时，写操作会同时追加进 Outbox 队列，接口保持不变
import { createKVLocalStore, newId, nowIso, type LocalRecord, type LocalStore } from '@wugui/core'
import { kvDriver } from '../utils/kv'
import { useAuth } from './useAuth'

export interface LocalItem extends LocalRecord {
  name: string
  quantity: number
  notes: string | null
  locationId: string
  tags: string[]
  /** 本地照片路径数组（M1 免费用户仅本地保存，不走 OSS） */
  photoPaths: string[]
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

export function useStore(): {
  store: LocalStore
  items: () => LocalItem[]
  locations: () => LocalLocation[]
  recentViews: () => LocalRecentView[]
} {
  const auth = useAuth()
  const store = createKVLocalStore(kvDriver, auth.state.householdId || 'anon')
  return {
    store,
    items: () => store.list<LocalItem>(ITEM).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    locations: () => store.list<LocalLocation>(LOCATION).sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    recentViews: () => store.list<LocalRecentView>(RECENT).sort((a, b) => b.viewedAt.localeCompare(a.viewedAt)),
  }
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
  store.put<LocalItem>(ITEM, {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...input,
  })
  return id
}

export function updateItem(id: string, input: Partial<{
  name: string
  quantity: number
  notes: string | null
  locationId: string
  tags: string[]
  photoPaths: string[]
}>) {
  const { store } = useStore()
  const old = store.get<LocalItem>(ITEM, id)
  if (!old) return
  store.put<LocalItem>(ITEM, { ...old, ...input, updatedAt: nowIso() })
}

export function deleteItem(id: string) {
  const { store } = useStore()
  store.remove(ITEM, id)
  // 同步清除最近查看
  const { recentViews } = useStore()
  for (const v of recentViews()) {
    if (v.itemId === id) store.remove<LocalRecentView>(RECENT, v.id)
  }
}

export function getItem(id: string): LocalItem | null {
  const { store } = useStore()
  return store.get<LocalItem>(ITEM, id)
}

export function createLocation(name: string, parentId?: string | null): string {
  const { store, locations } = useStore()
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
  store.put<LocalLocation>(LOCATION, {
    id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deletedAt: null,
    name: name.slice(0, 30),
    parentId: pid,
    level,
  })
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
  store.remove(LOCATION, id)
  return { ok: true }
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
