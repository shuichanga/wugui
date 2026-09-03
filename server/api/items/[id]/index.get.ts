import { and, asc, eq } from 'drizzle-orm'
import { items, itemPhotos } from '~/drizzle/schema'
import { decorateItems, getLocationPathMap } from '~/server/utils/items'

// 物品详情
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''

  const db = getDB(event)
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.householdId, householdId)))
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: '物品不存在' })

  const pathMap = await getLocationPathMap(db, householdId)
  const [item] = await decorateItems(db, rows, pathMap)

  // 全部照片（最多3张）
  const photoRows = await db
    .select({ id: itemPhotos.id })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id))
    .orderBy(asc(itemPhotos.sortOrder))
  const photos = photoRows.map(p => ({ id: p.id, url: `/api/photos/${p.id}` }))

  return { ...item, photos }
})
