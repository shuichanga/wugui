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
        <view class="icon-tile icon-plain">
          <LocationIcon slug="crown" :size="44" :state="membership.isPro ? 'default' : 'muted'" />
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

    <!-- 开通卡：仅虚拟支付已开通（服务端 offerId 已配置）时显示，避免无支付能力的版本被判定为虚拟商品售卖 -->
    <view v-if="membership.state.value.payEnabled" class="card buy-card">
      <view class="buy-head">
        <view class="buy-head-text">
          <text class="buy-title">开通云同步会员</text>
          <text class="buy-sub">永久会员 · 一次买断 · 无订阅无续费</text>
        </view>
        <view class="price-box">
          <view class="price-now-row">
            <text class="price-symbol">¥</text>
            <text class="price-now">{{ currentPriceYuan ?? '--' }}</text>
          </view>
          <text v-if="hasDiscount" class="price-original">原价 ¥{{ originalPriceYuan }}</text>
        </view>
      </view>
      <view class="feat-list">
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">物品 / 空间多设备实时同步</text></view>
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">与 Web 端数据互通</text></view>
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">家庭共享：家人加入住所即享同步</text></view>
        <view class="feat-row"><view class="feat-dot"></view><text class="feat-text">会员免广告</text></view>
      </view>
      <button class="btn-primary buy-btn" :disabled="paying" @tap="onBuy">
        <text>{{ paying ? '处理中…' : (currentPriceYuan ? `立即开通 ¥${currentPriceYuan}` : '立即开通') }}</text>
      </button>
      <text class="buy-note">会员费用用于支付服务器、云存储与多端同步的运行成本，让物归能长期稳定地陪着你</text>
      <text class="buy-note">开通后当前账号的全部住所均可永久使用云同步</text>
      <text class="buy-note">付款后 7 天内可无条件退款；退款后云同步停止，云端数据保留 30 天后清除，本机数据不受影响，重新开通可恢复同步</text>
    </view>
    <view v-else class="card pay-off-card">
      <text class="pay-off-text">云同步会员购买通道即将开放，开通后可多端同步</text>
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

/** 现价（元字符串）：服务端下发，未下发时为 null（按钮与价格行降级为无价文案） */
const currentPriceYuan = computed(() => {
  const p = membership.state.value.product?.goodsPrice
  return typeof p === 'number' && p > 0 ? (p / 100).toFixed(2) : null
})
/** 划线原价（元字符串）：仅在原价高于现价时展示（活动价对比） */
const originalPriceYuan = computed(() => {
  const p = membership.state.value.product?.originalPrice
  return typeof p === 'number' && p > 0 ? (p / 100).toFixed(2) : null
})
const hasDiscount = computed(() => {
  const goods = membership.state.value.product
  return typeof goods?.originalPrice === 'number'
    && typeof goods.goodsPrice === 'number'
    && goods.originalPrice > goods.goodsPrice
})

onShow(() => {
  void membership.refresh()
})

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/home' })
}

