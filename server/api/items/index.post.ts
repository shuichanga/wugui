import { and, eq } from 'drizzle-orm'
import { items, itemTags, locations } from '~/drizzle/schema'

// 新增物品
export default defineEventHandler(async (event) => {
  const { user, householdId } = await requireHousehold(event)
  const body = await readBody<Record<string, unknown>>(event) ?? {}

  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '物品名称不能为空' })
  if (name.length > 100) throw createError({ statusCode: 400, statusMessage: '物品名称最多 100 字' })

  const locationId = String(body.locationId ?? '')
  const quantity = Math.max(1, Math.floor(Number(body.quantity) || 1))
  const notes = String(body.notes ?? '').trim().slice(0, 500) || null
  const tags = Array.isArray(body.tags)
    ? [...new Set(body.tags.map(t => String(t).trim()).filter(t => t && t.length <= 20))].slice(0, 10)
    : []

  const db = getDB(event)
  const loc = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.id, locationId), eq(locations.householdId, householdId)))
  if (!loc.length) throw createError({ statusCode: 404, statusMessage: '收纳位置不存在' })

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.insert(items).values({
    id,
    householdId,
    locationId,
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
})
