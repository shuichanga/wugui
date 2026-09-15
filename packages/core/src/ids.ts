import { v4 as uuidv4 } from 'uuid'

// 统一 ID 生成：所有实体 id 都用 UUIDv4
// 离线场景下本地生成的 ID，同步到云端时保留，天然幂等
export function newId(): string {
  return uuidv4()
}

export function nowIso(): string {
  return new Date().toISOString()
}
