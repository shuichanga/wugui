import { sql } from 'drizzle-orm'

// 返回当前住所热门标签（按物品数量降序）
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const db = getDB(event)
  const rows = await db.all<{ tag: string; count: number }>(sql`
    SELECT t.tag, count(*) as count
    FROM item_tags t
    JOIN items i ON t.item_id = i.id
    WHERE i.household_id = ${householdId}
    GROUP BY t.tag
    ORDER BY count(*) DESC
    LIMIT 20
  `)
  return { tags: rows }
})
