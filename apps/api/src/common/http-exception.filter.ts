// 全局异常过滤器：把 NestJS 异常格式化成 h3 风格 { statusCode, statusMessage }，
// 与现有 Nuxt 前端的 useErrMsg.ts（读 err.data.statusMessage）保持兼容
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import type { FastifyReply } from 'fastify'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>()

    let statusCode = 500
    let statusMessage = '服务器内部错误'

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        statusMessage = body
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>
        statusMessage = (b.statusMessage as string) ?? (b.message as string) ?? statusMessage
      }
    }

    reply.status(statusCode).send({ statusCode, statusMessage })
  }
}
