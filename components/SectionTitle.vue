<template>
  <!-- 区块标题：品牌绿点母题 + 标题 + 右侧辅助信息 -->
  <div class="flex items-center justify-between">
    <h2 class="font-display flex items-center gap-2 text-[15px] font-bold tracking-wide">
      <i class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      {{ title }}
    </h2>
    <span v-if="$slots.aux" class="text-xs text-text-tertiary">
      <slot name="aux" />
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
