// 本地数据仓库：物品 / 空间，全部读写走本地（离线优先）
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
}

export interface LocalLocation extends LocalRecord {
  name: string
}

export const ITEM = 'items'
export const LOCATION = 'locations'

export function useStore(): { store: LocalStore; items: () => LocalItem[]; locations: () => LocalLocation[] } {
  const auth = useAuth()
  const store = createKVLocalStore(kvDriver, auth.state.householdId || 'anon')
  return {
    store,
    items: () => store.list<LocalItem>(ITEM).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    locations: () => store.list<LocalLocation>(LOCATION).sort((a, b) => a.name.localeCompare(b.name, 'zh')),
  }
}

export function createItem(input: { name: string; quantity: number; notes: string | null; locationId: string; tags: string[] }): string {
  const { store } = useStore()
  const id = newId()
  store.put<LocalItem>(ITEM, { id, updatedAt: nowIso(), deletedAt: null, ...input })
  return id
}

export function updateItem(id: string, input: { name: string; quantity: number; notes: string | null; locationId: string; tags: string[] }) {
  const { store } = useStore()
  const old = store.get<LocalItem>(ITEM, id)
  if (!old) return
  store.put<LocalItem>(ITEM, { ...old, ...input, updatedAt: nowIso() })
}

export function deleteItem(id: string) {
  const { store } = useStore()
  store.remove(ITEM, id)
}

export function getItem(id: string): LocalItem | null {
  const { store } = useStore()
  return store.get<LocalItem>(ITEM, id)
}

export function createLocation(name: string): string {
  const { store } = useStore()
  const id = newId()
  store.put<LocalLocation>(LOCATION, { id, updatedAt: nowIso(), deletedAt: null, name: name.slice(0, 30) })
  return id
}

export function deleteLocation(id: string) {
  const { store } = useStore()
  store.remove(LOCATION, id)
}
