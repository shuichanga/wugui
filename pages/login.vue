<template>
  <main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
    <h1 class="text-center text-2xl">物归</h1>
    <p class="mt-1 text-center text-sm text-text-secondary">家庭收纳，物归其位</p>

    <form class="mt-8 flex flex-col gap-4" @submit.prevent="submit">
      <section>
        <label for="login-email" class="mb-1 block text-sm font-medium">邮箱</label>
        <input id="login-email" v-model="email" type="email" class="input-base" autocomplete="email" required />
      </section>
      <section>
        <label for="login-password" class="mb-1 block text-sm font-medium">密码</label>
        <input id="login-password" v-model="password" type="password" class="input-base" autocomplete="current-password" required />
      </section>

      <p v-if="error" class="rounded-md border border-border bg-neutral-surface p-3 text-sm text-error" role="alert">
        {{ error }}
      </p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>
      <p class="text-center text-sm text-text-secondary">
        还没有账号？
        <NuxtLink to="/register" class="text-primary">注册</NuxtLink>
      </p>
    </form>
  </main>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } })
    await navigateTo('/')
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '登录失败，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>
