<template>
  <!-- 底部导航条 + 中央 FAB：对齐 Web 端 AppBottomNav（首页 / 物品 / [FAB] / 空间 / 我的） -->
  <view class="tabbar">
    <view class="tabbar-inner">
      <view v-for="t in tabsBefore" :key="t.key" class="tab-cell" @tap="go(t.key)">
        <view class="tab" :class="{ on: active === t.key }">
          <LocationIcon
            :slug="t.slug"
            :size="44"
            :state="active === t.key ? 'active' : 'inactive'"
            class="tab-icon"
          />
          <text class="tab-label" :class="{ on: active === t.key }">{{ t.label }}</text>
          <view class="tab-dot" :class="{ on: active === t.key }"></view>
        </view>
      </view>
      <!-- FAB 槽固定第 3 位：与其余四段等宽，保证五段中心间距均等 -->
      <view class="tab-fab-slot"></view>
      <view v-for="t in tabsAfter" :key="t.key" class="tab-cell" @tap="go(t.key)">
        <view class="tab" :class="{ on: active === t.key }">
          <LocationIcon
            :slug="t.slug"
            :size="44"
            :state="active === t.key ? 'active' : 'inactive'"
            class="tab-icon"
          />
          <text class="tab-label" :class="{ on: active === t.key }">{{ t.label }}</text>
          <view class="tab-dot" :class="{ on: active === t.key }"></view>
        </view>
      </view>
    </view>
    <!-- FAB：始终可点，不受当前 tab 影响 -->
    <view class="tab-fab" @tap="onFab">
      <text class="tab-fab-plus">＋</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LocationIcon from './LocationIcon.vue'
import { useHomeTabs, TAB_ORDER, type TabKey } from '../composables/useHomeTabs'

const tabsBefore = [
  { key: 'home' as TabKey, label: '首页', slug: 'tab-home' },
  { key: 'items' as TabKey, label: '物品', slug: 'tab-box' },
]
const tabsAfter = [
  { key: 'locations' as TabKey, label: '空间', slug: 'tab-shelf' },
  { key: 'settings' as TabKey, label: '我的', slug: 'tab-user' },
]

const { activeTab, switchTab } = useHomeTabs()
const active = computed(() => TAB_ORDER[activeTab.value] ?? '')

function go(key: TabKey) {
  switchTab(key)
}

function onFab() {
  uni.navigateTo({ url: '/pages/item-edit/item-edit' })
}
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-surface, #ffffff);
  border-top: 1rpx solid var(--color-border, #e4eae5);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}
.tabbar-inner {
  display: flex;
  align-items: center;
  height: var(--tabbar-height, 128rpx);
}
.tab-cell {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-fab-slot {
  flex: 1;
  height: 100%;
}
.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 0;
  width: 100%;
}
.tab-icon {
  width: 44rpx;
  height: 44rpx;
}
.tab-label {
  font-size: 20rpx;
  color: var(--color-text-tertiary, #8a978f);
  line-height: 1;
}
.tab-label.on {
  color: var(--color-primary, #16a34a);
  font-weight: 600;
}
.tab-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: transparent;
}
.tab-dot.on {
  background: var(--color-primary, #16a34a);
}
.tab-fab {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -34%);
  width: 108rpx;
  height: 108rpx;
  border-radius: 999rpx;
  background: var(--color-primary, #16a34a);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-primary, 0 20rpx 44rpx rgba(22, 163, 74, 0.34)),
    0 0 0 8rpx var(--color-surface, #ffffff);
  z-index: 101;
}
.tab-fab-plus {
  font-size: 48rpx;
  font-weight: 600;
  line-height: 1;
}
</style>
