// 空间树 / 空间路径 公共工具（locations 与 items 模块共用）
import { eq, sql } from 'drizzle-orm'
import type { FieldPacket } from 'mysql2'
import { locations } from '../db/schema'
import type { DB } from '../db/database.service'

export interface LocationTreeNode {
  id: string
  name: string
  level: 'room' | 'furniture' | 'compartment'
  icon: string | null
  itemCount: number
  children?: LocationTreeNode[]
}

interface LocationRow {
  id: string
  parent_id: string | null
  level: 'room' | 'furniture' | 'compartment'
  name: string
  icon: string | null
  own_count: number
}

// 递归 CTE 一次取整棵树 + 每个空间直挂物品数，JS 组装
// MySQL 8 支持 WITH RECURSIVE；占位符由 drizzle sql 模板转为 ?
export async function getLocationTree(db: DB, householdId: string): Promise<LocationTreeNode[]> {
  // drizzle 的 execute 条件类型在 SELECT 场景下有歧义，直接断言为 [rows, fields]
  const [rows] = (await db.execute<LocationRow>(sql`
    WITH RECURSIVE loc AS (
      SELECT id, parent_id, level, name, icon
      FROM locations
      WHERE household_id = ${householdId} AND parent_id IS NULL
      UNION ALL
      SELECT l.id, l.parent_id, l.level, l.name, l.icon
      FROM locations l
      JOIN loc ON l.parent_id = loc.id
      WHERE l.household_id = ${householdId}
    )
    SELECT loc.id, loc.parent_id, loc.level, loc.name, loc.icon,
      (SELECT COUNT(*) FROM items i WHERE i.location_id = loc.id) AS own_count
    FROM loc
    ORDER BY loc.name
  `)) as unknown as [LocationRow[], FieldPacket[]]

  const nodeMap = new Map<string, LocationTreeNode>()
  for (const r of rows) {
    nodeMap.set(r.id, {
      id: r.id,
      name: r.name,
      level: r.level,
      icon: r.icon,
      itemCount: Number(r.own_count),
      children: [],
    })
  }

  const roots: LocationTreeNode[] = []
  for (const r of rows) {
    const node = nodeMap.get(r.id)!
    if (r.parent_id && nodeMap.has(r.parent_id)) {
      nodeMap.get(r.parent_id)!.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  // 自底向上聚合：itemCount = 直挂数 + 所有后代直挂数
  const aggregate = (node: LocationTreeNode): number => {
    let total = node.itemCount
    for (const child of node.children ?? []) {
      total += aggregate(child)
    }
    node.itemCount = total
    return total
  }

  // 清理空 children 数组，叶子节点渲染更简洁
  const prune = (nodes: LocationTreeNode[]) => {
    for (const n of nodes) {
      if (n.children?.length) {
        prune(n.children)
      } else {
        delete n.children
      }
    }
  }
  for (const root of roots) aggregate(root)
  prune(roots)

  return roots
}

// 全住所空间 id → 完整路径（"客厅 / 电视柜 / 第2抽屉"）
export async function getLocationPathMap(db: DB, householdId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: locations.id, parentId: locations.parentId, name: locations.name })
    .from(locations)
    .where(eq(locations.householdId, householdId))
  const byId = new Map(rows.map(r => [r.id, r]))
  const pathOf = (id: string): string => {
    const parts: string[] = []
    let cur = byId.get(id)
    while (cur) {
      parts.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return parts.join(' / ')
  }
  return new Map(rows.map(r => [r.id, pathOf(r.id)]))
}
