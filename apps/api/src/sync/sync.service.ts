// 云同步业务：push（Outbox 批量上行，逐条 LWW）与 pull（增量游标 / 首次快照）
//
// LWW 规则：以 change.clientTimestamp 与现有行 updatedAt（含墓碑行）比较，
// 客户端时间更新才落库，否则记 stale（目标状态未被超越）。
// 目标状态已达成（如删除不存在的行）记 accepted，客户端据此移除 Outbox 条目。
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { and, asc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import type { SyncChange, SyncEntity, SyncPullResponse, SyncPushResponse } from './sync.types'
import { itemPhotos, itemTags, items, locations, syncChanges } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { OssService } from '../oss/oss.service'
import { SubscriptionService } from '../subscription/subscription.service'
import type { SessionUser } from '../auth/session.types'

const NAME_MAX = 100
const LOCATION_NAME_MAX = 30
const PUSH_LIMIT = 200
const PULL_LIMIT = 500

@Injectable()
export class SyncService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly subscription: SubscriptionService,
    private readonly oss: OssService,
  ) {}

  /** POST /api/sync/push —— 批量上行变更（Outbox flush，locations 先于 items 由客户端保证） */
  async push(user: SessionUser, householdId: string, changes: SyncChange[]): Promise<SyncPushResponse> {
    if (!Array.isArray(changes)) throw new BadRequestException('changes 必须是数组')
    if (changes.length > PUSH_LIMIT) throw new BadRequestException(`单次最多推送 ${PUSH_LIMIT} 条变更`)

    const unlocked = await this.subscription.householdHasCloudSync(householdId)
    if (!unlocked) {
      throw new ForbiddenException({
        statusMessage: '云同步需要订阅，开通后即可使用',
        message: '云同步需要订阅，开通后即可使用',
        code: 'SUBSCRIPTION_REQUIRED',
      })
    }

    const results: SyncPushResponse['results'] = []
    for (const change of changes) {
      const status = await this.applyChange(user, householdId, change)
      results.push({ entity: change.entity, entityId: change.entityId, op: change.op, status })
    }

    return { results, serverTime: new Date().toISOString() }
  }

  /** GET /api/sync/status —— 当前住所最近一次云同步活动时间（Web 端同步状态卡展示用） */
  async status(householdId: string): Promise<{ lastSyncAt: string | null }> {
    const rows = await this.drizzle.db
      .select({ syncedAt: syncChanges.syncedAt })
      .from(syncChanges)
      .where(eq(syncChanges.householdId, householdId))
      .orderBy(sql`synced_at DESC`)
      .limit(1)
    return { lastSyncAt: rows[0]?.syncedAt.toISOString() ?? null }
  }

  /** GET /api/sync/pull —— since 缺省返回全量快照；否则按 syncedAt 增量 */
  async pull(householdId: string, since?: string): Promise<SyncPullResponse> {
    const now = new Date()

    if (since) {
      const cursor = new Date(since)
      if (Number.isNaN(cursor.getTime())) throw new BadRequestException('since 不是有效时间')
      const rows = await this.drizzle.db
        .select()
        .from(syncChanges)
        .where(and(eq(syncChanges.householdId, householdId), gt(syncChanges.syncedAt, cursor)))
        .orderBy(asc(syncChanges.syncedAt))
        .limit(PULL_LIMIT)

      const changes: SyncChange[] = rows.map(r => ({
        entity: r.entity as SyncEntity,
        entityId: r.entityId,
        op: r.op as SyncChange['op'],
        data: r.dataJson ? (JSON.parse(r.dataJson) as Record<string, unknown>) : null,
        clientTimestamp: r.clientTimestamp.toISOString(),
      }))
      return { changes, serverTime: now.toISOString() }
    }

    // ---- 快照模式：首次同步 / 游标丢失 ----
    const [locationRows, itemRows] = await Promise.all([
      this.drizzle.db
        .select()
        .from(locations)
        .where(and(eq(locations.householdId, householdId), isNull(locations.deletedAt))),
      this.drizzle.db
        .select()
        .from(items)
        .where(and(eq(items.householdId, householdId), isNull(items.deletedAt))),
    ])
    if (!itemRows.length) {
      return {
        snapshot: {
          locations: locationRows.map(mapLocation),
          items: [],
        },
        serverTime: now.toISOString(),
      }
    }

    const itemIds = itemRows.map(i => i.id)
    const [tagRows, photoRows] = await Promise.all([
      this.drizzle.db
        .select({ itemId: itemTags.itemId, tag: itemTags.tag })
        .from(itemTags)
        .where(inArray(itemTags.itemId, itemIds)),
      this.drizzle.db
        .select({ id: itemPhotos.id, itemId: itemPhotos.itemId, ossKey: itemPhotos.ossKey, sortOrder: itemPhotos.sortOrder })
        .from(itemPhotos)
        .where(inArray(itemPhotos.itemId, itemIds)),
    ])
    const tagsByItem = new Map<string, string[]>()
    for (const t of tagRows) {
      if (!itemIds.includes(t.itemId)) continue
      const list = tagsByItem.get(t.itemId) ?? []
      list.push(t.tag)
      tagsByItem.set(t.itemId, list)
    }
    const photosByItem = new Map<string, Array<{ photoId: string; ossKey: string; url: string; sortOrder: number }>>()
    for (const p of photoRows) {
      if (!itemIds.includes(p.itemId)) continue
      const list = photosByItem.get(p.itemId) ?? []
      // 直接给 OSS 签名 URL：小程序 image 组件无法携带 Authorization 头，302 代理对小程序不可用
      list.push({ photoId: p.id, ossKey: p.ossKey, url: this.oss.signedGetUrl(p.ossKey), sortOrder: p.sortOrder })
      photosByItem.set(p.itemId, list)
    }

    return {
      snapshot: {
        locations: locationRows.map(mapLocation),
        items: itemRows.map(i => ({
          id: i.id,
          name: i.name,
          locationId: i.locationId,
          quantity: i.quantity,
          notes: i.notes,
          ownerId: i.ownerId,
          tags: tagsByItem.get(i.id) ?? [],
          photos: photosByItem.get(i.id) ?? [],
          createdAt: i.createdAt.toISOString(),
          updatedAt: i.updatedAt.toISOString(),
        })),
      },
      serverTime: now.toISOString(),
    }
  }

  // ---- 单条变更落地 ----

  private async applyChange(user: SessionUser, householdId: string, change: SyncChange): Promise<'accepted' | 'stale'> {
    if (!change || typeof change !== 'object') throw new BadRequestException('变更格式错误')
    if (!change.entityId) throw new BadRequestException('变更缺少 entityId')
    const clientTs = new Date(change.clientTimestamp)
    if (Number.isNaN(clientTs.getTime())) throw new BadRequestException(`无效的 clientTimestamp：${change.clientTimestamp}`)

    if (change.entity === 'items') {
      return this.applyItemChange(user, householdId, change, clientTs)
    }
    if (change.entity === 'locations') {
      return this.applyLocationChange(householdId, change, clientTs)
    }
    // item_photos 由服务端 REST 写路径记录，客户端不 push
    throw new BadRequestException(`不支持推送的实体：${change.entity}`)
  }

  private async applyItemChange(
    user: SessionUser,
    householdId: string,
    change: SyncChange,
    clientTs: Date,
  ): Promise<'accepted' | 'stale'> {
    const db = this.drizzle.db
    const id = change.entityId

    if (change.op === 'delete') {
      const found = await db.select().from(items).where(eq(items.id, id))
      if (!found.length || found[0].deletedAt) return 'accepted' // 目标状态已达成
      if (found[0].householdId !== householdId) return 'stale' // 跨住所 id 冲突，拒绝
      if (found[0].updatedAt >= clientTs) return 'stale' // 服务端更新（LWW）

      await db.transaction(async tx => {
        await tx.update(items).set({ deletedAt: clientTs, updatedAt: clientTs }).where(eq(items.id, id))
        await tx.delete(itemTags).where(eq(itemTags.itemId, id))
      })
      await this.logChange(user, householdId, change, clientTs)
      return 'accepted'
    }

    const data = change.data ?? {}
    const name = String(data.name ?? '').trim()
    if (!name) throw new BadRequestException(`物品 ${id} 缺少名称`)
    if (name.length > NAME_MAX) throw new BadRequestException(`物品名称最多 ${NAME_MAX} 字`)
    const locationId = String(data.locationId ?? '')
    if (!locationId) throw new BadRequestException(`物品 ${id} 缺少收纳空间`)
    const quantity = Math.max(1, Math.floor(Number(data.quantity) || 1))
    const notes = data.notes == null ? null : String(data.notes).slice(0, 500) || null
    const tags: string[] = Array.isArray(data.tags)
      ? [...new Set((data.tags as unknown[]).map(t => String(t).trim()).filter((t): t is string => Boolean(t) && t.length <= 20))].slice(0, 10)
      : []

    const found = await db.select().from(items).where(eq(items.id, id))
    if (found.length && found[0].householdId !== householdId) return 'stale'
    if (found.length && found[0].updatedAt >= clientTs) return 'stale'

    const createdAt = data.createdAt ? new Date(String(data.createdAt)) : clientTs
    const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? clientTs : createdAt

    // upsert：跨住所冲突已排除，existing 可安全覆盖（含复活墓碑）
    await db.transaction(async tx => {
      if (found.length) {
        await tx
          .update(items)
          .set({
            locationId,
            name,
            quantity,
            notes,
            deletedAt: null,
            updatedAt: clientTs,
          })
          .where(eq(items.id, id))
      } else {
        await tx.insert(items).values({
          id,
          householdId,
          locationId,
          name,
          quantity,
          notes,
          ownerId: user.id,
          createdAt: safeCreatedAt,
          updatedAt: clientTs,
        })
      }
      await tx.delete(itemTags).where(eq(itemTags.itemId, id))
      if (tags.length) {
        await tx.insert(itemTags).values(tags.map(tag => ({ itemId: id, tag })))
      }
    })
    await this.logChange(user, householdId, change, clientTs)
    return 'accepted'
  }

  private async applyLocationChange(
    householdId: string,
    change: SyncChange,
    clientTs: Date,
  ): Promise<'accepted' | 'stale'> {
    const db = this.drizzle.db
    const id = change.entityId

    if (change.op === 'delete') {
      const found = await db.select().from(locations).where(eq(locations.id, id))
      if (!found.length || found[0].deletedAt) return 'accepted'
      if (found[0].householdId !== householdId) return 'stale'

      // 有存活子空间或存活物品挂载时拒绝删除（客户端应先删子实体）
      const [child, attached] = await Promise.all([
        db.select({ id: locations.id }).from(locations).where(and(eq(locations.parentId, id), isNull(locations.deletedAt))).limit(1),
        db.select({ id: items.id }).from(items).where(and(eq(items.locationId, id), isNull(items.deletedAt))).limit(1),
      ])
      if (child.length || attached.length) return 'stale'
      if (found[0].updatedAt >= clientTs) return 'stale'

      await db.update(locations).set({ deletedAt: clientTs, updatedAt: clientTs }).where(eq(locations.id, id))
      await this.logChange(null, householdId, change, clientTs)
      return 'accepted'
    }

    const data = change.data ?? {}
    const name = String(data.name ?? '').trim()
    if (!name) throw new BadRequestException(`空间 ${id} 缺少名称`)
    if (name.length > LOCATION_NAME_MAX) throw new BadRequestException(`空间名称最多 ${LOCATION_NAME_MAX} 字`)
    const level = String(data.level ?? 'room')
    if (!['room', 'furniture', 'compartment'].includes(level)) throw new BadRequestException(`空间 ${id} 层级无效`)
    const parentId = data.parentId == null ? null : String(data.parentId) || null
    const icon = data.icon == null ? null : String(data.icon).slice(0, 32) || null
    const sortOrder = Math.max(0, Math.floor(Number(data.sortOrder) || 0))

    const found = await db.select().from(locations).where(eq(locations.id, id))
    if (found.length && found[0].householdId !== householdId) return 'stale'
    if (found.length && found[0].updatedAt >= clientTs) return 'stale'

    if (found.length) {
      await db
        .update(locations)
        .set({ parentId, level, name, icon, sortOrder, deletedAt: null, updatedAt: clientTs })
        .where(eq(locations.id, id))
    } else {
      const now = new Date()
      await db.insert(locations).values({
        id,
        householdId,
        parentId,
        level,
        name,
        icon,
        sortOrder,
        createdAt: now,
        updatedAt: clientTs,
      })
    }
    await this.logChange(null, householdId, change, clientTs)
    return 'accepted'
  }

  /** push 落库成功后写同步日志（clientTimestamp 保留客户端值，其他设备经 pull 增量获取） */
  private async logChange(
    user: SessionUser | null,
    householdId: string,
    change: SyncChange,
    clientTs: Date,
  ) {
    await this.drizzle.db.insert(syncChanges).values({
      id: crypto.randomUUID(),
      userId: user?.id ?? '',
      householdId,
      entity: change.entity,
      entityId: change.entityId,
      op: change.op,
      dataJson: change.data ? JSON.stringify(change.data) : null,
      clientTimestamp: clientTs,
      syncedAt: new Date(),
    })
  }
}

function mapLocation(l: typeof locations.$inferSelect) {
  return {
    id: l.id,
    name: l.name,
    parentId: l.parentId,
    level: l.level,
    icon: l.icon,
    sortOrder: l.sortOrder,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }
}
