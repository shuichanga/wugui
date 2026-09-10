<template>
  <Teleport to="body">
    <Transition name="lb">
      <div v-if="index !== null"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
           @click.self="close">
        <!-- 顶部：计数 + 关闭 -->
        <div class="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <p class="text-sm text-white/80">{{ (index ?? 0) + 1 }} / {{ photos.length }}</p>
          <button type="button" class="rounded-full p-2 text-white/80 hover:text-white" aria-label="关闭大图" @click="close">
            <X :size="24" aria-hidden="true" />
          </button>
        </div>

        <!-- 全图（object-contain 完整显示不裁切） -->
        <img v-if="current" :src="current.url" alt="物品照片大图"
             class="max-h-[82vh] max-w-[92vw] rounded-lg object-contain" @click.stop />

        <!-- 多张时左右切换 -->
        <template v-if="photos.length > 1">
          <button type="button"
                  class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
                  aria-label="上一张" :disabled="index === 0" @click.stop="prev">
            <ChevronLeft :size="24" aria-hidden="true" />
          </button>
          <button type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
                  aria-label="下一张" :disabled="index === photos.length - 1" @click.stop="next">
            <ChevronRight :size="24" aria-hidden="true" />
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{ photos: { url: string }[]; index: number | null }>()
const emit = defineEmits<{ 'update:index': [number | null] }>()

const current = computed(() => (props.index === null ? null : props.photos[props.index] ?? null))

function close() {
  emit('update:index', null)
}
function prev() {
  if (props.index !== null && props.index > 0) emit('update:index', props.index - 1)
}
function next() {
  if (props.index !== null && props.index < props.photos.length - 1) emit('update:index', props.index + 1)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

// 打开时监听键盘并锁定背景滚动，关闭时恢复
watch(() => props.index, (v) => {
  if (import.meta.server) return
  if (v !== null) {
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
  } else {
    window.removeEventListener('keydown', onKey)
    document.body.style.overflow = ''
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.2s ease;
}
.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}
</style>
