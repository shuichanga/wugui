import { Controller, Get } from '@nestjs/common'
import { DrizzleService } from '../db/database.service'
import { Public } from '../auth/public.decorator'

@Controller('health')
export class HealthController {
  constructor(private readonly drizzle: DrizzleService) {}

  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'wugui-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }

  // 数据库连通性检查
  @Public()
  @Get('db')
  async checkDb() {
    try {
      await this.drizzle.db.execute('SELECT 1 AS ok')
      return { status: 'ok', database: 'connected' }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { status: 'error', database: msg }
    }
  }
}
