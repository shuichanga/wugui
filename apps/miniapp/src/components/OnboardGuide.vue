<script setup lang="ts">
// 首次使用引导弹窗：仅首次弹出（storage 标志），介绍主要功能；提供"直接使用/登录账号"两个出口
// 审核要求：先体验后登录——登录永远不是强制步骤
import { useAuth } from '../composables/useAuth'
import { useHomeTabs } from '../composables/useHomeTabs'

const KEY = 'wugui:guide-v1'

const visible = ref(!uni.getStorageSync(KEY))
const auth = useAuth()
const { switchTab } = useHomeTabs()

function close() {
  visible.value = false
  uni.setStorageSync(KEY, '1')
}

function startLocal() {
  close()
}

function goLogin() {
  close()
  uni.navigateTo({ url: '/pages/login/login' })
}

function goLocations() {
  close()
  switchTab('locations')
}
</script>

<template>
  <view v-if="visible" class="guide-mask" @tap="startLocal">
    <view class="guide-card" @tap.stop>
      <view class="guide-badge">
        <text>物归</text>
      </view>
      <text class="guide-title">欢迎使用物归</text>
      <text class="guide-sub">把家里的东西收得明明白白</text>

      <view class="guide-list">
        <view class="guide-row">
          <view class="guide-dot"></view>
          <text class="guide-text">空间/物品分级管理：房间 → 家具 → 格位</text>
        </view>
        <view class="guide-row">
          <view class="guide-dot"></view>
          <text class="guide-text">拍照录入，找东西按空间路径一查即得</text>
        </view>
        <view class="guide-row">
          <view class="guide-dot"></view>
          <text class="guide-text">数据默认保存在本机，登录账号后可多端云同步</text>
        </view>
      </view>

      <view class="guide-actions">
        <view class="btn-primary guide-start" @tap="startLocal">
          <text>开始使用</text>
        </view>
        <view class="guide-secondary" @tap="goLocations">
          <text>先看看空间怎么建</text>
        </view>
        <view v-if="!auth.isLogged" class="guide-secondary" @tap="goLogin">
          <text>已有账号？去登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.guide-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(12, 22, 16, 0.45);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.guide-card {
  width: 100%;
  background: var(--color-surface, #ffffff);
  border-radius: 36rpx;
  padding: 48rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.guide-badge {
  background: var(--color-primary, #16a34a);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  border-radius: 999rpx;
  padding: 8rpx 32rpx;
}
.guide-title {
  font-family: var(--font-display);
  font-size: 38rpx;
  font-weight: 700;
  color: var(--color-text, #182720);
  margin-top: 8rpx;
}
.guide-sub {
  font-size: 26rpx;
  color: var(--color-text-tertiary, #8a978f);
}
.guide-list {
  margin-top: 24rpx;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.guide-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.guide-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: var(--color-primary, #16a34a);
  margin-top: 14rpx;
  flex-shrink: 0;
}
.guide-text {
  flex: 1;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--color-text-secondary, #51605a);
}
.guide-actions {
  margin-top: 32rpx;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.guide-start {
  padding: 24rpx 32rpx;
  font-size: 32rpx;
}
.guide-secondary {
  text-align: center;
  font-size: 26rpx;
  color: var(--color-text-tertiary, #8a978f);
  padding: 8rpx 0;
}
</style>
