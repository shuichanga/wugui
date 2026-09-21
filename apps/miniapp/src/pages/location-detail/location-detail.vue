<template>
  <view class="page page-tabbar" :class="themeClass">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="topbar-back" @tap="goBack"><LocationIcon slug="chevron-left" :size="32" /></view>
      <text class="topbar-title">{{ location?.name ?? '空间详情' }}</text>
    </view>

    <view v-if="!location" class="empty card">
      <text>空间不存在或已被删除</text>
      <view class="btn-secondary back-btn" @tap="goBack">返回</view>
    </view>

    <block v-else>
      <!-- 位置概览 -->
      <view class="overview">
        <view class="overview-head">
          <text class="overview-name">{{ location.name }}</text>
          <view v-if="items.length" class="qty-pill">{{ items.length }} 件</view>
        </view>
        <text class="overview-path">{{ locationPath || '　' }}</text>
      </view>

      <!-- 子空间 -->
      <view v-if="location.children.length" class="subsection">
        <view class="subsection-title">
          <text class="dot"></text>
          <text>{{ location.level === 'room' ? '家具' : '格位' }}</text>
        </view>
        <view class="sub-list">
          <view
            v-for="sub in location.children"
            :key="sub.id"
            class="card sub-card"
            @tap="goDetail(sub.id)"
          >
            <LocationIcon
              :slug="subIcon(sub)"
              :size="36"
              class="sub-icon"
            />
            <text class="sub-name">{{ sub.name }}</text>
            <text class="sub-count">{{ sub.itemCount }} 件</text>
            <text class="sub-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 空间内物品：复用首页最近添加行卡样式 -->
      <view class="subsection">
        <view class="subsection-title">
          <text class="dot"></text>
          <text>物品</text>
        </view>

        <view v-if="!items.length" class="card empty-box">
          <text class="empty-text">这里还没有物品</text>
          <view class="empty-link" @tap="goAdd">去录入</view>
        </view>

        <view v-else class="item-list">
          <view
            v-for="item in items"
            :key="item.id"
            class="card row-card"
            @tap="goItem(item.id)"
          >
            <view class="thumb-sm">
              <image v-if="item.photoPaths[0]" :src="item.photoPaths[0]" mode="aspectFill" class="thumb-img" />
              <view v-else class="thumb-placeholder">
                <LocationIcon slug="package" :size="44" class="thumb-ph-icon" />
              </view>
            </view>
            <view class="row-body">
              <view class="row-title">
                <text class="truncate">{{ item.name }}</text>
                <view v-if="item.tags[0]" class="tag" :style="tagStyle(item.tags[0])">
                  <text>{{ item.tags[0] }}</text>
                </view>
              </view>
              <text class="row-loc truncate">{{ locationPath || '未放置' }}</text>
            </view>
            <text class="row-qty">×{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </block>

    <AppTabbar />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import LocationIcon from '../../components/LocationIcon.vue'
import AppTabbar from '../../components/AppTabbar.vue'
import { useAuth } from '../../composables/useAuth'
import { useTheme } from '../../composables/useTheme'
import {
  buildLocationTree,
  getLocationPath,
  useStore,
  type LocalItem,
  type LocationTreeNode,
} from '../../composables/useLocalData'
import { getCompartmentIcon, getFurnitureIcon, getRoomIcon } from '../../utils/room-style'
import { useHomeTabs } from '../../composables/useHomeTabs'
import { tagStyle } from '../../utils/local-photo'

const { themeClass } = useTheme()
const { switchTab } = useHomeTabs()
const auth = useAuth()
const store = useStore()

const locationId = ref('')
const tree = ref<LocationTreeNode[]>([])
const items = ref<LocalItem[]>([])

const location = computed<LocationTreeNode | null>(() => {
  if (!locationId.value) return null
  const find = (nodes: LocationTreeNode[]): LocationTreeNode | null => {
    for (const n of nodes) {
      if (n.id === locationId.value) return n
      const hit = find(n.children)
      if (hit) return hit
    }
    return null
  }
  return find(tree.value)
})

const locationPath = computed(() => (locationId.value ? getLocationPath(locationId.value) : ''))

function subIcon(node: LocationTreeNode): string {
  if (node.level === 'room') return getRoomIcon(node.name)
  if (node.level === 'furniture') return getFurnitureIcon(node.name)
  return getCompartmentIcon(node.name)
}

function refresh() {
  tree.value = buildLocationTree()
  if (locationId.value) {
    items.value = store.items().filter(i => i.locationId === locationId.value)
  }
}

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else switchTab('locations')
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/location-detail/location-detail?id=${id}` })
}

function goItem(id: string) {
  uni.navigateTo({ url: `/pages/item-detail/item-detail?id=${id}` })
}

function goAdd() {
  uni.navigateTo({ url: `/pages/item-edit/item-edit?locationId=${locationId.value}` })
}

onLoad((query) => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  locationId.value = String(query?.id ?? '')
  refresh()
})

onShow(() => {
  if (!auth.isLogged) return
  refresh()
})
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 32rpx;
  position: relative;
}
.topbar-back {
  position: absolute;
  left: 24rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid #e4eae5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #182720;
  font-size: 32rpx;
}
.topbar-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #182720;
}

.overview {
  margin-top: 16rpx;
}
.overview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}
.overview-name {
  font-size: 44rpx;
  font-weight: 700;
  color: #182720;
  letter-spacing: 2rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.overview-path {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a978f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subsection {
  margin-top: 32rpx;
}
.subsection-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: #182720;
  margin-bottom: 16rpx;
}
.sub-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.sub-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
}
.sub-icon {
  flex-shrink: 0;
}
.sub-name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 600;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub-count {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.sub-arrow {
  font-size: 40rpx;
  color: #aebbb2;
  line-height: 1;
  flex-shrink: 0;
}

.empty-box {
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty-text {
  color: #8a978f;
  font-size: 26rpx;
}
.empty-link {
  color: #16a34a;
  font-size: 28rpx;
  font-weight: 600;
  padding: 8rpx 16rpx;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

/* 物品卡片：复用首页最近添加行卡样式 */
.row-card {
  padding: 16rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.thumb-sm {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
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
.row-title > text:first-child {
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
  flex: 1;
  min-width: 0;
}
.row-loc {
  font-size: 22rpx;
  color: #8a978f;
}
.row-qty {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}

/* 标签 */
.tag {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.2;
  flex-shrink: 0;
}

.empty {
  margin-top: 32rpx;
  padding: 60rpx 32rpx;
  text-align: center;
  color: #8a978f;
  font-size: 26rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  align-items: center;
}
.back-btn {
  padding: 20rpx 40rpx;
  font-size: 28rpx;
}
</style>
