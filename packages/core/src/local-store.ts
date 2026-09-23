// 离线优先本地存储抽象：微信小程序（WXStorage）与 App/Harmony（SQLite）共用同一接口
// 存储约定：每个 (householdId, collection) 一个分片，序列化为 JSON 数组；
// 家庭规模数据量（几百条）下 KV 分片完全够用，SQLite 实现后续在同接口下替换
// deletedAt 字段为软删 tombstone：本地删除先标记，同步时告知服务端

export interface LocalRecord {
  id: string
  updatedAt: string
  deletedAt?: string | null
}

/** 平台存储驱动：小程序用 uni.getStorageSync 封装，App 端用 SQLite KV 表封装 */
export interface KVDriver {
  get(key: string): string | null | undefined
  set(key: string, value: string): void
  remove(key: string): void
}

export interface PutOptions {
  /**
   * LWW 合并（pull 回写用）：existing.updatedAt >= record.updatedAt 时跳过。
   * 本地用户写不传 lww，强制覆盖（防时钟回拨丢自己的编辑）。
   */
  lww?: boolean
}

export interface LocalStore {
  list<T extends LocalRecord>(collection: string): T[]
  get<T extends LocalRecord>(collection: string, id: string): T | null
  put<T extends LocalRecord>(collection: string, record: T, opts?: PutOptions): void
  putMany<T extends LocalRecord>(collection: string, records: T[], opts?: PutOptions): void
  /** 硬删仅在本地未同步场景使用；已同步数据用软删（deletedAt） */
  remove(collection: string, id: string): void
  /** 整集合替换（pull 快照 / 清空重置用） */
  replaceAll<T extends LocalRecord>(collection: string, records: T[]): void
}

export function createKVLocalStore(driver: KVDriver, householdId: string): LocalStore {
  const prefix = `wugui:ls:${householdId}:`
  const read = <T extends LocalRecord>(collection: string): T[] => {
    const raw = driver.get(prefix + collection)
    if (!raw) return []
    try {
      return JSON.parse(raw) as T[]
    } catch {
      return []
    }
  }
  const write = <T extends LocalRecord>(collection: string, rows: T[]) =>
    driver.set(prefix + collection, JSON.stringify(rows))

  return {
    list: read,
    get<T extends LocalRecord>(collection: string, id: string): T | null {
      return (read<T>(collection).find(r => r.id === id) as T | undefined) ?? null
    },
    put(collection, record, opts) {
      const rows = read(collection)
      if (opts?.lww) {
        const existing = rows.find(r => r.id === record.id)
        if (existing && existing.updatedAt >= record.updatedAt) return // 本地版本更新或相同，跳过
      }
      write(collection, [...rows.filter(r => r.id !== record.id), record])
    },
    putMany(collection, records, opts) {
      const byId = new Map(read(collection).map(r => [r.id, r]))
      for (const record of records) {
        const existing = byId.get(record.id)
        if (opts?.lww && existing && existing.updatedAt >= record.updatedAt) continue
        byId.set(record.id, record)
      }
      write(collection, [...byId.values()])
    },
    remove(collection, id) {
      write(collection, read(collection).filter(r => r.id !== id))
    },
    replaceAll(collection, records) {
      write(collection, records)
    },
  }
}
