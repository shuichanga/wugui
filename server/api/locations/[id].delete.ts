import { and, eq } from 'drizzle-orm'
import { items, locations } from '~/drizzle/schema'

// 删除空间：有子空间或有物品直挂时拒绝
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const found = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '空间不存在' })

  const children = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.parentId, id))
    .limit(1)
  if (children.length) throw createError({ statusCode: 409, statusMessage: '请先删除其子空间' })

  const attached = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.locationId, id))
    .limit(1)
  if (attached.length) throw createError({ statusCode: 409, statusMessage: '该空间下仍有物品，请先移走或删除物品' })

  await db.delete(locations).where(eq(locations.id, id))
  return { ok: true }
})
