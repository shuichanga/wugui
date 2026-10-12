<template>
  <!-- 建所引导弹窗：无住所时由门禁/开屏引导唤起（home.vue 常驻挂载） -->
  <view v-if="onboardVisible" class="ho-mask" @tap="dismissOnboard">
    <view class="ho-card" @tap.stop>
      <view class="ho-icon">
        <LocationIcon slug="tab-home" :size="44" />
      </view>
      <text class="ho-title">创建你的住所</text>
      <text class="ho-sub">住所是整理空间与物品的起点，创建后可邀请家人加入共享</text>

      <view class="ho-field">
        <text class="ho-label">住所名称</text>
        <input
          v-model="name"
          class="input-base"
          placeholder="如：我的家"
          placeholder-class="ho-ph"
          maxlength="20"
          confirm-type="done"
          @confirm="onConfirm"
        />
      </view>

      <button class="btn-primary ho-btn" @tap="onConfirm">创建住所</button>
      <text class="ho-skip" @tap="dismissOnboard">暂不创建，先随便看看</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LocationIcon from './LocationIcon.vue'
import { onboardVisible, confirmOnboard, dismissOnboard } from '../composables/useHouseholds'

// 预填默认名：一键确认即可创建（可改），改名也会在登录时自动带入账号住所
const name = ref('我的住所')

function onConfirm() {
  confirmOnboard(name.value)
}
</script>

<style scoped>
/* 遮罩：压过 tabbar（200）与 OnboardGuide（200），栈顶交互 */
.ho-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(12, 22, 16, 0.5);
  z-index: 220;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.ho-card {
  width: 100%;
  background: var(--color-surface, #ffffff);
  border-radius: 36rpx;
  padding: 48rpx 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 24rpx 64rpx rgba(12, 22, 16, 0.18);
}
.ho-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 28rpx;
  background: var(--color-tint, #e7f4ec);
  color: var(--color-primary, #16a34a);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}
.ho-title {
  font-family: var(--font-display);
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-text, #182720);
}
.ho-sub {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--color-text-tertiary, #8a978f);
  text-align: center;
}
.ho-field {
  width: 100%;
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.ho-label {
  font-size: 24rpx;
  color: var(--color-text-secondary, #51605a);
  font-weight: 600;
}
.ho-btn {
  width: 100%;
  margin-top: 32rpx;
}
.ho-skip {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: var(--color-text-tertiary, #8a978f);
  padding: 8rpx 0;
}
</style>
