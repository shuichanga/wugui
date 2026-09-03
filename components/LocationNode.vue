<template>
  <li class="mt-1">
    <!-- 有子级：可折叠 -->
    <details v-if="node.children?.length" class="group">
      <summary class="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-2 hover:bg-neutral-sunken">
        <ChevronRight :size="16" class="shrink-0 text-text-tertiary transition-transform group-open:rotate-90" aria-hidden="true" />
        <NuxtLink :to="`/locations/${node.id}`" class="flex min-w-0 flex-1 items-center gap-2" @click.stop>
          <LocationIcon :name="node.icon ?? 'package'" :size="20" />
          <span class="truncate" :class="nameClass">{{ node.name }}</span>
        </NuxtLink>
        <span class="shrink-0 text-xs text-text-tertiary">{{ node.itemCount }}件</span>
      </summary>
      <ul class="ml-4 border-l border-border pl-2">
        <LocationNode v-for="child in node.children" :key="child.id" :node="child" @delete="emit('delete', $event)" />
      </ul>
    </details>

    <!-- 无子级：叶子，可删除 -->
    <div v-else class="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-neutral-sunken">
      <span class="w-4 shrink-0" aria-hidden="true"></span>
      <NuxtLink :to="`/locations/${node.id}`" class="flex min-w-0 flex-1 items-center gap-2">
        <LocationIcon :name="node.icon ?? 'package'" :size="20" />
        <span class="truncate" :class="nameClass">{{ node.name }}</span>
      </NuxtLink>
      <span class="shrink-0 text-xs text-text-tertiary">{{ node.itemCount }}件</span>
      <button type="button" class="shrink-0 p-1 text-text-tertiary hover:text-error" aria-label="删除位置"
              @click="emit('delete', node.id)">
        <Trash2 :size="16" aria-hidden="true" />
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { ChevronRight, Trash2 } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'

const props = defineProps<{ node: LocationTreeNode }>()
const emit = defineEmits<{ delete: [id: string] }>()

const nameClass = computed(() =>
  props.node.level === 'room' ? 'font-semibold' : '',
)
</script>
