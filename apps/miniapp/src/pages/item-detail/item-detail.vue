<template>
  <!-- page-meta：状态栏/导航带高度写到 page 元素，标题与胶囊对齐 -->
  <page-meta :page-style="pageStyle" />
  <view class="page page-tabbar-footer" :class="themeClass" :style="topVars">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="topbar-back" @tap="goBack">
        <LocationIcon slug="chevron-left" :size="32" />
      </view>
      <text class="topbar-title">物品详情</text>
    </view>

    <!-- 空态 -->
    <view v-if="!item" class="empty">
      <text>物品不存在或已被删除</text>
      <button class="btn-secondary back-btn" @tap="goBack">返回</button>
    </view>

    <template v-else>
      <!-- 照片 hero：多张横向滑动 + 圆点指示（本地 photoPaths 优先，云端 photoRefs 紧随） -->
      <view class="hero">
        <swiper
          v-if="photos.length"
          class="hero-swiper"
          :circular="false"
          :indicator-dots="photos.length > 1"
          indicator-active-color="#ffffff"
          indicator-color="rgba(255,255,255,0.4)"
        >
          <swiper-item v-for="(p, i) in photos" :key="p.key">
            <image :src="p.src" mode="aspectFill" class="hero-img" @tap="previewPhoto(i)" />
          </swiper-item>
        </swiper>
        <view v-else class="hero-empty">
          <LocationIcon slug="package" :size="96" state="muted" />
          <text class="hero-empty-text">暂无照片</text>
        </view>
      </view>

      <!-- 标题行：名称 + 数量 pill -->
      <view class="head">
        <text class="name">{{ item.name }}</text>
        <view class="qty-pill">
          <text>× {{ item.quantity }}</text>
        </view>
      </view>

      <!-- 位置面包屑卡 -->
      <view class="card loc-card" @tap="goLocation">
        <view class="icon-tile">
          <LocationIcon :slug="locIcon" :size="36" />
        </view>
        <view class="loc-body">
          <text class="loc-name">{{ locationName || '未放置' }}</text>
          <text class="loc-sub">{{ locPath || (item.tags.length ? `标签 ${item.tags.length} 个` : '无标签') }}</text>
        </view>
        <text class="loc-arrow">›</text>
      </view>

      <!-- 录入信息 -->
      <view class="meta-row">
        <text>添加于 {{ formatDateTime(item.createdAt) }}</text>
      </view>

      <!-- 标签 / 数量双卡 -->
      <view class="duo">
        <view class="card info-card">
          <text class="info-title">标签</text>
          <view v-if="item.tags.length" class="info-tags">
            <view v-for="t in item.tags" :key="t" class="tag" :style="tagStyle(t)">
              <text>{{ t }}</text>
            </view>
          </view>
          <text v-else class="info-empty">无</text>
        </view>
        <view class="card info-card info-card-sm">
          <text class="info-title">数量</text>
          <text class="info-num">{{ item.quantity }} 件</text>
        </view>
      </view>

      <!-- 备注 -->
      <view v-if="item.notes" class="card notes-card">
        <text class="info-title">备注</text>
        <text class="notes-text">{{ item.notes }}</text>
      </view>
    </template>

    <!-- 底部固定操作栏 -->
    <view v-if="item" class="footer-bar">
      <button class="btn-secondary" @tap="goEdit">编辑物品</button>
        <button class="btn-danger-soft" @tap="onDelete">删除</button>
    </view>

    <AppTabbar />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import {
  deleteItem, getItem, getLocation, getLocationPath, recordRecentView, type LocalItem,
} from '../../composables/useLocalData'
import { formatDateTime, removeLocalPhotos, tagStyle } from '../../utils/local-photo'
import { resolvePhotoUrl } from '../../utils/photo-uploader'
import { getCompartmentIcon, getFurnitureIcon, getRoomIcon } from '../../utils/room-style'
import AppTabbar from '../../components/AppTabbar.vue'
import LocationIcon from '../../components/LocationIcon.vue'
import { useTheme } from '../../composables/useTheme'
import { useSafeArea } from '../../composables/useSafeArea'
const { themeClass } = useTheme()
const { topVars, pageStyle } = useSafeArea()

const auth = useAuth()
const itemId = ref('')
const item = ref<LocalItem | null>(null)
const locationName = ref('')
const locPath = ref('')
const locLevel = ref('room')
const heroIndex = ref(0)
/** 展示用照片列表：本地路径 + 云端 photoRefs（签名 URL 异步解析后追加） */
const photos = ref<Array<{ key: string; src: string }>>([])

