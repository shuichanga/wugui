<template>
  <!-- 照片：76px 方块 + 虚线添加钮（在 ItemForm 的扩展区 slot 中使用） -->
  <section class="rounded-2xl border border-border bg-neutral-surface px-3.5 py-3 shadow-level-1">
    <span class="mb-2 block text-xs font-semibold text-text-tertiary">照片 <span class="font-normal">（最多 {{ max }} 张）</span></span>
    <ul class="flex gap-2">
      <li v-for="(p, i) in modelValue" :key="i" class="relative">
        <img :src="p.previewUrl" alt="照片预览" class="h-[76px] w-[76px] rounded-lg object-cover" />
        <button type="button"
                class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text-primary text-white"
                aria-label="移除照片" @click="removeAt(i)">
          <X :size="12" aria-hidden="true" />
        </button>
      </li>
      <li v-if="modelValue.length < max">
        <label class="flex h-[76px] w-[76px] cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-dashed border-border-strong bg-neutral-surface text-text-disabled">
          <Plus :size="20" aria-hidden="true" />
          <input type="file" accept="image/*" capture="environment" class="hidden" @change="onPick" />
        </label>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { Plus, X } from 'lucide-vue-next'
import { compressImage } from '~/composables/useImageCompress'

export interface PendingPhoto {
  file: File
  previewUrl: string
}

const modelValue = defineModel<PendingPhoto[]>({ required: true })

withDefaults(defineProps<{ max?: number }>(), { max: 3 })

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  void (async () => {
    try {
      const compressed = await compressImage(file)
      modelValue.value = [...modelValue.value, { file: compressed, previewUrl: URL.createObjectURL(compressed) }]
    } catch {
      await useDialog().alertDialog('照片处理失败', '请换一张试试')
    }
  })()
}

function removeAt(i: number) {
  const [removed] = modelValue.value.splice(i, 1)
  if (removed) URL.revokeObjectURL(removed.previewUrl)
}

// 离开页面未保存时统一回收预览 URL，防止内存泄漏
onBeforeUnmount(() => {
  for (const p of modelValue.value) URL.revokeObjectURL(p.previewUrl)
})
</script>
