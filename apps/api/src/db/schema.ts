// 物归 - MySQL schema（完整版）
// 改造要点：
//   1. 开放注册：注册即自动创建自己的住所（owner），邀请码保留为"邀请家人加入已有住所"的二级功能
//   2. username 登录：username 可选（微信登录用户可后补），登录支持 username 或 email
//   3. 多端预留：provider/openid/unionid（微信）、phone/phoneVerified（付费强身份）
//   4. 订阅与同步：subscriptions（商业化）、sync_changes（Phase 2 离线同步 LWW 队列）
import { boolean, datetime, index, int, mysqlTable, primaryKey, text, varchar } from 'drizzle-orm/mysql-core'

export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    // 登录名（用户名+密码）；微信用户可后补
    username: varchar('username', { length: 32 }).unique(),
    // 邮箱（可选，找回密码用）；微信用户可能没有
    email: varchar('email', { length: 255 }).unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    // 微信用户无密码
    passwordHash: varchar('password_hash', { length: 255 }),
    // 'email' | 'wechat'
    provider: varchar('provider', { length: 16 }).notNull().default('email'),
    openid: varchar('openid', { length: 64 }),
    unionid: varchar('unionid', { length: 64 }),
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phone_verified').notNull().default(false),
    displayName: varchar('display_name', { length: 64 }),
    avatarKey: varchar('avatar_key', { length: 255 }),
    createdAt: datetime('created_at').notNull(),
    updatedAt: datetime('updated_at').notNull(),
  },
  (t) => [
    index('idx_users_openid').on(t.openid),
    index('idx_users_unionid').on(t.unionid),
    index('idx_users_phone').on(t.phone),
  ],
)

export const households = mysqlTable('households', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  inviteCode: varchar('invite_code', { length: 8 }).notNull().unique(),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
})

export const householdMembers = mysqlTable(
  'household_members',
  {
    householdId: varchar('household_id', { length: 36 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    role: varchar('role', { length: 16 }).notNull().default('member'),
    joinedAt: datetime('joined_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.householdId, t.userId] }),
    index('idx_household_members_user').on(t.userId),
  ],
)

export const locations = mysqlTable(
  'locations',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    householdId: varchar('household_id', { length: 36 }).notNull(),
    parentId: varchar('parent_id', { length: 36 }),
    level: varchar('level', { length: 20 }).notNull(), // room | furniture | compartment
    name: varchar('name', { length: 64 }).notNull(),
    icon: varchar('icon', { length: 32 }),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at').notNull(),
    updatedAt: datetime('updated_at').notNull(),
  },
  (t) => [
    index('idx_locations_household').on(t.householdId),
    index('idx_locations_parent').on(t.parentId),
  ],
)

export const items = mysqlTable(
  'items',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    householdId: varchar('household_id', { length: 36 }).notNull(),
    locationId: varchar('location_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    quantity: int('quantity').notNull().default(1),
    notes: text('notes'),
    ownerId: varchar('owner_id', { length: 36 }).notNull(),
    createdAt: datetime('created_at').notNull(),
    updatedAt: datetime('updated_at').notNull(),
  },
  (t) => [
    index('idx_items_household').on(t.householdId),
    index('idx_items_location').on(t.locationId),
    index('idx_items_name').on(t.name),
  ],
)

export const itemTags = mysqlTable(
  'item_tags',
  {
    itemId: varchar('item_id', { length: 36 }).notNull(),
    tag: varchar('tag', { length: 64 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.itemId, t.tag] }),
    index('idx_item_tags_tag').on(t.tag),
  ],
)

// 最近查看：每用户 × 每物品一条，物品被查看时更新 viewed_at
export const recentViews = mysqlTable(
  'recent_views',
  {
    userId: varchar('user_id', { length: 36 }).notNull(),
    itemId: varchar('item_id', { length: 36 }).notNull(),
    viewedAt: datetime('viewed_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    index('idx_recent_views_user_time').on(t.userId, t.viewedAt),
  ],
)

export const itemPhotos = mysqlTable(
  'item_photos',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    itemId: varchar('item_id', { length: 36 }).notNull(),
    ossKey: varchar('oss_key', { length: 512 }).notNull(),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at').notNull(),
  },
  (t) => [index('idx_item_photos_item').on(t.itemId)],
)

// ---- 商业化：订阅（免费层默认 free；手动收款 paymentProvider='manual'，Phase 4 微信虚拟支付） ----
export const subscriptions = mysqlTable(
  'subscriptions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    // 'free' | 'cloud_sync_permanent' | ...
    planType: varchar('plan_type', { length: 32 }).notNull().default('free'),
    // 'active' | 'expired'
    status: varchar('status', { length: 16 }).notNull().default('active'),
    // 'manual' | 'wechat_virtual'
    paymentProvider: varchar('payment_provider', { length: 16 }),
    transactionId: varchar('transaction_id', { length: 128 }),
    // null = 永久有效
    expiresAt: datetime('expires_at'),
    createdAt: datetime('created_at').notNull(),
    updatedAt: datetime('updated_at').notNull(),
  },
  (t) => [index('idx_subscriptions_user').on(t.userId)],
)

// ---- Phase 2 离线同步队列（LWW：客户端时间戳为准，服务端顺序落库） ----
export const syncChanges = mysqlTable(
  'sync_changes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    // 'items' | 'locations' | 'households' | 'item_photos' | 'item_tags'
    entity: varchar('entity', { length: 32 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }).notNull(),
    // 'create' | 'update' | 'delete'
    op: varchar('op', { length: 16 }).notNull(),
    // 变更数据 JSON（delete 时为 null）
    dataJson: text('data_json'),
    clientTimestamp: datetime('client_timestamp').notNull(),
    syncedAt: datetime('synced_at').notNull(),
  },
  (t) => [index('idx_sync_user_time').on(t.userId, t.clientTimestamp)],
)
