<template>
  <div class="min-h-dvh" :class="{ 'pb-20': showNav }">
    <NuxtPage />
    <AppBottomNav v-if="showNav" />
  </div>
</template>

<script setup lang="ts">
// 除登录/注册外全站显示底部导航（详情/设置页也保留，点当前 tab 回到根页面）
const route = useRoute()
const showNav = computed(() => !['/login', '/register'].includes(route.path))
</script>
