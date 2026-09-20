<template>
  <main class="page">
    <view class="card user-card">
      <view class="avatar">{{ initial }}</view>
      <view class="user-info">
        <text class="user-name">{{ auth.state.user?.displayName ?? '微信用户' }}</text>
        <text class="text-muted">
          {{ auth.state.user?.username ? `账号：${auth.state.user.username}` : '微信登录' }}
        </text>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">数据与同步</text>
      <text class="text-muted line">
        当前为本地模式：数据保存在本机，可离线使用。云同步与多设备共通将在订阅功能上线后开放。
      </text>
    </view>

    <button class="btn-danger" @click="onLogout">退出登录</button>
    <text class="foot">物归 v{{ version }} · 本机数据随登出保留</text>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuth } from '../../composables/useAuth'

const auth = useAuth()
const version = '1.0.0'
const initial = computed(() => (auth.state.user?.displayName ?? '物').slice(0, 1))

onShow(() => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
  }
})

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '本机数据会保留，下次登录同一账号可继续使用。',
    success: (res) => {
      if (res.confirm) auth.logout()
    },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 32rpx 60rpx;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 12rpx;
}
.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: #16a34a;
  color: #ffffff;
  font-size: 40rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.user-name {
  font-size: 32rpx;
  font-weight: 600;
}
.section {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
}
.line {
  line-height: 1.6;
}
.btn-danger {
  margin-top: 48rpx;
}
.foot {
  display: block;
  text-align: center;
  margin-top: 32rpx;
  color: #9ca3af;
  font-size: 22rpx;
}
</style>
