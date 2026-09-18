<template>
  <main class="mx-auto max-w-md px-4">
    <AppTopbar :title="locationName" fallback="/locations" />

    <!-- 位置概览：面包屑 + 数量 -->
    <section class="mt-2" aria-label="位置概览">
      <div class="flex items-center justify-between gap-3">
        <h2 class="min-w-0 truncate text-[21px] font-bold tracking-wide">{{ locationName }}</h2>
        <span v-if="items?.length" class="shrink-0 rounded-full bg-neutral-sunken px-3 py-1.5 text-xs font-semibold text-text-secondary">
          {{ items.length }} 件
        </span>
      </div>
      <p class="mt-1 truncate text-xs text-text-tertiary" :title="locationPath">{{ locationPath || '　' }}</p>
    </section>

    <!-- 空间内物品列表 -->
    <section class="mt-4" aria-label="空间内物品">
      <p v-if="hydrated && pending && !items?.length" class="p-4 text-sm text-text-tertiary">加载中…</p>
      <div v-else-if="!items?.length"
           class="rounded-2xl border border-border bg-neutral-surface p-6 text-center shadow-level-1">
        <Package :size="28" class="mx-auto text-text-tertiary" aria-hidden="true" />
        <p class="mt-2 text-sm text-text-secondary">这里还没有物品</p>
        <NuxtLink to="/add" class="mt-2 inline-block text-sm font-medium text-primary">去录入</NuxtLink>
      </div>
      <ul v-else class="flex flex-col gap-2">
        <li v-for="item in items" :key="item.id">
          <ItemCard :item="item" @deleted="onDeleted" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import type { ItemSummary } from '~/types/api'
import type { LocationTreeNode } from '~/types/api'

const route = useRoute()
const locationId = String(route.params.id)
const hydrated = useHydrated()

const { data: items, pending, refresh } = await useAsyncData(`items-at-${locationId}`, async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>(`/api/items?location_id=${locationId}&limit=50`)
  return res.items
}, { server: false, default: () => [], getCachedData: swrCache })

// 空间名与完整路径：从树上定位（onMounted 拉树，配合 hydration gate 防 mismatch）
const locationName = ref('…')
const locationPath = ref('')
onMounted(async () => {
  const tree = await apiFetch<LocationTreeNode[]>('/api/locations')
  const find = (nodes: LocationTreeNode[], trail: string[]): LocationTreeNode | null => {
    for (const n of nodes) {
      const path = [...trail, n.name]
      if (n.id === locationId) {
        locationPath.value = path.join(' / ')
        return n
      }
      const hit = find(n.children ?? [], path)
      if (hit) return hit
    }
    return null
  }
  const node = find(tree, [])
  locationName.value = node?.name ?? '未知空间'
})

// 列表内左滑删除：本地移除 + 刷新空间树计数
function onDeleted(id: string) {
  items.value = (items.value ?? []).filter(x => x.id !== id)
  refreshNuxtData('location-tree')
  refreshNuxtData('rooms-dashboard')
}
</script>
