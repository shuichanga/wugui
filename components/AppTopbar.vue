<template>
  <!-- 内页顶栏：透明底融入页面背景，白底圆角返回钮 + 绝对居中标题 + 右槽 -->
  <header class="relative -mx-4 flex h-13 shrink-0 items-center justify-between px-4">
    <button type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-neutral-surface text-text-secondary shadow-level-1 transition-colors hover:text-text-primary"
            aria-label="返回" @click="goBack">
      <ChevronLeft :size="18" aria-hidden="true" />
    </button>
    <h1 class="pointer-events-none absolute left-1/2 max-w-48 -translate-x-1/2 truncate text-base font-bold tracking-wide">
      {{ title }}
    </h1>
    <div class="flex h-9 min-w-9 shrink-0 items-center justify-end">
      <slot name="right" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title: string
  /** 无历史记录时的回退路由 */
  fallback?: string
}>(), { fallback: '/' })

function goBack() {
  if (window.history.length > 1) history.back()
  else navigateTo(props.fallback)
}
</script>
