// 空间风格工具：房间/家具/格位名称 → 自绘图标 slug（对齐 Web 端 composables/useRoomStyle.ts）
// 与 Web 端保持一致，便于双端视觉对齐

const roomIconMap: { keywords: string[]; slug: string }[] = [
  { keywords: ['主卧'], slug: 'bedroom-master' },
  { keywords: ['儿童', '小孩', '孩子'], slug: 'kids-room' },
  { keywords: ['卧', '睡', '床'], slug: 'bedroom' },
  { keywords: ['客厅', '起居'], slug: 'living-room' },
  { keywords: ['厨', '灶'], slug: 'kitchen' },
  { keywords: ['卫', '浴', '厕'], slug: 'bathroom' },
  { keywords: ['书'], slug: 'study' },
  { keywords: ['阳', '露'], slug: 'balcony' },
  { keywords: ['储', '藏', '仓', '阁', '地下'], slug: 'storage-room' },
  { keywords: ['门', '玄', '入口'], slug: 'entryway' },
  { keywords: ['餐', '饭'], slug: 'dining' },
  { keywords: ['衣帽'], slug: 'closet' },
  { keywords: ['健身', '运动'], slug: 'workshop' },
  { keywords: ['车'], slug: 'garage' },
  { keywords: ['洗衣'], slug: 'laundry' },
  { keywords: ['办公'], slug: 'study' },
]

const defaultRoomIcon = 'home'

const furnitureIconMap: { keywords: string[]; slug: string }[] = [
  { keywords: ['衣柜', '衣', '橱', '吊'], slug: 'wardrobe' },
  { keywords: ['书桌', '桌'], slug: 'desk' },
  { keywords: ['床头柜'], slug: 'nightstand' },
  { keywords: ['书架', '书柜'], slug: 'bookshelf' },
  { keywords: ['鞋'], slug: 'shoe-cabinet' },
  { keywords: ['电视', '影音'], slug: 'tv-stand' },
  { keywords: ['梳妆', '抽屉柜', '斗柜'], slug: 'dresser' },
  { keywords: ['架', '层'], slug: 'shelf' },
  { keywords: ['箱', '盒'], slug: 'storage-box' },
  { keywords: ['行李', '旅行'], slug: 'suitcase' },
  { keywords: ['冰'], slug: 'fridge' },
]

const defaultFurnitureIcon = 'storage-box'

const compartmentIconMap: { keywords: string[]; slug: string }[] = [
  { keywords: ['抽', '屉'], slug: 'drawer' },
  { keywords: ['层', '第', '隔板'], slug: 'shelf-layer' },
  { keywords: ['挂'], slug: 'hanging-rod' },
  { keywords: ['格', '区', '分', '栏'], slug: 'grid-cell' },
  { keywords: ['篮'], slug: 'basket' },
  { keywords: ['文件', '档案'], slug: 'file-box' },
]

const defaultCompartmentIcon = 'grid-cell'

// ── 彩色看板配色（对齐 Web 端 useRoomStyle 的 colorPalette） ──
interface RoomColors {
  bg: string
  accent: string
  soft: string
}

const mix = (hex: string, ratio: number) => {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 0xff) * (1 - ratio) + 0xff * ratio)
  const g = Math.round(((n >> 8) & 0xff) * (1 - ratio) + 0xff * ratio)
  const b = Math.round((n & 0xff) * (1 - ratio) + 0xff * ratio)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const colorPalette: RoomColors[] = [
  { bg: '#e7f4ec', accent: mix('#16a34a', 0.3), soft: '#d3efdd' },
  { bg: '#f0f8f3', accent: mix('#15803d', 0.3), soft: '#bbf7d0' },
  { bg: '#f0fdfa', accent: mix('#0d9488', 0.3), soft: '#99f6e4' },
  { bg: '#f7fee7', accent: mix('#65a30d', 0.3), soft: '#bef264' },
  { bg: '#ecfeff', accent: mix('#0d9488', 0.3), soft: '#5eead4' },
  { bg: '#f0fdf4', accent: mix('#166534', 0.3), soft: '#86efac' },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getRoomColors(name: string): RoomColors {
  return colorPalette[hashString(name) % colorPalette.length]
}

export function getRoomIcon(name: string): string {
  const match = roomIconMap.find(r => r.keywords.some(k => name.includes(k)))
  return match?.slug ?? defaultRoomIcon
}

export function getFurnitureIcon(name: string): string {
  const match = furnitureIconMap.find(r => r.keywords.some(k => name.includes(k)))
  return match?.slug ?? defaultFurnitureIcon
}

export function getCompartmentIcon(name: string): string {
  const match = compartmentIconMap.find(r => r.keywords.some(k => name.includes(k)))
  return match?.slug ?? defaultCompartmentIcon
}
