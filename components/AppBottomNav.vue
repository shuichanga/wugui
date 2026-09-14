<template>
  <!-- 白底导航条 + 浮动绿色 FAB；5 段 flex-1 均分，图标中心间距视觉相等 -->
  <nav class="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-neutral-surface">
    <ul class="mx-auto flex max-w-md">
      <!-- FAB 槽固定第 3 位：与其余四段等宽 flex-1，保证五段中心间距均等 -->
      <li v-for="tab in tabsBefore" :key="tab.to" class="relative flex h-16 flex-1 flex-col items-center justify-center">
        <NuxtLink :to="tab.to" class="flex flex-col items-center gap-0.5" :class="cls(tab.to)">
          <LocationIcon :slug="tab.icon" :size="21" />
          <span class="text-2xs leading-none">{{ tab.label }}</span>
          <i class="h-1 w-1 rounded-full" :class="on(tab.to) ? 'bg-primary' : 'bg-transparent'" aria-hidden="true" />
        </NuxtLink>
      </li>
      <li class="relative flex h-16 flex-1"></li>
      <li v-for="tab in tabsAfter" :key="tab.to" class="relative flex h-16 flex-1 flex-col items-center justify-center">
        <NuxtLink :to="tab.to" class="flex flex-col items-center gap-0.5" :class="cls(tab.to)">
          <LocationIcon :slug="tab.icon" :size="21" />
          <span class="text-2xs leading-none">{{ tab.label }}</span>
          <i class="h-1 w-1 rounded-full" :class="on(tab.to) ? 'bg-primary' : 'bg-transparent'" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
    <!-- 浮动添加按钮 -->
    <NuxtLink to="/add" aria-label="添加物品"
              class="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-full bg-primary text-white shadow-fab transition-colors hover:bg-primary-dark">
      <Plus :size="26" aria-hidden="true" />
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
const route = useRoute()

// 图标为原型 tabbar 专用自绘图标（LocationIcon 内 tab-* 系列）；FAB 槽位于两组之间
const tabsBefore = [
  { to: '/', label: '首页', icon: 'tab-home' },
  { to: '/items', label: '物品', icon: 'tab-box' },
]
const tabsAfter = [
  { to: '/locations', label: '空间', icon: 'tab-shelf' },
  { to: '/settings', label: '我的', icon: 'tab-user' },
]

function on(prefix: string) {
  return prefix === '/'
    ? route.path === '/'
    : route.path.startsWith(prefix)
}

// 物品/我的 仅精确匹配：详情/编辑页（/items/[id] 等）不高亮，保持来源页高亮更直觉
function cls(prefix: string) {
  return on(prefix) ? 'text-primary font-semibold' : 'text-text-tertiary'
}
</script>
