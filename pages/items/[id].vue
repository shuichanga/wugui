<template>
  <!-- 嵌套路由：编辑子路由时只渲染子页面 -->
  <template v-if="isEdit">
    <NuxtPage />
  </template>
  <main v-else class="mx-auto max-w-md px-4 pt-4">
    <header class="flex items-center justify-between">
      <button type="button" class="flex items-center gap-1 text-sm text-text-secondary" @click="goBack">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>返回</span>
      </button>
      <h1 class="text-lg">物品详情</h1>
      <NuxtLink :to="`/items/${id}/edit`" class="flex items-center gap-1 text-sm text-primary" aria-label="编辑物品">
        <Pencil :size="16" aria-hidden="true" />
        <span>编辑</span>
      </NuxtLink>
    </header>

    <p v-if="pending" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else-if="item">
      <section class="mt-4 rounded-lg border border-border bg-neutral-surface p-4">
        <!-- 照片区：最多3张，R2 预签名 GET URL -->
        <div v-if="item.photos?.length" class="flex gap-2">
          <img v-for="p in item.photos" :key="p.id" :src="p.url" alt="物品照片"
               class="h-24 flex-1 rounded-md object-cover" />
        </div>
        <div v-else class="flex h-40 w-full items-center justify-center rounded-md bg-neutral-sunken">
          <Package :size="32" class="text-text-tertiary" aria-hidden="true" />
        </div>

        <div class="mt-4 flex items-baseline justify-between gap-2">
          <h2 class="text-xl">{{ item.name }}</h2>
          <span class="text-sm text-text-tertiary">×{{ item.quantity }}</span>
        </div>

        <dl class="mt-3 flex flex-col gap-2 text-sm">
          <div class="flex items-start gap-1">
            <MapPin :size="16" class="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
            <div>
              <dt class="sr-only">收纳位置</dt>
              <dd>
                <NuxtLink :to="`/locations/${item.locationId}`" class="text-primary">
                  {{ item.locationPath }}
                </NuxtLink>
              </dd>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <User :size="16" class="shrink-0 text-text-tertiary" aria-hidden="true" />
            <div>
              <dt class="sr-only">录入人</dt>
              <dd class="text-text-secondary">{{ item.ownerName }} · {{ timeAgo(item.createdAt) }}</dd>
            </div>
          </div>
        </dl>

        <ul v-if="item.tags.length" class="mt-3 flex flex-wrap gap-1.5">
          <li v-for="tag in item.tags" :key="tag"
              class="rounded border border-border px-2 py-0.5 text-xs text-text-secondary">
            {{ tag }}
          </li>
        </ul>

        <p v-if="item.notes" class="mt-3 border-t border-border pt-3 text-sm text-text-secondary">
          {{ item.notes }}
        </p>
      </section>

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
import { ArrowLeft, Package, MapPin, User, Pencil } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const route = useRoute()
const id = String(route.params.id)

// 嵌套路由：/items/:id/edit 时父组件只作为出口
const isEdit = computed(() => route.name === 'items-id-edit')

const { data: item, pending } = await useAsyncData(`item-${id}`, async () => {
  const res = await apiFetch<ItemSummary & { photos?: { id: string; url: string }[] }>(`/api/items/${id}`)
  return res
}, { server: false })

async function remove() {
  if (!confirm('确定删除该物品？')) return
  try {
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
    await navigateTo('/')
  } catch (e: unknown) {
    alert((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '删除失败')
  }
}

function goBack() {
  if (window.history.length > 1) history.back()
  else navigateTo('/')
}
</script>
