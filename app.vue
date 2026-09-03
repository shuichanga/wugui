<template>
  <div class="min-h-dvh" :class="{ 'pb-20': showNav }">
    <NuxtPage />
    <AppBottomNav v-if="showNav" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const showNav = computed(() => ['/', '/locations', '/add'].includes(route.path))
</script>
