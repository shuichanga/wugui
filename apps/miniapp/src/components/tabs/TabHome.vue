<template>
  <view class="tab-root">
    <!-- 问候头：头像在左，问候+日期/住所切换在右（与上一稿一致） -->
    <view class="greet">
      <view class="avatar" :class="{ 'avatar-photo': avatarPath }" @tap="switchTab('settings')">
        <image v-if="avatarPath" :src="avatarPath" mode="aspectFill" class="avatar-img" />
        <text v-else>{{ displayNameInitial }}</text>
      </view>
      <view class="greet-left">
        <view class="greet-title">{{ greeting }}</view>
        <ResidenceSwitcher :date="today" @switched="refresh" />
      </view>
    </view>

    <!-- 未登录提示：本地模式可用，登录后多端同步（非阻断，tap 去我的页） -->
    <view v-if="!auth.isLogged" class="card local-hint" @tap="switchTab('settings')">
      <text class="local-hint-text">数据保存在本机 · 登录账号可多端同步</text>
      <text class="local-hint-link">去登录 ›</text>
    </view>

    <!-- 新手引导：三步（空间 / 家具(可选) / 物品） -->
    <view v-if="showOnboard" class="card onboard">
      <view class="section-title">
        <view class="section-title-left">
          <i class="dot"></i>
          <text>开始整理你的家</text>
        </view>
      </view>
      <view class="onboard-hint">三步上手，物品再也不怕找不到</view>
      <view class="onboard-steps">
        <view class="step">
          <view class="step-num" :class="{ done: hasRooms }">
            <text>{{ hasRooms ? '✓' : '1' }}</text>
          </view>
          <view class="step-body">
            <view class="step-title">添加空间</view>
            <view class="step-hint">先建房间，如客厅、卧室</view>
          </view>
          <text v-if="!hasRooms" class="step-link" @tap="switchTab('locations')">去添加</text>
        </view>
        <view class="step">
          <view class="step-num" :class="{ done: hasSubRooms, muted: !hasRooms }">
            <text>{{ hasSubRooms ? '✓' : '2' }}</text>
          </view>
          <view class="step-body">
            <view class="step-title">添加家具<text class="step-opt">可选</text></view>
            <view class="step-hint">如电视柜、衣柜，不放物品也可跳过</view>
          </view>
          <text v-if="hasRooms && !hasSubRooms" class="step-link" @tap="switchTab('locations')">去添加</text>
        </view>
        <view class="step">
          <view class="step-num" :class="{ done: hasItems, muted: !hasRooms }">
            <text>{{ hasItems ? '✓' : '3' }}</text>
          </view>
          <view class="step-body">
            <view class="step-title">录入第一件物品</view>
            <view class="step-hint">拍照、选好空间就行</view>
          </view>
          <text v-if="hasRooms && !hasItems" class="step-link" @tap="go('/pages/item-edit/item-edit')">去录入</text>
        </view>
      </view>
    </view>

    <!-- 空间看板 -->
    <view class="section">
      <view class="section-title">
        <view class="section-title-left">
          <i class="dot"></i>
          <text>空间看板</text>
        </view>
        <text v-if="rooms.length" class="section-title-aux">
          共 {{ totalItems }} 件 · {{ rooms.length }} 个房间
        </text>
      </view>
      <view v-if="rooms.length" class="grid-2">
        <view
          v-for="(loc, index) in rooms"
          :key="loc.id"
          class="card room-card"
          :class="{ 'room-card-colorful': boardStyle === 'colorful' }"
          :style="getCardStyle(loc, index)"
          @tap="goRoom(loc.id)"
          @longpress="onGridLongPress(index, $event)"
          @touchmove="onGridTouchMove"
          @touchend="onGridTouchEnd"
          @touchcancel="onGridTouchEnd"
        >
          <template v-if="boardStyle === 'clean'">
            <view class="room-top">
              <view class="icon-tile" :class="{ 'icon-tile-muted': loc.itemCount === 0 }">
                <LocationIcon
                  :slug="getRoomIcon(loc.name)"
                  :size="36"
                  :state="loc.itemCount === 0 ? 'muted' : 'default'"
                />
              </view>
              <text class="room-name">{{ loc.name }}</text>
              <text class="room-count" :class="{ muted: loc.itemCount === 0 }">
                <template v-if="loc.itemCount > 0">
                  <text class="room-count-num">{{ loc.itemCount }}</text> 件
                </template>
                <template v-else>还没有物品</template>
              </text>
            </view>
            <view class="track">
              <view class="track-fill" :style="{ width: progressWidth(loc) }"></view>
              <view class="track-dot" :style="{ left: progressWidth(loc) }"></view>
            </view>
          </template>
          <template v-else>
            <view class="room-deco room-deco-1"></view>
            <view class="room-deco room-deco-2"></view>
            <view class="room-colorful-row">
              <LocationIcon :slug="getRoomIcon(loc.name)" :size="36" state="white" />
              <text class="room-colorful-name">{{ loc.name }}</text>
              <text class="room-colorful-count" :class="{ 'room-colorful-count-empty': loc.itemCount === 0 }">{{ loc.itemCount }} 件</text>
            </view>
            <view class="room-colorful-track">
              <view class="room-colorful-fill" :style="{ width: progressWidth(loc) }"></view>
            </view>
          </template>
        </view>
      </view>
    </view>

    <!-- 最近查看 -->
    <view v-if="recentItems.length" class="section">
      <view class="section-title">
        <view class="section-title-left">
          <i class="dot"></i>
          <text>最近查看</text>
        </view>
        <text class="section-title-aux" @tap="switchTab('items')">全部 ›</text>
      </view>
      <view class="grid-2">
        <view
          v-for="it in recentItems"
          :key="it.id"
          class="card recent-card"
          @tap="goItem(it.id)"
        >
          <view class="thumb">
            <image v-if="coverSrc(it)" :src="coverSrc(it)" mode="aspectFill" :webp="true" class="thumb-img" />
            <view v-else class="thumb-placeholder">
              <LocationIcon slug="package" :size="52" class="thumb-ph-icon" />
            </view>
          </view>
          <view class="recent-body">
            <view class="recent-name truncate">{{ it.name }}</view>
            <TagRow v-if="it.tags.length" class="recent-tag-row" :tags="it.tags" />
            <view class="recent-loc truncate">{{ locationPath(it.locationId) || '未放置' }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 最近添加 -->
    <view class="section">
      <view class="section-title">
        <view class="section-title-left">
          <i class="dot"></i>
          <text>最近添加</text>
        </view>
        <text class="section-title-aux" @tap="switchTab('items')">全部 ›</text>
      </view>
      <view v-if="!recentAdded.length" class="card empty">
        <text class="text-secondary">{{ items.length === 0 ? '还没有物品，点右下角 + 录入第一件' : '最近 30 天没有新增物品' }}</text>
      </view>
      <view v-else class="rows">
        <view
          v-for="it in recentAdded"
          :key="it.id"
          class="card row-card"
          @tap="goItem(it.id)"
        >
          <view class="thumb-sm">
            <image v-if="coverSrc(it)" :src="coverSrc(it)" mode="aspectFill" :webp="true" class="thumb-img" />
            <view v-else class="thumb-placeholder">
              <LocationIcon slug="package" :size="38" class="thumb-ph-icon" />
            </view>
          </view>
          <view class="row-body">
            <view class="row-title">
              <text class="truncate">{{ it.name }}</text>
            </view>
            <TagRow v-if="it.tags.length" class="row-tag-row" :tags="it.tags" />
            <text class="row-loc truncate">{{ locationPath(it.locationId) || '未放置' }}</text>
          </view>
          <text class="row-time">{{ timeLabel(it.createdAt) }}</text>
        </view>
      </view>
    </view>

    <!-- 广告位：会员不渲染（流量主开通后填 adUnitId） -->
    <AdBanner />

    <!-- 拖拽悬浮卡：复制被拖卡内容，fixed 跟手；原格位由半透明占位卡保留 -->
    <view
      v-if="(dragActive || dragSnap) && dragRoom"
      class="card room-card room-card-ghost"
      :class="{ 'room-card-colorful': boardStyle === 'colorful' }"
      :style="ghostStyle"
    >
      <template v-if="boardStyle === 'clean'">
        <view class="room-top">
          <view class="icon-tile" :class="{ 'icon-tile-muted': dragRoom.itemCount === 0 }">
            <LocationIcon
              :slug="getRoomIcon(dragRoom.name)"
              :size="36"
              :state="dragRoom.itemCount === 0 ? 'muted' : 'default'"
            />
          </view>
          <text class="room-name">{{ dragRoom.name }}</text>
          <text class="room-count" :class="{ muted: dragRoom.itemCount === 0 }">
            <template v-if="dragRoom.itemCount > 0">
              <text class="room-count-num">{{ dragRoom.itemCount }}</text> 件
            </template>
            <template v-else>还没有物品</template>
          </text>
        </view>
        <view class="track">
          <view class="track-fill" :style="{ width: progressWidth(dragRoom) }"></view>
          <view class="track-dot" :style="{ left: progressWidth(dragRoom) }"></view>
        </view>
      </template>
      <template v-else>
        <view class="room-deco room-deco-1"></view>
        <view class="room-deco room-deco-2"></view>
        <view class="room-colorful-row">
          <LocationIcon :slug="getRoomIcon(dragRoom.name)" :size="36" state="white" />
          <text class="room-colorful-name">{{ dragRoom.name }}</text>
          <text class="room-colorful-count" :class="{ 'room-colorful-count-empty': dragRoom.itemCount === 0 }">{{ dragRoom.itemCount }} 件</text>
        </view>
        <view class="room-colorful-track">
          <view class="room-colorful-fill" :style="{ width: progressWidth(dragRoom) }"></view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import LocationIcon from '../LocationIcon.vue'
import AdBanner from '../AdBanner.vue'
import TagRow from '../TagRow.vue'
import ResidenceSwitcher from '../ResidenceSwitcher.vue'
import { useAuth } from '../../composables/useAuth'
import {
  buildLocationTree, createItem, createLocation, getLocationPath, useStore,
  reorderLocations,
  type LocalItem, type LocationTreeNode,
} from '../../composables/useLocalData'
import { timeLabel } from '../../utils/local-photo'
import { useTheme } from '../../composables/useTheme'
import { useDragLock } from '../../composables/useDragLock'
import { useHomeTabs } from '../../composables/useHomeTabs'
import { useAvatar } from '../../composables/useAvatar'
import { useItemCover } from '../../composables/useItemCover'
import { getRoomColors, getRoomIcon } from '../../utils/room-style'

const { boardStyle } = useTheme()
const { pendingItemRoom, switchTab } = useHomeTabs()
const { avatarPath } = useAvatar()
const { coverSrc, resolveCovers } = useItemCover()
const auth = useAuth()
const store = useStore()
const items = ref<LocalItem[]>([])
// 看板仅显示一级空间（房间），数量为房间及全部下属层级的物品数
const rooms = ref<LocationTreeNode[]>([])
const recentViewIds = ref<string[]>([])

// 三步引导完成状态
const hasRooms = computed(() => rooms.value.length > 0)
const hasSubRooms = computed(() => rooms.value.some(r => r.children.length > 0))
const hasItems = computed(() => items.value.length > 0)

// 问候语
const greeting = computed(() => {
  const h = new Date().getHours()
  const period = h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  const name = auth.state.user?.displayName?.trim()
  return name ? `${period}，${name}` : period
})
const today = computed(() => {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week[d.getDay()]}`
})
const displayNameInitial = computed(() => (auth.state.user?.displayName ?? '物').slice(0, 1))

const totalItems = computed(() => rooms.value.reduce((sum, r) => sum + r.itemCount, 0))
const showOnboard = computed(() => !hasItems.value)

// 最近查看对应的 item（按 recentView 顺序）
const recentItems = computed<LocalItem[]>(() => {
  const map = new Map(items.value.map(i => [i.id, i]))
  return recentViewIds.value.map(id => map.get(id)).filter((x): x is LocalItem => !!x).slice(0, 8)
})

// 最近添加：30 天内新增
const RECENT_DAYS = 30
const recentAdded = computed(() => {
  const cutoff = Date.now() - RECENT_DAYS * 86400000
  return items.value.filter(i => new Date(i.createdAt).getTime() >= cutoff).slice(0, 6)
})

function refresh() {
  items.value = store.items()
  rooms.value = buildLocationTree()
  recentViewIds.value = store.recentViews().map(v => v.itemId)
  // 云端封面解析：本地路径为空的物品（上传成功后 photoPaths 被清空）回退 photoRefs 签名 URL
  void resolveCovers(items.value)
}

// ---- 看板卡长按拖拽排序（2 列 grid）：克隆卡 fixed 悬浮跟手；DOM 顺序不动，
// 各卡用 transform 平移到显示格位（transition 平滑让位），松手后数组重排与清 transform 同帧无缝归位 ----
const { setDragLock } = useDragLock()
const gridInstance = getCurrentInstance()
const dragId = ref('')           // 被拖卡 id
const dragIndex = ref(-1)        // 被拖卡当前显示格位（dragOrder 中的下标）
const dragOrder = ref<string[] | null>(null)  // 拖拽中的显示顺序；null = 非拖拽（rooms 保持原顺序）
const dragActive = ref(false)    // 长按测量成功后进入拖拽态
const dragSnap = ref(false)      // 松手后的回落动画阶段
const dragDx = ref(0)
const dragDy = ref(0)
let dragStartY = 0
let dragStartX = 0
let dragStartIndex = 0
let dragRowH = 0
let dragColW = 0
let gridLeft = 0
let gridTop = 0
let dragRect = { left: 0, top: 0, width: 0, height: 0 }
let dragPending = false        // 长按已触发、测量回调未返回

function onGridLongPress(index: number, e: { changedTouches?: Array<{ clientX: number; clientY: number }> }) {
  if (dragActive.value || dragSnap.value) return // 回落动画期间不响应新的长按拖拽
  dragPending = true
  dragStartIndex = index
  dragStartY = e?.changedTouches?.[0]?.clientY ?? 0
  dragStartX = e?.changedTouches?.[0]?.clientX ?? 0
  uni.vibrateShort({})

  uni.createSelectorQuery()
    .in(gridInstance)
    .selectAll('.room-card')
    .boundingClientRect((nodes) => {
      const list = nodes as Array<{ left: number; top: number; width: number; height: number }>
      // 列宽 = 第二列 left - 第一列 left；行高 = 第三张卡 top - 第一张 top（grid 2 列）
      dragColW = list.length >= 2 ? Math.abs(list[1].left - list[0].left) : 0
      dragRowH = list.length >= 3 ? Math.abs(list[2].top - list[0].top) : (list[0]?.height ?? 0)
      const rect = list[index]
      const dragLoc = rooms.value[index]
      // 测量失败或手指已松开则不激活
      if (!dragPending || !dragRowH || !dragColW || !rect || !dragLoc) {
        dragPending = false
        return
      }
      dragPending = false
      gridLeft = list[0].left
      gridTop = list[0].top
      dragRect = rect
      dragDx.value = 0
      dragDy.value = 0
      dragId.value = dragLoc.id
      dragOrder.value = rooms.value.map((n) => n.id)
      dragIndex.value = index
      dragActive.value = true
      setDragLock(true) // 拖拽期间锁定 scroll-view 滚动，防止内容在悬浮卡下方移动抖动
    })
    .exec()
}

function onGridTouchMove(e: { touches: Array<{ clientX: number; clientY: number }> }) {
  if (!dragActive.value || dragSnap.value) return
  const t = e.touches?.[0]
  if (!t) return

  // 悬浮卡 1:1 跟手
  dragDx.value = t.clientX - dragStartX
  dragDy.value = t.clientY - dragStartY

  // 相对起始格位的行/列差换算目标格（行差×2 + 列差）
  const dRows = Math.round(dragDy.value / dragRowH)
  const dCols = Math.round(dragDx.value / dragColW)
  const target = Math.max(0, Math.min(rooms.value.length - 1, dragStartIndex + dRows * 2 + dCols))
  const from = dragIndex.value
  if (target === from) return

  const order = dragOrder.value
  if (!order) return
  const [movedId] = order.splice(from, 1)
  order.splice(target, 0, movedId)
  dragIndex.value = target
  uni.vibrateShort({})
}

function onGridTouchEnd() {
  dragPending = false
  if (!dragActive.value) return
  const order = dragOrder.value
  if (!order) return
  // 悬浮卡进入回落动画（落点 = 目标格；占位卡已通过 transform 移到该格）
  dragDx.value = gridLeft + (dragIndex.value % 2) * dragColW - dragRect.left
  dragDy.value = gridTop + Math.floor(dragIndex.value / 2) * dragRowH - dragRect.top
  dragSnap.value = true
  reorderLocations(order.slice())
  // 立即同步退出拖拽态：同帧完成「清占位淡显/卡片 transform + rooms 按最终顺序重排」，
  // 卡片从 transform 位置无缝落回文档流；悬浮卡由 dragSnap 单独保活到回落动画结束。
  // 状态复位不放进 setTimeout：延迟复位在模拟器里可能被合并渲染丢失，导致淡显不恢复
  dragActive.value = false
  dragOrder.value = null
  dragIndex.value = -1
  setDragLock(false)
  refresh()
  setTimeout(() => {
    dragSnap.value = false
    dragId.value = ''
  }, 200)
}

// 组件卸载兜底：防止拖拽中离开页面导致滚动锁泄漏
onUnmounted(() => setDragLock(false))

// 被拖卡数据与悬浮样式：原卡留流内作半透明占位，克隆卡 fixed 跟手（回落阶段带过渡）
const dragRoom = computed(() => (dragId.value ? rooms.value.find((n) => n.id === dragId.value) ?? null : null))

const ghostStyle = computed((): Record<string, string> => {
  const room = dragRoom.value
  // 拖拽态与回落动画态都要保活（回落时 dragActive 已复位，靠 dragSnap 维持样式）
  if ((!dragActive.value && !dragSnap.value) || !room) return {}
  const style: Record<string, string> = {
    position: 'fixed',
    left: `${dragRect.left}px`,
    top: `${dragRect.top}px`,
    width: `${dragRect.width}px`,
    height: `${dragRect.height}px`,
    zIndex: '200',
    transform: `translate(${dragDx.value}px, ${dragDy.value}px) scale(${dragSnap.value ? 1 : 1.04})`,
    transition: dragSnap.value ? 'transform 0.2s ease-out' : 'none',
  }
  if (boardStyle.value === 'colorful') style.background = getRoomColors(room.name).accent
  return style
})

// 拖拽期间各卡位移样式：把卡从自己的文档流格位平移到在 dragOrder 中的显示格位，
// transition 让"换序让位"变成滑动动画（0 偏移也输出，保证拖回原位时同样有过渡）；
// 被拖卡在本体位加透明度占位（内联 style，与 transform 同通道，避免 class 更新丢失）；非拖拽态返回普通样式
function getCardStyle(loc: LocationTreeNode, index: number): Record<string, string> {
  const style: Record<string, string> = {}
  if (boardStyle.value === 'colorful') style.background = getRoomColors(loc.name).accent
  if (dragActive.value && loc.id === dragId.value) style.opacity = '0.35'
  const order = dragOrder.value
  if (dragActive.value && order) {
    const displayIndex = order.indexOf(loc.id)
    if (displayIndex >= 0) {
      const dx = (displayIndex % 2) * dragColW - (index % 2) * dragColW
      const dy = Math.floor(displayIndex / 2) * dragRowH - Math.floor(index / 2) * dragRowH
      style.transform = `translate(${dx}px, ${dy}px)`
      style.transition = 'transform 0.15s ease-out'
    }
  }
  return style
}

// 进度条：该房间物品数（含下属层级）占整个住所物品总数的比例
function progressWidth(loc: LocationTreeNode): string {
  if (totalItems.value <= 0) return '0%'
  const pct = (loc.itemCount / totalItems.value) * 100
  return `${Math.max(pct, 4)}%`
}
// 空间信息列出全部层级（对齐 Web 端 locationPath）：如「主卧 / 床头柜」
function locationPath(id: string): string {
  return id ? getLocationPath(id) : ''
}

function go(url: string) {
  uni.navigateTo({ url })
}
function goItem(id: string) {
  uni.navigateTo({ url: `/pages/item-detail/item-detail?id=${id}` })
}
// 看板卡 → 物品 tab，列出该空间（含下属层级）的全部物品（对齐 Web 端）
function goRoom(id: string) {
  pendingItemRoom.value = id
  switchTab('items')
}

onMounted(refresh)

defineExpose({ refresh })
</script>

<style scoped>
.tab-root {
  padding-top: 0;
}

/* 问候头：占满导航带高度，与右上角胶囊垂直居中（头像在左、文字在右） */
.greet {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-height: var(--nav-bar-height, 88rpx);
  padding: 0 4rpx;
}
.greet-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
  flex: 1;
}
.greet-title {
  font-family: var(--font-display);
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: var(--color-text);
}
.greet-date {
  font-size: 24rpx;
  color: #8a978f;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
}
/* 已上传照片：去掉绿底与绿色投影，透明 PNG 不透出背景色 */
.avatar-photo {
  background: transparent;
  box-shadow: none;
}

/* 引导卡 */
.onboard {
  margin-top: 24rpx;
  padding: 28rpx 32rpx;
}
.onboard-hint {
  font-size: 24rpx;
  color: #8a978f;
  margin-top: 8rpx;
  margin-bottom: 20rpx;
}
.onboard-steps {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.step {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #f0f2f0;
  border-radius: 20rpx;
  padding: 16rpx 20rpx;
}
.step-num {
  width: 44rpx;
  height: 44rpx;
  border-radius: 999rpx;
  background: #16a34a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.step-num.done {
  background: #16a34a;
}
.step-num.muted {
  background: #ffffff;
  color: #8a978f;
  border: 2rpx solid #e4eae5;
}
.step-body {
  flex: 1;
  min-width: 0;
}
.step-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
}
.step-opt {
  font-size: 20rpx;
  font-weight: 400;
  color: #8a978f;
  margin-left: 6rpx;
}
.step-hint {
  font-size: 22rpx;
  color: #8a978f;
  margin-top: 4rpx;
}
.step-link {
  font-size: 24rpx;
  font-weight: 600;
  color: #0f7a38;
  flex-shrink: 0;
}

/* 区块 */
.section {
  margin-top: 32rpx;
}

/* 空间看板：2 列 */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 20rpx;
}

/* 未登录提示条 */
.local-hint {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.local-hint-text {
  font-size: 24rpx;
  color: var(--color-text-secondary, #51605a);
  flex: 1;
  min-width: 0;
}
.local-hint-link {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--color-primary, #16a34a);
  flex-shrink: 0;
}

/* 空间卡：对齐 Web 端 RoomCard（px-3 pt-2 pb-2） */
.room-card {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  position: relative;
}
/* 拖拽悬浮卡投影 + 跟手（位移/缩放由内联 transform 控制） */
.room-card-ghost {
  margin: 0;
  box-shadow: 0 8rpx 16rpx rgba(24, 39, 32, 0.16), 0 24rpx 64rpx rgba(24, 39, 32, 0.2);
}
.room-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.room-top .icon-tile {
  flex-shrink: 0;
}
.room-count {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.room-count.muted {
  color: #aebbb2;
}
.room-count-num {
  color: #16a34a;
  font-weight: 700;
  font-size: 28rpx;
}
/* 名称与图标同行：占据中间剩余空间，超长省略 */
.room-name {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 彩色看板卡（外观偏好：彩色） */
.room-card-colorful {
  position: relative;
  overflow: hidden;
  border: none;
}
.room-deco {
  position: absolute;
  border-radius: 999rpx;
  background: #ffffff;
}
.room-deco-1 {
  width: 180rpx;
  height: 180rpx;
  right: -50rpx;
  top: -70rpx;
  opacity: 0.08;
}
.room-deco-2 {
  width: 120rpx;
  height: 120rpx;
  left: -40rpx;
  bottom: -60rpx;
  opacity: 0.06;
}
.room-colorful-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.room-colorful-name {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.room-colorful-count {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  flex-shrink: 0;
}
.room-colorful-count-empty {
  color: rgba(255, 255, 255, 0.55);
}
.room-colorful-track {
  position: relative;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.25);
  overflow: hidden;
  margin-top: 4rpx;
}
.room-colorful-fill {
  height: 100%;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.85);
}

/* 最近查看卡 */
.recent-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.thumb {
  height: 100rpx;
  width: 100%;
  overflow: hidden;
}
.thumb-img {
  width: 100%;
  height: 100%;
}
.thumb-placeholder {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e7f4ec, #d3efdd);
}
.thumb-ph-icon {
  opacity: 0.6;
}
.recent-body {
  padding: 12rpx 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.recent-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-tag-row {
  margin-top: 2rpx;
}
.recent-loc {
  font-size: 22rpx;
  color: #8a978f;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 标签：对齐 Web 端 pill（px-2 py-1 text-2xs leading-none） */
.tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  line-height: 1;
  flex-shrink: 0;
}

/* 最近添加行卡：对齐 Web 端 RecentItemRow（px-3 py-1.5 gap-3，40px 圆角xl缩略图） */
.rows {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 20rpx;
}
.row-card {
  padding: 12rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.thumb-sm {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  overflow: hidden;
  flex-shrink: 0;
}
.thumb-sm .thumb-img {
  width: 100%;
  height: 100%;
}
.thumb-sm .thumb-placeholder {
  height: 100%;
}
.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.row-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.row-tag-row {
  margin-top: 2rpx;
}
.row-title > view:first-child {
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
}
.row-loc {
  font-size: 22rpx;
  line-height: 1.4;
  color: #8a978f;
}
.row-time {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}

/* 空态 */
.empty {
  margin-top: 20rpx;
  padding: 40rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: #8a978f;
}

/* truncate */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
