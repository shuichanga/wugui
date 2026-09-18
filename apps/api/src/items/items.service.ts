// 物品业务：列表检索 / 新增 / 详情 / 编辑 / 删除
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { and, asc, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm'
import { itemPhotos, itemTags, items, locations, recentViews } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { decorateItems } from '../common/item-summary'
import { getLocationPathMap } from '../common/location-tree'
import { LocationsService } from '../locations/locations.service'
import { OssService } from '../oss/oss.service'
import type { SessionUser } from '../auth/session.types'

const NAME_MAX = 100
const NOTES_MAX = 500

export interface ItemListQuery {
  keyword?: string
  locationId?: string
  tag?: string
  limit?: number
  offset?: number
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly locationsService: LocationsService,
    private readonly oss: OssService,
  ) {}

  /** GET /api/items —— keyword（名称/备注/标签模糊）、location_id（含所有后代）、tag 过滤 */
  async list(householdId: string, q: ItemListQuery) {
    const keyword = (q.keyword ?? '').trim()
    const locationId = (q.locationId ?? '').trim()
    const tag = (q.tag ?? '').trim()
    const limit = Math.min(50, Math.max(1, Math.floor(Number(q.limit) || 20)))
    const offset = Math.max(0, Math.floor(Number(q.offset) || 0))

    const db = this.drizzle.db
    const conditions: SQL[] = [eq(items.householdId, householdId)]

    if (keyword) {
      conditions.push(or(
        like(items.name, `%${keyword}%`),
        like(items.notes, `%${keyword}%`),
        sql`EXISTS (SELECT 1 FROM item_tags t WHERE t.item_id = ${items.id} AND t.tag LIKE ${`%${keyword}%`})`,
      )!)
    }
    if (locationId) {
      // 空间过滤包含所有后代层级（点客厅应看到下属所有物品）
      const ids = await this.locationsService.descendantIds(householdId, locationId)
      if (!ids.length) return { items: [], total: 0 }
      conditions.push(inArray(items.locationId, ids))
    }
    if (tag) {
      conditions.push(sql`EXISTS (SELECT 1 FROM item_tags t WHERE t.item_id = ${items.id} AND t.tag = ${tag})`)
    }

    const where = and(...conditions)
    const [rows, [countRow], pathMap] = await Promise.all([
      db.select().from(items).where(where).orderBy(desc(items.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(items).where(where),
      getLocationPathMap(db, householdId),
    ])
    const decorated = await decorateItems(db, rows, pathMap)
    return { items: decorated, total: Number(countRow?.count ?? 0) }
  }

  /** POST /api/items —— 新增物品 */
  async create(user: SessionUser, householdId: string, input: {
    name: string
    locationId: string
    quantity?: number
    notes?: string | null
    tags?: unknown
  }) {
    const name = input.name?.trim() ?? ''
    if (!name) throw new BadRequestException('物品名称不能为空')
    if (name.length > NAME_MAX) throw new BadRequestException(`物品名称最多 ${NAME_MAX} 字`)
    if (!input.locationId) throw new BadRequestException('请选择收纳空间')

    const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1))
    const notes = input.notes?.trim().slice(0, NOTES_MAX) || null
    const tags = parseTags(input.tags)

    const db = this.drizzle.db
    const loc = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, input.locationId), eq(locations.householdId, householdId)))
    if (!loc.length) throw new NotFoundException('收纳空间不存在')

    const now = new Date()
    const id = crypto.randomUUID()
    await db.insert(items).values({
      id,
      householdId,
      locationId: input.locationId,
      name,
      quantity,
      notes,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    })
    if (tags.length) {
      await db.insert(itemTags).values(tags.map(tag => ({ itemId: id, tag })))
    }

    return { id, name, quantity, tags }
  }

  /** GET /api/items/:id —— 详情（含全部照片，最多 3 张契约在前端） */
  async detail(householdId: string, id: string) {
    const db = this.drizzle.db
    const rows = await db
      .select()
      .from(items)
      .where(and(eq(items.id, id), eq(items.householdId, householdId)))
    if (!rows.length) throw new NotFoundException('物品不存在')

    const [pathMap, photoRows] = await Promise.all([
      getLocationPathMap(db, householdId),
      db
        .select({ id: itemPhotos.id })
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, id))
        .orderBy(asc(itemPhotos.sortOrder)),
    ])
    const [item] = await decorateItems(db, rows, pathMap)
    const photos = photoRows.map(p => ({ id: p.id, url: `/api/photos/${p.id}` }))

    return { ...item, photos }
  }

  /** PATCH /api/items/:id —— 名称/数量/备注/空间/标签（标签整体替换） */
  async update(householdId: string, id: string, body: Record<string, unknown>) {
    const db = this.drizzle.db
    const found = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, id), eq(items.householdId, householdId)))
    if (!found.length) throw new NotFoundException('物品不存在')

    const updates: Record<string, unknown> = { updatedAt: new Date() }

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) throw new BadRequestException('物品名称不能为空')
      if (name.length > NAME_MAX) throw new BadRequestException(`物品名称最多 ${NAME_MAX} 字`)
      updates.name = name
    }
    if (body.quantity !== undefined) {
      updates.quantity = Math.max(1, Math.floor(Number(body.quantity) || 1))
    }
    if (body.notes !== undefined) {
      updates.notes = String(body.notes).trim().slice(0, NOTES_MAX) || null
    }
    if (body.locationId !== undefined) {
      const locationId = String(body.locationId)
      const loc = await db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.id, locationId), eq(locations.householdId, householdId)))
      if (!loc.length) throw new NotFoundException('收纳空间不存在')
      updates.locationId = locationId
    }
    if (body.tags !== undefined) {
      const tags = parseTags(body.tags)
      await db.delete(itemTags).where(eq(itemTags.itemId, id))
      if (tags.length) {
        await db.insert(itemTags).values(tags.map(tag => ({ itemId: id, tag })))
      }
    }

    await db.update(items).set(updates).where(eq(items.id, id))
    return { ok: true, id }
  }

  /** DELETE /api/items/:id —— 删除物品 + 级联清理（标签 / 浏览记录 / 照片 DB 记录 / OSS 对象） */
  async remove(householdId: string, id: string) {
    const db = this.drizzle.db
    const found = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, id), eq(items.householdId, householdId)))
    if (!found.length) throw new NotFoundException('物品不存在')

    // 照片记录先取出来，删完 DB 再逐个删 OSS 对象（失败只告警，孤儿对象由清理任务兜底）
    const photoRows = await db
      .select({ ossKey: itemPhotos.ossKey })
      .from(itemPhotos)
      .where(eq(itemPhotos.itemId, id))

    await db.delete(itemPhotos).where(eq(itemPhotos.itemId, id))
    await db.delete(itemTags).where(eq(itemTags.itemId, id))
    await db.delete(items).where(eq(items.id, id))
    await db.delete(recentViews).where(eq(recentViews.itemId, id))

    // OSS 删除放最后：网络失败不影响已完成的 DB 清理
    for (const p of photoRows) {
      try {
        await this.oss.deleteObject(p.ossKey)
      } catch (e) {
        console.warn(`[items] OSS 照片删除失败 ${p.ossKey}:`, e)
      }
    }
    return { ok: true }
  }

  /** GET /api/tags —— 当前住所热门标签（按物品数降序，前 20） */
  async hotTags(householdId: string) {
    const rows = await this.drizzle.rawQuery<{ tag: string; count: number }>(sql`
      SELECT t.tag, count(*) as count
      FROM item_tags t
      JOIN items i ON t.item_id = i.id
      WHERE i.household_id = ${householdId}
      GROUP BY t.tag
      ORDER BY count(*) DESC
      LIMIT 20
    `)
    return { tags: rows.map(r => ({ tag: r.tag, count: Number(r.count) })) }
  }

  /** GET /api/recent-views —— 最近查看（当前用户视角，限制当前住所） */
  async recentViews(userId: string, householdId: string, limit: number) {
    const l = Math.min(20, Math.max(1, Math.floor(limit) || 10))
    const db = this.drizzle.db
    const rows = await db
      .select({
        id: items.id,
        name: items.name,
        quantity: items.quantity,
        notes: items.notes,
        locationId: items.locationId,
        ownerId: items.ownerId,
        createdAt: items.createdAt,
      })
      .from(recentViews)
      .innerJoin(items, eq(items.id, recentViews.itemId))
      .where(and(eq(recentViews.userId, userId), eq(items.householdId, householdId)))
      .orderBy(desc(recentViews.viewedAt))
      .limit(l)

    const pathMap = await getLocationPathMap(db, householdId)
    return { items: await decorateItems(db, rows, pathMap) }
  }

  /** POST /api/recent-views —— 记录查看：upsert，物品需属于当前住所 */
  async recordView(userId: string, householdId: string, itemId: string) {
    if (!itemId) throw new BadRequestException('缺少 itemId')
    const db = this.drizzle.db
    const found = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.householdId, householdId)))
    if (!found.length) throw new NotFoundException('物品不存在')

    const now = new Date()
    await db
      .insert(recentViews)
      .values({ userId, itemId, viewedAt: now })
      .onDuplicateKeyUpdate({ set: { viewedAt: now } })
    return { ok: true }
  }
}

// 解析标签：去重、≤10 个、每个 ≤20 字
function parseTags(input: unknown): string[] {
  return Array.isArray(input)
    ? [...new Set(input.map(t => String(t).trim()).filter(t => t && t.length <= 20))].slice(0, 10)
    : []
}
