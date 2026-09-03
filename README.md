# 物归 (wugui)

家庭收纳管理 Web 应用：记录家里的物品和收纳位置，全家人共享，找不到东西时随手一查。

## 功能

- **物品管理**：名称、数量、标签、备注、照片（最多 3 张，前端压缩后存储）
- **收纳位置**：房间 → 家具 → 格位三级结构（层级不强制，家具可直接挂物品）
- **三种检索**：关键字搜索（名称/备注/标签）、按位置树浏览、标签筛选
- **多家庭**：一人可创建/加入多个家庭（如自己家 + 父母家），邀请码加入，随时切换
- **连续录入**："保存并继续"保留位置与标签，配合最近位置记忆，批量整理省 80% 录入成本

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Nuxt 3 + Vue 3 + TypeScript |
| UI | Tailwind CSS v4 + Lucide Icons |
| 运行时 | Cloudflare Pages（Nitro，前后端一体部署） |
| 数据库 | Cloudflare D1 + drizzle-orm |
| 文件存储 | Cloudflare R2 |
| 认证 | 自写（scrypt 密码哈希 + jose JWT + httpOnly cookie） |

## 本地开发

```bash
npm install                 # 踩 npm arborist bug 时加 --legacy-peer-deps
npx wrangler d1 migrations apply wugui-db --local   # 建本地表
npm run dev                 # http://localhost:3000
```

本地 D1/R2 绑定与密钥通过 `wrangler.toml` + `.dev.vars` 提供（`.dev.vars` 需自行创建：`JWT_SECRET=<随机字符串>`）。

## 部署

推送到 `main` 分支触发 Cloudflare Pages 自动构建（build command: `npm run build`，output: `dist`）。首次部署后执行：

```bash
npx wrangler d1 migrations apply wugui-db --remote
```

## 目录结构

```
pages/          # 页面（首页/位置/添加/详情/设置/登录注册）
server/api/     # API 路由（auth / households / locations / items / photos）
server/utils/   # db、auth、位置树、物品装饰等工具
drizzle/        # 数据库 schema 定义
migrations/     # D1 SQL 迁移
components/     # 通用组件（底部导航/卡片/位置树/照片上传等）
composables/    # 前端组合式函数
stores/         # Pinia 状态
```
