// 全局异常过滤器：把 NestJS 异常格式化成 h3 风格 { statusCode, statusMessage }，
// 与现有 Nuxt 前端的 useErrMsg.ts（读 err.data.statusMessage）保持兼容。
// 未知异常（非 HttpException）必须在服务端日志打印完整堆栈，否则线上无法排查。
import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common'
import type { FastifyReply } from 'fastify'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>()

    let statusCode = 500
    let statusMessage = '服务器内部错误'
    let code: string | undefined

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const body = exception.getResponse()
      if (typeof body === 'string') {
        statusMessage = body
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, unknown>
        statusMessage = (b.statusMessage as string) ?? (b.message as string) ?? statusMessage
        // 业务错误码透传（如 SUBSCRIPTION_REQUIRED），客户端据此精确分支
        code = typeof b.code === 'string' ? b.code : undefined
      }
    } else {
      // 未知异常：打完整堆栈（数据库错误、代码 bug 都在这暴露）
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
      )
    }

    reply.status(statusCode).send({ statusCode, statusMessage, ...(code ? { code } : {}) })
  }
}
