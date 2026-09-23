// 物归 - 业务实体类型
// 这一层是"契约"：Web / 小程序 / 安卓 / 鸿蒙 都必须遵守
// Phase 0 保持与旧 schema 对齐，Phase 1-2 加 username / phone / subscription 字段

export type LocationLevel = 'room' | 'furniture' | 'compartment'
export type HouseholdRole = 'owner' | 'member'
export type AuthProvider = 'email' | 'wechat'

export interface User {
  id: string
  email: string
  displayName?: string | null
  avatarKey?: string | null
  username?: string | null
  provider?: AuthProvider | null
  openid?: string | null
  unionid?: string | null
  phone?: string | null
  phoneVerified?: boolean
  createdAt: string
  updatedAt: string
}

export interface Household {
  id: string
  name: string
  inviteCode: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface HouseholdMembership {
  householdId: string
  userId: string
  role: HouseholdRole
  joinedAt: string
}

export interface Location {
  id: string
  householdId: string
  parentId?: string | null
  level: LocationLevel
  name: string
  icon?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  householdId: string
  locationId: string
  name: string
  quantity: number
  notes?: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface ItemTag {
  itemId: string
  tag: string
}

export interface ItemPhoto {
  id: string
  itemId: string
  ossKey: string
  sortOrder: number
  createdAt: string
}

// ---- 请求 / 响应 DTO ----

export interface RegisterInput {
  email: string
  password: string
  username?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface WechatLoginInput {
  code: string
  /** 微信头像昵称填写能力拿到的昵称（可选） */
  nickname?: string
}

export interface SessionResponse {
  token: string
  user: User
  households: Household[]
}

export interface CreateHouseholdInput {
  name: string
}

export interface CreateLocationInput {
  name: string
  level: LocationLevel
  parentId?: string | null
  icon?: string | null
  sortOrder?: number
}

export interface CreateItemInput {
  locationId: string
  name: string
  quantity?: number
  notes?: string | null
  tags?: string[]
}

// ---- 云同步契约（M2 LWW）----

/** 同步变更实体：与服务端 sync_changes.entity 枚举一致（复数表名） */
export type SyncEntity = 'items' | 'locations' | 'item_photos'

export interface SyncChange {
  entity: SyncEntity
  entityId: string
  op: 'create' | 'update' | 'delete'
  /** items: { name, locationId, quantity, notes, tags, createdAt }；locations: { name, parentId, level, icon, sortOrder }；item_photos 仅服务端 REST 写路径记录 */
  data: Record<string, unknown> | null
  /** 客户端设备时钟（ISO），LWW 比较基准 */
  clientTimestamp: string
}

/** POST /api/sync/push 响应：逐条结果（目标状态已达成也记 accepted，客户端据此移除 Outbox 条目） */
export interface SyncPushResponse {
  results: Array<{ entity: SyncEntity; entityId: string; op: string; status: 'accepted' | 'stale' }>
  serverTime: string
}

/** GET /api/sync/pull 增量响应（since 缺省时返回 snapshot 快照） */
export interface SyncPullResponse {
  changes?: SyncChange[]
  snapshot?: {
    locations: Array<Record<string, unknown>>
    items: Array<Record<string, unknown>>
  }
  serverTime: string
}
