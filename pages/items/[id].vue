<template>
  <!-- 嵌套路由：编辑子路由时只渲染子页面 -->
  <template v-if="isEdit">
    <NuxtPage />
  </template>
  <main v-else class="mx-auto max-w-md px-4 pb-40">
    <AppTopbar title="物品详情" fallback="/" />

    <p v-if="pending" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else-if="item">
      <!-- 照片 hero：横向滑动大图 + 圆点指示器，点击放大看全图 -->
      <section class="mt-2" aria-label="物品照片">
        <div v-if="item.photos?.length" class="relative h-64 overflow-hidden rounded-3xl shadow-level-1">
          <div ref="heroEl"
               class="flex h-full snap-x snap-mandatory overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-width:none]"
               @scroll.passive="onHeroScroll">
            <img v-for="(p, i) in item.photos" :key="p.id" :src="p.url" alt="物品照片"
                 class="h-full w-full flex-none cursor-zoom-in snap-center object-cover" @click="lightboxIndex = i" />
          </div>
          <div v-if="item.photos.length > 1"
               class="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            <i v-for="(p, i) in item.photos" :key="p.id" class="h-1.5 w-1.5 rounded-full transition-opacity"
               :class="i === heroIndex ? 'bg-white' : 'bg-white/45'" aria-hidden="true" />
          </div>
        </div>
        <div v-else
             class="flex h-64 w-full items-center justify-center rounded-3xl border border-border bg-neutral-surface shadow-level-1">
          <Package :size="44" class="text-text-tertiary" aria-hidden="true" />
        </div>
      </section>

      <!-- 标题行：名称 + 数量 pill -->
      <div class="mt-4 flex items-center justify-between gap-3">
        <h2 class="min-w-0 truncate text-[21px] font-bold tracking-wide">{{ item.name }}</h2>
        <span class="shrink-0 rounded-full bg-neutral-sunken px-3 py-1.5 text-xs font-semibold text-text-secondary">
          × {{ item.quantity }}
        </span>
      </div>

      <!-- 位置面包屑卡：房间 / 家具 / 格位，点击跳空间 -->
      <NuxtLink :to="`/locations/${item.locationId}`"
                class="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-neutral-surface px-3.5 py-3 shadow-level-1">
        <span class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-tint text-primary">
          <LocationIcon :slug="roomIcon" :size="16" />
        </span>
        <span class="flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold">
          <template v-for="(seg, i) in pathSegs" :key="i">
            <ChevronRight v-if="i" :size="11" class="shrink-0 text-text-disabled" aria-hidden="true" />
            <span class="truncate" :class="i === pathSegs.length - 1 ? 'text-primary-dark' : ''">{{ seg }}</span>
          </template>
        </span>
        <ChevronRight :size="16" class="shrink-0 text-text-disabled" aria-hidden="true" />
      </NuxtLink>

      <!-- 录入信息：头像 + 添加时间（绝对时间，档案语义） -->
      <div class="mt-3 flex items-center gap-2 px-0.5 text-xs text-text-tertiary">
        <UserAvatar :name="item.ownerName" :src="item.ownerAvatarUrl" :size="24" dot />
        <span><b class="font-semibold text-text-secondary">{{ item.ownerName }}</b> 添加于 {{ formatDateTime(item.createdAt) }}</span>
      </div>

      <!-- 标签 / 数量双卡 -->
      <div class="mt-3 flex gap-2.5">
        <div class="min-w-0 flex-1 rounded-2xl border border-border bg-neutral-surface px-3.5 py-3 shadow-level-1">
          <p class="text-xs text-text-tertiary">标签</p>
          <div v-if="item.tags.length" class="mt-1.5 flex flex-wrap gap-1.5">
            <span v-for="tag in item.tags" :key="tag"
                  class="rounded-full px-2 py-1 text-2xs leading-none" :style="tagStyle(tag)">
              {{ tag }}
            </span>
          </div>
          <p v-else class="mt-1.5 text-sm font-semibold text-text-secondary">无</p>
        </div>
        <div class="w-24 shrink-0 rounded-2xl border border-border bg-neutral-surface px-3.5 py-3 shadow-level-1">
          <p class="text-xs text-text-tertiary">数量</p>
          <p class="mt-1.5 text-sm font-semibold">{{ item.quantity }} 件</p>
        </div>
      </div>

      <!-- 备注 -->
      <div v-if="item.notes"
           class="mt-3 rounded-2xl border border-border bg-neutral-surface px-3.5 py-3 shadow-level-1">
        <p class="text-xs text-text-tertiary">备注</p>
        <p class="mt-1.5 text-sm leading-relaxed text-text-secondary">{{ item.notes }}</p>
      </div>

      <!-- 照片灯箱 -->
      <ImageLightbox v-model:index="lightboxIndex" :photos="item.photos ?? []" />

      <!-- 底部固定操作栏：悬于底部导航上方（bottom-20 = 导航 64px + 16px），中央避开 FAB -->
      <div class="fixed inset-x-0 bottom-20 z-10">
        <div class="mx-auto flex max-w-md gap-2.5 px-4">
          <NuxtLink :to="`/items/${id}/edit`"
                    class="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-border-strong bg-neutral-surface text-sm font-semibold shadow-level-1 hover:bg-neutral-sunken">
            <Pencil :size="16" aria-hidden="true" />
            编辑物品
          </NuxtLink>
          <button type="button"
                  class="btn-danger-soft flex h-12 flex-1 items-center justify-center gap-1.5 text-sm"
                  @click="remove">
            <Trash2 :size="16" aria-hidden="true" />
            删除
          </button>
        </div>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ChevronRight, Package, Pencil, Trash2 } from 'lucide-vue-next'
import type { ItemSummary } from '~/types/api'

const route = useRoute()
const id = String(route.params.id)

// 嵌套路由：/items/:id/edit 时父组件只作为出口
const isEdit = computed(() => route.name === 'items-id-edit')

// 照片灯箱：null = 关闭，数字 = 当前查看的照片下标
const lightboxIndex = ref<number | null>(null)

// hero 圆点指示器：横向滚动换算当前下标
const heroEl = ref<HTMLElement | null>(null)
const heroIndex = ref(0)
function onHeroScroll() {
  const el = heroEl.value
  if (!el || !el.clientWidth) return
  heroIndex.value = Math.round(el.scrollLeft / el.clientWidth)
}

const { data: item, pending } = await useAsyncData(`item-${id}`, async () => {
  const res = await apiFetch<ItemSummary & { photos?: { id: string; url: string }[] }>(`/api/items/${id}`)
  return res
}, { server: false, getCachedData: swrCache })

// 记录浏览（fire-and-forget，供首页"最近查看"；失败静默）
watch(item, (val) => {
  if (val?.id) apiFetch('/api/recent-views', { method: 'POST', body: { itemId: id } }).catch(() => {})
}, { immediate: true })

// 位置路径拆段：首段决定房间图标
const pathSegs = computed(() =>
  (item.value?.locationPath || '').split('/').map(s => s.trim()).filter(Boolean))
const { getRoomIcon } = useRoomStyle()
const roomIcon = computed(() => getRoomIcon(pathSegs.value[0] ?? ''))

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
</script>
