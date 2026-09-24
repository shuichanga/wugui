<script setup lang="ts">
// 广告位（微信流量主）：仅未订阅用户展示（isPro=自己有有效订阅 → 关闭广告）
// 流量主开通后把小程序后台的广告位 id 填进 AD_UNIT_ID；为空串时整个组件不渲染
// 会员态首次服务端校验完成前不渲染（loaded）：防会员冷启动闪广告
import { ref } from 'vue'
import { useMembership } from '../composables/useMembership'

/** 微信流量主广告位 id（开通后替换） */
const AD_UNIT_ID = ''

const membership = useMembership()
const adFailed = ref(false)

function onAdError() {
  // 广告拉取失败（未开通/无填充）时静默收起占位，避免留白
  adFailed.value = true
}
</script>

<template>
  <view v-if="AD_UNIT_ID && !membership.isPro && membership.loaded && !adFailed" class="ad-wrap">
    <ad v-if="AD_UNIT_ID" :unit-id="AD_UNIT_ID" ad-intervals="60" @error="onAdError" />
  </view>
</template>

<style scoped>
.ad-wrap {
  margin: 24rpx 0;
}
</style>
