<template>
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-neutral-surface">
    <ul class="mx-auto flex max-w-md">
      <li class="flex-1">
        <NuxtLink to="/" class="flex flex-col items-center gap-1 py-2" :class="cls('/')">
          <Home :size="20" aria-hidden="true" />
          <span class="text-xs">首页</span>
        </NuxtLink>
      </li>
      <li class="relative w-20 shrink-0">
        <!-- 凸起大按钮：＋号悬浮于导航条上方，视觉引导高频录入动作 -->
        <NuxtLink to="/add" aria-label="添加物品"
                  class="absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-level-2 ring-4 ring-neutral-bg transition-colors"
                  :class="active('/add') ? 'bg-primary-dark' : 'bg-primary hover:bg-primary-dark'">
          <Plus :size="26" aria-hidden="true" />
        </NuxtLink>
        <span class="flex h-full items-end justify-center pb-1 text-xs"
              :class="active('/add') ? 'font-semibold text-primary' : 'text-text-secondary'">
          添加
        </span>
      </li>
      <li class="flex-1">
        <NuxtLink to="/locations" class="flex flex-col items-center gap-1 py-2" :class="cls('/locations')">
          <MapPin :size="20" aria-hidden="true" />
          <span class="text-xs">位置</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { Home, MapPin, Plus } from 'lucide-vue-next'
const route = useRoute()

function active(prefix: string) {
  return prefix === '/'
    ? route.path === '/'
    : route.path.startsWith(prefix)
}

// 位置 tab 在子页面（/locations/[id]）也高亮
function cls(prefix: string) {
  return active(prefix) ? 'text-primary font-semibold' : 'text-text-secondary'
}
</script>
