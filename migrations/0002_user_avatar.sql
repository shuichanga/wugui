-- 用户头像：存 R2 key（wugui/avatars/{userId}.jpg），空 = 使用首字母头像
ALTER TABLE users ADD COLUMN avatar_key TEXT;
