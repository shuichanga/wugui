<template>
  <main class="page">
    <view class="hero">
      <text class="hero-title">物归</text>
      <text class="text-muted">家庭收纳，物归其位</text>
    </view>

    <button class="btn-primary login-btn" :loading="loading" @click="onWechatLogin">
      微信一键登录
    </button>

    <view class="card bind-card">
      <text class="bind-title">已有 Web 端账号？</text>
      <text class="text-muted">输入账号密码登录，自动绑定本微信</text>
      <input v-model="account" class="input-base bind-input" placeholder="用户名或邮箱" />
      <input v-model="password" class="input-base bind-input" password placeholder="密码" />
      <button class="btn-secondary" :loading="binding" @click="onBind">登录并绑定微信</button>
    </view>

    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { wechatLogin, bindExistingAccount } from '../../composables/useAuth'
import { errMsg } from '../../utils/api'

const account = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const binding = ref(false)

function done() {
  uni.reLaunch({ url: '/pages/index/index' })
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
  padding: 120rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 80rpx;
}
.hero-title {
  font-size: 48rpx;
  font-weight: 700;
}
.login-btn {
  margin-bottom: 48rpx;
}
.bind-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.bind-title {
  font-size: 28rpx;
  font-weight: 600;
}
.bind-input {
  margin-top: -8rpx;
}
.error {
  color: #dc2626;
  font-size: 26rpx;
  text-align: center;
}
</style>
