import {
  Sofa, Bed, CookingPot, Bath, BookOpen, Leaf,
  Package, DoorOpen, Home, UtensilsCrossed,
  Shirt, Dumbbell, Car, Warehouse, Layers, Droplets,
  Briefcase, Baby, Clapperboard,
  Tv, Lamp, Armchair, Monitor, Headphones, Gamepad2,
  Refrigerator, Microwave, Wine,
  Boxes, Archive, Box, Folder, LayoutGrid, Layers3, Grid3x3,
  type LucideIcon,
} from 'lucide-vue-next'

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

// 房间名称 → Lucide 图标映射
const roomIconMap: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['客厅', '起居'], icon: Sofa },
  { keywords: ['卧', '睡', '床'], icon: Bed },
  { keywords: ['厨', '灶'], icon: CookingPot },
  { keywords: ['卫', '浴', '厕'], icon: Bath },
  { keywords: ['书'], icon: BookOpen },
  { keywords: ['阳', '露'], icon: Leaf },
  { keywords: ['储', '藏', '仓'], icon: Package },
  { keywords: ['门', '玄', '入口'], icon: DoorOpen },
  { keywords: ['餐', '饭'], icon: UtensilsCrossed },
  { keywords: ['衣帽', '衣', '衣柜'], icon: Shirt },
  { keywords: ['健身', '运动'], icon: Dumbbell },
  { keywords: ['车'], icon: Car },
  { keywords: ['阁楼', '阁'], icon: Warehouse },
  { keywords: ['地下'], icon: Layers },
  { keywords: ['洗衣'], icon: Droplets },
  { keywords: ['办公'], icon: Briefcase },
  { keywords: ['儿童', '小孩', '孩子'], icon: Baby },
  { keywords: ['影音', '影', '视听'], icon: Clapperboard },
]

const defaultIcon = Home

// 家具名称 → Lucide 图标映射
const furnitureIconMap: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['电视', '影音'], icon: Tv },
  { keywords: ['书', '书架', '书柜'], icon: BookOpen },
  { keywords: ['衣', '橱', '柜', '吊'], icon: Shirt },
  { keywords: ['床'], icon: Bed },
  { keywords: ['桌', '书柜', '台', '梳妆'], icon: Armchair },
  { keywords: ['沙', '躺'], icon: Armchair },
  { keywords: ['灯'], icon: Lamp },
  { keywords: ['电脑', '笔电', '笔记本', '平板', '屏'], icon: Monitor },
  { keywords: ['耳机', '音响', '音'], icon: Headphones },
  { keywords: ['游戏', '手柄', '机'], icon: Gamepad2 },
  { keywords: ['冰'], icon: Refrigerator },
  { keywords: ['微波', '烤箱', '蒸'], icon: Microwave },
  { keywords: ['酒', '杯', '饮'], icon: Wine },
  { keywords: ['鞋'], icon: Boxes },
  { keywords: ['箱', '盒'], icon: Archive },
  { keywords: ['抽屉'], icon: Folder },
  { keywords: ['架', '层'], icon: LayoutGrid },
]

const defaultFurnitureIcon = Package

// 收纳位（格位）名称 → Lucide 图标映射
const compartmentIconMap: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ['层', '第'], icon: Layers3 },
  { keywords: ['格', '区', '分', '栏'], icon: Grid3x3 },
  { keywords: ['抽', '屉'], icon: Folder },
  { keywords: ['箱', '盒', '包'], icon: Archive },
  { keywords: ['架', '板', '托'], icon: LayoutGrid },
]

const defaultCompartmentIcon = Box

// 4 组家具配色：绿色系、低饱和度
const itemPalette: ItemColors[] = [
  { bg: '#ffffff', accent: '#059669', soft: '#d1fae5', border: '#a7f3d0', text: '#047857' },
  { bg: '#ffffff', accent: '#16a34a', soft: '#dcfce7', border: '#bbf7d0', text: '#15803d' },
  { bg: '#ffffff', accent: '#0d9488', soft: '#ccfbf1', border: '#99f6e4', text: '#0f766e' },
  { bg: '#ffffff', accent: '#15803d', soft: '#d1fae5', border: '#a7f3d0', text: '#166534' },
]

// 6 组绿色系配色：以 emerald 主题色为基准的相近色，低饱和度（与白色混合 30%）
const mix = (hex: string, ratio: number) => {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 0xff) * (1 - ratio) + 0xff * ratio)
  const g = Math.round(((n >> 8) & 0xff) * (1 - ratio) + 0xff * ratio)
  const b = Math.round((n & 0xff) * (1 - ratio) + 0xff * ratio)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

const colorPalette: RoomColors[] = [
  { bg: '#ecfdf5', accent: mix('#059669', 0.3), soft: '#a7f3d0' }, // emerald → 浅 emerald
  { bg: '#f0fdf4', accent: mix('#16a34a', 0.3), soft: '#86efac' }, // green → 浅 green
  { bg: '#f0fdfa', accent: mix('#0d9488', 0.3), soft: '#99f6e4' }, // teal → 浅 teal
  { bg: '#f7fee7', accent: mix('#65a30d', 0.3), soft: '#bef264' }, // lime → 浅 lime
  { bg: '#ecfeff', accent: mix('#0d9488', 0.3), soft: '#5eead4' }, // cyan-teal → 浅 cyan-teal
  { bg: '#f0fdf4', accent: mix('#15803d', 0.3), soft: '#bbf7d0' }, // dark green → 浅 dark green
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
  function getRoomIcon(name: string): LucideIcon {
    const match = roomIconMap.find(r => r.keywords.some(k => name.includes(k)))
    return match?.icon ?? defaultIcon
  }

  function getRoomColors(name: string): RoomColors {
    return colorPalette[hashString(name) % colorPalette.length]
  }

  function getItemColors(name: string): ItemColors {
    return itemPalette[hashString(name) % itemPalette.length]
  }

  function getFurnitureIcon(name: string): LucideIcon {
    const match = furnitureIconMap.find(r => r.keywords.some(k => name.includes(k)))
    return match?.icon ?? defaultFurnitureIcon
  }

  function getCompartmentIcon(name: string): LucideIcon {
    const match = compartmentIconMap.find(r => r.keywords.some(k => name.includes(k)))
    return match?.icon ?? defaultCompartmentIcon
  }

  return { getRoomIcon, getRoomColors, getItemColors, getFurnitureIcon, getCompartmentIcon }
}
