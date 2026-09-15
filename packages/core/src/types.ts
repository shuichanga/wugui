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
  username?: string
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

export interface SyncChange {
  entity: 'item' | 'location' | 'household' | 'tag'
  entityId: string
  op: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  clientTimestamp: string
}

export interface SyncPushResponse {
  accepted: number
  conflicts: Array<{
    entity: string
    entityId: string
    serverVersion: Record<string, unknown>
  }>
}
