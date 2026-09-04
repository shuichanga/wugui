import { and, eq } from 'drizzle-orm'
import { households } from '~/drizzle/schema'

// 改住所名（仅 owner）
export default defineEventHandler(async (event) => {
  const { householdId, role } = await requireHousehold(event)
  if (role !== 'owner') throw createError({ statusCode: 403, statusMessage: '仅住所创建者可改名' })

  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '住所名称不能为空' })
  if (name.length > 20) throw createError({ statusCode: 400, statusMessage: '住所名称最多 20 字' })

  const db = getDB(event)
  await db.update(households)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(and(eq(households.id, householdId)))

  return { ok: true, name }
})
