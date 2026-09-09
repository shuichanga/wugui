<div align="center">

<img src="public/android-chrome-192x192.png" width="40" alt="物归"> 

# 物归 (wugui)

### 家庭收纳管理 Web 应用

记录家里的物品和收纳空间，全家人共享，找不到东西时随手一查。

</div>

<br />

<div align="center">

[![Nuxt](https://img.shields.io/badge/Nuxt-3.17-00DC82?logo=nuxt&logoColor=white)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Cloudflare D1](https://img.shields.io/badge/Database-D1-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1)
[![Cloudflare R2](https://img.shields.io/badge/Storage-R2-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2)
[![License](https://img.shields.io/badge/License-MIT-111827)](#license)

</div>

<br />

---

## ✨ 功能特性

### 📦 物品管理

| 功能 | 说明 |
|------|------|
| 基本信息 | 名称、数量、标签、备注 |
| 照片上传 | 最多 3 张，前端压缩后存储至 R2 |
| 标签颜色 | 标签自动分配柔和颜色，一目了然 |
| 连续录入 | "保存并继续"保留空间与标签，批量整理省 80% 录入成本 |

### 🗂️ 收纳空间

| 功能 | 说明 |
|------|------|
| 三级结构 | 房间 → 家具 → 格位（层级不强制，家具可直接挂物品） |
| 空间图标 | 每个空间可设置图标，快速识别 |
| 最近空间 | 自动记忆最近使用的空间，快速录入 |
| 可折叠卡片 | 空间卡片默认折叠显示房间色头部，点击 Chevron 展开家具与格位 |

### 🔍 检索

| 功能 | 说明 |
|------|------|
| 关键字搜索 | 按名称、备注、标签模糊匹配 |
| 空间树浏览 | 按收纳空间树形浏览所有物品 |
| 标签筛选 | 按标签快速过滤 |

### 👨‍👩‍👧‍👦 多住所

| 功能 | 说明 |
|------|------|
| 多住所管理 | 一人可创建/加入多个住所（如自己家 + 父母家） |
| 邀请码加入 | 创建者生成邀请码，家人输入即可加入 |
| 成员管理 | 所有者可移除成员、重置邀请码 |
| 随时切换 | 下拉选择当前住所，数据隔离 |

### 🎨 UI/UX

| 功能 | 说明 |
|------|------|
| 响应式布局 | PC 端两栏，移动端单栏自适应 |
| 角色动画 | 登录/注册页趣味动画（眼睛跟随、眨眼、偷看） |
| PWA | 支持添加到主屏，离线图标缓存 |
| 底部导航 | 移动端底部 Tab 导航 |

---

## 🛠️ 技术栈

| 层 | 选型 | 说明 |
|----|------|------|
| **框架** | [Nuxt 3](https://nuxt.com) + [Vue 3](https://vuejs.org) + [TypeScript](https://typescriptlang.org) | 前后端一体，SSR/SSG 灵活切换 |
| **UI 样式** | [Tailwind CSS v4](https://tailwindcss.com) | CSS-first 配置（`@theme`），无独立配置文件 |
| **图标** | [Lucide Vue Next](https://lucide.dev) | 轻量、一致的图标集 |
| **状态管理** | [Pinia](https://pinia.vuejs.org) | 管理认证状态、用户信息 |
| **数据库** | [Cloudflare D1](https://developers.cloudflare.com/d1) + [drizzle-orm](https://orm.drizzle.team) | Serverless SQLite，TypeScript 类型安全 |
| **文件存储** | [Cloudflare R2](https://developers.cloudflare.com/r2) | S3 兼容对象存储，存照片 |
| **认证** | 自写（scrypt + jose JWT + httpOnly cookie） | 零依赖密码哈希，标准 JWT 签发 |
| **部署** | [Cloudflare Pages](https://pages.cloudflare.com) | Nitro `cloudflare-pages` preset，前后端一体部署 |
| **本地开发** | [nitro-cloudflare-dev](https://github.com/nuxt/nitro) | 本地模拟 CF 环境（D1/R2 mock） |


---

## 🏗️ 项目架构

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器 (客户端)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   页面       │  │   组件       │  │  Composables │      │
│  │ pages/      │  │ components/ │  │ composables/ │      │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │
│         │                │                │              │
│         └────────────────┼────────────────┘              │
│                          │                               │
│              ┌───────────┴───────────┐                   │
│              │  Pinia (auth store)    │                   │
│              └───────────┬───────────┘                   │
└──────────────────────────┼───────────────────────────────┘
                           │  fetch / API Routes
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Pages (Nitro SSR)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │              server/ (Nitro API)                  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │   │
│  │  │ auth    │ │households│ │ locations│ │items │ │   │
│  │  │ routes  │ │ routes   │ │ routes   │ │routes│ │   │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘ └──┬───┘ │   │
│  │       │           │            │          │      │   │
│  │  ┌────▼───────────▼────────────▼──────────▼───┐   │   │
│  │  │         server/utils/ (共享工具)             │   │   │
│  │  │  db.ts │ auth.ts │ items.ts │ locations.ts │   │   │
│  │  └─────────────────┬──────────────────────────┘   │   │
│  └────────────────────┼──────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼                           ▼
┌──────────────────┐     ┌──────────────────┐
│   Cloudflare D1  │     │   Cloudflare R2  │
│   (SQLite DB)    │     │   (Object Store) │
│                  │     │                  │
│  users           │     │  item photos     │
│  households      │     │  avatars         │
│  locations       │     │                  │
│  items           │     │                  │
│  item_tags       │     │                  │
│  item_photos     │     │                  │
└──────────────────┘     └──────────────────┘
```

### 数据流向

```
用户操作 → 前端组件 → composable/API 调用 → Nitro API Route
    → drizzle-orm 查询 → Cloudflare D1 (SQLite)
    → 返回数据 → 前端渲染
```

---

## 🚀 快速开始

### 前置要求

```
Node.js  >= 18.0.0
npm      >= 9.0.0
Wrangler >= 4.0.0  (npx 自动下载)
```

### 本地开发

```bash
# 1. 克隆项目
git clone <repo-url> && cd wugui

# 2. 安装依赖
npm install
# ⚠️ 如遇 npm arborist bug，改用：
# npm install --legacy-peer-deps

# 3. 创建本地数据库
npx wrangler d1 migrations apply wugui-db --local

# 4. 创建环境变量文件
echo "JWT_SECRET=your-random-secret-here" > .dev.vars

# 5. 启动开发服务器
npm run dev
# → http://localhost:3000
```

### 本地环境变量

`.dev.vars` 文件（**不要提交到 Git**）：

| 变量 | 说明 | 示例 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥，至少 32 字符随机字符串 | `echo "openssl rand -base64 48" \| cat` |

> `.dev.vars` 中的值对应 `wrangler.toml` 中的绑定名。本地开发时 D1/R2 由 `nitro-cloudflare-dev` 自动模拟。

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热重载） |
| `npm run build` | 生产构建，输出至 `dist/` |
| `npm run generate` | 生成静态站点 |
| `npm run preview` | 本地预览生产构建 |
| `npx wrangler d1 migrations apply wugui-db --local` | 同步本地 D1 数据库迁移 |

---

## 🌐 部署

### 首次部署（完整流程）

#### Step 1: 创建 Cloudflare 资源

1. **登录 [Cloudflare Dashboard](https://dash.cloudflare.com)**

2. **创建 D1 数据库**
   ```
   Workers & Pages → D1 → Create D1 database
   Database name: wugui-db
   ```
   记录生成的 `database_id`（UUID 格式）。

3. **创建 R2 存储桶**
   ```
   Workers & Pages → R2 Storage → Create bucket
   Bucket name: wugui-photos
   ```

4. **创建 Pages 项目**
   ```
   Workers & Pages → Create → Pages → Connect to Git
   ```
   选择你的仓库，配置如下：

   | 配置项 | 值 |
   |--------|-----|
   | Project name | `wugui` |
   | Production branch | `main` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

#### Step 2: 配置环境变量

在 Pages 项目的 **Settings → Environment Variables** 中添加：

| 变量 | 值 | 说明 |
|------|-----|------|
| `JWT_SECRET` | 32+ 字符随机字符串 | JWT 签名密钥，生产环境必须使用强密钥 |

#### Step 3: 绑定 D1 和 R2

在 Pages 项目的 **Settings → Bindings** 中添加：

**D1 Binding：**
| 配置项 | 值 |
|--------|-----|
| Binding variable | `DB` |
| D1 database name | `wugui-db` |

**R2 Binding：**
| 配置项 | 值 |
|--------|-----|
| Binding variable | `PHOTOS` |
| R2 bucket name | `wugui-photos` |

> 或者在 `wrangler.toml` 中直接配置 `database_id` 和 `bucket_name`，Cloudflare Pages 会自动读取。

#### Step 4: 执行数据库迁移

```bash
# 推送到 main 触发首次构建
git add .
git commit -m "initial deploy"
git push origin main

# 构建完成后，执行 D1 迁移
npx wrangler d1 migrations apply wugui-db --remote
```

#### Step 5: 验证部署

1. 访问 Pages 项目的 **Deployments** 标签页
2. 确认构建状态为 ✅ **Success**
3. 访问部署 URL，注册账号并测试完整流程

### 后续更新

推送到 `main` 分支即自动构建部署：

```bash
git add .
git commit -m "feat: 新功能描述"
git push origin main
```

如有新的数据库迁移：

```bash
# 编辑 migrations/ 目录下的 SQL 文件
npx wrangler d1 migrations apply wugui-db --remote
```

### 回滚

```bash
# 回滚到上一个构建
# 在 Pages Dashboard → Deployments 点击任意历史构建 → Deploy to production
# 或使用 Wrangler CLI：
npx wrangler pages deploy dist --project-name wugui
```

---

## 📁 目录结构

```
wugui/
├── app.vue                    # 根组件（NuxtPage + 底部导航 + 对话框）
├── nuxt.config.ts             # Nuxt 全局配置
├── package.json               # 依赖与脚本
├── wrangler.toml              # Cloudflare Pages 部署配置
├── tsconfig.json              # TypeScript 配置
├── .npmrc                     # npm 配置
├── .dev.vars                  # 本地环境变量（不入库）
│
├── assets/
│   └── css/
│       └── main.css           # 全局样式 + Tailwind v4 @theme 定义
│
├── public/                    # 静态资源（PWA 图标、manifest）
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   └── site.webmanifest       # PWA Web App Manifest
│
├── pages/                     # 页面（路由）
│   ├── index.vue              # 首页（搜索 + 最近空间）
│   ├── add.vue                # 添加物品
│   ├── login.vue              # 登录
│   ├── register.vue           # 注册
│   ├── settings.vue           # 设置（用户 + 住所管理）
│   ├── locations.vue          # 空间列表
│   ├── locations/[id].vue     # 空间详情
│   ├── items/[id].vue         # 物品详情
│   └── items/[id]/edit.vue    # 编辑物品
│
├── components/                # Vue 组件
│   ├── AppBottomNav.vue       # 底部导航栏
│   ├── AppDialog.vue          # 通用对话框
│   ├── CharacterScene.vue     # 登录/注册页角色动画场景
│   ├── ItemCard.vue           # 物品卡片
│   ├── ItemForm.vue           # 物品表单
│   ├── LocationIcon.vue       # 空间图标
│   ├── LocationNode.vue       # 空间树节点
│   ├── PhotoUploader.vue      # 照片上传器
│   ├── ResidenceSwitcher.vue  # 住所切换器
│   ├── RoomCard.vue           # 首页房间卡片
│   ├── RoomLocationsCard.vue  # 可折叠房间卡片（家具 + 格位）
│   ├── SearchPopover.vue      # 悬浮搜索弹窗
│   └── UserAvatar.vue         # 用户头像
│
├── composables/               # Vue 组合式函数
│   ├── useApi.ts              # API 请求封装
│   ├── useDialog.ts           # 对话框控制
│   ├── useImageCompress.ts    # 前端图片压缩
│   ├── useItemPhotos.ts       # 物品照片管理
│   ├── useRecentLocations.ts  # 最近空间记忆
│   ├── useTagColor.ts         # 标签颜色映射
│   └── useTimeAgo.ts          # 相对时间显示
│
├── stores/
│   └── auth.ts                # Pinia 认证状态管理
│
├── drizzle/
│   └── schema.ts              # drizzle-orm 数据库 Schema
│
├── migrations/                # D1 SQL 迁移文件
│   ├── 0001_init.sql          # 初始 Schema（7 张表）
│   └── 0002_user_avatar.sql   # 用户头像字段
│
└── server/                    # 服务端（Nitro API）
    ├── middleware/
    │   └── auth.ts            # 全局鉴权中间件
    ├── api/
    │   ├── auth/              # 认证 API
    │   │   ├── login.post.ts
    │   │   ├── logout.post.ts
    │   │   ├── me.get.ts
    │   │   ├── register.post.ts
    │   │   └── switch/[householdId].post.ts
    │   ├── households/        # 住所 API
    │   │   ├── index.get.ts
    │   │   ├── index.post.ts
    │   │   ├── join.post.ts
    │   │   ├── [id].patch.ts
    │   │   ├── [id]/invite/reset.post.ts
    │   │   └── [id]/members/
    │   │       ├── index.get.ts
    │   │       ├── [userId].delete.ts
    │   │       └── me.delete.ts
    │   ├── items/             # 物品 API
    │   │   ├── index.get.ts
    │   │   ├── index.post.ts
    │   │   ├── [id]/index.get.ts
    │   │   ├── [id]/index.patch.ts
    │   │   ├── [id]/index.delete.ts
    │   │   └── [id]/photos/
    │   │       ├── index.post.ts
    │   │       └── [photoId].delete.ts
    │   ├── locations/         # 空间 API
    │   │   ├── index.get.ts
    │   │   ├── index.post.ts
    │   │   ├── [id].patch.ts
    │   │   └── [id].delete.ts
    │   ├── photos/            # 照片读取 API
    │   │   └── [photoId].get.ts
    │   ├── me/                # 用户自身 API
    │   │   ├── avatar.post.ts
    │   │   └── avatar.delete.ts
    │   └── avatars/           # 用户头像 API
    │       └── [userId].get.ts
    └── utils/
        ├── auth.ts            # 认证工具（scrypt + JWT + Cookie）
        ├── db.ts              # 数据库连接（drizzle-orm）
        ├── items.ts           # 物品辅助函数
        └── locations.ts       # 空间树辅助函数
```

---

## 🔌 API 参考

> 所有 API 路由均需要认证（`/api/auth/login` 和 `/api/auth/register` 除外）。认证通过 `httpOnly` Cookie 自动携带。

### Auth 认证

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | `/api/auth/register` | 注册 | `{ email, password, displayName? }` |
| POST | `/api/auth/login` | 登录 | `{ email, password }` |
| POST | `/api/auth/logout` | 退出登录 | — |
| GET | `/api/auth/me` | 获取当前用户 | — |
| POST | `/api/auth/switch/{householdId}` | 切换住所 | — |

### Households 住所

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/households` | 我的住所列表 |
| POST | `/api/households` | 创建住所 |
| POST | `/api/households/join` | 通过邀请码加入 |
| PATCH | `/api/households/{id}` | 更新住所信息 |
| POST | `/api/households/{id}/invite/reset` | 重置邀请码 |
| GET | `/api/households/{id}/members` | 成员列表 |
| DELETE | `/api/households/{id}/members/{userId}` | 移除成员 |
| DELETE | `/api/households/{id}/members/me` | 退出住所 |

### Locations 空间

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/locations` | 空间树 |
| POST | `/api/locations` | 创建空间 |
| PATCH | `/api/locations/{id}` | 更新空间 |
| DELETE | `/api/locations/{id}` | 删除空间 |

### Items 物品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items` | 物品列表（支持搜索/标签筛选） |
| POST | `/api/items` | 创建物品 |
| GET | `/api/items/{id}` | 物品详情 |
| PATCH | `/api/items/{id}` | 更新物品 |
| DELETE | `/api/items/{id}` | 删除物品 |
| POST | `/api/items/{id}/photos` | 上传照片 |
| DELETE | `/api/items/{id}/photos/{photoId}` | 删除照片 |

### Photos & Avatars

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/photos/{photoId}` | 读取照片（从 R2） |
| POST | `/api/me/avatar` | 上传头像 |
| DELETE | `/api/me/avatar` | 删除头像 |
| GET | `/api/avatars/{userId}` | 读取头像 |

---

## 🗄️ 数据库 Schema

### ER 关系图

```
users 1──N household_members N──1 households
users 1──N items (ownerId)
households 1──N locations
locations N──1 locations (parentId, 自关联树)
locations 1──N items
items 1──N item_tags
items 1──N item_photos
```

### 表结构

#### users — 用户

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | 用户 ID |
| `email` | TEXT UNIQUE NOT NULL | 邮箱（唯一） |
| `password_hash` | TEXT NOT NULL | scrypt 密码哈希 |
| `display_name` | TEXT | 显示名 |
| `avatar_key` | TEXT | R2 头像路径 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |

#### households — 住所

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | 住所 ID |
| `name` | TEXT NOT NULL | 住所名称 |
| `invite_code` | TEXT UNIQUE NOT NULL | 邀请码 |
| `created_by` | TEXT NOT NULL | 创建者 ID |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |

#### household_members — 住所成员

| 字段 | 类型 | 说明 |
|------|------|------|
| `household_id` | TEXT NOT NULL | 住所 ID |
| `user_id` | TEXT NOT NULL | 用户 ID |
| `role` | TEXT ENUM('owner','member') | 角色 |
| `joined_at` | TEXT NOT NULL | 加入时间 |
| **PK** | `(household_id, user_id)` | 复合主键 |

#### locations — 空间

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | 空间 ID |
| `household_id` | TEXT NOT NULL | 所属住所 |
| `parent_id` | TEXT | 父空间（NULL=顶级） |
| `level` | TEXT ENUM('room','furniture','compartment') | 层级 |
| `name` | TEXT NOT NULL | 名称 |
| `icon` | TEXT | 图标名 |
| `sort_order` | INTEGER DEFAULT 0 | 排序 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |

#### items — 物品

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | 物品 ID |
| `household_id` | TEXT NOT NULL | 所属住所 |
| `location_id` | TEXT NOT NULL | 所在空间 |
| `name` | TEXT NOT NULL | 名称 |
| `quantity` | INTEGER DEFAULT 1 | 数量 |
| `notes` | TEXT | 备注 |
| `owner_id` | TEXT NOT NULL | 录入者 |
| `created_at` | TEXT NOT NULL | 创建时间 |
| `updated_at` | TEXT NOT NULL | 更新时间 |

#### item_tags — 物品标签

| 字段 | 类型 | 说明 |
|------|------|------|
| `item_id` | TEXT NOT NULL | 物品 ID |
| `tag` | TEXT NOT NULL | 标签名 |
| **PK** | `(item_id, tag)` | 复合主键 |

#### item_photos — 物品照片

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | 照片 ID |
| `item_id` | TEXT NOT NULL | 物品 ID |
| `r2_key` | TEXT NOT NULL | R2 存储路径 |
| `sort_order` | INTEGER DEFAULT 0 | 排序 |
| `created_at` | TEXT NOT NULL | 上传时间 |

### 索引

```sql
idx_household_members_user       ON household_members(user_id)
idx_locations_household          ON locations(household_id)
idx_locations_parent             ON locations(parent_id)
idx_items_household              ON items(household_id)
idx_items_location               ON items(location_id)
idx_items_name                   ON items(name)
idx_item_tags_tag                ON item_tags(tag)
idx_item_photos_item             ON item_photos(item_id)
```

---

## 🔐 认证方案

### 密码哈希

使用 `@noble/hashes` 的 **scrypt** 算法，零依赖纯 JS 实现：

```
scrypt(password, salt) → 32 字节哈希
```

- Salt 每次随机生成，与哈希一起存储
- 默认参数：N=16384, r=8, p=1

### JWT 签发

使用 `jose` 库签发 **HS256** JWT：

```
payload: { sub: userId, householdId, role, iat, exp }
```

- 过期时间：7 天
- 签名密钥：`JWT_SECRET` 环境变量

### Cookie

| Cookie | 值 | 说明 |
|--------|-----|------|
| `wugui_token` | JWT 字符串 | 认证令牌，7 天 |
| `wugui_household` | 当前住所 ID | 当前选择 |

属性：`httpOnly`, `sameSite=lax`, `path=/`

### 鉴权守卫

全局中间件 `server/middleware/auth.ts`：

- 开放路径：`/api/auth/register`, `/api/auth/login`
- 其余 `/api/*` 路径均需 `requireUser()` 验证 JWT

---

## 🎨 设计规范

### 色彩系统

```css
:root {
  --color-primary: #059669    /* 主色：翡翠绿 */
  --color-secondary: #f59e0b  /* 辅助色：琥珀 */
  --color-neutral-50: #f9fafb
  --color-neutral-100: #f3f4f6
  --color-neutral-200: #e5e7eb
  --color-neutral-300: #d1d5db
  --color-neutral-600: #4b5563
  --color-neutral-700: #374151
  --color-neutral-800: #1f2937
  --color-neutral-900: #111827
  --color-success: #10b981
  --color-warning: #f59e0b
  --color-error: #ef4444
}
```

### 间距系统

基于 4px 网格：

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
--space-12: 48px
--space-16: 64px
```

### 字号系统

```
--text-xs: 12px
--text-sm: 14px
--text-base: 16px
--text-lg: 20px
--text-xl: 24px
--text-2xl: 32px
```

### 圆角

- 小圆角：`6px`（输入框、按钮）
- 中圆角：`8px`（卡片、弹窗）
- 大圆角：`12px`（头像、大卡片）
- 全圆角：`9999px`（标签、登录按钮）

---

## ⚙️ 配置参考

### `wrangler.toml`

```toml
name = "wugui"
compatibility_date = "2025-07-15"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "wugui-db"
database_id = "50522026-9a87-4806-9f68-b0f8aa475db0"
migrations_dir = "migrations"

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "wugui-photos"
```

### `nuxt.config.ts` 关键配置

```typescript
{
  compatibilityDate: '2025-07-15',
  modules: ['@pinia/nuxt'],
  nitro: {
    preset: 'cloudflare-pages',
    modules: ['nitro-cloudflare-dev'],
  },
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      title: '物归',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#059669' },
      ],
    },
  },
}
```

---

## 🧪 数据库迁移

### 新建迁移

```bash
# 1. 在 migrations/ 下创建 SQL 文件
# 文件名格式：NNNN_description.sql（NNNN 为递增序号）

# 2. 编辑 SQL 内容
# 例如 migrations/0003_new_feature.sql：
# CREATE TABLE new_table (...);

# 3. 本地验证
npx wrangler d1 migrations apply wugui-db --local

# 4. 同步到线上
npx wrangler d1 migrations apply wugui-db --remote
```

### 查看迁移状态

```bash
npx wrangler d1 migrations list wugui-db --local
npx wrangler d1 migrations list wugui-db --remote
```

---

## 🔒 安全注意事项

1. **JWT_SECRET** — 生产环境必须使用 32+ 字符的强随机密钥，建议用 `openssl rand -base64 48` 生成
2. **Cookie** — 所有认证 Cookie 均设置 `httpOnly` + `sameSite=lax`，防止 XSS 窃取
3. **密码** — 使用 scrypt 哈希存储，绝不存储明文
4. **R2 路径** — 照片/头像路径使用随机 ID，不可预测
5. **CORS** — Cloudflare Pages 同源部署，无需额外 CORS 配置
6. **数据库** — D1 仅通过 API 中间件访问，不暴露直连端点

---

## 📦 环境变量一览

| 变量 | 位置 | 必需 | 说明 |
|------|------|------|------|
| `JWT_SECRET` | `.dev.vars` / Pages Settings | ✅ | JWT 签名密钥 |
| `DATABASE_URL` | `wrangler.toml` (自动) | — | D1 数据库，由 Wrangler 管理 |
| `PHOTOS_BUCKET` | `wrangler.toml` (自动) | — | R2 存储桶，由 Wrangler 管理 |

---

## 🤝 贡献

欢迎 Issue 和 Pull Request！提交 PR 前请确保：

1. 本地开发服务器正常运行
2. TypeScript 无报错（`npx nuxi typecheck`）
3. 新增数据库变更已创建迁移文件

---

## 📄 License

[MIT](./LICENSE)

---

<div align="center">

<p>Built with ❤️ by <a href="https://shuichang.cn">shuichang</a></p>

</div>
