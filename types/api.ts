// 与后端 API 响应对齐的共享类型（原 server/utils 下的类型，Cloudflare 层删除后迁到这里）
export interface ItemSummary {
  id: string
  name: string
  quantity: number
  notes: string | null
  locationId: string
  locationPath: string
  ownerId: string
  ownerName: string
  ownerAvatarUrl: string | null
  tags: string[]
  photoUrl: string | null
  createdAt: string
}

export interface LocationTreeNode {
  id: string
  name: string
  level: 'room' | 'furniture' | 'compartment'
  icon: string | null
  itemCount: number
  children?: LocationTreeNode[]
}
