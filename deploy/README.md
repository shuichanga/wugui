# 物归 部署指南

## 目录结构
```
deploy/
├── docker-compose.yml     ← 编排 MySQL + API + Nginx
├── Dockerfile.api         ← NestJS 镜像构建
├── nginx.conf             ← 反向代理配置
├── .env.example           ← 环境变量模板
├── certs/                 ← SSL 证书（挂载）
│   ├── fullchain.pem
│   └── privkey.pem
└── README.md
```

## 上传到服务器

假设 1panel 服务器目录 `/opt/wugui/`：

```bash
# 1. 本地打包（在仓库根目录）
tar czf wugui-deploy.tgz deploy apps packages pnpm-workspace.yaml package.json tsconfig.base.json

# 2. 上传
scp wugui-deploy.tgz user@server:/opt/wugui/

# 3. 服务器解包
ssh user@server
cd /opt/wugui
tar xzf wugui-deploy.tgz

# 4. 准备 SSL 证书
cd deploy
mkdir -p certs
# 从 1panel 复制证书：
cp /usr/local/labs/sites/wugui.shuichanga.cn/ssl/fullchain.pem certs/
cp /usr/local/labs/sites/wugui.shuichanga.cn/ssl/privkey.pem certs/
# 或者手动下载 Let's Encrypt 证书放这里

# 5. 生成 .env
cp .env.example .env
# 编辑 .env，替换所有 CHANGE_ME 和 REPLACE_ME

# 6. 启动
docker compose up -d --build
```

## 验证

```bash
# 健康检查
curl https://wugui.shuichanga.cn/health

# 数据库连通
curl https://wugui.shuichanga.cn/api/health/db
```

## 常用操作

```bash
# 查看日志
docker compose logs -f api

# 重启
docker compose restart api

# 备份 MySQL
docker exec wugui-mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" wugui > backup_$(date +%Y%m%d).sql

# 数据库 Studio
pnpm --filter @wugui/api db:studio
```

## 1panel 集成

1panel 上可以直接用「网站 → 容器 → 新建 Compose」，把 `deploy/docker-compose.yml` 内容粘贴进去，环境变量从 `.env` 读。
