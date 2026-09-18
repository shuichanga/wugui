// 数据迁移路由：/api/export（备份下载）、/api/import（合并导入）
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { TransferService } from './transfer.service'

@Controller()
export class TransferController {
  constructor(private readonly service: TransferService) {}

  /** GET /api/export —— 全量导出当前住所数据 */
  @Get('export')
  export(@CurrentHouseholdId() householdId: string) {
    return this.service.export(householdId)
  }

  /** POST /api/import —— 合并导入（缺失的新增，已存在的跳过） */
  @HttpCode(200)
  @Post('import')
  import(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.import(
      user,
      householdId,
      body as { locations?: { path?: unknown }[]; items?: { name?: unknown }[] },
    )
  }
}
