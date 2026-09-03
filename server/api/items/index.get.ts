import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { items } from '~/drizzle/schema'
import { decorateItems, getLocationPathMap } from '~/server/utils/items'

// 物品列表 + 检索：keyword（名称/备注/标签模糊）、location_id（直挂）、tag
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const q = getQuery(event)
  const keyword = String(q.keyword ?? '').trim()
  const locationId = String(q.location_id ?? '').trim()
  const tag = String(q.tag ?? '').trim()
  const limit = Math.min(50, Math.max(1, Number(q.limit) || 20))
  const offset = Math.max(0, Number(q.offset) || 0)

  const conditions = [eq(items.householdId, householdId)]
  if (keyword) {
    conditions.push(or(
      like(items.name, `%${keyword}%`),
      like(items.notes, `%${keyword}%`),
      sql`EXISTS (SELECT 1 FROM item_tags t WHERE t.item_id = ${items.id} AND t.tag LIKE ${`%${keyword}%`})`,
    )!)
  }
  if (locationId) conditions.push(eq(items.locationId, locationId))
  if (tag) {
    conditions.push(sql`EXISTS (SELECT 1 FROM item_tags t WHERE t.item_id = ${items.id} AND t.tag = ${tag})`)
  }

  const db = getDB(event)
  const rows = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.createdAt))
    .limit(limit)
    .offset(offset)

  const pathMap = await getLocationPathMap(db, householdId)
  const decorated = await decorateItems(db, rows, pathMap)
  return { items: decorated }
})
