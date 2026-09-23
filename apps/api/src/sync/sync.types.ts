// 同步契约 DTO（镜像 packages/core/src/types.ts 的 Sync* 类型，服务端自包含）
// 修改任一侧时必须同步另一侧，字段语义见 core 侧注释
export type SyncEntity = 'items' | 'locations' | 'item_photos'

export interface SyncChange {
  entity: SyncEntity
  entityId: string
  op: 'create' | 'update' | 'delete'
  data: Record<string, unknown> | null
  clientTimestamp: string
}

export interface SyncPushResponse {
  results: Array<{ entity: SyncEntity; entityId: string; op: string; status: 'accepted' | 'stale' }>
  serverTime: string
}

export interface SyncPullResponse {
  changes?: SyncChange[]
  snapshot?: {
    locations: Array<Record<string, unknown>>
    items: Array<Record<string, unknown>>
  }
  serverTime: string
}
