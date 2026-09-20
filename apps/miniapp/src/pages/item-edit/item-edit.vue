<template>
  <main class="page">
    <view class="card form">
      <view class="field">
        <text class="label">名称</text>
        <input v-model="name" class="input-base" placeholder="物品名称" maxlength="50" />
      </view>
      <view class="field">
        <text class="label">数量</text>
        <input v-model="quantity" class="input-base" type="number" />
      </view>
      <view class="field">
        <text class="label">收纳空间</text>
        <picker :range="locationNames" @change="onPick">
          <view class="input-base picker">
            <text :class="locationIndex >= 0 ? 'picker-value' : 'text-muted'">
              {{ locationIndex >= 0 ? locationNames[locationIndex] : '选择收纳空间' }}
            </text>
          </view>
        </picker>
        <text v-if="!locations.length" class="text-muted hint">
          还没有空间，先到「空间」页添加一个
        </text>
      </view>
      <view class="field">
        <text class="label">标签</text>
        <input v-model="tags" class="input-base" placeholder="用逗号分隔，如：厨房,易碎" />
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="notes" class="input-base notes" placeholder="选填" maxlength="200" />
      </view>
    </view>

    <button class="btn-primary save" :loading="saving" @click="onSave">保存</button>
    <button v-if="isEdit" class="btn-danger" @click="onDelete">删除物品</button>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'
import {
  createItem, createLocation, deleteItem, getItem, updateItem, useStore,
} from '../../composables/useLocalData'
import { errMsg } from '../../utils/api'

const auth = useAuth()
const store = useStore()

const id = ref('')
const isEdit = computed(() => !!id.value)
const name = ref('')
const quantity = ref('1')
const locationIndex = ref(-1)
const tags = ref('')
const notes = ref('')
const saving = ref(false)

const locations = ref(store.locations())
const locationNames = computed(() => locations.value.map(l => l.name))
const locationId = computed(() => (locationIndex.value >= 0 ? locations.value[locationIndex.value].id : ''))

function refreshLocations() {
  locations.value = store.locations()
}

onLoad((query) => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  refreshLocations()
  const editId = String(query?.id ?? '')
  if (!editId) return
  id.value = editId
  const item = getItem(editId)
  if (!item) {
    uni.navigateBack()
    return
  }
  name.value = item.name
  quantity.value = String(item.quantity)
  notes.value = item.notes ?? ''
  tags.value = item.tags.join(',')
  const idx = locations.value.findIndex(l => l.id === item.locationId)
  if (idx >= 0) locationIndex.value = idx
})

function onPick(e: { detail: { value: number | string } }) {
  locationIndex.value = Number(e.detail.value)
}

function onSave() {
  if (!name.value.trim()) {
    uni.showToast({ title: '请填写物品名称', icon: 'none' })
    return
  }
  if (!locationId.value) {
    uni.showToast({ title: '请选择收纳空间', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      quantity: Math.max(1, Math.round(Number(quantity.value) || 1)),
      notes: notes.value.trim() || null,
      locationId: locationId.value,
      tags: tags.value.split(/[,，]/).map(t => t.trim()).filter(Boolean).slice(0, 10),
    }
    if (isEdit.value) updateItem(id.value, payload)
    else createItem(payload)
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 400)
  } catch (e) {
    uni.showToast({ title: errMsg(e) || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onDelete() {
  uni.showModal({
    title: '删除物品',
    content: `确定删除「${name.value}」？`,
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      deleteItem(id.value)
      uni.navigateBack()
    },
  })
}

// 新页面可能刚加完空间就进来，show 时刷新一次
onShow(() => {
  refreshLocations()
  if (locationIndex.value >= 0) {
    const idx = locations.value.findIndex(l => l.id === locationId.value)
    if (idx >= 0) locationIndex.value = idx
  }
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 32rpx 60rpx;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.label {
  font-size: 26rpx;
  color: #6b7280;
}
.picker {
  display: flex;
  align-items: center;
  min-height: 44rpx;
}
.picker-value {
  color: #111827;
  font-size: 28rpx;
}
.hint {
  margin-top: -2rpx;
}
.notes {
  height: 140rpx;
}
.save {
  margin-top: 32rpx;
}
.save + .btn-danger,
.btn-danger {
  margin-top: 24rpx;
}
</style>
