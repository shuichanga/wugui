<template>
  <NuxtLink :to="`/items/${item.id}`"
            class="flex items-center gap-3 rounded-lg border border-border bg-neutral-surface p-3">
    <!-- 缩略图：有照片显示，无照片图标兜底 -->
    <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
         class="h-12 w-12 shrink-0 rounded-md object-cover" />
    <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-neutral-sunken">
      <Package :size="20" class="text-text-tertiary" aria-hidden="true" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="truncate text-base font-medium">{{ item.name }}</h3>
        <span class="shrink-0 text-xs text-text-tertiary">×{{ item.quantity }}</span>
      </div>
      <p class="mt-1 flex items-center gap-1 text-sm text-text-secondary">
        <MapPin :size="16" class="shrink-0" aria-hidden="true" />
        <span class="truncate">{{ item.locationPath }}</span>
      </p>
      <div class="mt-1.5 flex items-center justify-between gap-2">
        <ul class="flex min-w-0 gap-1.5">
          <li v-for="tag in item.tags" :key="tag"
              class="rounded border border-border px-1.5 py-0.5 text-xs text-text-secondary">
            {{ tag }}
          </li>
        </ul>
        <p class="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
          <UserAvatar :name="item.ownerName" :size="16" />
          {{ item.ownerName }} · {{ timeAgo(item.createdAt) }}
        </p>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { Package, MapPin } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

defineProps<{ item: ItemSummary }>()
</script>
