<template>
  <!-- 预留头像上传：有 src 时显示图片，否则渲染首字母色块；dot 为品牌在线点 -->
  <span class="relative inline-block shrink-0" :style="sizeStyle">
    <img v-if="src" :src="src" alt="头像" class="h-full w-full rounded-full object-cover" />
    <span v-else
          class="flex h-full w-full select-none items-center justify-center rounded-full font-semibold text-white"
          :style="{ backgroundColor: bgColor }"
          :class="size < 24 ? 'text-[10px]' : 'text-base'"
          aria-hidden="true">
      {{ initial }}
    </span>
    <i v-if="dot" class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-neutral-bg" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string | null
  email?: string | null
  src?: string | null
  size?: number
  /** 右下角品牌绿点（在线/个人入口母题） */
  dot?: boolean
}>(), { size: 32, dot: false })

const sizeStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))

const initial = computed(() => {
  const n = props.name?.trim()
  if (n) return n[0]!.toUpperCase()
  const e = props.email?.trim()
  return e ? e[0]!.toUpperCase() : '家'
})

// 名字/邮箱哈希取固定颜色，同一人永远同色
const PALETTE = ['#16a34a', '#0284c7', '#d97706', '#dc2626', '#0f766e', '#6d28d9']
const bgColor = computed(() => {
  const key = props.name?.trim() || props.email?.trim() || ''
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]!
})
</script>
