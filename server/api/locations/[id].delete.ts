import { and, eq } from 'drizzle-orm'
import { items, locations } from '~/drizzle/schema'

// 删除位置：有子位置或有物品直挂时拒绝
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const found = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '位置不存在' })

  const children = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.parentId, id))
    .limit(1)
  if (children.length) throw createError({ statusCode: 409, statusMessage: '请先删除其子位置' })

  const attached = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.locationId, id))
    .limit(1)
  if (attached.length) throw createError({ statusCode: 409, statusMessage: '该位置下仍有物品，请先移走或删除物品' })

  await db.delete(locations).where(eq(locations.id, id))
  return { ok: true }
})
