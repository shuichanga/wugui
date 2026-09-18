<template>
  <!-- 物品卡（gcard）：渐变图区 + 名称/位置/标签 -->
  <NuxtLink :to="`/items/${item.id}`"
            class="block overflow-hidden rounded-2xl border border-border bg-neutral-surface shadow-level-1">
    <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
         class="h-[58px] w-full object-cover" loading="lazy" />
    <div v-else class="flex h-[58px] w-full items-center justify-center bg-gradient-to-br from-tint to-primary-soft">
      <Package :size="26" class="text-primary/60" aria-hidden="true" />
    </div>
    <div class="px-3 pb-2.5 pt-2">
      <p class="truncate text-sm font-semibold">{{ item.name }}</p>
      <p class="mb-1.5 mt-0.5 truncate text-2xs text-text-tertiary" :title="item.locationPath">
        {{ shortPath || '未放置' }}
      </p>
      <span v-if="item.tags.length" class="inline-block rounded-full px-2 py-1 text-2xs leading-none"
            :style="tagStyle(item.tags[0])">
        {{ item.tags[0] }}
      </span>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Package } from 'lucide-vue-next'
import type { ItemSummary } from '~/types/api'

const props = defineProps<{ item: ItemSummary }>()

// 位置路径显示前两段（房间 · 格位），避免三段全展挤压卡片
const shortPath = computed(() => {
  const segs = (props.item.locationPath || '').split('/').map(s => s.trim()).filter(Boolean)
  return segs.slice(0, 2).join(' · ')
})
</script>
