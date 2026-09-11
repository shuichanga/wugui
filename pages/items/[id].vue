<template>
  <!-- 嵌套路由：编辑子路由时只渲染子页面 -->
  <template v-if="isEdit">
    <NuxtPage />
  </template>
  <main v-else class="mx-auto max-w-md px-4">
    <header class="relative -mx-4 flex h-12 items-center justify-between bg-primary px-4 text-white">
      <button type="button" class="flex items-center gap-1 text-sm text-white/90 hover:text-white" @click="goBack">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>返回</span>
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-lg">物品详情</h1>
      <NuxtLink :to="`/items/${id}/edit`" class="flex items-center gap-1 text-sm text-white/90 hover:text-white" aria-label="编辑物品">
        <Pencil :size="16" aria-hidden="true" />
        <span>编辑</span>
      </NuxtLink>
    </header>

    <p v-if="pending" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else-if="item">
      <!-- 照片区：横向滑动大图，点击放大看全图 -->
      <section class="mt-4" aria-label="物品照片">
        <div v-if="item.photos?.length"
             class="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
          <img v-for="(p, i) in item.photos" :key="p.id" :src="p.url" alt="物品照片"
               class="h-56 w-full flex-none cursor-zoom-in snap-center rounded-lg object-cover" @click="lightboxIndex = i" />
        </div>
        <div v-else class="flex h-56 w-full items-center justify-center rounded-lg border border-border bg-neutral-surface">
          <Package :size="32" class="text-text-tertiary" aria-hidden="true" />
        </div>
      </section>

      <!-- 信息卡 -->
      <section class="mt-4 rounded-lg border border-border bg-neutral-surface p-4">
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="text-xl">{{ item.name }}</h2>
          <span class="text-sm text-text-tertiary">×{{ item.quantity }}</span>
        </div>
        <dl class="mt-3 flex flex-col gap-2 text-sm">
          <div class="flex items-start gap-1">
            <MapPin :size="16" class="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
            <div>
              <dt class="sr-only">收纳空间</dt>
              <dd>
                <NuxtLink :to="`/locations/${item.locationId}`" class="text-primary">
                  {{ item.locationPath }}
                </NuxtLink>
              </dd>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <UserAvatar :name="item.ownerName" :src="item.ownerAvatarUrl" :size="16" />
            <div>
              <dt class="sr-only">录入人</dt>
              <dd class="text-text-secondary">{{ item.ownerName }} · {{ timeAgo(item.createdAt) }}</dd>
            </div>
          </div>
        </dl>
      </section>

      <!-- 标签与备注 -->
      <section v-if="item.tags.length || item.notes" class="mt-4 rounded-lg border border-border bg-neutral-surface p-4">
        <ul v-if="item.tags.length" class="flex flex-wrap gap-1.5">
          <li v-for="tag in item.tags" :key="tag"
              class="rounded border px-2 py-0.5 text-xs"
              :style="tagStyle(tag)">
            {{ tag }}
          </li>
        </ul>
        <p v-if="item.notes" class="text-sm text-text-secondary" :class="item.tags.length ? 'mt-3 border-t border-border pt-3' : ''">
          {{ item.notes }}
        </p>
      </section>

      <!-- 照片灯箱 -->
      <ImageLightbox v-model:index="lightboxIndex" :photos="item.photos ?? []" />

      <div class="mt-4 mb-4">
        <button type="button" class="w-full rounded-lg border border-error py-3 text-sm font-semibold text-error"
                @click="remove">
          删除物品
        </button>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeft, Package, MapPin, Pencil } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const route = useRoute()
const id = String(route.params.id)

// 嵌套路由：/items/:id/edit 时父组件只作为出口
const isEdit = computed(() => route.name === 'items-id-edit')

// 照片灯箱：null = 关闭，数字 = 当前查看的照片下标
const lightboxIndex = ref<number | null>(null)

const { data: item, pending } = await useAsyncData(`item-${id}`, async () => {
  const res = await apiFetch<ItemSummary & { photos?: { id: string; url: string }[] }>(`/api/items/${id}`)
  return res
}, { server: false, getCachedData: swrCache })

// 记录浏览（fire-and-forget，供首页"最近查看"；失败静默）
watch(item, (val) => {
  if (val?.id) apiFetch('/api/recent-views', { method: 'POST', body: { itemId: id } }).catch(() => {})
}, { immediate: true })

const { confirmDialog, alertDialog } = useDialog()

async function remove() {
  if (!(await confirmDialog({
    title: '删除物品',
    message: '确定删除该物品？删除后无法恢复。',
    confirmText: '删除',
    danger: true,
  }))) return
  try {
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
    await navigateTo('/')
  } catch (e: unknown) {
    await alertDialog('删除失败', errMsg(e) || '请稍后重试')
  }
}

function goBack() {
  if (window.history.length > 1) history.back()
  else navigateTo('/')
}
</script>
