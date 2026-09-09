-- 最近查看：记录用户查看物品的时间，用于首页"最近查看"入口（每用户×每物品一条）
CREATE TABLE recent_views (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  viewed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX idx_recent_views_user_time ON recent_views (user_id, viewed_at);
