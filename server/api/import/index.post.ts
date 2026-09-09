import { eq } from 'drizzle-orm'
import { items, itemTags, locations } from '~/drizzle/schema'

interface ImportLocation { path?: string }
interface ImportItem { name?: string; quantity?: number; notes?: string | null; tags?: string[]; locationPath?: string }

const LEVELS = ['room', 'furniture', 'compartment'] as const

// 合并导入：空间按完整路径逐级 find-or-create；物品按（空间 + 名称）去重，已存在则跳过
// 只新增不删除，照片不在备份内故导入物品无照片
export default defineEventHandler(async (event) => {
  const { user, householdId } = await requireHousehold(event)
  const body = await readBody<{ locations?: ImportLocation[]; items?: ImportItem[] }>(event) ?? {}
  const locationsIn = Array.isArray(body.locations) ? body.locations : []
  const itemsIn = Array.isArray(body.items) ? body.items : []
  if (!locationsIn.length && !itemsIn.length) {
    throw createError({ statusCode: 400, statusMessage: '导入文件中没有数据' })
  }
  if (itemsIn.length > 10000 || locationsIn.length > 5000) {
    throw createError({ statusCode: 400, statusMessage: '导入数据量超出限制' })
  }

  const db = getDB(event)
  const now = new Date().toISOString()

  // ---- 空间：现有空间按完整路径建索引，逐级 find-or-create ----
  const existing = await db
    .select({ id: locations.id, parentId: locations.parentId, name: locations.name })
    .from(locations)
    .where(eq(locations.householdId, householdId))
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

  async function ensurePath(path: string): Promise<string | null> {
    if (pathIdMap.has(path)) return pathIdMap.get(path)!
    const parts = path.split(' / ').map(s => s.trim()).filter(Boolean)
    if (!parts.length) return null
    let parentId: string | null = null
    let cur = ''
    for (let i = 0; i < parts.length && i < LEVELS.length; i++) {
      cur = cur ? `${cur} / ${parts[i]}` : parts[i]!
      const known = pathIdMap.get(cur)
      if (known) {
        parentId = known
        continue
      }
      const id = crypto.randomUUID()
      const rec = { id, parentId, name: parts[i]!.slice(0, 30) }
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

  // ---- 物品：按（空间 + 名称）去重后批量新增 ----
  const existingItems = await db
    .select({ name: items.name, locationId: items.locationId })
    .from(items)
    .where(eq(items.householdId, householdId))
  const itemKey = (locationId: string, name: string) => `${locationId}::${name}`
  const itemSet = new Set(existingItems.map(i => itemKey(i.locationId, i.name)))

  const toCreate: {
    id: string; householdId: string; locationId: string; name: string; quantity: number
    notes: string | null; ownerId: string; createdAt: string; updatedAt: string
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
      name: name.slice(0, 50),
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
      await db.insert(itemTags).values(tagRows.slice(i, i + 100)).onConflictDoNothing()
    }
  }

  return { createdLocations, createdItems: toCreate.length, skippedItems }
})
