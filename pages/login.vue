<template>
  <!-- Mobile: original simple style -->
  <main v-if="!isDesktop" class="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
    <h1 class="text-center text-2xl">物归</h1>
    <p class="mt-1 text-center text-sm text-text-secondary">家庭收纳，物归其位</p>

    <form class="mt-8 flex flex-col gap-4" @submit.prevent="onSubmit">
      <section>
        <label for="login-email" class="mb-1 block text-sm font-medium">邮箱</label>
        <input id="login-email" v-model="email" type="email" class="input-base" autocomplete="email" required />
      </section>
      <section>
        <label for="login-password" class="mb-1 block text-sm font-medium">密码</label>
        <input id="login-password" v-model="password" type="password" class="input-base" autocomplete="current-password" required />
      </section>

      <p v-if="error" class="rounded-md border border-border bg-neutral-surface p-3 text-sm text-error" role="alert">{{ error }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>
      <p class="text-center text-sm text-text-secondary">
        还没有账号？
        <NuxtLink to="/register" class="text-primary">注册</NuxtLink>
      </p>
    </form>
  </main>

  <!-- Desktop: two-column with character scene -->
  <div v-else class="h-dvh overflow-hidden grid grid-cols-3">
    <div class="col-span-2 h-full">
      <CharacterScene :is-typing="isTyping" :password-length="password.length" :show-password="showPassword" />
    </div>

    <main class="flex flex-col justify-center bg-neutral-surface px-10">
      <h1 class="text-center text-2xl font-bold tracking-tight">欢迎回来</h1>
      <p class="mt-1 text-center text-sm text-text-secondary">家庭收纳，物归其位</p>

      <form class="mt-6 flex flex-col gap-4" @submit.prevent="onSubmit">
        <section>
          <label for="login-email" class="mb-1 block text-sm font-medium">邮箱</label>
          <input id="login-email" v-model="email" type="email" class="form-input" autocomplete="email" placeholder="请输入邮箱" required @focus="isTyping = true" @blur="isTyping = false" />
        </section>

        <section>
          <label for="login-password" class="mb-1 block text-sm font-medium">密码</label>
          <div class="relative">
            <input id="login-password" v-model="password" :type="showPassword ? 'text' : 'password'" class="form-input pr-10" autocomplete="current-password" placeholder="请输入密码" required />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary transition-colors hover:text-text-primary" aria-label="切换密码可见" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" :size="20" aria-hidden="true" />
              <Eye v-else :size="20" aria-hidden="true" />
            </button>
          </div>
        </section>

        <p v-if="error" class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning" role="alert">{{ error }}</p>

        <button type="submit" class="form-submit-btn w-full" :disabled="loading">
          <span class="form-submit-text">{{ loading ? '登录中…' : '登录' }}</span>
          <span v-if="!loading" class="form-submit-hover">
            <span>登录</span>
            <ArrowRight :size="16" aria-hidden="true" />
          </span>
        </button>

        <p class="text-center text-sm text-text-secondary">
          还没有账号？
          <NuxtLink to="/register" class="font-medium text-primary hover:underline">注册</NuxtLink>
        </p>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Eye, EyeOff, ArrowRight } from 'lucide-vue-next'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)
const isTyping = ref(false)
const isDesktop = ref(false)

onMounted(() => {
  isDesktop.value = window.innerWidth >= 1024
  window.addEventListener('resize', () => { isDesktop.value = window.innerWidth >= 1024 })
})

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    useRecentLocations().clear()
    await navigateTo('/')
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '登录失败，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-input { width: 100%; height: 48px; border: 1px solid var(--color-border); border-radius: 9999px; padding: 0 16px; font-size: var(--text-base); background: var(--color-neutral-surface); color: var(--color-text-primary); transition: border-color 0.2s, box-shadow 0.2s; }
.form-input::placeholder { color: var(--color-text-tertiary); }
.form-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 2px rgba(5,150,105,0.2); }

.form-submit-btn { position: relative; width: 100%; height: 48px; overflow: hidden; border: 1px solid var(--color-border); border-radius: 9999px; background: var(--color-neutral-surface); color: var(--color-text-primary); font-size: var(--text-base); font-weight: 600; cursor: pointer; transition: border-color 0.3s, color 0.3s; }
.form-submit-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.form-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.form-submit-text { display: inline-block; transition: transform 0.3s, opacity 0.3s; }
.form-submit-btn:hover:not(:disabled) .form-submit-text { transform: translateX(48px); opacity: 0; }

.form-submit-hover { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--color-primary); color: white; opacity: 0; transition: opacity 0.3s; border-radius: 9999px; }
.form-submit-btn:hover:not(:disabled) .form-submit-hover { opacity: 1; }
</style>
