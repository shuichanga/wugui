<template>
  <!-- page-meta：状态栏/导航带高度写到 page 元素，标题与胶囊对齐 -->
  <page-meta :page-style="pageStyle" />
  <view class="page page-tabbar" :class="themeClass" :style="topVars">
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

    <!-- 项目：GitHub 仓库（对齐 Web 端按钮样式；小程序无法直接跳外部浏览器，点击复制链接） -->
    <view class="section">
      <text class="sec-title">项目</text>
      <view class="github-btn" @tap="copyGithub">
        <LocationIcon slug="github" :size="34" />
        <text class="github-text">开源仓库 · GitHub</text>
      </view>
    </view>

    <!-- 底部版权与作者：对齐 Web 端 footer -->
    <view class="footer">
      <text class="footer-text">© {{ year }} 物归 · 用心整理每一个家</text>
      <text class="footer-author">作者：水常 · 邮箱：<text class="footer-link" @tap="copyEmail">rao@shuichanga.cn</text></text>
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
import { useSafeArea } from '../../composables/useSafeArea'
const { themeClass } = useTheme()
const { switchTab } = useHomeTabs()
const { topVars, pageStyle } = useSafeArea()
const version = __APP_VERSION__
const year = new Date().getFullYear()

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else switchTab('settings')
}

/** 复制到剪贴板：写剪贴板是隐私接口，被拦截/拒绝时 fail 不带提示，这里统一兜底 */
function copyText(data: string, okTitle: string) {
  uni.setClipboardData({
    data,
    success: () => uni.showToast({ title: okTitle, icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }),
  })
}

function copyGithub() {
  copyText('https://github.com/shuichanga/wugui', '链接已复制')
}

function copyEmail() {
  copyText('rao@shuichanga.cn', '邮箱已复制')
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

/* GitHub 按钮：对齐 Web 端（h-46px 圆角xl 1.5px 描边 图标+文字居中） */
.github-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  height: 92rpx;
  margin-top: 16rpx;
  background: var(--color-surface);
  border: 3rpx solid var(--color-border-strong);
  border-radius: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 16rpx 48rpx rgba(24, 39, 32, 0.05);
}
.github-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text);
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
.footer-author {
  display: block;
  margin-top: 8rpx;
  font-family: var(--font-display);
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #aebbb2;
}
.footer-link {
  color: var(--color-primary-dark);
}
</style>
