import { and, eq } from 'drizzle-orm'
import { locations } from '~/drizzle/schema'

// 新增位置。level 由父节点推导：无 parent → room；room 下 → furniture；furniture 下 → compartment
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const body = await readBody<Record<string, unknown>>(event) ?? {}

  const name = String(body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, statusMessage: '位置名称不能为空' })
  if (name.length > 30) throw createError({ statusCode: 400, statusMessage: '位置名称最多 30 字' })
  const icon = String(body.icon ?? '').trim().slice(0, 32) || null
  const parentId = String(body.parentId ?? '').trim() || null

  const db = getDB(event)
  let level: 'room' | 'furniture' | 'compartment' = 'room'

  if (parentId) {
    const parent = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, parentId), eq(locations.householdId, householdId)))
    if (!parent.length) throw createError({ statusCode: 404, statusMessage: '父位置不存在' })
    if (parent[0].level === 'compartment') {
      throw createError({ statusCode: 400, statusMessage: '格位下不能再建子位置' })
    }
    level = parent[0].level === 'room' ? 'furniture' : 'compartment'
  }

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await db.insert(locations).values({
    id,
    householdId,
    parentId,
    level,
    name,
    icon,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })

  return { id, name, level, parentId, icon }
})
