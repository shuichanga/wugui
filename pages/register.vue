<template>
  <main class="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
    <h1 class="text-center text-2xl">创建账号</h1>
    <p class="mt-1 text-center text-sm text-text-secondary">加入家人的家庭，或创建你自己的</p>

    <form class="mt-8 flex flex-col gap-4" @submit.prevent="submit">
      <section>
        <label for="reg-name" class="mb-1 block text-sm font-medium">昵称</label>
        <input id="reg-name" v-model="displayName" type="text" class="input-base" placeholder="家人怎么称呼你" />
      </section>
      <section>
        <label for="reg-email" class="mb-1 block text-sm font-medium">邮箱</label>
        <input id="reg-email" v-model="email" type="email" class="input-base" autocomplete="email" required />
      </section>
      <section>
        <label for="reg-password" class="mb-1 block text-sm font-medium">密码</label>
        <input id="reg-password" v-model="password" type="password" class="input-base" autocomplete="new-password" required />
        <p class="mt-1 text-xs text-text-tertiary">至少 8 位</p>
      </section>
      <section>
        <label for="reg-invite" class="mb-1 block text-sm font-medium">家庭邀请码 <span class="font-normal text-text-tertiary">（选填）</span></label>
        <input id="reg-invite" v-model="inviteCode" type="text" class="input-base uppercase" placeholder="有邀请码就填，没有会自动创建新家庭" />
      </section>

      <p v-if="error" class="rounded-md border border-border bg-neutral-surface p-3 text-sm text-error" role="alert">
        {{ error }}
      </p>

      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? '注册中…' : '注册' }}
      </button>
      <p class="text-center text-sm text-text-secondary">
        已有账号？
        <NuxtLink to="/login" class="text-primary">登录</NuxtLink>
      </p>
    </form>
  </main>
</template>

<script setup lang="ts">
const displayName = ref('')
const email = ref('')
const password = ref('')
const inviteCode = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        displayName: displayName.value || undefined,
        email: email.value,
        password: password.value,
        inviteCode: inviteCode.value || undefined,
      },
    })
    await navigateTo('/')
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '注册失败，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>
