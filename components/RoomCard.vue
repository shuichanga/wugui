<template>
  <!-- 简洁白卡（默认，跟随原型） -->
  <NuxtLink v-if="variant === 'clean'"
            :to="`/locations/${room.id}`"
            class="block rounded-2xl border border-border bg-neutral-surface px-3 pb-2 pt-2 shadow-level-1 transition-transform hover:scale-[1.02]">
    <div class="flex items-center justify-between">
      <span class="flex h-[30px] w-[30px] items-center justify-center rounded-[10px]"
            :class="room.count > 0 ? 'bg-tint text-primary' : 'bg-neutral-sunken text-text-disabled'">
        <LocationIcon :slug="iconSlug" :size="16" />
      </span>
      <span class="text-xs text-text-tertiary">
        <template v-if="room.count > 0"><b class="text-sm font-bold text-primary">{{ room.count }}</b>件</template>
        <template v-else>还没有物品</template>
      </span>
    </div>
    <p class="mb-[5px] mt-1 truncate text-sm font-semibold">{{ room.name }}</p>
    <!-- 细进度条 + 末端圆点：空房间圆点停在起点（跟随原型） -->
    <div class="relative h-1 rounded-full bg-track">
      <span class="absolute inset-y-0 left-0 rounded-full bg-primary" :style="{ width: progressWidth }" />
      <span class="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-neutral-surface"
            :style="{ left: progressWidth }" />
    </div>
  </NuxtLink>

  <!-- 彩色卡（旧版，由外观偏好开关控制保留） -->
  <NuxtLink v-else
            :to="`/locations/${room.id}`"
            class="relative block overflow-hidden rounded-2xl shadow-level-1 transition-transform hover:scale-[1.02]"
            :style="{ backgroundColor: colors.accent }">
    <!-- SVG 装饰背景 -->
    <svg class="absolute inset-0 h-full w-full" viewBox="0 0 200 120"
         preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
      <circle cx="165" cy="15" r="42" fill="white" opacity="0.08" />
      <circle cx="185" cy="95" r="28" fill="white" opacity="0.06" />
      <circle cx="10" cy="100" r="20" fill="white" opacity="0.05" />
    </svg>

    <!-- 图标 + 名称 + 数量（同一行） -->
    <div class="relative flex items-center gap-2 p-3">
      <LocationIcon :slug="iconSlug" :size="18" class="text-white" />
      <p class="flex-1 truncate text-sm font-semibold text-white">{{ room.name }}</p>
      <p class="shrink-0 text-xs text-white/80">{{ room.count }} 件</p>
    </div>

    <!-- 进度条 -->
    <div class="relative mx-3 mb-3">
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
        <div class="h-full rounded-full bg-white/80" :style="{ width: progressWidth }" />
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

const props = withDefaults(defineProps<{
  room: RoomData
  totalCount: number
  variant?: 'clean' | 'colorful'
}>(), { variant: 'clean' })

const { getRoomIcon, getRoomColors } = useRoomStyle()
const iconSlug = getRoomIcon(props.room.name)
const colors = getRoomColors(props.room.name)

const progressWidth = computed(() => {
  // 空房间 0%：圆点停在进度条起点（原型 zero 态）
  if (props.room.count <= 0) return '0%'
  const pct = (props.room.count / props.totalCount) * 100
  return `${Math.max(pct, 4)}%`
})
</script>
