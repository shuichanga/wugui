<template>
  <main class="mx-auto max-w-md px-4">
    <!-- 顶栏：住所切换 + 标题 + 设置入口；底部大圆弧过渡，标题下问候语+日期 -->
    <header class="relative -mx-4 rounded-b-[2rem] bg-primary px-4 pb-4 pt-3 text-white">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ResidenceSwitcher @switched="onSwitched" :inverse="true" />
        </div>
        <h1 class="absolute left-1/2 -translate-x-1/2 text-xl text-white">物归</h1>
        <NuxtLink to="/settings" aria-label="设置">
          <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="32" />
        </NuxtLink>
      </div>
      <!-- 问候语与日期依赖客户端本地时间，hydration 后渲染（SSR 输出等高占位防跳动） -->
      <p class="mt-1.5 text-center text-xs text-white/70">
        <template v-if="hydrated">{{ greeting }} · {{ today }}</template>
        <template v-else>&nbsp;</template>
      </p>
    </header>

    <!-- 新手引导：空间或物品未就绪时显示（数据加载完成前挂起，防刷新闪现） -->
    <section v-if="!loading && (!rooms.length || !recent.length)" class="mt-4" aria-label="新手引导">
      <div class="relative overflow-hidden rounded-lg border border-primary/40 bg-neutral-surface p-4">
        <svg class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 200 120"
             preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <circle cx="170" cy="12" r="42" fill="#059669" opacity="0.06" />
          <circle cx="24" cy="108" r="22" fill="#059669" opacity="0.05" />
        </svg>
        <h2 class="relative text-base font-semibold">开始整理你的家</h2>
        <p class="relative text-sm text-text-secondary">三步上手，物品再也不怕找不到</p>
        <ol class="relative mt-3 flex flex-col gap-2">
          <!-- 步骤 1：添加空间 -->
          <li class="flex items-center gap-3 rounded-md bg-neutral-sunken px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="onboard.room ? 'bg-success text-white' : 'bg-primary text-white'">
              <Check v-if="onboard.room" :size="14" aria-hidden="true" />
              <template v-else>1</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">添加空间</p>
              <p class="text-xs text-text-tertiary">先建房间，如客厅、卧室</p>
            </div>
            <NuxtLink v-if="!onboard.room" to="/locations" class="shrink-0 text-xs font-semibold text-primary">去添加</NuxtLink>
          </li>
          <!-- 步骤 2：添加家具（可选） -->
          <li class="flex items-center gap-3 rounded-md bg-neutral-sunken px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="onboard.furniture ? 'bg-success text-white' : 'bg-neutral-surface text-text-secondary ring-1 ring-border'">
              <Check v-if="onboard.furniture" :size="14" aria-hidden="true" />
              <template v-else>2</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">添加家具<span class="ml-1 text-xs font-normal text-text-tertiary">可选</span></p>
              <p class="text-xs text-text-tertiary">如电视柜、衣柜，不放物品也可跳过</p>
            </div>
            <NuxtLink v-if="onboard.room && !onboard.furniture" to="/locations"
                      class="shrink-0 text-xs font-semibold text-primary">去添加</NuxtLink>
          </li>
          <!-- 步骤 3：录入物品 -->
          <li class="flex items-center gap-3 rounded-md bg-neutral-sunken px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="onboard.item ? 'bg-success text-white' : (onboard.room ? 'bg-primary text-white' : 'bg-neutral-surface text-text-secondary ring-1 ring-border')">
              <Check v-if="onboard.item" :size="14" aria-hidden="true" />
              <template v-else>3</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">录入第一件物品</p>
              <p class="text-xs text-text-tertiary">拍照、选好空间就行</p>
            </div>
            <NuxtLink v-if="onboard.room && !onboard.item" to="/add" class="shrink-0 text-xs font-semibold text-primary">去录入</NuxtLink>
          </li>
        </ol>
      </div>
    </section>

    <!-- 空间看板 -->
    <section class="mt-4" aria-label="空间看板">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-text-secondary">空间看板</h2>
        <span v-if="rooms.length" class="text-xs text-text-tertiary">共 {{ totalItems }} 件 · {{ rooms.length }} 个房间</span>
      </div>
      <div v-if="rooms.length" class="mt-2 grid grid-cols-2 gap-3">
        <RoomCard v-for="room in rooms" :key="room.id" :room="room" :total-count="totalItems" />
      </div>
    </section>

    <!-- 最近查看：横向滚动缩略卡 -->
    <section v-if="recentViews.length" class="mt-6" aria-label="最近查看">
      <h2 class="text-sm font-semibold text-text-secondary">最近查看</h2>
      <ul class="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
        <li v-for="item in recentViews" :key="item.id" class="w-28 shrink-0">
          <ItemThumbCard :item="item" />
        </li>
      </ul>
    </section>

    <!-- 最近添加 -->
    <section class="mt-6" aria-label="最近添加">
      <h2 class="text-sm font-semibold text-text-secondary">最近添加</h2>
      <p v-if="!loading && !recent.length" class="mt-2 p-4 text-sm text-text-tertiary">
        还没有物品，去底部"添加"录入第一件吧
      </p>
      <ul v-else-if="recent.length" class="mt-2 flex flex-col gap-2">
        <li v-for="item in recent" :key="item.id">
          <ItemCard :item="item" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const auth = useAuthStore()

