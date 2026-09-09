import { and, desc, eq } from 'drizzle-orm'
import { items, recentViews } from '~/drizzle/schema'
import { decorateItems, getLocationPathMap } from '~/server/utils/items'

// 最近查看：当前用户视角，join items 限制在当前住所（已删物品自然过滤）
export default defineEventHandler(async (event) => {
  const { user, householdId } = await requireHousehold(event)
  const limit = Math.min(20, Math.max(1, Number(getQuery(event).limit) || 10))

  const db = getDB(event)
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
    .where(and(eq(recentViews.userId, user.id), eq(items.householdId, householdId)))
    .orderBy(desc(recentViews.viewedAt))
    .limit(limit)

  const pathMap = await getLocationPathMap(db, householdId)
  const decorated = await decorateItems(db, rows, pathMap)
  return { items: decorated }
})
