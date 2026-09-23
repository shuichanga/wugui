// 同步 Outbox：本地写操作的待推送队列（持久化于 KV）
// 合并策略（同 entity+entityId）：
//   - update 叠加到已有 create/update 上（保留最早 op、最新 data 与 clientTimestamp）
//   - delete 清掉该 id 所有条目后压入一条 delete（最终意图是删）
//   - 已有 delete 后再来的 create/update 被忽略（无撤销语义）
import { newId } from './ids'
import type { KVDriver } from './local-store'
import type { SyncChange, SyncEntity } from './types'

export interface OutboxEntry {
  /** 条目 id（仅用于移除定位） */
  id: string
  entity: Exclude<SyncEntity, 'item_photos'>
  entityId: string
  op: 'create' | 'update' | 'delete'
  data: Record<string, unknown> | null
  clientTimestamp: string
}

export interface Outbox {
  list(): OutboxEntry[]
  size(): number
  enqueue(entry: Omit<OutboxEntry, 'id'>): void
  /** flush 后按条目 id 移除（accepted 与 stale 都移除：stale 由 pull 回填服务端版本） */
  removeMany(entryIds: string[]): void
  clear(): void
}

export function outboxKey(householdId: string): string {
  return `wugui:outbox:${householdId}`
}

export function createOutbox(driver: KVDriver, householdId: string): Outbox {
  const key = outboxKey(householdId)
  const read = (): OutboxEntry[] => {
    const raw = driver.get(key)
    if (!raw) return []
    try {
      return JSON.parse(raw) as OutboxEntry[]
    } catch {
      return []
    }
  }
  const write = (entries: OutboxEntry[]) => driver.set(key, JSON.stringify(entries))

  return {
    list: read,
    size: () => read().length,
    enqueue(entry) {
      const entries = read()
      const existing = entries.filter(e => e.entity === entry.entity && e.entityId === entry.entityId)

      if (existing.length) {
        // 最终意图为删除：清掉该 id 全部条目，压入一条 delete
        if (entry.op === 'delete') {
          write([
            ...entries.filter(e => !(e.entity === entry.entity && e.entityId === entry.entityId)),
            {
              id: newId(),
              entity: entry.entity,
              entityId: entry.entityId,
              op: 'delete',
              data: null,
              clientTimestamp: entry.clientTimestamp,
            },
          ])
          return
        }
        // 已有 delete：忽略后续 create/update（无撤销语义）
        if (existing.some(e => e.op === 'delete')) return
        // update 叠加：保留最早 op（create 优先），data 与 clientTimestamp 取最新
        const keep = existing[0]
        write([
          ...entries.filter(e => e.id !== keep.id),
          {
            ...keep,
            data: entry.data ?? keep.data,
            clientTimestamp: entry.clientTimestamp,
          },
        ])
        return
      }

      write([{ ...entry, id: newId() }, ...entries])
    },
    removeMany(entryIds) {
      if (!entryIds.length) return
      const drop = new Set(entryIds)
      write(read().filter(e => !drop.has(e.id)))
    },
    clear: () => driver.remove(key),
  }
}

/** Outbox 条目 → SyncChange（push 请求体） */
export function toSyncChange(entry: OutboxEntry): SyncChange {
  return {
    entity: entry.entity,
    entityId: entry.entityId,
    op: entry.op,
    data: entry.data,
    clientTimestamp: entry.clientTimestamp,
  }
}
