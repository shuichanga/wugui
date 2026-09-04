<template>
  <div class="relative overflow-hidden rounded-lg border border-border bg-neutral-surface">
    <!-- 左滑露出的操作层 -->
    <div class="absolute inset-y-0 right-0 flex" aria-hidden="true">
      <button type="button" class="w-16 bg-primary text-sm font-medium text-white" @click="goEdit">编辑</button>
      <button type="button" class="w-16 bg-error text-sm font-medium text-white" @click="onDelete">删除</button>
    </div>

    <!-- 前景卡片：跟随手势横移 -->
    <NuxtLink :to="`/items/${item.id}`"
              class="flex h-full items-center gap-3 bg-neutral-surface p-3"
              :style="{ transform: `translateX(${offsetX}px)`, transition: dragging ? 'none' : 'transform 0.2s ease' }"
              @click="onLinkClick"
              @touchstart="onTouchStart"
              @touchmove="onTouchMove"
              @touchend="onTouchEnd"
              @touchcancel="onTouchEnd">
      <!-- 缩略图：有照片显示，无照片图标兜底 -->
      <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
           class="h-12 w-12 shrink-0 rounded-md object-cover" />
      <div v-else class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-neutral-sunken">
        <Package :size="20" class="text-text-tertiary" aria-hidden="true" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="truncate text-base font-medium">{{ item.name }}</h3>
          <span class="shrink-0 text-xs text-text-tertiary">×{{ item.quantity }}</span>
        </div>
        <p class="mt-1 flex items-center gap-1 text-sm text-text-secondary">
          <MapPin :size="16" class="shrink-0" aria-hidden="true" />
          <span class="truncate">{{ item.locationPath }}</span>
        </p>
        <div class="mt-1.5 flex items-center justify-between gap-2">
          <ul class="flex min-w-0 gap-1.5">
            <li v-for="tag in item.tags" :key="tag"
                class="rounded border px-1.5 py-0.5 text-xs"
                :style="tagStyle(tag)">
              {{ tag }}
            </li>
          </ul>
          <p class="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
            <UserAvatar :name="item.ownerName" :src="item.ownerAvatarUrl" :size="16" />
            {{ item.ownerName }} · {{ timeAgo(item.createdAt) }}
          </p>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { Package, MapPin } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const props = defineProps<{ item: ItemSummary }>()
const emit = defineEmits<{ deleted: [id: string] }>()

// 全局共享"当前左滑打开的卡片"，保证同时只有一张打开
const swipedId = useState<string | null>('swiped-item-id', () => null)

const rootRef = ref<HTMLElement | null>(null)
const ACTION_W = 128 // 编辑 64 + 删除 64
const offsetX = ref(0)
const opened = ref(false)
const dragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const axis = ref<'h' | 'v' | null>(null)

// 其他卡片打开时收起自己
watch(swipedId, (id) => {
  if (id !== props.item.id) close()
})

// ---- 全局收起：展开期间，任何其它点击/滚动都先恢复卡片（点击本身继续生效） ----
function onDocClick() {
  // 点外部：收起卡片；不拦截事件，本次点击照常生效（可正常跳转/聚焦）
  close()
}
function onWinScroll() {
  close()
}
function addGlobalListeners() {
  document.addEventListener('click', onDocClick, { capture: true })
  window.addEventListener('scroll', onWinScroll, { passive: true })
}
function removeGlobalListeners() {
  document.removeEventListener('click', onDocClick, { capture: true })
  window.removeEventListener('scroll', onWinScroll)
}
watch(opened, (isOpen) => {
  if (import.meta.server) return
  if (isOpen) {
    swipedId.value = props.item.id
    addGlobalListeners()
  } else {
    removeGlobalListeners()
  }
})
onBeforeUnmount(removeGlobalListeners)

function close() {
  opened.value = false
  offsetX.value = 0
  if (swipedId.value === props.item.id) swipedId.value = null
}

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]!
  startX.value = t.clientX
  startY.value = t.clientY
  dragging.value = true
  axis.value = null
}

function onTouchMove(e: TouchEvent) {
  if (!dragging.value) return
  const t = e.touches[0]!
  const dx = t.clientX - startX.value
  const dy = t.clientY - startY.value
  // 方向锁：横向意图才接管手势，避免干扰页面纵向滚动
  if (!axis.value) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    axis.value = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
  }
  if (axis.value !== 'h') return
  e.preventDefault()
  const base = opened.value ? -ACTION_W : 0
  offsetX.value = Math.min(0, Math.max(-ACTION_W, base + dx))
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  opened.value = offsetX.value < -ACTION_W / 2
  offsetX.value = opened.value ? -ACTION_W : 0
  if (opened.value) swipedId.value = props.item.id
}

function onLinkClick(e: MouseEvent) {
  // 已左滑时点击卡片 = 收起，不跳详情
  if (opened.value) {
    e.preventDefault()
    close()
  }
}

function goEdit() {
  close()
  navigateTo(`/items/${props.item.id}/edit`)
}

async function onDelete() {
  if (!confirm(`确定删除「${props.item.name}」？`)) return
  try {
    await apiFetch(`/api/items/${props.item.id}`, { method: 'DELETE' })
    close()
    emit('deleted', props.item.id)
  } catch (e: unknown) {
    alert((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '删除失败')
  }
}
</script>
