// 数据迁移业务：全量导出（JSON/CSV 共用数据）+ 合并导入
// 从 Cloudflare D1 版本移植，契约保持不变（前端 settings.vue 已按此契约写好）
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { households, itemTags, items, locations, syncChanges, users } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import type { SessionUser } from '../auth/session.types'

const LEVELS = ['room', 'furniture', 'compartment'] as const

export interface ExportData {
  household: { id: string; name: string; exportedAt: string }
  locations: { id: string; parentId: string | null; level: string; name: string; path: string }[]
  items: {
    name: string
    quantity: number
    notes: string | null
    tags: string[]
    locationPath: string
    ownerName: string
    createdAt: Date | string
    updatedAt: Date | string
  }[]
}

@Injectable()
export class TransferService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** GET /api/export —— 全量导出当前住所（空间树 + 物品含标签） */
  async export(householdId: string): Promise<ExportData> {
    const db = this.drizzle.db
    const [hh] = await db
      .select({ id: households.id, name: households.name })
      .from(households)
      .where(eq(households.id, householdId))
    if (!hh) throw new NotFoundException('住所不存在')

    const [locRows, itemRows] = await Promise.all([
      db
        .select({ id: locations.id, parentId: locations.parentId, level: locations.level, name: locations.name })
        .from(locations)
        .where(and(eq(locations.householdId, householdId), isNull(locations.deletedAt))),
      db
        .select({
          id: items.id, name: items.name, quantity: items.quantity, notes: items.notes,
          locationId: items.locationId, ownerId: items.ownerId, createdAt: items.createdAt, updatedAt: items.updatedAt,
        })
        .from(items)
        .where(and(eq(items.householdId, householdId), isNull(items.deletedAt))),
    ])

    const [tagRows, ownerRows] = await Promise.all([
      itemRows.length
        ? db.select().from(itemTags).where(inArray(itemTags.itemId, itemRows.map(r => r.id)))
        : Promise.resolve([] as { itemId: string; tag: string }[]),
      itemRows.length
        ? db.select({ id: users.id, displayName: users.displayName, email: users.email })
            .from(users).where(inArray(users.id, [...new Set(itemRows.map(r => r.ownerId))]))
        : Promise.resolve([] as { id: string; displayName: string | null; email: string | null }[]),
    ])

    // 空间完整路径（"客厅 / 电视柜"）
    const byId = new Map(locRows.map(l => [l.id, l]))
    const pathOf = (id: string): string => {
      const parts: string[] = []
      let cur = byId.get(id)
      while (cur) {
        parts.unshift(cur.name)
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return parts.join(' / ')
    }
    const ownerBy = new Map(ownerRows.map(o => [o.id, o.displayName ?? (o.email ? o.email.split('@')[0] : null) ?? '未知成员']))
    const tagsBy = new Map<string, string[]>()
    for (const t of tagRows) tagsBy.set(t.itemId, [...(tagsBy.get(t.itemId) ?? []), t.tag])

    return {
      household: { id: hh.id, name: hh.name, exportedAt: new Date().toISOString() },
      locations: locRows.map(l => ({
        id: l.id,
        parentId: l.parentId,
        level: l.level,
        name: l.name,
        path: pathOf(l.id),
      })),
      items: itemRows.map(r => ({
        name: r.name,
        quantity: r.quantity,
        notes: r.notes,
        tags: tagsBy.get(r.id) ?? [],
        locationPath: pathOf(r.locationId),
        ownerName: ownerBy.get(r.ownerId) ?? '未知成员',
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    }
  }

  /**
   * POST /api/import —— 合并导入：空间按完整路径逐级 find-or-create；
   * 物品按（空间 + 名称）去重，已存在则跳过；只新增不删除，照片不在备份内
   */
  async import(user: SessionUser, householdId: string, body: {
    locations?: { path?: unknown }[]
    items?: { name?: unknown; quantity?: unknown; notes?: unknown; tags?: unknown; locationPath?: unknown }[]
  }) {
    const locationsIn = Array.isArray(body?.locations) ? body.locations : []
    const itemsIn = Array.isArray(body?.items) ? body.items : []
    if (!locationsIn.length && !itemsIn.length) {
      throw new BadRequestException('导入文件中没有数据')
    }
    if (itemsIn.length > 10000 || locationsIn.length > 5000) {
      throw new BadRequestException('导入数据量超出限制')
    }

    const db = this.drizzle.db
    const now = new Date()

    // ---- 空间：现有空间按完整路径建索引，逐级 find-or-create（排除墓碑，同名空间将新建存活行） ----
    const existing = await db
      .select({ id: locations.id, parentId: locations.parentId, name: locations.name })
      .from(locations)
      .where(and(eq(locations.householdId, householdId), isNull(locations.deletedAt)))
    const byId = new Map(existing.map(l => [l.id, l]))
    const pathOf = (l: { id: string }): string => {
      const parts: string[] = []
      let cur = byId.get(l.id)
      while (cur) {
        parts.unshift(cur.name)
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return parts.join(' / ')
    }
    const pathIdMap = new Map<string, string>()
    for (const l of existing) pathIdMap.set(pathOf(l), l.id)

    let createdLocations = 0
    const createdLocationLog: { id: string; name: string; parentId: string | null; level: string }[] = []

    const ensurePath = async (path: string): Promise<string | null> => {
      const known = pathIdMap.get(path)
      if (known) return known
      const parts = path.split(' / ').map(s => s.trim()).filter(Boolean)
      if (!parts.length) return null
      let parentId: string | null = null
      let cur = ''
      for (let i = 0; i < parts.length && i < LEVELS.length; i++) {
        cur = cur ? `${cur} / ${parts[i]}` : parts[i]
        const mapped = pathIdMap.get(cur)
        if (mapped) {
          parentId = mapped
          continue
        }
        const id = crypto.randomUUID()
        const rec = { id, parentId, name: String(parts[i]).slice(0, 30) }
        await db.insert(locations).values({
          ...rec,
          householdId,
          level: LEVELS[i],
          createdAt: now,
          updatedAt: now,
        })
        existing.push(rec)
        byId.set(id, rec)
        pathIdMap.set(cur, id)
        createdLocations++
        createdLocationLog.push({ id, name: rec.name, parentId, level: LEVELS[i] })
        parentId = id
      }
      return parentId
    }

    // 空间树：浅层路径先建，保证父级存在
    const allPaths = new Set<string>()
    for (const l of locationsIn) if (typeof l.path === 'string' && l.path.trim()) allPaths.add(l.path.trim())
    for (const it of itemsIn) if (typeof it.locationPath === 'string' && it.locationPath.trim()) allPaths.add(it.locationPath.trim())
    const sortedPaths = [...allPaths].sort((a, b) => a.split(' / ').length - b.split(' / ').length)
    for (const p of sortedPaths) await ensurePath(p)

    // ---- 物品：按（空间 + 名称）去重后批量新增（排除墓碑物品） ----
    const existingItems = await db
      .select({ name: items.name, locationId: items.locationId })
      .from(items)
      .where(and(eq(items.householdId, householdId), isNull(items.deletedAt)))
    const itemKey = (locationId: string, name: string) => `${locationId}::${name}`
    const itemSet = new Set(existingItems.map(i => itemKey(i.locationId, i.name)))

    const toCreate: {
      id: string; householdId: string; locationId: string; name: string; quantity: number
      notes: string | null; ownerId: string; createdAt: Date; updatedAt: Date
    }[] = []
    const tagsToCreate = new Set<string>()
    let skippedItems = 0

    for (const it of itemsIn) {
      const name = String(it.name ?? '').trim()
      if (!name) {
        skippedItems++
        continue
      }
      const locationId = typeof it.locationPath === 'string' ? await ensurePath(it.locationPath) : null
      if (!locationId) {
        skippedItems++
        continue
      }
      const key = itemKey(locationId, name)
      if (itemSet.has(key)) {
        skippedItems++
        continue
      }
      itemSet.add(key)
      const id = crypto.randomUUID()
      const quantity = Math.min(9999, Math.max(1, Math.round(Number(it.quantity) || 1)))
      toCreate.push({
        id, householdId, locationId,
        name: name.slice(0, 100),
        quantity,
        notes: typeof it.notes === 'string' ? it.notes.slice(0, 500) : null,
        ownerId: user.id,
        createdAt: now,
        updatedAt: now,
      })
      if (Array.isArray(it.tags)) {
        for (const tag of it.tags.slice(0, 10)) {
          const t = String(tag).trim().slice(0, 20)
          if (t) tagsToCreate.add(`${id}::${t}`)
        }
      }
    }

    for (let i = 0; i < toCreate.length; i += 100) {
      await db.insert(items).values(toCreate.slice(i, i + 100))
    }
    if (tagsToCreate.size) {
      const tagRows = [...tagsToCreate].map(k => {
        const idx = k.indexOf('::')
        return { itemId: k.slice(0, idx), tag: k.slice(idx + 2) }
      })
      for (let i = 0; i < tagRows.length; i += 100) {
        await db.insert(itemTags).values(tagRows.slice(i, i + 100))
      }
    }

    // ---- 同步日志：导入结果对小程序可见（批量写入，分片 100） ----
    const tagsByItem = new Map<string, string[]>()
    for (const k of tagsToCreate) {
      const idx = k.indexOf('::')
      const itemId = k.slice(0, idx)
      const tag = k.slice(idx + 2)
      tagsByItem.set(itemId, [...(tagsByItem.get(itemId) ?? []), tag])
    }
    const logRows: (typeof syncChanges.$inferInsert)[] = []
    for (const l of createdLocationLog) {
      logRows.push({
        id: crypto.randomUUID(), userId: user.id, householdId,
        entity: 'locations', entityId: l.id, op: 'create',
        dataJson: JSON.stringify({ name: l.name, parentId: l.parentId, level: l.level, icon: null, sortOrder: 0 }),
        clientTimestamp: now, syncedAt: now,
      })
    }
    for (const it of toCreate) {
      logRows.push({
        id: crypto.randomUUID(), userId: user.id, householdId,
        entity: 'items', entityId: it.id, op: 'create',
        dataJson: JSON.stringify({
          name: it.name, locationId: it.locationId, quantity: it.quantity, notes: it.notes,
          tags: tagsByItem.get(it.id) ?? [], createdAt: it.createdAt.toISOString(),
        }),
        clientTimestamp: now, syncedAt: now,
      })
    }
    for (let i = 0; i < logRows.length; i += 100) {
      await db.insert(syncChanges).values(logRows.slice(i, i + 100))
    }

    return { createdLocations, createdItems: toCreate.length, skippedItems }
  }
}
