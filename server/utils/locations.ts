import { sql } from 'drizzle-orm'

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
  item_count: number
}

// 递归 CTE 一次取整棵树 + 每个位置直挂物品数，JS 组装
export async function getLocationTree(db: DB, householdId: string): Promise<LocationTreeNode[]> {
  const rows = await db.all<LocationRow>(sql`
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
      (SELECT COUNT(*) FROM items i WHERE i.location_id = loc.id) AS item_count
    FROM loc
    ORDER BY loc.name
  `)

  const nodeMap = new Map<string, LocationTreeNode>()
  for (const r of rows) {
    nodeMap.set(r.id, {
      id: r.id,
      name: r.name,
      level: r.level,
      icon: r.icon,
      itemCount: r.item_count,
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
  prune(roots)

  return roots
}
