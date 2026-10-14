<script setup lang="ts">
// 广告位（微信流量主）：仅未订阅用户展示（isPro=自己有有效订阅 → 关闭广告）
// 广告位 id 由服务端 /api/config 下发（管理后台「运营配置」可改），空串 = 未配置不渲染
// 会员态首次服务端校验完成前不渲染（loaded）：防会员冷启动闪广告
import { ref } from 'vue'
import { useMembership } from '../composables/useMembership'
import { useAppConfig } from '../composables/useAppConfig'

const membership = useMembership()
const appConfig = useAppConfig()
const adFailed = ref(false)

function onAdError() {
  // 广告拉取失败（未开通/无填充）时静默收起占位，避免留白
  adFailed.value = true
}

// 首次挂载拉取公开配置（storage 有缓存时离线也可用）
void appConfig.refresh()
</script>

<template>
  <view v-if="appConfig.adUnitId && !membership.isPro && membership.loaded && !adFailed" class="ad-wrap">
    <ad :unit-id="appConfig.adUnitId" ad-intervals="60" @error="onAdError" />
  </view>
</template>

<style scoped>
.ad-wrap {
  margin: 24rpx 0;
}
</style>
