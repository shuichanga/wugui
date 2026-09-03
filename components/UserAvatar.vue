<template>
  <!-- 预留头像上传：有 src 时显示图片，否则渲染首字母色块 -->
  <img v-if="src" :src="src" alt="头像"
       class="shrink-0 rounded-full object-cover" :style="sizeStyle" />
  <span v-else
        class="flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
        :style="{ ...sizeStyle, backgroundColor: bgColor }"
        :class="size < 24 ? 'text-[10px]' : 'text-base'"
        aria-hidden="true">
    {{ initial }}
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string | null
  email?: string | null
  src?: string | null
  size?: number
}>(), { size: 32 })

const sizeStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))

const initial = computed(() => {
  const n = props.name?.trim()
  if (n) return n[0]!.toUpperCase()
  const e = props.email?.trim()
  return e ? e[0]!.toUpperCase() : '家'
})

// 名字/邮箱哈希取固定颜色，同一人永远同色
const PALETTE = ['#059669', '#0284c7', '#d97706', '#dc2626', '#0f766e', '#6d28d9']
const bgColor = computed(() => {
  const key = props.name?.trim() || props.email?.trim() || ''
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]!
})
</script>
