<template>
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-neutral-surface">
    <ul class="mx-auto flex max-w-md">
      <li class="flex h-14 flex-1 flex-col items-center justify-center gap-1">
        <NuxtLink to="/" class="flex flex-col items-center gap-1" :class="cls('/')">
          <Home :size="20" aria-hidden="true" />
          <span class="text-xs leading-none">首页</span>
        </NuxtLink>
      </li>
      <li class="flex h-14 flex-1 flex-col items-center justify-center gap-1">
        <NuxtLink to="/items" class="flex flex-col items-center gap-1" :class="cls('/items')">
          <Package :size="20" aria-hidden="true" />
          <span class="text-xs leading-none">物品</span>
        </NuxtLink>
      </li>
      <li class="relative w-20 shrink-0">
        <!-- 凸起大按钮：只凸出导航条上边线约 1/3 -->
        <NuxtLink to="/add" aria-label="添加物品"
                  class="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-full text-white shadow-level-2 ring-4 ring-neutral-bg transition-colors"
                  :class="active('/add') ? 'bg-primary-dark' : 'bg-primary hover:bg-primary-dark'">
          <Plus :size="26" aria-hidden="true" />
        </NuxtLink>
      </li>
      <li class="flex h-14 flex-1 flex-col items-center justify-center gap-1">
        <NuxtLink to="/locations" class="flex flex-col items-center gap-1" :class="cls('/locations')">
          <DoorOpen :size="20" aria-hidden="true" />
          <span class="text-xs leading-none">空间</span>
        </NuxtLink>
      </li>
      <li class="flex h-14 flex-1 flex-col items-center justify-center gap-1">
        <NuxtLink to="/settings" class="flex flex-col items-center gap-1" :class="cls('/settings')">
          <User :size="20" aria-hidden="true" />
          <span class="text-xs leading-none">我的</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { DoorOpen, Home, Package, Plus, User } from 'lucide-vue-next'
const route = useRoute()

function active(prefix: string) {
  return prefix === '/'
    ? route.path === '/'
    : route.path.startsWith(prefix)
}

// 物品/我的 仅精确匹配：详情/编辑页（/items/[id] 等）不高亮，保持来源页高亮更直觉
function cls(prefix: string) {
  const on = prefix === '/items' || prefix === '/settings'
    ? route.path === prefix
    : active(prefix)
  return on ? 'text-primary font-semibold' : 'text-text-secondary'
}
</script>
