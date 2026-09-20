<template>
  <main class="page">
    <view class="topbar">
      <text class="title">物归</text>
      <view class="top-actions">
        <text class="link" @click="go('/pages/locations/locations')">空间</text>
        <text class="link" @click="go('/pages/settings/settings')">我的</text>
      </view>
    </view>

    <button class="btn-primary" @click="go('/pages/item-edit/item-edit')">＋ 添加物品</button>

    <p v-if="!items.length" class="text-muted empty">还没有物品，点上方按钮录入第一件</p>

    <view
      v-for="it in items"
      :key="it.id"
      class="card item-card"
      @click="go(`/pages/item-edit/item-edit?id=${it.id}`)"
    >
      <view class="item-main">
        <text class="item-name">{{ it.name }}</text>
        <text class="text-muted">{{ locationName(it.locationId) }}</text>
      </view>
      <text class="qty">× {{ it.quantity }}</text>
    </view>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { useStore, type LocalItem } from '../../composables/useLocalData'

const auth = useAuth()
const items = ref<LocalItem[]>([])
const store = useStore()

function refresh() {
  items.value = store.items()
}

function locationName(locationId: string): string {
  return store.locations().find(l => l.id === locationId)?.name ?? '未分配空间'
}

function go(url: string) {
  uni.navigateTo({ url })
}

onShow(() => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  refresh()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 32rpx 60rpx;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 4rpx 24rpx;
}
.title {
  font-size: 40rpx;
  font-weight: 700;
}
.top-actions {
  display: flex;
  gap: 32rpx;
}
.link {
  color: #16a34a;
  font-size: 28rpx;
  font-weight: 500;
}
.empty {
  text-align: center;
  margin-top: 120rpx;
}
.item-card {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.item-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}
.item-name {
  font-size: 30rpx;
  font-weight: 600;
}
.qty {
  color: #16a34a;
  font-weight: 600;
}
</style>
