<template>
  <!-- 最近添加行卡：小缩略图 + 名称/标签 + 位置 + 时间 -->
  <NuxtLink :to="`/items/${item.id}`"
            class="flex items-center gap-3 rounded-2xl border border-border bg-neutral-surface px-3 py-1.5 shadow-level-1">
    <span class="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
      <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片" class="h-full w-full object-cover" loading="lazy" />
      <span v-else class="flex h-full w-full items-center justify-center bg-gradient-to-br from-tint to-primary-soft">
        <Package :size="19" class="text-primary/60" aria-hidden="true" />
      </span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-2">
        <span class="truncate text-sm font-semibold">{{ item.name }}</span>
        <span v-if="item.tags.length" class="shrink-0 rounded-full px-2 py-1 text-2xs leading-none"
              :style="tagStyle(item.tags[0])">
          {{ item.tags[0] }}
        </span>
      </span>
      <span class="mt-0.5 block truncate text-2xs text-text-tertiary" :title="item.locationPath">
        {{ item.locationPath || '未放置' }}
      </span>
    </span>
    <span class="shrink-0 text-2xs text-text-tertiary">{{ timeLabel }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const props = defineProps<{ item: ItemSummary }>()

// 当天显示 HH:MM，更早显示相对时间
const timeLabel = computed(() => {
  const d = new Date(props.item.createdAt)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return timeAgo(props.item.createdAt)
})
</script>
