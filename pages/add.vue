<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <header>
      <h1 class="text-xl">添加物品</h1>
    </header>

    <ItemForm show-keep-going :submitting="saving" @save="onSave">
      <!-- 照片：前端压缩，保存后上传 -->
      <PhotoUploader v-model="photos" />
    </ItemForm>

    <!-- 保存提示 -->
    <p v-if="savedTip" class="mb-4 rounded-md border border-border bg-neutral-surface p-3 text-sm text-success shadow-level-1" role="status">
      {{ savedTip }}
    </p>
  </main>
</template>

<script setup lang="ts">
import type { PendingPhoto } from '~/components/PhotoUploader.vue'
import type { ItemFormPayload } from '~/components/ItemForm.vue'

const photos = ref<PendingPhoto[]>([])
const saving = ref(false)
const savedTip = ref('')

async function onSave(payload: ItemFormPayload, keepGoing: boolean) {
  saving.value = true
  try {
    const res = await apiFetch<{ id: string }>('/api/items', {
      method: 'POST',
      body: { ...payload, notes: payload.notes || undefined },
    })
    if (photos.value.length) {
      await uploadItemPhotos(res.id, photos.value)
    }
    if (keepGoing) {
      savedTip.value = `已保存「${payload.name}」，继续录入下一件`
      for (const p of photos.value) URL.revokeObjectURL(p.previewUrl)
      photos.value = []
    } else {
      await navigateTo(`/items/${res.id}`)
    }
  } catch (e: unknown) {
    alert((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '保存失败')
  } finally {
    saving.value = false
  }
}
</script>
