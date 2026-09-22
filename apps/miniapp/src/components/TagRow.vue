<template>
  <view v-if="tags.length" class="tag-row">
    <text
      v-for="t in visible"
      :key="t"
      class="tag-pill"
      :style="tagStyle(t)"
    >{{ t }}</text>
    <text v-if="hiddenCount > 0" class="tag-pill tag-pill-more">+{{ hiddenCount }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { tagStyle } from '../utils/local-photo'

/**
 * 标签行：按父容器实际宽度自适应展示标签，超出折叠为 "+N"。
 *
 * 策略：
 * - 先按 maxVisible（默认 10）尽可能多地渲染标签；
 * - CSS 用 `flex-wrap: nowrap` + `overflow: hidden` 让超出容器的 pill 视觉裁切；
 * - 每颗 pill 通过 `max-width: 180rpx` + `text-overflow: ellipsis` 防止单个标签过长撑破布局；
 * - 若标签数超过 maxVisible，多余的走 "+N" 折叠胶囊。
 *
 * 这样 2-3 个短标签在常见卡片宽度下 100% 完全显示，
 * 只有真正极端情况（> 10 个标签）才会出现 "+N"。
 */
const props = withDefaults(
  defineProps<{
    tags: string[]
    /** 最多渲染的标签数上限（超过则折叠成 +N） */
    maxVisible?: number
  }>(),
  { maxVisible: 10 },
)

const visible = computed(() => props.tags.slice(0, props.maxVisible))
const hiddenCount = computed(() => Math.max(0, props.tags.length - props.maxVisible))
</script>

<style scoped>
.tag-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6rpx;
  overflow: hidden;
  min-width: 0;
  width: 100%;
  align-items: center;
}
.tag-pill {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1;
  flex-shrink: 0;
  max-width: 180rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-pill-more {
  background: #f0f2f0;
  color: #51605a;
  font-weight: 600;
}
</style>
