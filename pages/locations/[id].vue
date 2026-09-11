<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <header class="relative -mx-4 flex items-center justify-between bg-primary px-4 py-3 text-white">
      <NuxtLink to="/locations" class="flex items-center gap-1 text-sm text-white/90 hover:text-white" aria-label="返回空间树">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>空间</span>
      </NuxtLink>
      <h1 class="max-w-56 truncate text-lg">{{ locationName }}</h1>
      <span class="w-12" aria-hidden="true"></span>
    </header>

    <section class="mt-4" aria-label="空间内物品">
      <p v-if="hydrated && pending && !items?.length" class="p-4 text-sm text-text-tertiary">加载中…</p>
      <p v-else-if="!items?.length" class="p-4 text-sm text-text-tertiary">这里还没有物品</p>
      <ul v-else class="flex flex-col gap-2">
        <li v-for="item in items" :key="item.id">
          <ItemCard :item="item" @deleted="onDeleted" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const route = useRoute()
const locationId = String(route.params.id)

const { data: items, pending } = await useAsyncData(`items-at-${locationId}`, async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>(`/api/items?location_id=${locationId}&limit=50`)
  return res.items
}, { server: false, default: () => [], getCachedData: swrCache })

// 空间名：从树上找
const locationName = ref('…')
onMounted(async () => {
  const tree = await apiFetch<LocationTreeNode[]>('/api/locations')
  const find = (nodes: LocationTreeNode[]): LocationTreeNode | null => {
    for (const n of nodes) {
      if (n.id === locationId) return n
      const hit = find(n.children ?? [])
      if (hit) return hit
    }
    return null
  }
  locationName.value = find(tree)?.name ?? '未知空间'
})
</script>
