<template>
  <!-- 最近查看卡：上图下文（首图或品牌渐变占位） -->
  <NuxtLink :to="`/items/${item.id}`"
            class="block overflow-hidden rounded-2xl border border-border bg-neutral-surface shadow-level-1">
    <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
         class="h-[50px] w-full object-cover" loading="lazy" />
    <div v-else class="flex h-[50px] w-full items-center justify-center bg-gradient-to-br from-tint to-primary-soft">
      <Package :size="26" class="text-primary/60" aria-hidden="true" />
    </div>
    <div class="px-3 pb-2 pt-1.5">
      <p class="flex items-center justify-between gap-2">
        <span class="truncate text-sm font-semibold">{{ item.name }}</span>
        <span v-if="item.tags.length" class="shrink-0 rounded-full px-2 py-1 text-2xs leading-none"
              :style="tagStyle(item.tags[0])">
          {{ item.tags[0] }}
        </span>
      </p>
      <p class="mt-1 truncate text-2xs text-text-tertiary" :title="item.locationPath">
        {{ item.locationPath || '未放置' }}
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

defineProps<{ item: ItemSummary }>()
</script>
