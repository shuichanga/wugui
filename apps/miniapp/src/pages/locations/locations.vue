<template>
  <main class="page">
    <view class="card add-card">
      <input
        v-model="name"
        class="input-base"
        placeholder="新空间名称，如：客厅 / 电视柜"
        maxlength="30"
        @confirm="onAdd"
      />
      <button class="btn-primary add-btn" :disabled="!name.trim()" @click="onAdd">添加</button>
    </view>

    <p v-if="!locations.length" class="text-muted empty">还没有收纳空间，先添加一个</p>

    <view v-for="loc in locations" :key="loc.id" class="card loc-card">
      <text class="loc-name">{{ loc.name }}</text>
      <text class="loc-count">{{ countItems(loc.id) }} 件物品</text>
      <text
        v-if="countItems(loc.id) === 0"
        class="loc-del"
        @click="onRemove(loc.id, loc.name)"
      >删除</text>
    </view>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import { createLocation, deleteLocation, useStore, type LocalLocation } from '../../composables/useLocalData'

const auth = useAuth()
const store = useStore()
const locations = ref<LocalLocation[]>([])
const name = ref('')

function countItems(locationId: string): number {
  return store.items().filter(i => i.locationId === locationId).length
}

function onAdd() {
  const n = name.value.trim()
  if (!n) return
  createLocation(n)
  name.value = ''
  refresh()
}

function refresh() {
  locations.value = store.locations()
}

function onRemove(id: string, name2: string) {
  uni.showModal({
    title: '删除空间',
    content: `确定删除「${name2}」？`,
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      deleteLocation(id)
      refresh()
    },
  })
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
.add-card {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.add-btn {
  padding: 18rpx 32rpx;
  flex-shrink: 0;
}
.empty {
  text-align: center;
  margin-top: 120rpx;
}
.loc-card {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.loc-name {
  font-size: 30rpx;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}
.loc-count {
  color: #6b7280;
  font-size: 24rpx;
}
.loc-del {
  color: #dc2626;
  font-size: 26rpx;
}
</style>
