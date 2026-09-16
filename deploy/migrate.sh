#!/usr/bin/env bash
# 物归 MySQL 迁移脚本（服务器用）
# 用途：把 drizzle-kit 生成的 migration SQL 安全地灌进 MySQL 容器
#   - 自动处理 drizzle 的 --> statement-breakpoint 标记（mysql 客户端不认识）
#   - --force 跳过"表已存在"类错误，保证可重复执行
#
# 用法（在 /opt/wugui 目录下）：
#   export MYSQL_PWD='你的MySQL密码'
#   bash deploy/migrate.sh apps/api/drizzle/0000_cold_lethal_legion.sql
#   bash deploy/migrate.sh apps/api/drizzle/0001_xxx.sql
set -euo pipefail

FILE="${1:?用法: migrate.sh <migration.sql>}"
DB="${2:-wugui}"
: "${MYSQL_PWD:?请先 export MYSQL_PWD='你的MySQL密码'}"

# 处理 breakpoint 标记：
#   1) 行尾形态  `...;--> statement-breakpoint`  → 换回分号
#   2) 独立行形态 `--> statement-breakpoint`      → 清成空行
sed -e 's/;--> statement-breakpoint/;/g' \
    -e 's/^[[:space:]]*--> statement-breakpoint[[:space:]]*$//' \
    "$FILE" \
  | docker exec -i -e MYSQL_PWD="$MYSQL_PWD" wugui-mysql mysql --force -uwugui "$DB"

echo "✓ migration 完成: $FILE"
