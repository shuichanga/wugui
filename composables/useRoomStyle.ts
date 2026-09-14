interface RoomColors {
  bg: string
  accent: string
  soft: string
}

interface ItemColors {
  bg: string
  accent: string
  soft: string
  border: string
  text: string
}

// 房间名称 → 自绘图标 slug（配合 components/LocationIcon.vue 渲染）
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

// 家具名称 → 自绘图标 slug
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

// 收纳位（格位）名称 → 自绘图标 slug
const compartmentIconMap: { keywords: string[]; slug: string }[] = [
  { keywords: ['抽', '屉'], slug: 'drawer' },
  { keywords: ['层', '第', '隔板'], slug: 'shelf-layer' },
  { keywords: ['挂'], slug: 'hanging-rod' },
  { keywords: ['格', '区', '分', '栏'], slug: 'grid-cell' },
  { keywords: ['篮'], slug: 'basket' },
  { keywords: ['文件', '档案'], slug: 'file-box' },
]

const defaultCompartmentIcon = 'grid-cell'

// 4 组家具配色：绿色系、低饱和度
const itemPalette: ItemColors[] = [
  { bg: '#ffffff', accent: '#16a34a', soft: '#d3efdd', border: '#bbf7d0', text: '#0f7a38' },
  { bg: '#ffffff', accent: '#15803d', soft: '#dcfce7', border: '#bbf7d0', text: '#166534' },
  { bg: '#ffffff', accent: '#0d9488', soft: '#ccfbf1', border: '#99f6e4', text: '#0f766e' },
  { bg: '#ffffff', accent: '#0f7a38', soft: '#d3efdd', border: '#a7f3d0', text: '#166534' },
]

// 6 组绿色系配色：以品牌绿为基准的相近色，低饱和度（与白色混合 30%）
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

export function useRoomStyle() {
  // 返回自绘图标 slug，由 <LocationIcon :slug="..." /> 渲染
  function getRoomIcon(name: string): string {
    const match = roomIconMap.find(r => r.keywords.some(k => name.includes(k)))
    return match?.slug ?? defaultRoomIcon
  }

  function getRoomColors(name: string): RoomColors {
    return colorPalette[hashString(name) % colorPalette.length]
  }

  function getItemColors(name: string): ItemColors {
    return itemPalette[hashString(name) % itemPalette.length]
  }

  function getFurnitureIcon(name: string): string {
    const match = furnitureIconMap.find(r => r.keywords.some(k => name.includes(k)))
    return match?.slug ?? defaultFurnitureIcon
  }

  function getCompartmentIcon(name: string): string {
    const match = compartmentIconMap.find(r => r.keywords.some(k => name.includes(k)))
    return match?.slug ?? defaultCompartmentIcon
  }

  return { getRoomIcon, getRoomColors, getItemColors, getFurnitureIcon, getCompartmentIcon }
}
