<template>
  <view class="tab-root">
    <!-- 页头：大标题 + 副行（右上角留空避让小程序胶囊，添加入口在下方按钮） -->
    <view class="head">
      <view class="head-left">
        <text class="head-title">空间</text>
        <text class="head-sub">{{ rooms.length }} 个房间</text>
      </view>
    </view>

    <!-- 新增空间表单 -->
    <view v-if="formOpen" class="card form-card">
      <view class="form-field">
        <text class="form-label">名称</text>
        <input
          v-model="form.name"
          class="input-base"
          placeholder="例如：客厅、电视柜、第2抽屉"
          placeholder-class="add-input-ph"
          maxlength="30"
          confirm-type="done"
          @focus="nameFocused = true"
          @blur="onNameBlur"
          @confirm="onAdd"
        />
        <view v-if="nameFocused && filteredSuggestions.length" class="sugg-row">
          <view
            v-for="s in filteredSuggestions"
            :key="s"
            class="sugg-chip"
            @tap="pickSuggestion(s)"
          >
            <text>{{ s }}</text>
          </view>
        </view>
      </view>

      <view class="form-field">
        <text class="form-label">
          上级空间 <text class="form-label-hint">（不选则为房间）</text>
        </text>
        <picker :range="parentLabels" :value="parentIndex" @change="onPickParent">
          <view class="input-base picker">
            <text :class="parentIndex > 0 ? 'picker-value' : 'placeholder'">
              {{ parentLabels[parentIndex] }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <view
        class="btn-primary submit"
        :class="{ 'btn-disabled': !form.name.trim() || adding }"
        @tap="onAdd"
      >
        <text>{{ adding ? '添加中…' : '添加' }}</text>
      </view>
    </view>

    <!-- 房间列表 -->
    <view class="section">
      <view class="section-title">
        <view class="section-title-left">
          <text class="dot"></text>
          <text>房间</text>
        </view>
        <text class="section-title-aux">点开查看家具与格子</text>
      </view>

      <view v-if="!rooms.length" class="card empty">
        <text class="empty-title">还没有空间</text>
        <text class="empty-sub">先创建一个房间，如客厅、主卧</text>
        <view class="btn-primary empty-add" @tap="formOpen = true">
          <text>＋ 添加房间</text>
        </view>
      </view>

      <view v-else class="room-list">
        <view
          v-for="(room, index) in rooms"
          :key="room.id"
          class="room-card"
          :class="{ 'room-card-colorful': isColorful, 'room-card-dragging': dragIndex === index }"
          @longpress="onCardLongPress(index, $event)"
          @touchmove="onCardTouchMove"
          @touchend="onCardTouchEnd"
          @touchcancel="onCardTouchEnd"
        >
          <!-- 房间行：彩色模式下背景与首页空间看板卡一致（展开后横线以下保持原样） -->
          <view
            class="room-row"
            :class="{ 'room-row-colorful': isColorful }"
            :style="isColorful ? { background: getRoomColors(room.name).accent } : undefined"
          >
            <template v-if="isColorful">
              <view class="row-deco row-deco-1"></view>
              <view class="row-deco row-deco-2"></view>
            </template>
            <view
              class="room-main"
              :aria-expanded="expandedId === room.id"
              @tap="toggleRoom(room.id)"
            >
              <view class="icon-tile" :class="{ 'icon-tile-muted': !isColorful && room.itemCount === 0 }">
                <LocationIcon :slug="getRoomIcon(room.name)" :size="36" :state="iconState(room.itemCount)" />
              </view>
              <text class="room-name">{{ room.name }}</text>
              <text v-if="room.itemCount > 0" class="room-count">
                <text class="room-count-num">{{ room.itemCount }}</text>件
              </text>
              <text v-else class="room-count-empty">空</text>
            </view>
            <view class="room-edit" @tap.stop="onRename(room)">
              <text class="room-edit-icon">✎</text>
            </view>
            <view class="room-arrow" @tap.stop="goDetail(room.id)">
              <text class="room-arrow-icon">›</text>
            </view>
          </view>

          <!-- 展开区：家具 + 格位 -->
          <view v-if="expandedId === room.id" class="room-expand">
            <view v-if="!room.children.length" class="expand-empty">
              <text>还没有家具，点上方"新增空间"在房间下建</text>
            </view>
            <view v-else class="furn-list">
              <view v-for="f in room.children" :key="f.id" class="furn-card">
                <view class="furn-row" @tap="goDetail(f.id)">
                  <LocationIcon :slug="getFurnitureIcon(f.name)" :size="32" class="furn-icon" />
                  <text class="furn-name">{{ f.name }}</text>
                  <text class="furn-count">{{ f.itemCount }} 件</text>
                  <text class="furn-del" @tap.stop="onRemove(f.id, f.name)">删除</text>
                </view>
                <view v-if="f.children.length" class="comp-row">
                  <view
                    v-for="c in f.children"
                    :key="c.id"
                    class="comp-chip"
                    @tap="goDetail(c.id)"
                  >
                    <LocationIcon :slug="getCompartmentIcon(c.name)" :size="24" />
                    <text class="comp-name">{{ c.name }}</text>
                    <text class="comp-count">{{ c.itemCount }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="room-del" @tap="onRemove(room.id, room.name)">
              <text>删除「{{ room.name }}」</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 添加房间：虚线按钮 -->
      <view v-if="rooms.length" class="dash-add" @tap="formOpen = !formOpen">
        <text class="dash-add-icon">{{ formOpen ? '−' : '＋' }}</text>
        <text>{{ formOpen ? '收起表单' : '添加房间' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, reactive, ref } from 'vue'
import LocationIcon from '../LocationIcon.vue'
import {
  buildLocationTree,
  createLocation,
  deleteLocation,
  reorderLocations,
  renameLocation,
  type LocationTreeNode,
} from '../../composables/useLocalData'
import { getCompartmentIcon, getFurnitureIcon, getRoomColors, getRoomIcon } from '../../utils/room-style'
import { useTheme } from '../../composables/useTheme'

const { boardStyle } = useTheme()
const isColorful = computed(() => boardStyle.value === 'colorful')

/** 空间图标颜色：彩色模式固定白；普通模式下空房间用灰版 muted，有物品用主色 default */
function iconState(itemCount: number): 'default' | 'muted' | 'white' {
  if (isColorful.value) return 'white'
  return itemCount === 0 ? 'muted' : 'default'
}

const tree = ref<LocationTreeNode[]>([])
const rooms = computed(() => tree.value)

const formOpen = ref(false)
const nameFocused = ref(false)
const form = reactive({ name: '', parentId: '' })
const adding = ref(false)
const expandedId = ref('')

// ── 上级空间候选：room + furniture，扁平化带缩进 ──
interface ParentOption { id: string; label: string }
const parentOptions = computed<ParentOption[]>(() => {
  const opts: ParentOption[] = []
  const walk = (nodes: LocationTreeNode[], depth: number) => {
    for (const n of nodes) {
      if (n.level === 'compartment') continue
      opts.push({ id: n.id, label: `${'　'.repeat(depth)}${n.name}` })
      walk(n.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return opts
})
const parentLabels = computed(() => ['无（新建房间）', ...parentOptions.value.map(o => o.label)])
const parentIndex = computed(() => {
  if (!form.parentId) return 0
  const i = parentOptions.value.findIndex(o => o.id === form.parentId)
  return i >= 0 ? i + 1 : 0
})
function onPickParent(e: { detail: { value: number | string } }) {
  const i = Number(e.detail.value)
  form.parentId = i === 0 ? '' : parentOptions.value[i - 1]?.id ?? ''
}

// ── 空间名称建议（对齐 Web 端） ──
const ROOT_SUGGESTIONS = ['客厅', '主卧', '次卧', '厨房', '卫生间', '阳台', '书房', '玄关', '餐厅', '衣帽间', '储物间', '洗衣房']

const FURNITURE_BY_ROOM: Record<string, string[]> = {
  '客厅': ['沙发', '茶几', '电视柜', '书架', '鞋柜', '边几'],
  '主卧': ['衣柜', '床头柜', '书桌', '梳妆台', '沙发', '书柜'],
  '次卧': ['衣柜', '床头柜', '书桌', '电脑桌', '书架'],
  '厨房': ['橱柜', '冰箱', '微波炉', '调料架', '碗柜', '水槽柜'],
  '卫生间': ['洗手台', '镜柜', '浴室柜', '收纳架', '鞋柜'],
  '阳台': ['洗衣机', '晾晒架', '花架', '收纳柜', '置物架'],
  '书房': ['书桌', '书柜', '电脑桌', '收纳柜', '文件柜'],
  '玄关': ['鞋柜', '衣帽架', '换鞋凳', '钥匙盒', '收纳柜'],
  '餐厅': ['餐桌', '餐边柜', '酒柜', '收纳柜', '冰箱'],
  '衣帽间': ['衣架', '抽屉柜', '鞋架', '收纳盒', '首饰柜'],
  '储物间': ['架子', '收纳箱', '储物柜', '货架'],
  '洗衣房': ['洗衣机', '烘干机', '收纳架', '清洁柜', '拖把架'],
}

const ROOM_KEYWORD_MAP: Record<string, string> = {
  '客厅': '客厅', '起居': '客厅',
  '卧': '主卧', '睡': '主卧', '床': '主卧',
  '厨': '厨房', '灶': '厨房',
  '卫': '卫生间', '浴': '卫生间', '厕': '卫生间',
  '阳': '阳台', '露': '阳台',
  '书': '书房',
  '门': '玄关', '玄': '玄关',
  '餐': '餐厅', '饭': '餐厅',
  '衣帽': '衣帽间', '衣': '衣帽间',
  '储': '储物间', '藏': '储物间', '仓': '储物间',
  '洗': '洗衣房',
}

const FALLBACK_FURNITURE = ['抽屉', '柜子', '箱子', '收纳盒', '架子', '置物架']

function getParentName(parentId: string): string {
  if (!parentId) return ''
  const walk = (nodes: LocationTreeNode[]): string | undefined => {
    for (const n of nodes) {
      if (n.id === parentId) return n.name
      const found = walk(n.children)
      if (found) return found
    }
    return undefined
  }
  return walk(tree.value) ?? ''
}

const rawSuggestions = computed(() => {
  if (!form.parentId) return ROOT_SUGGESTIONS
  const parentName = getParentName(form.parentId)
  let roomKey: string | undefined
  for (const [kw, mapped] of Object.entries(ROOM_KEYWORD_MAP)) {
    if (parentName.includes(kw)) { roomKey = mapped; break }
  }
  return (roomKey && FURNITURE_BY_ROOM[roomKey]) || FALLBACK_FURNITURE
})

const filteredSuggestions = computed(() => {
  const kw = form.name.trim().toLowerCase()
  if (!kw) return rawSuggestions.value
  return rawSuggestions.value.filter(s => s.toLowerCase().includes(kw))
})

function pickSuggestion(name: string) {
  form.name = name
  nameFocused.value = false
}

// blur 时延迟收起建议，让点击 chip 先生效
function onNameBlur() {
  setTimeout(() => { nameFocused.value = false }, 120)
}

function onAdd() {
  const n = (form.name || '').trim()
  if (!n) {
    uni.showToast({ title: '请输入空间名称', icon: 'none' })
    return
  }
  if (adding.value) return
  adding.value = true
  try {
    createLocation(n, form.parentId || undefined)
    form.name = ''
    form.parentId = ''
    refresh()
    uni.showToast({ title: '已添加', icon: 'success' })
  } catch (err) {
    console.error('[locations] createLocation failed', err)
    uni.showToast({ title: '添加失败，请重试', icon: 'none' })
  } finally {
    adding.value = false
  }
}

function toggleRoom(id: string) {
  expandedId.value = expandedId.value === id ? '' : id
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/location-detail/location-detail?id=${id}` })
}

function onRemove(id: string, locName: string) {
  uni.showModal({
    title: '删除空间',
    content: `确定删除「${locName}」？需先移出子空间与物品。`,
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      const r = deleteLocation(id)
      if (!r.ok) {
        uni.showToast({ title: r.reason || '删除失败', icon: 'none' })
        return
      }
      refresh()
    },
  })
}

function refresh() {
  tree.value = buildLocationTree()
}

// ---- 重命名（长按给拖拽，改名走铅笔图标，避免手势冲突） ----
function onRename(room: LocationTreeNode) {
  uni.showModal({
    title: '重命名空间',
    editable: true,
    content: room.name,
    placeholderText: '输入新名称（最多 30 字）',
    success: (res) => {
      if (!res.confirm) return
      const r = renameLocation(room.id, res.content ?? '')
      if (!r.ok) {
        uni.showToast({ title: r.reason || '重命名失败', icon: 'none' })
        return
      }
      refresh()
      uni.showToast({ title: '已重命名', icon: 'success' })
    },
  })
}

// ---- 长按拖拽排序（顶层房间）：相对位移换算，避免 pageScrollTo 与页面滚动打架造成抖动 ----
// 关键：激活时收起展开区（等高卡片），行高 = 相邻卡片 top 差；换算与页面滚动完全解耦
const instance = getCurrentInstance()
const dragIndex = ref(-1)
let dragStartY = 0
let dragStartIndex = 0
let dragRowH = 0

function onCardLongPress(index: number, e: { changedTouches?: Array<{ clientY: number }> }) {
  if (dragIndex.value >= 0) return
  expandedId.value = '' // 收起展开区：拖拽期间卡片等高，换算才准
  dragIndex.value = index
  dragStartIndex = index
  // 基准 = 手指按下位置（longpress 事件的 touch），而非卡片 top
  dragStartY = e?.changedTouches?.[0]?.clientY ?? 0
  uni.vibrateShort({})

  uni.createSelectorQuery()
    .in(instance)
    .selectAll('.room-card')
    .boundingClientRect((nodes) => {
      const list = nodes as Array<{ top: number; height: number }>
      // 行高 = 相邻卡片 top 差（含间距）；只有一张卡时不启用拖拽
      dragRowH = list.length >= 2 ? Math.abs(list[1].top - list[0].top) : 0
      if (!dragRowH) {
        dragIndex.value = -1
        return
      }
    })
    .exec()
}

function onCardTouchMove(e: { touches: Array<{ clientY: number }> }) {
  if (dragIndex.value < 0 || !dragRowH) return
  const y = e.touches?.[0]?.clientY
  if (y == null) return

  const offset = Math.round((y - dragStartY) / dragRowH)
  const target = Math.max(0, Math.min(rooms.value.length - 1, dragStartIndex + offset))
  const from = dragIndex.value
  if (target === from) return

  const list = tree.value
  const [moved] = list.splice(from, 1)
  list.splice(target, 0, moved)
  dragIndex.value = target
  uni.vibrateShort({})
}

function onCardTouchEnd() {
  if (dragIndex.value < 0) return
  dragIndex.value = -1
  const ids = tree.value.map((n) => n.id)
  reorderLocations(ids)
  refresh()
}

onMounted(refresh)

defineExpose({ refresh })
</script>

<style scoped>
.tab-root {
  padding-top: 0;
}

/* 页头：占满导航带高度，与右上角胶囊垂直居中 */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--nav-bar-height, 88rpx);
  padding: 8rpx 4rpx;
}
.head-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.head-title {
  font-family: var(--font-display);
  font-size: 40rpx;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 2rpx;
}
.head-sub {
  font-size: 24rpx;
  color: #8a978f;
}

/* 新增表单 */
.form-card {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.form-label {
  font-size: 24rpx;
  font-weight: 600;
  color: #8a978f;
}
.form-label-hint {
  font-weight: 400;
}
.sugg-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
}
.sugg-chip {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  border: 1rpx solid #e4eae5;
  background: #f5f7f5;
  font-size: 22rpx;
  color: #51605a;
}
.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.picker-value {
  color: #182720;
}
.placeholder {
  color: #aebbb2;
}
.picker-arrow {
  color: #8a978f;
  font-size: 40rpx;
  line-height: 1;
}
.submit {
  padding: 24rpx 32rpx;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.4;
}
.submit.btn-disabled {
  opacity: 0.5;
  box-shadow: none;
}

/* 房间区块 */
.section {
  margin-top: 32rpx;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.section-title-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #182720;
}
.section-title-aux {
  font-size: 24rpx;
  color: #8a978f;
}
.empty {
  padding: 48rpx 32rpx;
  text-align: center;
  color: #8a978f;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.empty-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #51605a;
}
.empty-sub {
  font-size: 24rpx;
  color: #8a978f;
}
.empty-add {
  margin-top: 12rpx;
  padding: 20rpx 48rpx;
  font-size: 28rpx;
}

/* 房间卡 */
.room-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.room-card {
  background: #ffffff;
  border: 1rpx solid #e4eae5;
  border-radius: 36rpx;
  box-shadow: 0 2rpx 6rpx rgba(24, 39, 32, 0.05), 0 8rpx 20rpx rgba(24, 39, 32, 0.04);
  overflow: hidden;
}
.room-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
}
.room-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.icon-tile {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e7f4ec;
  flex-shrink: 0;
}
.icon-tile-muted {
  background: #f0f2f0;
}
.room-name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 600;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.room-count {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.room-count-num {
  font-size: 28rpx;
  font-weight: 700;
  color: #16a34a;
}
.room-count-empty {
  font-size: 22rpx;
  color: #aebbb2;
  flex-shrink: 0;
}
.room-edit {
  padding: 8rpx;
  color: #aebbb2;
  flex-shrink: 0;
}
.room-edit-icon {
  font-size: 30rpx;
  line-height: 1;
}
.room-row-colorful .room-edit {
  color: rgba(255, 255, 255, 0.85);
}
.room-arrow {
  padding: 8rpx;
  color: #aebbb2;
  flex-shrink: 0;
}
.room-arrow-icon {
  font-size: 40rpx;
  line-height: 1;
}

/* 拖拽中：卡片抬起 */
.room-card-dragging {
  transform: scale(1.02);
  box-shadow: 0 8rpx 16rpx rgba(24, 39, 32, 0.12), 0 24rpx 64rpx rgba(24, 39, 32, 0.12);
  opacity: 0.92;
}

/* 彩色模式：房间行背景与首页空间看板卡一致（展开后横线以下不变） */
.room-card-colorful {
  border: none;
}
.room-row-colorful {
  position: relative;
  overflow: hidden;
}
.room-row-colorful .room-main,
.room-row-colorful .room-arrow {
  position: relative;
}
.room-row-colorful .icon-tile {
  background: rgba(255, 255, 255, 0.22);
}
.room-row-colorful .room-name {
  color: #ffffff;
}
.room-row-colorful .room-count {
  color: rgba(255, 255, 255, 0.85);
}
.room-row-colorful .room-count-num {
  color: #ffffff;
}
.room-row-colorful .room-count-empty {
  color: rgba(255, 255, 255, 0.75);
}
.room-row-colorful .room-arrow {
  color: rgba(255, 255, 255, 0.85);
}
.row-deco {
  position: absolute;
  border-radius: 999rpx;
  background: #ffffff;
}
.row-deco-1 {
  width: 180rpx;
  height: 180rpx;
  right: -50rpx;
  top: -70rpx;
  opacity: 0.08;
}
.row-deco-2 {
  width: 120rpx;
  height: 120rpx;
  left: -40rpx;
  bottom: -60rpx;
  opacity: 0.06;
}

/* 展开区 */
.room-expand {
  border-top: 1rpx solid #e4eae5;
  padding: 20rpx 24rpx 24rpx;
}
.expand-empty {
  padding: 8rpx 0 16rpx;
  font-size: 24rpx;
  color: #8a978f;
}
.furn-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.furn-card {
  background: #f8faf8;
  border: 1rpx solid #e4eae5;
  border-radius: 28rpx;
  padding: 16rpx 20rpx;
}
.furn-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.furn-icon {
  flex-shrink: 0;
}
.furn-name {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  font-weight: 600;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.furn-count {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.furn-del {
  color: #dc2626;
  font-size: 24rpx;
  font-weight: 600;
  padding: 4rpx 8rpx;
  flex-shrink: 0;
}
.comp-row {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.comp-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid #e4eae5;
  background: #ffffff;
  font-size: 22rpx;
  color: #51605a;
}
.comp-name {
  font-size: 22rpx;
}
.comp-count {
  font-weight: 600;
  color: #0f7a38;
}
.room-del {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: rgba(220, 38, 38, 0.7);
  padding: 4rpx 0;
}

/* 虚线添加按钮 */
.dash-add {
  margin-top: 16rpx;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 32rpx;
  border: 3rpx dashed #d8e1da;
  font-size: 28rpx;
  font-weight: 500;
  color: #8a978f;
}
.dash-add-icon {
  font-size: 32rpx;
  line-height: 1;
}
</style>
