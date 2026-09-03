<template>
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-neutral-surface">
    <ul class="mx-auto flex max-w-md">
      <li class="flex-1">
        <NuxtLink to="/" class="flex flex-col items-center gap-1 py-2" :class="activeClass('/')">
          <Home :size="20" aria-hidden="true" />
          <span class="text-xs">首页</span>
        </NuxtLink>
      </li>
      <li class="flex-1">
        <NuxtLink to="/locations" class="flex flex-col items-center gap-1 py-2" :class="activeClass('/locations')">
          <MapPin :size="20" aria-hidden="true" />
          <span class="text-xs">位置</span>
        </NuxtLink>
      </li>
      <li class="flex-1">
        <NuxtLink to="/add" class="flex flex-col items-center gap-1 py-2" :class="activeClass('/add')">
          <Plus :size="20" aria-hidden="true" />
          <span class="text-xs">添加</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { Home, MapPin, Plus } from 'lucide-vue-next'
const route = useRoute()

function activeClass(path: string) {
  return route.path === path
    ? 'text-primary font-semibold'
    : 'text-text-secondary'
}
</script>
