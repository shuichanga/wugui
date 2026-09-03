import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdBy: text('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const householdMembers = sqliteTable('household_members', {
  householdId: text('household_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
  joinedAt: text('joined_at').notNull(),
}, (t) => [
  primaryKey({ columns: [t.householdId, t.userId] }),
  index('idx_household_members_user').on(t.userId),
])

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  parentId: text('parent_id'),
  level: text('level', { enum: ['room', 'furniture', 'compartment'] }).notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('idx_locations_household').on(t.householdId),
  index('idx_locations_parent').on(t.parentId),
])

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  locationId: text('location_id').notNull(),
  name: text('name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  notes: text('notes'),
  ownerId: text('owner_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('idx_items_household').on(t.householdId),
  index('idx_items_location').on(t.locationId),
  index('idx_items_name').on(t.name),
])

export const itemTags = sqliteTable('item_tags', {
  itemId: text('item_id').notNull(),
  tag: text('tag').notNull(),
}, (t) => [
  primaryKey({ columns: [t.itemId, t.tag] }),
  index('idx_item_tags_tag').on(t.tag),
])

export const itemPhotos = sqliteTable('item_photos', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  r2Key: text('r2_key').notNull(),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').notNull(),
}, (t) => [
  index('idx_item_photos_item').on(t.itemId),
])
