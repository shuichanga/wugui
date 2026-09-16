// 空间业务：树查询 / 新增 / 编辑 / 删除
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { items, locations } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { getLocationTree, type LocationTreeNode } from '../common/location-tree'

const NAME_MAX = 30

@Injectable()
export class LocationsService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** GET /api/locations —— 当前住所完整空间树 */
  tree(householdId: string): Promise<LocationTreeNode[]> {
    return getLocationTree(this.drizzle.db, householdId)
  }

  /** POST /api/locations —— level 由父节点推导：无 parent → room；room 下 → furniture；furniture 下 → compartment */
  async create(householdId: string, input: { name: string; icon?: string | null; parentId?: string | null }) {
    const name = input.name?.trim() ?? ''
    if (!name) throw new BadRequestException('空间名称不能为空')
    if (name.length > NAME_MAX) throw new BadRequestException(`空间名称最多 ${NAME_MAX} 字`)
    const icon = input.icon?.trim().slice(0, 32) || null
    const parentId = input.parentId?.trim() || null

    const db = this.drizzle.db
    let level: 'room' | 'furniture' | 'compartment' = 'room'

    if (parentId) {
      const parent = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, parentId), eq(locations.householdId, householdId)))
      if (!parent.length) throw new NotFoundException('父空间不存在')
      if (parent[0].level === 'compartment') {
        throw new BadRequestException('格位下不能再建子空间')
      }
      level = parent[0].level === 'room' ? 'furniture' : 'compartment'
    }

    const now = new Date()
    const id = crypto.randomUUID()
    await db.insert(locations).values({
      id,
      householdId,
      parentId,
      level,
      name,
      icon,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })

    return { id, name, level, parentId, icon }
  }

  /** PATCH /api/locations/:id —— 名称 / 图标（不支持跨父级移动） */
  async update(householdId: string, id: string, input: { name: string; icon?: string | null }) {
    const name = input.name?.trim() ?? ''
    if (!name) throw new BadRequestException('空间名称不能为空')
    if (name.length > NAME_MAX) throw new BadRequestException(`空间名称最多 ${NAME_MAX} 字`)
    const icon = input.icon?.trim().slice(0, 32) || null

    const db = this.drizzle.db
    const found = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId)))
    if (!found.length) throw new NotFoundException('空间不存在')

    await db.update(locations).set({ name, icon, updatedAt: new Date() }).where(eq(locations.id, id))
    return { ok: true, id, name, icon }
  }

  /** DELETE /api/locations/:id —— 有子空间或有物品直挂时拒绝 */
  async remove(householdId: string, id: string) {
    const db = this.drizzle.db
    const found = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId)))
    if (!found.length) throw new NotFoundException('空间不存在')

    const children = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.parentId, id))
      .limit(1)
    if (children.length) throw new ConflictException('请先删除其子空间')

    const attached = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.locationId, id))
      .limit(1)
    if (attached.length) throw new ConflictException('该空间下仍有物品，请先移走或删除物品')

    await db.delete(locations).where(eq(locations.id, id))
    return { ok: true }
  }

  /** 空间及其所有后代 id（物品列表按空间过滤时用） */
  async descendantIds(householdId: string, locationId: string): Promise<string[]> {
    const rows = await this.drizzle.rawQuery<{ id: string }>(sql`
      WITH RECURSIVE sub(id) AS (
        SELECT id FROM locations WHERE id = ${locationId} AND household_id = ${householdId}
        UNION ALL
        SELECT l.id FROM locations l JOIN sub ON l.parent_id = sub.id
      )
      SELECT id FROM sub
    `)
    return rows.map(r => r.id)
  }
}
