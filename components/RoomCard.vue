<template>
  <NuxtLink :to="`/locations/${room.id}`"
            class="relative block overflow-hidden rounded-lg p-3 transition-transform hover:scale-[1.02]"
            :style="{ backgroundColor: colors.accent }">
    <!-- SVG 装饰背景 -->
    <svg class="absolute inset-0 h-full w-full" viewBox="0 0 200 120"
         preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <circle cx="165" cy="15" r="42" fill="white" opacity="0.08" />
      <circle cx="185" cy="95" r="28" fill="white" opacity="0.06" />
      <circle cx="10" cy="100" r="20" fill="white" opacity="0.05" />
    </svg>

    <!-- 图标 + 名称 + 数量（同一行） -->
    <div class="relative flex items-center gap-2">
      <component :is="icon" :size="18" color="#ffffff" :stroke-width="2" />
      <p class="flex-1 truncate text-sm font-semibold text-white">{{ room.name }}</p>
      <p class="shrink-0 text-xs text-white/80">{{ room.count }} 件</p>
    </div>

    <!-- 进度条 -->
    <div class="relative mt-2">
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
        <div class="h-full rounded-full bg-white/80"
             :style="{ width: progressWidth }" />
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
interface RoomData {
  id: string
  name: string
  count: number
}

const props = defineProps<{ room: RoomData; totalCount: number }>()

const { getRoomIcon, getRoomColors } = useRoomStyle()
const icon = getRoomIcon(props.room.name)
const colors = getRoomColors(props.room.name)

const progressWidth = computed(() => {
  const pct = props.totalCount > 0 ? (props.room.count / props.totalCount) * 100 : 0
  return `${Math.max(pct, 4)}%`
})
</script>
