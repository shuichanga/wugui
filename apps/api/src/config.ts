import { registerAs } from '@nestjs/config'

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'mysql://wugui:wugui@localhost:3306/wugui',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  // JWT 有效期：家庭工具类应用低频使用，7 天过期表现为"隔周打开就掉线"；30 天 + 客户端 401 静默重登兜底。
  // 兼容旧部署的 JWT_EXPIRES_IN 命名（现行架构无 refresh token，旧 JWT_REFRESH_EXPIRES_IN 为死配置）
  jwtExpires: process.env.JWT_EXPIRES ?? process.env.JWT_EXPIRES_IN ?? '30d',
  // 管理员用户 id 列表（逗号分隔）：manual 订阅开通 + Web 管理后台
  adminUserIds: (process.env.ADMIN_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean),
  // 头像落盘目录（相对 cwd；容器内由 volume 挂到 /app/data/avatars 持久化）
  avatarDir: process.env.AVATAR_DIR ?? 'data/avatars',
  wechat: {
    appId: process.env.WECHAT_APP_ID ?? '',
    appSecret: process.env.WECHAT_APP_SECRET ?? '',
    offerId: process.env.WECHAT_OFFER_ID ?? '',
    payAppKey: process.env.WECHAT_PAY_APP_KEY ?? '',
    // MP 后台「消息推送」配置的 Token（明文模式验签：sha1(sort(token,timestamp,nonce))）
    notifyToken: process.env.WECHAT_NOTIFY_TOKEN ?? '',
  },
  oss: {
    region: process.env.OSS_REGION ?? 'oss-cn-hangzhou',
    bucket: process.env.OSS_BUCKET ?? 'wugui-photos',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? '',
    endpoint: process.env.OSS_ENDPOINT ?? '',
  },
}))

export type AppConfig = ReturnType<typeof appConfig>
