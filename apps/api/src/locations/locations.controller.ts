// 空间路由：/api/locations
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { CurrentHouseholdId } from '../auth/current-user.decorator'
import { LocationsService } from './locations.service'

@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  /** GET /api/locations —— 当前住所完整空间树 */
  @Get()
  tree(@CurrentHouseholdId() householdId: string) {
    return this.service.tree(householdId)
  }

  /** POST /api/locations —— 新增空间 */
  @HttpCode(200)
  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.create(householdId, {
      name: String(body.name ?? ''),
      icon: body.icon ? String(body.icon) : null,
      parentId: body.parentId ? String(body.parentId) : null,
    })
  }

  /** PATCH /api/locations/:id —— 编辑名称 / 图标 */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.update(householdId, id, {
      name: String(body.name ?? ''),
      icon: body.icon ? String(body.icon) : null,
    })
  }

  /** DELETE /api/locations/:id —— 删除空间（有子空间/直挂物品时 409） */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentHouseholdId() householdId: string) {
    return this.service.remove(householdId, id)
  }
}
