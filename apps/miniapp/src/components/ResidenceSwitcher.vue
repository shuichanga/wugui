<template>
  <!-- 住所切换（对齐 Web 端 components/ResidenceSwitcher.vue）：
       日期右侧点住所名展开下拉，勾选当前住所、切换、或跳转「我的」管理 -->
  <view class="rs-root">
    <view
      class="rs-trigger"
      role="button"
      :aria-expanded="String(open)"
      aria-label="切换住所"
      @tap.stop="toggle"
    >
      <slot>
        <text class="rs-date">{{ date }}</text>
        <text class="rs-sep">·</text>
        <text class="rs-name">{{ householdName || '我的住所' }}</text>
      </slot>
      <view class="rs-chev" :class="{ on: open }">
        <LocationIcon slug="chevron-down" :size="22" state="muted" />
      </view>
    </view>

    <!-- 点空白处关闭 -->
    <view v-if="open" class="rs-mask" @tap.stop="open = false" />

    <view v-if="open" class="rs-menu">
      <text class="rs-menu-title">切换住所</text>
      <view
        v-for="h in households"
        :key="h.id"
        class="rs-opt"
        :class="{ current: h.id === currentHouseholdId }"
        @tap.stop="pick(h)"
      >
        <text class="rs-opt-name truncate">{{ h.name }}</text>
        <LocationIcon v-if="h.id === currentHouseholdId" slug="check" :size="24" />
      </view>
      <view class="rs-divider" />
      <view class="rs-opt rs-opt-manage" @tap.stop="goManage">
        <LocationIcon slug="settings" :size="24" state="muted" />
        <text>管理住所</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LocationIcon from './LocationIcon.vue'
import { useHomeTabs } from '../composables/useHomeTabs'
import { useHouseholds, type Household } from '../composables/useHouseholds'

const props = withDefaults(defineProps<{
  /** 日期副行，与住所名用「·」拼成一行（对应 Web 端 slot 内容） */
  date?: string
}>(), { date: '' })

const emit = defineEmits<{ switched: [] }>()

const { switchTab } = useHomeTabs()
const { households, currentHouseholdId, householdName, switchTo } = useHouseholds()
const open = ref(false)

function toggle() {
  open.value = !open.value
}

function pick(h: Household) {
  open.value = false
  if (h.id === currentHouseholdId.value) return
  if (switchTo(h.id)) {
    emit('switched')
  } else {
    uni.showToast({ title: '切换失败，请重试', icon: 'none' })
  }
}

function goManage() {
  open.value = false
  switchTab('settings')
}
</script>

<style scoped>
.rs-root {
  position: relative;
}

.rs-trigger {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-width: 0;
}
.rs-date {
  font-size: 24rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.rs-sep {
  font-size: 24rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.rs-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #51605a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rs-chev {
  display: flex;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.rs-chev.on {
  transform: rotate(180deg);
}

/* 遮罩：铺满全屏（父级 overflow 不裁固定定位） */
.rs-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 190;
}

/* 下拉菜单 */
.rs-menu {
  position: absolute;
  left: 0;
  top: 44rpx;
  z-index: 200;
  width: 280rpx;
  background: #ffffff;
  border: 1rpx solid #e4eae5;
  border-radius: 24rpx;
  padding: 12rpx;
  box-shadow: 0 16rpx 48rpx rgba(24, 39, 32, 0.12);
}
.rs-menu-title {
  padding: 6rpx 12rpx 10rpx;
  font-size: 22rpx;
  color: #8a978f;
}
.rs-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 12rpx;
  border-radius: 12rpx;
}
.rs-opt-name {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #182720;
}
.rs-opt.current .rs-opt-name {
  color: #16a34a;
  font-weight: 600;
}
.rs-opt-manage {
  gap: 12rpx;
  color: #51605a;
}
.rs-opt-manage text {
  font-size: 26rpx;
  color: #51605a;
}
.rs-divider {
  height: 1rpx;
  background: #e4eae5;
  margin: 6rpx 0;
}
.rs-chev,
.rs-opt {
  display: flex;
}
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