const locIcon = computed(() => {
  if (locLevel.value === 'furniture') return getFurnitureIcon(locationName.value)
  if (locLevel.value === 'compartment') return getCompartmentIcon(locationName.value)
  return getRoomIcon(locationName.value || '未放置')
})

function refresh() {
  if (!itemId.value) return
  item.value = getItem(itemId.value)
  if (item.value) {
    const loc = getLocation(item.value.locationId)
    locationName.value = loc?.name ?? ''
    locLevel.value = loc?.level ?? 'room'
    locPath.value = getLocationPath(item.value.locationId)
  }
  void rebuildPhotos()
}

/** 本地路径立即展示；云端引用逐个解析签名 URL 后追加（并发解析、先到先显示） */
async function rebuildPhotos() {
  const cur = item.value
  if (!cur) {
    photos.value = []
    return
  }
  const locals = (cur.photoPaths ?? []).map(p => ({ key: p, src: p }))
  photos.value = locals
  const refs = cur.photoRefs ?? []
  const resolved = await Promise.all(refs.map(async r => {
    const src = await resolvePhotoUrl(r.photoId)
    return src ? { key: r.photoId, src } : null
  }))
  // await 期间 item 可能已切换或刷新，校验后再合并
  if (item.value && item.value.id === cur.id) {
    photos.value = [...locals, ...resolved.filter((p): p is { key: string; src: string } => p !== null)]
  }
}

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/home' })
}
function goEdit() {
  uni.navigateTo({ url: `/pages/item-edit/item-edit?id=${itemId.value}` })
}
function goLocation() {
  if (!item.value) return
  uni.navigateTo({ url: `/pages/location-detail/location-detail?id=${item.value.locationId}` })
}
function previewPhoto(i: number) {
  if (!photos.value.length) return
  uni.previewImage({ current: photos.value[i]?.src, urls: photos.value.map(p => p.src) })
}
function onHeroChange(e: any) {
  heroIndex.value = e?.detail?.current ?? 0
}
function onDelete() {
  if (!item.value) return
  uni.showModal({
    title: '删除物品',
    content: `确定删除「${item.value.name}」？删除后无法恢复。`,
    confirmText: '删除',
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      removeLocalPhotos([...(item.value!.photoPaths ?? [])])
      deleteItem(item.value!.id)
      uni.navigateBack()
    },
  })
}

onLoad((query) => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  itemId.value = String(query?.id ?? '')
  refresh()
})

onShow(() => {
  refresh()
  if (item.value) recordRecentView(item.value.id)
})
</script>

<style scoped>
/* hero 照片区 */
.hero {
  width: 100%;
  height: 512rpx;
  border-radius: 36rpx;
  overflow: hidden;
  background: #f0f2f0;
  box-shadow: 0 2rpx 6rpx rgba(24, 39, 32, 0.06);
  margin-bottom: 20rpx;
}
.hero-swiper {
  width: 100%;
  height: 100%;
}
.hero-img {
  width: 100%;
  height: 100%;
}
.hero-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}
.hero-empty-text {
  font-size: 24rpx;
  color: #8a978f;
}

/* 标题行 */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 4rpx;
  margin-bottom: 20rpx;
}
.name {
  font-size: 42rpx;
  font-weight: 700;
  color: #182720;
  letter-spacing: 2rpx;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 位置卡 */
.loc-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
}
.loc-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.loc-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f7a38;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loc-sub {
  font-size: 22rpx;
  color: #8a978f;
}
.loc-arrow {
  color: #aebbb2;
  font-size: 40rpx;
  line-height: 1;
}

/* 录入信息 */
.meta-row {
  padding: 4rpx 4rpx 20rpx;
  font-size: 22rpx;
  color: #8a978f;
}

/* 双卡 */
.duo {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.info-card {
  padding: 20rpx 24rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.info-card-sm {
  width: 200rpx;
  flex: none;
}
.info-title {
  font-size: 22rpx;
  color: #8a978f;
  font-weight: 600;
}
.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.tag {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.3;
}
.info-empty {
  font-size: 26rpx;
  font-weight: 600;
  color: #51605a;
}
.info-num {
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
}

/* 备注 */
.notes-card {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.notes-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #51605a;
  white-space: pre-wrap;
}

/* 空态 */
.empty {
  margin-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  color: #8a978f;
  font-size: 28rpx;
}
.back-btn {
  min-width: 240rpx;
  padding: 20rpx 40rpx;
}
</style>
