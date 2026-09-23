// 同步路由：/api/sync（小程序离线同步专用；Web 在线模式走 REST）
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import type { SyncChange } from './sync.types'
import { SyncService } from './sync.service'

@Controller('sync')
export class SyncController {
  constructor(private readonly service: SyncService) {}

  /** POST /api/sync/push —— 批量上行本地变更（Outbox flush） */
  @HttpCode(200)
  @Post('push')
  push(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.push(user, householdId, (body?.changes ?? []) as SyncChange[])
  }

  /** GET /api/sync/pull?since= —— 增量拉取（since 缺省返回全量快照） */
  @Get('pull')
  pull(@Query('since') since: string, @CurrentHouseholdId() householdId: string) {
    return this.service.pull(householdId, since || undefined)
  }
}
