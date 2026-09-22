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
          v-for="loc in rooms"
          :key="loc.id"
          class="card room-card"
          :class="{ 'room-card-colorful': boardStyle === 'colorful' }"
          :style="boardStyle === 'colorful' ? { background: getRoomColors(loc.name).accent } : undefined"
          @tap="goRoom(loc.id)"
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
              <text class="room-count" :class="{ muted: loc.itemCount === 0 }">
                <template v-if="loc.itemCount > 0">
                  <text class="room-count-num">{{ loc.itemCount }}</text> 件
                </template>
                <template v-else>还没有物品</template>
              </text>
            </view>
            <view class="room-name">{{ loc.name }}</view>
            <view class="track">
              <view class="track-fill" :style="{ width: progressWidth(loc) }"></view>
              <view class="track-dot" :style="{ left: progressWidth(loc) }"></view>
            </view>
          </template>
          <template v-else>
            <view class="room-deco room-deco-1"></view>
            <view class="room-deco room-deco-2"></view>
            <view class="room-colorful-row">
              <view class="room-colorful-icon" :class="{ 'room-colorful-icon-empty': loc.itemCount === 0 }">
                <LocationIcon :slug="getRoomIcon(loc.name)" :size="32" state="white" />
              </view>
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
            <image v-if="it.photoPaths[0]" :src="it.photoPaths[0]" mode="aspectFill" class="thumb-img" />
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
            <image v-if="it.photoPaths[0]" :src="it.photoPaths[0]" mode="aspectFill" class="thumb-img" />
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
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LocationIcon from '../LocationIcon.vue'
import TagRow from '../TagRow.vue'
import ResidenceSwitcher from '../ResidenceSwitcher.vue'
import { useAuth } from '../../composables/useAuth'
import {
  buildLocationTree, getLocationPath, useStore, type LocalItem, type LocationTreeNode,
} from '../../composables/useLocalData'
import { timeLabel } from '../../utils/local-photo'
import { useTheme } from '../../composables/useTheme'
import { useHomeTabs } from '../../composables/useHomeTabs'
import { useAvatar } from '../../composables/useAvatar'
import { getRoomColors, getRoomIcon } from '../../utils/room-style'

const { boardStyle } = useTheme()
const { pendingItemRoom, switchTab } = useHomeTabs()
const { avatarPath } = useAvatar()
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

/* 空间卡：对齐 Web 端 RoomCard（px-3 pt-2 pb-2） */
.room-card {
  padding: 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.room-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.room-count {
  font-size: 22rpx;
  color: #8a978f;
}
.room-count.muted {
  color: #aebbb2;
}
.room-count-num {
  color: #16a34a;
  font-weight: 700;
  font-size: 28rpx;
}
.room-name {
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
  gap: 12rpx;
}
.room-colorful-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* 空房间在彩色模式下的弱化：底色更淡 + 图标整体半透明 */
.room-colorful-icon-empty {
  background: rgba(255, 255, 255, 0.10);
  opacity: 0.55;
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
