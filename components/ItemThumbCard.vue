<template>
  <NuxtLink :to="`/items/${item.id}`"
            class="flex flex-col rounded-lg border border-border bg-neutral-surface p-2">
    <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
         class="aspect-square w-full rounded-md object-cover" loading="lazy" />
    <div v-else class="flex aspect-square w-full items-center justify-center rounded-md bg-neutral-sunken">
      <Package :size="20" class="text-text-tertiary" aria-hidden="true" />
    </div>
    <p class="mt-1.5 truncate text-sm font-medium">{{ item.name }}</p>
    <p class="truncate text-xs font-medium" :style="{ color: roomColor }" :title="item.locationPath">
      {{ item.locationPath || '未放置' }}
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const props = defineProps<{ item: ItemSummary }>()

// 色条语义沿用 ItemCard：取路径首段（房间名）决定配色
const { getRoomColors } = useRoomStyle()
const roomColor = computed(() => {
  const path = props.item.locationPath || ''
  const idx = path.indexOf('/')
  return getRoomColors(idx === -1 ? path : path.slice(0, idx)).accent
})
</script>
