// 物品路由：/api/items
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser, CurrentHouseholdId } from '../auth/current-user.decorator'
import type { SessionUser } from '../auth/session.types'
import { ItemsService } from './items.service'

@Controller('items')
export class ItemsController {
  constructor(private readonly service: ItemsService) {}

  /** GET /api/items —— 列表检索 */
  @Get()
  list(
    @Query('keyword') keyword: string,
    @Query('location_id') locationId: string,
    @Query('tag') tag: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.list(householdId, {
      keyword,
      locationId,
      tag,
      limit: Number(limit),
      offset: Number(offset),
    })
  }

  /** POST /api/items —— 新增物品 */
  @HttpCode(200)
  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.create(user, householdId, {
      name: String(body.name ?? ''),
      locationId: String(body.locationId ?? ''),
      quantity: body.quantity !== undefined ? Number(body.quantity) : undefined,
      notes: body.notes !== undefined ? String(body.notes) : null,
      tags: body.tags,
    })
  }

  /** GET /api/items/:id —— 详情 */
  @Get(':id')
  detail(@Param('id') id: string, @CurrentHouseholdId() householdId: string) {
    return this.service.detail(householdId, id)
  }

  /** PATCH /api/items/:id —— 编辑 */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.update(user, householdId, id, body)
  }

  /** DELETE /api/items/:id —— 删除 */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.remove(user, householdId, id)
  }
}
