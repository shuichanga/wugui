import { and, eq } from 'drizzle-orm'
import { locations } from '~/drizzle/schema'

// 编辑位置：名称 / 图标（不支持跨父级移动，MVP 不做）
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<Record<string, unknown>>(event) ?? {}

  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '位置名称不能为空' })
  if (name.length > 30) throw createError({ statusCode: 400, statusMessage: '位置名称最多 30 字' })
  const icon = String(body.icon ?? '').trim().slice(0, 32) || null

  const db = getDB(event)
  const found = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.householdId, householdId)))
  if (!found.length) throw createError({ statusCode: 404, statusMessage: '位置不存在' })

  await db.update(locations)
    .set({ name, icon, updatedAt: new Date().toISOString() })
    .where(eq(locations.id, id))

  return { ok: true, id, name, icon }
})
