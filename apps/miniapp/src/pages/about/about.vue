<template>
  <view class="page page-tabbar" :class="themeClass">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="topbar-back" @tap="goBack">
        <LocationIcon slug="chevron-left" :size="32" />
      </view>
      <text class="topbar-title">关于</text>
    </view>

    <!-- 品牌区：logo + 版本药丸 + 标语 + 三绿点 -->
    <view class="brand">
      <image src="/static/logo.png" class="brand-logo" mode="aspectFit" />
      <text class="brand-name">物归</text>
      <text class="brand-tagline">归位每一件物品</text>
      <view class="brand-dots">
        <view class="brand-dot"></view>
        <view class="brand-dot brand-dot-mid"></view>
        <view class="brand-dot brand-dot-light"></view>
      </view>
    </view>

    <!-- 关于物归 -->
    <view class="section">
      <view class="sec-head">
        <text class="sec-title">关于物归</text>
        <view class="ver-pill">
          <text>v{{ version }}</text>
        </view>
      </view>
      <view class="card desc-card">
        <text class="desc-text">
          物归是一个开源的家庭物品管理应用，帮你把家里的东西「放得明确、找得回来」。
          多住所、房间—家具—格子三级定位，全家人一起维护。
        </text>
      </view>
    </view>

    <!-- 数据与安全 -->
    <view class="section">
      <text class="sec-title">数据与安全</text>
      <view class="card list-card">
        <view class="list-row">
          <view class="row-icon-tile">
            <LocationIcon slug="hard-drive" :size="36" />
          </view>
          <view class="row-body">
            <text class="row-title">数据存储</text>
            <text class="row-sub">本地模式：数据保存在本机</text>
          </view>
        </view>
        <view class="list-row list-row-border">
          <view class="row-icon-tile">
            <LocationIcon slug="shield" :size="36" />
          </view>
          <view class="row-body">
            <text class="row-title">隐私保护</text>
            <text class="row-sub">小程序版数据不离开本机</text>
          </view>
        </view>
      </view>
      <text class="sec-hint">可在"我的"页导出 JSON 作为本地备份。</text>
    </view>

    <!-- 项目 -->
    <view class="section">
      <text class="sec-title">项目</text>
      <view class="card link-card" @tap="copyGithub">
        <text class="link-text">开源仓库 · GitHub</text>
        <text class="link-arrow">›</text>
      </view>
    </view>

    <!-- 底部版权 -->
    <view class="footer">
      <text class="footer-text">© {{ year }} 物归 · 用心整理每一个家</text>
    </view>

    <AppTabbar />
    <!-- 隐私授权弹窗：本页复制 GitHub 链接用到剪贴板 -->
    <PrivacyPopup />
  </view>
</template>

<script setup lang="ts">
import AppTabbar from '../../components/AppTabbar.vue'
import LocationIcon from '../../components/LocationIcon.vue'
import PrivacyPopup from '../../components/PrivacyPopup.vue'
import { useTheme } from '../../composables/useTheme'
import { useHomeTabs } from '../../composables/useHomeTabs'
const { themeClass } = useTheme()
const { switchTab } = useHomeTabs()
const version = '1.0.0'
const year = new Date().getFullYear()

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else switchTab('settings')
}

function copyGithub() {
  uni.setClipboardData({
    data: 'https://github.com/shuichanga/wugui',
    success: () => uni.showToast({ title: '链接已复制', icon: 'success' }),
  })
}
</script>

<style scoped>
/* 品牌区 */
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 0 32rpx;
  gap: 12rpx;
}
.brand-logo {
  width: 156rpx;
  height: 156rpx;
  border-radius: 48rpx;
  box-shadow: 0 16rpx 40rpx rgba(22, 163, 74, 0.25);
}
.brand-name {
  font-size: 44rpx;
  font-weight: 800;
  letter-spacing: 8rpx;
  color: #182720;
  margin-top: 16rpx;
}
.brand-tagline {
  font-size: 24rpx;
  letter-spacing: 14rpx;
  color: #8a978f;
}
.brand-dots {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}
.brand-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: #16a34a;
}
.brand-dot-mid {
  opacity: 0.55;
}
.brand-dot-light {
  opacity: 0.3;
}

/* 区块 */
.section {
  margin-top: 32rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx 12rpx;
}
.sec-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #51605a;
}
.ver-pill {
  background: #e7f4ec;
  border-radius: 999rpx;
  padding: 4rpx 16rpx;
}
.ver-pill > text {
  font-size: 20rpx;
  font-weight: 600;
  color: #0f7a38;
}
.desc-card {
  padding: 24rpx;
}
.desc-text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #51605a;
}

/* 列表卡 */
.list-card {
  padding: 0;
  overflow: hidden;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
}
.list-row-border {
  border-top: 1rpx solid #e4eae5;
}
.row-icon-tile {
  width: 68rpx;
  height: 68rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e7f4ec;
  color: #16a34a;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.row-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
}
.row-sub {
  font-size: 22rpx;
  color: #8a978f;
}
.sec-hint {
  display: block;
  font-size: 22rpx;
  color: #8a978f;
  padding: 8rpx 4rpx 0;
}

/* 链接卡 */
.link-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 28rpx 24rpx;
}
.link-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
}
.link-arrow {
  font-size: 36rpx;
  color: #aebbb2;
  line-height: 1;
}

/* 底部 */
.footer {
  margin-top: 64rpx;
  text-align: center;
}
.footer-text {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #aebbb2;
}
</style>
