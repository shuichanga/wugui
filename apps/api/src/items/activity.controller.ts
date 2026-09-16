// 标签与浏览记录路由：/api/tags、/api/recent-views
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { ItemsService } from './items.service'

@Controller('tags')
export class TagsController {
  constructor(private readonly items: ItemsService) {}

  /** GET /api/tags —— 当前住所热门标签 */
  @Get()
  hotTags(@CurrentHouseholdId() householdId: string) {
    return this.items.hotTags(householdId)
  }
}

@Controller('recent-views')
export class RecentViewsController {
  constructor(private readonly items: ItemsService) {}

  /** GET /api/recent-views —— 最近查看 */
  @Get()
  list(
    @Query('limit') limit: string,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.items.recentViews(user.id, householdId, Number(limit))
  }

  /** POST /api/recent-views —— 记录查看 */
  @HttpCode(200)
  @Post()
  record(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.items.recordView(user.id, householdId, String(body?.itemId ?? '').trim())
  }
}
