<template>
  <!-- 外层卡片：房间 -->
  <article class="overflow-hidden rounded-lg border border-primary/40 bg-neutral-surface shadow-level-1">
    <!-- 房间标题：图标 + 名称 + 数量 + 删除 -->
    <div class="relative flex items-center gap-2 overflow-hidden px-3 py-2.5"
         :style="{ backgroundColor: roomColors.accent }">
      <!-- SVG 装饰背景 -->
      <svg class="absolute inset-0 h-full w-full" viewBox="0 0 200 120"
           preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
        <circle cx="165" cy="15" r="42" fill="white" opacity="0.08" />
        <circle cx="185" cy="95" r="28" fill="white" opacity="0.06" />
        <circle cx="10" cy="100" r="20" fill="white" opacity="0.05" />
      </svg>
      <NuxtLink :to="`/locations/${room.id}`" class="relative flex min-w-0 flex-1 items-center gap-2 text-white">
        <component :is="icon" :size="20" :stroke-width="2" color="#ffffff" aria-hidden="true" />
        <p class="truncate text-base font-semibold text-white">{{ room.name }}</p>
      </NuxtLink>
      <p class="relative shrink-0 text-sm font-medium text-white/80">{{ room.itemCount }} 件</p>
      <button type="button" class="relative shrink-0 p-1 text-white/80 hover:text-white"
              aria-label="删除房间" @click="$emit('delete', room.id)">
        <Trash2 :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="border-t px-3 py-2.5" :style="{ borderColor: colors.border }">
      <p v-if="!room.children?.length" class="py-1 text-sm text-text-tertiary">这个房间还没有家具</p>

      <!-- 家具卡片列表 -->
      <ul v-else class="flex flex-col gap-2">
        <li v-for="furniture in room.children" :key="furniture.id">
          <!-- 内层卡片：家具 -->
          <article class="overflow-hidden rounded-md border"
                   :style="{ borderColor: colors.border, backgroundColor: colors.bg }">
            <div class="flex items-center gap-2 px-2.5 py-2">
              <NuxtLink :to="`/locations/${furniture.id}`" class="flex min-w-0 flex-1 items-center gap-2"
                        :style="{ color: colors.text }">
                <LocationIcon v-if="furniture.icon" :name="furniture.icon" :size="18" />
                <span v-else class="shrink-0" :style="{ color: colors.accent }">
                  <Package :size="18" :stroke-width="2" aria-hidden="true" />
                </span>
                <p class="truncate text-sm font-medium">{{ furniture.name }}</p>
              </NuxtLink>
              <p class="shrink-0 text-xs font-medium" :style="{ color: colors.accent }">{{ furniture.itemCount }} 件</p>
              <button type="button" class="shrink-0 p-0.5 text-text-tertiary hover:text-error"
                      aria-label="删除家具" @click="$emit('delete', furniture.id)">
                <Trash2 :size="14" aria-hidden="true" />
              </button>
            </div>

            <div class="px-2.5 pb-2">
              <!-- 进度条：家具在房间内的占比 -->
              <div class="h-1.5 w-full overflow-hidden rounded-full" :style="{ backgroundColor: colors.border }">
                <div class="h-full rounded-full"
                     :style="{ width: progressWidth(furniture.itemCount), backgroundColor: colors.accent }" />
              </div>

              <!-- 格位 chips：横滑 -->
              <div v-if="furniture.children?.length"
                   class="mt-2 flex gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
                <NuxtLink v-for="compartment in furniture.children" :key="compartment.id"
                          :to="`/locations/${compartment.id}`"
                          class="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-xs font-medium"
                          :style="{ backgroundColor: colors.soft, color: colors.text }">
                  <Box :size="14" aria-hidden="true" />
                  <span>{{ compartment.name }}</span>
                  <span :style="{ color: colors.accent }">{{ compartment.itemCount }}</span>
                </NuxtLink>
              </div>
            </div>
          </article>
        </li>
      </ul>
    </div>
  </article>
</template>

<script setup lang="ts">
import { Box, Package, Trash2 } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'

const props = defineProps<{ room: LocationTreeNode }>()
defineEmits<{ delete: [id: string] }>()

const { getRoomIcon, getRoomColors, getItemColors } = useRoomStyle()

const icon = getRoomIcon(props.room.name)
const roomColors = getRoomColors(props.room.name)
const colors = getItemColors(props.room.name)

const progressWidth = (count: number) => {
  const pct = props.room.itemCount > 0 ? (count / props.room.itemCount) * 100 : 0
  return `${Math.max(pct, 6)}%`
}
</script>
