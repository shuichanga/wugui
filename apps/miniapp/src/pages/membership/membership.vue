<template>
  <view class="page" :class="themeClass" :style="topVars">
    <view class="topbar">
      <view class="topbar-back" @tap="goBack">
        <LocationIcon slug="chevron-left" :size="32" />
      </view>
      <text class="topbar-title">云同步与会员</text>
    </view>

    <!-- 会员状态卡 -->
    <view class="card status-card">
      <view class="status-head">
        <view class="icon-tile">
          <LocationIcon slug="star" :size="36" />
        </view>
        <view class="status-body">
          <text class="status-name">{{ membership.isPro ? '会员已开通' : '尚未开通会员' }}</text>
          <text class="status-sub">{{ planLabel }}</text>
        </view>
        <view v-if="membership.isPro" class="badge-pro"><text>PRO</text></view>
      </view>

      <!-- 云同步解锁状态（住所级：家庭成员订阅同样解锁） -->
      <view class="sync-row">
        <view class="sync-dot" :class="{ on: membership.canCloudSync }"></view>
        <view class="sync-body">
          <text class="sync-title">{{ syncTitle }}</text>
          <text class="sync-sub">{{ syncSub }}</text>
        </view>
      </view>
    </view>

    <!-- 开通卡 -->
    <view class="card buy-card">
      <text class="buy-title">开通云同步会员</text>
      <view class="feat-list">
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">物品 / 空间多设备实时同步</text></view>
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">与 Web 端数据互通</text></view>
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">家庭共享：家人加入住所即享同步</text></view>
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">会员免广告</text></view>
      </view>
      <button class="btn-primary buy-btn" :disabled="paying" @tap="onBuy">
        <text>{{ paying ? '处理中…' : '立即开通' }}</text>
      </button>
      <text class="buy-note">开通后当前账号的全部住所均可用云同步</text>
    </view>

    <!-- 家庭共享说明 -->
    <view class="card share-card">
      <text class="share-title">家庭共享规则</text>
      <text class="share-text">· 任一成员开通会员，其所在住所即解锁云同步</text>
      <text class="share-text">· 会员本人关闭广告，家庭成员不受影响</text>
      <text class="share-text">· 每个住所最多 10 名成员</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import LocationIcon from '../../components/LocationIcon.vue'
import { useTheme } from '../../composables/useTheme'
import { useSafeArea } from '../../composables/useSafeArea'
import { useMembership } from '../../composables/useMembership'
import { api, errMsg } from '../../utils/api'
import { syncNow } from '../../composables/useSync'

const { themeClass } = useTheme()
const { topVars } = useSafeArea()
const membership = useMembership()
const paying = ref(false)

const planLabel = computed(() => {
  if (!membership.isPro) return '免费版 · 数据仅存本机'
  if (!membership.state.value.expiresAt) return '永久有效'
  return `有效期至 ${membership.state.value.expiresAt.slice(0, 10)}`
})

const syncTitle = computed(() =>
  membership.canCloudSync ? '当前住所云同步已解锁' : '当前住所云同步未解锁',
)
const syncSub = computed(() => {
  if (!membership.canCloudSync) return '开通会员或由家庭成员开通后自动解锁'
  return membership.state.value.cloudSyncSource === 'self'
    ? '来源：我的会员'
    : '来源：家庭成员的会员（家庭共享）'
})

onShow(() => {
  void membership.refresh()
})

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/home' })
}

/** 购买：服务端签发虚拟支付参数（M2 骨架 501 → 提示暂未开放；备案认证后填 offerId 即通） */
async function onBuy() {
  if (paying.value) return
  paying.value = true
  try {
    const res = await api.post<{
      signData: Record<string, unknown>
      sign: string
      pkg: string
    }>('/subscription/wechat/pay', { planType: 'cloud_sync_permanent' })

    // 微信虚拟支付（需小程序备案+认证、后台开通虚拟支付后可用）
    await new Promise<void>((resolve, reject) => {
      wx.requestVirtualPayment({
        signData: res.signData,
        sign: res.sign,
        package: res.pkg,
        success: () => resolve(),
        fail: (err: { errMsg?: string }) => reject(new Error(err.errMsg || '支付未完成')),
      })
    })
    await membership.refresh()
    await syncNow()
    uni.showToast({ title: '开通成功', icon: 'success' })
  } catch (e) {
    const msg = errMsg(e)
    if (msg.includes('暂未开放') || msg.includes('NOT_AVAILABLE')) {
      uni.showToast({ title: '微信支付通道配置中，敬请期待', icon: 'none' })
    } else {
      uni.showToast({ title: msg || '支付未完成', icon: 'none' })
    }
  } finally {
    paying.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: var(--status-bar-height, 0px) 32rpx 40rpx;
  box-sizing: border-box;
  background: var(--color-bg);
  color: var(--color-text);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--nav-bar-height, 88rpx);
  padding: 0 32rpx;
  position: relative;
  margin: 0 -32rpx;
}
.topbar-back {
  position: absolute;
  left: 24rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: var(--color-surface);
  border: 1rpx solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
}
.topbar-title {
  font-size: 30rpx;
  font-weight: 600;
}

/* 会员状态卡 */
.status-card {
  margin-top: 24rpx;
}
.status-head {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.status-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.status-name {
  font-family: var(--font-display);
  font-size: 32rpx;
  font-weight: 700;
}
.status-sub {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
.badge-pro {
  background: var(--color-primary);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
  border-radius: 999rpx;
  padding: 6rpx 20rpx;
  letter-spacing: 2rpx;
}

/* 云同步状态行 */
.sync-row {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid var(--color-border);
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.sync-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: var(--color-border-strong);
  margin-top: 10rpx;
}
.sync-dot.on {
  background: var(--color-signal);
}
.sync-body {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.sync-title {
  font-size: 28rpx;
  font-weight: 600;
}
.sync-sub {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

/* 开通卡 */
.buy-card {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.buy-title {
  font-family: var(--font-display);
  font-size: 30rpx;
  font-weight: 700;
}
.feat-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.feat-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.feat-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: var(--color-primary);
}
.feat-text {
  font-size: 26rpx;
  color: var(--color-text-secondary);
}
.buy-btn {
  width: 100%;
}
.buy-note {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  text-align: center;
}

/* 家庭共享说明 */
.share-card {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.share-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 4rpx;
}
.share-text {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
