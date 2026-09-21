<template>
  <!-- 隐私授权弹窗：只在用户触发隐私接口、且微信侧尚未记录同意时出现（usePrivacy 控制） -->
  <view v-if="visible" class="privacy-mask">
    <view class="privacy-card">
      <text class="privacy-title">用户隐私保护提示</text>
      <text class="privacy-body">
        物归仅在你主动选择照片、导入备份文件等操作时读取相应信息，不会收集位置与通讯录。请阅读并同意后继续。
      </text>
      <text class="privacy-link" @tap="openContract">查看{{ contractName }}全文</text>
      <view class="privacy-actions">
        <button class="btn-secondary privacy-btn" @tap="disagree">
          <text>不同意</text>
        </button>
        <button
          id="agree-btn"
          class="btn-primary privacy-btn"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onAgree"
        >
          <text>同意并继续</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePrivacy } from '../composables/usePrivacy'

const { visible, contractName, agree, disagree, openContract } = usePrivacy()

/** 同意按钮 id 需与回执里的 buttonId 一致，平台会校验该按钮确实被点过 */
function onAgree() {
  agree('agree-btn')
}
</script>

<style scoped>
.privacy-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 200;
  background: rgba(24, 39, 32, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
/* 弹窗卡：白底 + 圆角 + 单层投影（不再叠边框） */
.privacy-card {
  width: 100%;
  background: var(--color-surface, #ffffff);
  border-radius: 32rpx;
  padding: 40rpx 32rpx 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(24, 39, 32, 0.12);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.privacy-title {
  font-family: var(--font-display);
  font-size: 32rpx;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text, #182720);
}
.privacy-body {
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--color-text-secondary, #51605a);
}
.privacy-link {
  font-size: 28rpx;
  color: var(--color-primary, #16a34a);
  padding: 8rpx 0;
}
.privacy-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}
.privacy-btn {
  flex: 1;
  padding: 24rpx;
}
</style>