/** 购买：wx.login 取 code → 服务端签发虚拟支付参数（paySig/用户态 signature）→ wx.requestVirtualPayment 拉起 → 轮询订单状态确认开通 */
async function onBuy() {
  if (paying.value) return
  // iOS 需微信 ≥ 8.0.68（Apple IAP），低版本引导更新
  if (!checkIosVersion()) return
  paying.value = true
  try {
    // 支付前确认弹窗：明示价格与买断规则，确认后才进入微信支付（价格来自服务端下发）
    if (!(await confirmPurchase())) return
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: res => resolve(res.code ?? ''),
        fail: err => reject(new Error(err.errMsg || '微信登录失败')),
      })
    })
    const res = await api.post<{
      mode: string
      signData: string
      paySig: string
      signature: string
      outTradeNo: string
    }>('/subscription/wechat/pay', { code })

    // success 回调可能丢失（微信异常退出），仅作为轮询起点；发货一律以服务端为准
    await new Promise<void>((resolve, reject) => {
      wx.requestVirtualPayment({
        signData: res.signData,
        paySig: res.paySig,
        signature: res.signature,
        mode: res.mode,
        success: () => resolve(),
        fail: (err: { errMsg?: string; errCode?: number }) => {
          // -2 用户主动取消：静默返回
          if (err.errCode === -2) reject(new Error('PAY_CANCEL'))
          else reject(new Error(err.errMsg || '支付未完成'))
        },
      })
    })

    // 轮询订单状态：服务端已发货（推送已处理或 query_order 兜底命中）才算开通成功
    let delivered = false
    for (let i = 0; i < 5; i++) {
      await sleep(1500)
      const order = await api.get<{ status: string }>(`/subscription/wechat/order/${res.outTradeNo}`)
      if (order.status === 'delivered') {
        delivered = true
        break
      }
      if (order.status === 'refunded' || order.status === 'closed') break
    }
    await membership.refresh()
    if (delivered) {
      await syncNow()
      uni.showToast({ title: '开通成功', icon: 'success' })
    } else {
      uni.showToast({ title: '支付成功，开通确认中，稍后回来查看', icon: 'none' })
    }
  } catch (e) {
    if (errMsg(e) === 'PAY_CANCEL') return
    const msg = errMsg(e)
    if (msg.includes('暂未开放')) {
      uni.showToast({ title: '微信支付通道配置中，敬请期待', icon: 'none' })
    } else {
      uni.showToast({ title: msg || '支付未完成', icon: 'none' })
    }
  } finally {
    paying.value = false
  }
}

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/** 支付前确认弹窗：展示服务端下发的价格（含划线原价）与商品说明，返回用户是否确认（价格未下发时省略金额，仍保留确认环节） */
function confirmPurchase(): Promise<boolean> {
  const goods = membership.state.value.product
  const price = typeof goods?.goodsPrice === 'number' ? `¥${(goods.goodsPrice / 100).toFixed(2)}` : ''
  const discount = hasDiscount.value ? `（原价 ¥${originalPriceYuan.value}）` : ''
  const policy = '付款后 7 天内可无条件退款，超过 7 天不支持退款；退款后云同步停止，云端数据保留 30 天后清除，本机数据不受影响。'
  const content = price
    ? `云同步会员 ${price}${discount} · 一次买断永久有效。${policy}`
    : `云同步会员一次买断永久有效。${policy}`
  return new Promise(resolve => {
    uni.showModal({
      title: '确认开通',
      content,
      confirmText: '确认支付',
      success: res => resolve(!!res.confirm),
      fail: () => resolve(false),
    })
  })
}

/** iOS 端虚拟支付要求微信 ≥ 8.0.68；不满足时引导更新 */
function checkIosVersion(): boolean {
  const sys = wx.getSystemInfoSync()
  if (sys.platform !== 'ios') return true
  const cur = (sys.version || '').split('.').map(Number)
  const base = [8, 0, 68]
  for (let i = 0; i < 3; i++) {
    if ((cur[i] || 0) > base[i]) return true
    if ((cur[i] || 0) < base[i]) break
  }
  uni.showModal({ title: '提示', content: '请将微信更新至最新版后再进行支付', showCancel: false })
  return false
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
/* 会员星标：去浅绿底，图标即状态——已开通主题色，未开通灰度 */
.icon-plain {
  background: transparent;
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
.buy-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}
.buy-head-text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.buy-title {
  font-family: var(--font-display);
  font-size: 30rpx;
  font-weight: 700;
}
.buy-sub {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}
/* 价格区：现价突出，原价划线 */
.price-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}
.price-now-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  color: var(--color-primary);
}
.price-symbol {
  font-size: 24rpx;
  font-weight: 700;
}
.price-now {
  font-family: var(--font-display);
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1;
}
.price-original {
  font-size: 22rpx;
  color: var(--color-text-tertiary);
  text-decoration: line-through;
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
.pay-off-card {
  margin-top: 24rpx;
}
.pay-off-text {
  font-size: 26rpx;
  color: var(--color-text-secondary, #51605a);
  line-height: 1.6;
}
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
