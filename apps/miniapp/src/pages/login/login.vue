<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="logo-badge">
        <text class="logo-text">物</text>
      </view>
      <view class="hero-title">物归</view>
      <view class="hero-sub">家庭收纳，物归其位</view>
    </view>

    <!-- 主 CTA：微信一键登录 -->
    <button class="btn-primary hero-btn" :loading="loading" :disabled="loading || binding" @tap="onWechatLogin">
      <text v-if="loading">登录中…</text>
      <text v-else>微信一键登录</text>
    </button>

    <!-- 绑定入口：折叠卡 -->
    <view class="divider">
      <view class="divider-line"></view>
      <text class="divider-text">或</text>
      <view class="divider-line"></view>
    </view>

    <view class="bind-card" :class="{ expanded: expanded }">
      <view class="bind-header" @tap="toggleExpand">
        <text class="bind-title">已有 Web 端账号？</text>
        <view class="chevron" :class="{ open: expanded }">
          <text>›</text>
        </view>
      </view>

      <view v-if="expanded" class="bind-form">
        <view class="field">
          <text class="label">用户名或邮箱</text>
          <input
            v-model="account"
            class="input-base"
            placeholder="请输入用户名或邮箱"
            placeholder-class="placeholder"
            maxlength="64"
            confirm-type="next"
          />
        </view>
        <view class="field">
          <text class="label">密码</text>
          <input
            v-model="password"
            class="input-base"
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
            maxlength="64"
            confirm-type="done"
            @confirm="onBind"
          />
        </view>
        <button class="btn-primary submit" :loading="binding" :disabled="loading || binding" @tap="onBind">
          <text v-if="binding">绑定中…</text>
          <text v-else>登录并绑定微信</text>
        </button>
      </view>
    </view>

    <!-- 错误提示 -->
    <view v-if="error" class="error-box">
      <text class="error-text">{{ error }}</text>
    </view>

    <!-- 底部信息：指引全文由微信托管，点击直接打开后台配置的《用户隐私保护指引》 -->
    <view class="foot">
      <text class="foot-text">登录即代表同意</text>
      <text class="foot-link" @tap="openContract">{{ contractName }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { wechatLogin, bindExistingAccount } from '../../composables/useAuth'
import { usePrivacy } from '../../composables/usePrivacy'
import { errMsg } from '../../utils/api'

// 底部指引链接：与 PrivacyPopup 共用同一份状态（名称取自微信后台配置）
const { contractName, openContract } = usePrivacy()

const account = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const binding = ref(false)
const expanded = ref(false)

function toggleExpand() {
  expanded.value = !expanded.value
  error.value = ''
}

function done() {
  uni.reLaunch({ url: '/pages/home/home' })
}

async function onWechatLogin() {
  error.value = ''
  loading.value = true
  try {
    await wechatLogin()
    done()
  } catch (e) {
    error.value = errMsg(e) || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

async function onBind() {
  error.value = ''
  if (!account.value.trim() || !password.value) {
    error.value = '请输入账号和密码'
    expanded.value = true
    return
  }
  binding.value = true
  try {
    await bindExistingAccount(account.value.trim(), password.value)
    done()
  } catch (e) {
    error.value = errMsg(e) || '登录失败，请重试'
  } finally {
    binding.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 160rpx 40rpx 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
  width: 100%;
}
.logo-badge {
  width: 120rpx;
  height: 120rpx;
  border-radius: 32rpx;
  background: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
  box-shadow: 0 20rpx 44rpx rgba(22, 163, 74, 0.3);
}
.logo-text {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 700;
  font-family: 'PingFang SC', serif;
}
.hero-title {
  font-size: 48rpx;
  font-weight: 700;
  color: #182720;
  letter-spacing: 4rpx;
  margin-bottom: 8rpx;
}
.hero-sub {
  font-size: 26rpx;
  color: #51605a;
}

.hero-btn {
  width: 100%;
  padding: 30rpx 32rpx;
  font-size: 34rpx;
  margin-bottom: 32rpx;
  text-align: center;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.divider-line {
  flex: 1;
  height: 1rpx;
  background: #e4eae5;
}
.divider-text {
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #8a978f;
}

.bind-card {
  width: 100%;
  background: #ffffff;
  border: 1rpx solid #e4eae5;
  border-radius: 36rpx;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 16rpx 48rpx rgba(24, 39, 32, 0.05);
  overflow: hidden;
}
.bind-card.expanded {
  padding-bottom: 32rpx;
}
.bind-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
}
.bind-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #182720;
}
.chevron {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a978f;
  font-size: 40rpx;
  line-height: 1;
  transition: transform 0.2s;
}
.chevron.open {
  transform: rotate(90deg);
}
.bind-form {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.label {
  font-size: 24rpx;
  font-weight: 600;
  color: #8a978f;
}
.placeholder {
  color: #aebbb2;
}
.submit {
  margin-top: 8rpx;
  padding: 26rpx 32rpx;
  font-size: 32rpx;
}

.error-box {
  width: 100%;
  margin-top: 28rpx;
  background: #fbf0de;
  border: 1rpx solid rgba(180, 83, 9, 0.2);
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
}
.error-text {
  font-size: 26rpx;
  color: #b45309;
  line-height: 1.5;
}

.foot {
  margin-top: 48rpx;
  text-align: center;
}
.foot-text {
  font-size: 22rpx;
  color: #8a978f;
  line-height: 1.6;
}
/* 可点击的隐私指引：用主题主色，随配色方案切换 */
.foot-link {
  font-size: 22rpx;
  color: var(--color-primary);
  line-height: 1.6;
  text-decoration: underline;
}
</style>
