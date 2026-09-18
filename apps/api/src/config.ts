import { registerAs } from '@nestjs/config'

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? 'mysql://wugui:wugui@localhost:3306/wugui',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES ?? '7d',
  // 头像落盘目录（相对 cwd；容器内由 volume 挂到 /app/data/avatars 持久化）
  avatarDir: process.env.AVATAR_DIR ?? 'data/avatars',
  wechat: {
    appId: process.env.WECHAT_APP_ID ?? '',
    appSecret: process.env.WECHAT_APP_SECRET ?? '',
    offerId: process.env.WECHAT_OFFER_ID ?? '',
    payAppKey: process.env.WECHAT_PAY_APP_KEY ?? '',
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
