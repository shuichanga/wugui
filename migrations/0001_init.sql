-- 物归 初始 schema
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE household_members (
  household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','member')),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (household_id, user_id)
);
CREATE INDEX idx_household_members_user ON household_members(user_id);

CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  parent_id TEXT REFERENCES locations(id),
  level TEXT NOT NULL CHECK(level IN ('room','furniture','compartment')),
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_locations_household ON locations(household_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_items_household ON items(household_id);
CREATE INDEX idx_items_location ON items(location_id);
CREATE INDEX idx_items_name ON items(name COLLATE NOCASE);

CREATE TABLE item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);
CREATE INDEX idx_item_tags_tag ON item_tags(tag);

CREATE TABLE item_photos (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_item_photos_item ON item_photos(item_id);
