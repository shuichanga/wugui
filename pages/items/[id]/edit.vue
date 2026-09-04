<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <header class="flex items-center justify-between">
      <NuxtLink :to="`/items/${id}`" class="flex items-center gap-1 text-sm text-text-secondary" aria-label="返回详情">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>返回</span>
      </NuxtLink>
      <h1 class="text-lg">编辑物品</h1>
      <span class="w-12" aria-hidden="true"></span>
    </header>

    <p v-if="pending" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else-if="item">
      <!-- 已有照片管理：点 × 标记删除，保存后生效 -->
      <section v-if="existingPhotos.length" class="mt-4">
        <span class="mb-1 block text-sm font-medium">已有照片（点 × 标记删除）</span>
        <ul class="flex gap-2">
          <li v-for="p in existingPhotos" :key="p.id" class="relative">
            <img :src="p.url" alt="物品照片" class="h-16 w-16 rounded-md object-cover"
                 :class="{ 'opacity-40': removedIds.includes(p.id) }" />
            <button type="button"
                    class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
                    :class="removedIds.includes(p.id) ? 'bg-text-tertiary' : 'bg-text-primary'"
                    :aria-label="removedIds.includes(p.id) ? '撤销删除' : '标记删除照片'"
                    @click="toggleRemove(p.id)">
              <X v-if="!removedIds.includes(p.id)" :size="12" aria-hidden="true" />
              <RotateCcw v-else :size="12" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </section>

      <ItemForm :initial="initial" :submitting="saving" submit-label="保存修改" @save="onSave">
        <PhotoUploader v-model="newPhotos" :max="3 - activeExistingCount" />
      </ItemForm>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeft, X, RotateCcw } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'
import type { ItemFormPayload } from '~/components/ItemForm.vue'
import type { PendingPhoto } from '~/components/PhotoUploader.vue'

const route = useRoute()
const id = String(route.params.id)

// 独立 key：与详情页区分（相同 key 不同 handler 会污染共享缓存），
// 编辑页每次进入都拿最新服务端数据
const { data: item, pending } = await useAsyncData(`item-edit-${id}`, async () => {
  return apiFetch<ItemSummary & { photos?: { id: string; url: string }[] }>(`/api/items/${id}`)
}, { server: false })

const existingPhotos = ref<{ id: string; url: string }[]>([])
const removedIds = ref<string[]>([])
const newPhotos = ref<PendingPhoto[]>([])
const saving = ref(false)

const activeExistingCount = computed(() => existingPhotos.value.length - removedIds.value.length)
const initial = computed(() => item.value
  ? {
      name: item.value.name,
      quantity: item.value.quantity,
      tags: item.value.tags,
      notes: item.value.notes,
      locationId: item.value.locationId,
    }
  : undefined)

// 详情页数据是缓存共享的，进编辑页时同步一份本地照片状态
watch(item, (val) => {
  if (val && !existingPhotos.value.length && !removedIds.value.length) {
    existingPhotos.value = [...(val.photos ?? [])]
  }
}, { immediate: true })

function toggleRemove(photoId: string) {
  if (removedIds.value.includes(photoId)) {
    removedIds.value = removedIds.value.filter(x => x !== photoId)
  } else {
    removedIds.value = [...removedIds.value, photoId]
  }
}

async function onSave(payload: ItemFormPayload) {
  saving.value = true
  try {
    await apiFetch(`/api/items/${id}`, { method: 'PATCH', body: payload })
    for (const photoId of removedIds.value) {
      await apiFetch(`/api/items/${id}/photos/${photoId}`, { method: 'DELETE' })
    }
    if (newPhotos.value.length) {
      await uploadItemPhotos(id, newPhotos.value)
    }
    // 父组件（详情）在嵌套路由切换间不销毁，用 refresh 重拉而非 clear（clear 会把它置 null 导致空白）
    await refreshNuxtData(`item-${id}`)
    await navigateTo(`/items/${id}`)
  } catch (e: unknown) {
    await useDialog().alertDialog('保存失败', (e as { data?: { statusMessage?: string } })?.data?.statusMessage)
  } finally {
    saving.value = false
  }
}
</script>
