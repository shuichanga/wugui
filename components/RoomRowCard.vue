<template>
  <!-- 空间行卡：点击行展开家具/格位，右侧箭头进入详情；展开区内含删除入口（防误触） -->
  <div class="overflow-hidden rounded-2xl border border-border bg-neutral-surface shadow-level-1">
    <div class="flex items-center gap-3 px-3.5 py-2.5">
      <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" :aria-expanded="expanded"
              @click="expanded = !expanded">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
              :class="room.itemCount > 0 ? 'bg-tint text-primary' : 'bg-neutral-sunken text-text-disabled'">
          <LocationIcon :slug="iconSlug" :size="18" />
        </span>
        <span class="min-w-0 flex-1 truncate text-sm font-semibold">{{ room.name }}</span>
        <span class="shrink-0 text-xs" :class="room.itemCount > 0 ? 'text-text-tertiary' : 'text-text-disabled'">
          <template v-if="room.itemCount > 0"><b class="text-sm font-bold text-primary">{{ room.itemCount }}</b>件</template>
          <template v-else>空</template>
        </span>
      </button>
      <NuxtLink :to="`/locations/${room.id}`" class="shrink-0 p-1 text-text-disabled hover:text-primary"
                :aria-label="`进入${room.name}`" @click.stop>
        <ChevronRight :size="16" class="transition-transform" :class="expanded ? 'rotate-90 text-primary' : ''" aria-hidden="true" />
      </NuxtLink>
    </div>

    <!-- 展开区：家具卡 + 格位 chips（grid rows 过渡动画） -->
    <div class="grid transition-[grid-template-rows] duration-200 ease-out"
         :style="{ gridTemplateRows: expanded ? '1fr' : '0fr' }">
      <div class="overflow-hidden">
        <div class="border-t border-border-tint px-3 pb-3 pt-2.5">
          <p v-if="!room.children?.length" class="py-1 text-xs text-text-tertiary">
            还没有家具，点右上角"新增空间"在家具下建
          </p>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="furniture in room.children" :key="furniture.id"
                class="rounded-[14px] border border-border-tint bg-surface-tint px-3 py-2">
              <div class="flex items-center gap-2">
                <NuxtLink :to="`/locations/${furniture.id}`" class="flex min-w-0 flex-1 items-center gap-2">
                  <LocationIcon :slug="getFurnitureIcon(furniture.name)" :size="16" class="shrink-0 text-primary" />
                  <span class="truncate text-[13px] font-semibold">{{ furniture.name }}</span>
                </NuxtLink>
                <span class="shrink-0 text-2xs text-text-tertiary">{{ furniture.itemCount }} 件</span>
                <button type="button" class="shrink-0 p-0.5 text-text-disabled hover:text-error"
                        aria-label="删除家具" @click="$emit('delete', furniture.id)">
                  <Trash2 :size="13" aria-hidden="true" />
                </button>
              </div>
              <div v-if="furniture.children?.length"
                   class="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:thin]">
                <NuxtLink v-for="c in furniture.children" :key="c.id" :to="`/locations/${c.id}`"
                          class="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-neutral-surface px-2 py-1 text-2xs text-text-secondary">
                  <LocationIcon :slug="getCompartmentIcon(c.name)" :size="12" aria-hidden="true" />
                  <span>{{ c.name }}</span>
                  <b class="font-semibold text-primary-dark">{{ c.itemCount }}</b>
                </NuxtLink>
              </div>
            </li>
          </ul>
          <!-- 房间删除：收进展开区，避免列表误触 -->
          <button type="button" class="mt-2.5 text-2xs text-error/70 transition-colors hover:text-error"
                  @click="$emit('delete', room.id)">
            删除「{{ room.name }}」
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, Trash2 } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'

const props = defineProps<{ room: LocationTreeNode }>()
defineEmits<{ delete: [id: string] }>()

const expanded = ref(false)
const { getRoomIcon, getFurnitureIcon, getCompartmentIcon } = useRoomStyle()
const iconSlug = getRoomIcon(props.room.name)
</script>