// 空间看板：仅第一层级（房间）；hasChildren 用于引导卡"已添加家具"判定
const { data: rooms, status: roomsStatus, refresh: refreshRooms } = await useAsyncData('rooms-dashboard', async () => {
  const tree = await apiFetch<LocationTreeNode[]>('/api/locations')
  return tree.map(node => ({
    id: node.id,
    name: node.name,
    count: node.itemCount,
    hasChildren: (node.children?.length ?? 0) > 0,
  }))
}, { server: false, default: () => [], getCachedData: swrCache })

const totalItems = computed(() => rooms.value.reduce((sum, r) => sum + r.count, 0))

// 最近添加
const { data: recent, status: recentStatus, refresh: refreshRecent } = await useAsyncData('recent-items', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/items?limit=10')
  return res.items
}, { server: false, default: () => [], getCachedData: swrCache })

// 最近查看（当前用户视角；onMounted 刷新以覆盖从详情页返回的缓存）
const { data: recentViews, status: recentViewsStatus, refresh: refreshRecentViews } = await useAsyncData('recent-views', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/recent-views?limit=10')
  return res.items
}, { server: false, default: () => [], getCachedData: swrCache })

// 引导卡步骤完成状态：房间已建 / 房间下有家具 / 已录入物品
const onboard = computed(() => ({
  room: rooms.value.length > 0,
  furniture: rooms.value.some(r => r.hasChildren),
  item: recent.value.length > 0,
}))

// 数据首次加载中：挂起引导卡与空态，避免刷新时闪现"没有空间/物品"后再被数据填充。
// hydration 期间恒为 false（与服务端渲染一致），规避 pending 分支的 hydration mismatch
const hydrated = useHydrated()
const loading = computed(() =>
  hydrated.value && (roomsStatus.value === 'pending' || recentStatus.value === 'pending' || recentViewsStatus.value === 'pending'))

// 问候语与日期：依赖客户端本地时间，hydration 后填充
const greeting = computed(() => {
  const h = new Date().getHours()
  const period = h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好'
  const name = auth.user?.displayName?.trim()
  return name ? `${period}，${name}` : period
})
const today = computed(() => {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week[d.getDay()]}`
})

// 切换住所后刷新本页数据
function onSwitched() {
  refreshRooms()
  refreshRecent()
  refreshRecentViews()
}

// 列表内左滑删除：本地移除 + 刷新空间计数
function onDeleted(id: string) {
  recent.value = recent.value.filter(x => x.id !== id)
  recentViews.value = (recentViews.value ?? []).filter(x => x.id !== id)
  refreshRooms()
  refreshNuxtData('location-tree')
}

onMounted(async () => {
  if (!auth.loaded) await auth.fetchMe()
  // 无住所账号（仅注册未加入）：引导到设置页创建/加入住所
  if (auth.loaded && !auth.households.length) {
    await navigateTo('/settings')
  }
  // useAsyncData 会缓存 payload，每次进入首页统一刷新（看板/列表/引导卡保持最新）
  refreshRooms()
  refreshRecent()
  refreshRecentViews()
})
</script>
