import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // bodyLimit 10MB：合并导入的 JSON 备份可能较大（默认 1MB 不够）
    new FastifyAdapter({ logger: { level: 'info' }, bodyLimit: 10 * 1024 * 1024 }),
  )

  // 全局前缀：所有路由以 /api 开头
  app.setGlobalPrefix('api')

  // 安全头 + 跨域 + cookie 解析（认证 cookie 依赖）
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: true,
    credentials: true,
  })
  await app.register(cookie)

  // 头像等 multipart 上传：单文件上限 1MB（服务端二次校验）
  await app.register(multipart, { limits: { fileSize: 1024 * 1024 } })

  // 请求日志
  const server = app.getHttpAdapter().getInstance()
  server.addHook('onRequest', (req, _reply, done) => {
    ;(req as any).logStart = Date.now()
    done()
  })
  server.addHook('onResponse', (req, reply, done) => {
    const start = (req as any).logStart as number | undefined
    const dur = start ? Date.now() - start : 0
    const tag = reply.statusCode >= 400 ? 'err' : 'req'
    // eslint-disable-next-line no-console
    console.log(`[${tag}] ${req.method} ${req.routeOptions.url ?? req.url} ${reply.statusCode} ${dur}ms`)
    done()
  })

  const config = app.get(ConfigService)
  const port = config.get<number>('app.port') ?? 3000

  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`🐢 wugui-api listening on http://0.0.0.0:${port}`)
}

void bootstrap()
