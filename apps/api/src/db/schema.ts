// 物归 - MySQL schema
// Phase 0: 保持与旧 D1 schema 字段对齐，Phase 1 再做扩展（username / phone / subscription 等）
import { mysqlTable, varchar, int, text, datetime, index } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 32 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 64 }),
  avatarKey: varchar('avatar_key', { length: 255 }),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
})

export const households = mysqlTable('households', {
  id: varchar('id', { length: 32 }).primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  inviteCode: varchar('invite_code', { length: 8 }).notNull().unique(),
  createdBy: varchar('created_by', { length: 32 }).notNull(),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
})

export const householdMembers = mysqlTable(
  'household_members',
  {
    householdId: varchar('household_id', { length: 32 }).notNull(),
    userId: varchar('user_id', { length: 32 }).notNull(),
    role: varchar('role', { length: 16 }).notNull().default('member'),
    joinedAt: datetime('joined_at').notNull(),
  },
  (t) => [index('idx_household_members_user').on(t.userId)],
)

export const locations = mysqlTable(
  'locations',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    householdId: varchar('household_id', { length: 32 }).notNull(),
    parentId: varchar('parent_id', { length: 32 }),
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
    id: varchar('id', { length: 32 }).primaryKey(),
    householdId: varchar('household_id', { length: 32 }).notNull(),
    locationId: varchar('location_id', { length: 32 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    quantity: int('quantity').notNull().default(1),
    notes: text('notes'),
    ownerId: varchar('owner_id', { length: 32 }).notNull(),
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
    itemId: varchar('item_id', { length: 32 }).notNull(),
    tag: varchar('tag', { length: 64 }).notNull(),
  },
  (t) => [index('idx_item_tags_tag').on(t.tag)],
)

export const recentViews = mysqlTable(
  'recent_views',
  {
    userId: varchar('user_id', { length: 32 }).notNull(),
    itemId: varchar('item_id', { length: 32 }).notNull(),
    viewedAt: datetime('viewed_at').notNull(),
  },
  (t) => [index('idx_recent_views_user_time').on(t.userId, t.viewedAt)],
)

export const itemPhotos = mysqlTable(
  'item_photos',
  {
    id: varchar('id', { length: 32 }).primaryKey(),
    itemId: varchar('item_id', { length: 32 }).notNull(),
    ossKey: varchar('oss_key', { length: 512 }).notNull(),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at').notNull(),
  },
  (t) => [index('idx_item_photos_item').on(t.itemId)],
)
