import { and, eq } from 'drizzle-orm'
import { items, recentViews } from '~/drizzle/schema'

// 记录查看：upsert（同一物品只保留最新时间），物品需属于当前住所
export default defineEventHandler(async (event) => {
  const { user, householdId } = await requireHousehold(event)
  const body = await readBody<{ itemId?: string }>(event)
  const itemId = String(body?.itemId ?? '').trim()
  if (!itemId) throw createError({ statusCode: 400, statusMessage: '缺少 itemId' })

  const db = getDB(event)
  const found = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '物品不存在' })

  const now = new Date().toISOString()
  await db
    .insert(recentViews)
    .values({ userId: user.id, itemId, viewedAt: now })
    .onConflictDoUpdate({
      target: [recentViews.userId, recentViews.itemId],
      set: { viewedAt: now },
    })
  return { ok: true }
})
