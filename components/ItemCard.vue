<template>
  <div class="relative overflow-hidden rounded-lg border border-border bg-neutral-surface">
    <!-- 左滑露出的操作层 -->
    <div class="absolute inset-y-0 right-0 flex" aria-hidden="true">
      <button type="button" class="w-16 bg-primary text-sm font-medium text-white" @click="goEdit">编辑</button>
      <button type="button" class="w-16 bg-error text-sm font-medium text-white" @click="onDelete">删除</button>
    </div>

    <!-- 前景卡片：跟随手势横移（border-left 作为左侧空间色条） -->
    <NuxtLink :to="`/items/${item.id}`"
              class="flex h-full items-center gap-3 bg-neutral-surface py-3 pl-4 pr-3"
              :style="{ transform: `translateX(${offsetX}px)`, transition: dragging ? 'none' : 'transform 0.2s ease', borderLeftWidth: '6px', borderLeftColor: roomColor }"
              @click="onLinkClick"
              @touchstart="onTouchStart"
              @touchmove="onTouchMove"
              @touchend="onTouchEnd"
              @touchcancel="onTouchEnd">
      <!-- 缩略图：有照片显示，无照片图标兜底（有照片时放大到 80×64） -->
      <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
           class="h-16 w-20 shrink-0 rounded-md object-cover" />
      <div v-else class="flex h-16 w-20 shrink-0 items-center justify-center rounded-md bg-neutral-sunken">
        <Package :size="24" class="text-text-tertiary" aria-hidden="true" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="truncate text-base font-medium">{{ item.name }}</h3>
          <span class="shrink-0 text-xs text-text-tertiary">×{{ item.quantity }}</span>
        </div>
        <!-- 空间 chip：首级房间用房间色高亮 -->
        <p class="mt-1 flex items-center gap-1 text-sm text-text-secondary">
          <MapPin :size="16" class="shrink-0 text-text-tertiary" aria-hidden="true" />
          <span class="truncate">
            <span class="font-medium" :style="{ color: roomColor }">{{ firstSegment }}</span>
            <span v-if="restPath">/ {{ restPath }}</span>
          </span>
        </p>
        <div class="mt-1.5 flex items-center justify-between gap-2">
          <ul class="flex min-w-0 flex-wrap gap-1">
            <li v-for="tag in visibleTags" :key="tag"
                class="rounded border px-1.5 py-0.5 text-xs"
                :style="tagStyle(tag)">
              {{ tag }}
            </li>
            <li v-if="hiddenTagCount > 0"
                class="rounded border border-border bg-neutral-sunken px-1.5 py-0.5 text-xs text-text-secondary">
              +{{ hiddenTagCount }}
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

// 取空间路径首段（房间名）+ 剩余路径
const locationParts = computed(() => {
  const path = props.item.locationPath || ''
  const idx = path.indexOf('/')
  if (idx === -1) return { first: path, rest: '' }
  return { first: path.slice(0, idx), rest: path.slice(idx + 1) }
})
const firstSegment = computed(() => locationParts.value.first)
const restPath = computed(() => locationParts.value.rest)

// 左侧色条颜色 = 首段房间颜色
const { getRoomColors } = useRoomStyle()
const roomColor = computed(() => getRoomColors(firstSegment.value).accent)

// 标签最多显示 3 个，超出折叠为 +N
const MAX_VISIBLE_TAGS = 3
const visibleTags = computed(() => props.item.tags.slice(0, MAX_VISIBLE_TAGS))
const hiddenTagCount = computed(() => Math.max(0, props.item.tags.length - MAX_VISIBLE_TAGS))

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
  const { confirmDialog, alertDialog } = useDialog()
  const ok = await confirmDialog({
    title: '删除物品',
    message: `确定删除「${props.item.name}」？`,
    confirmText: '删除',
    danger: true,
  })
  if (!ok) return
  try {
    await apiFetch(`/api/items/${props.item.id}`, { method: 'DELETE' })
    close()
    emit('deleted', props.item.id)
  } catch (e: unknown) {
    await alertDialog('删除失败', (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '请稍后重试')
  }
}
</script>
