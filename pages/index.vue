<template>
  <main class="mx-auto max-w-md px-4">
    <!-- 问候头：透明融入背景，左问候块（含住所切换）+ 右头像 -->
    <header class="flex items-center justify-between pt-4">
      <div class="min-w-0">
        <p class="font-display text-lg font-bold tracking-wide">{{ greeting }}</p>
        <!-- 问候语/日期依赖客户端本地时间，hydration 后渲染（SSR 输出等高占位防跳动） -->
        <p class="mt-1 flex h-5 items-center text-xs text-text-tertiary">
          <template v-if="hydrated">
            <ResidenceSwitcher @switched="onSwitched">
              {{ today }} · <span class="font-medium text-text-secondary">{{ auth.currentHousehold?.name }}</span>
            </ResidenceSwitcher>
          </template>
          <template v-else>&nbsp;</template>
        </p>
      </div>
      <NuxtLink to="/settings" aria-label="设置">
        <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="44" dot />
      </NuxtLink>
    </header>

    <!-- 新手引导：空间或物品未就绪时显示（数据加载完成前挂起，防刷新闪现） -->
    <section v-if="!loading && (!rooms.length || !recent.length)" class="mt-5" aria-label="新手引导">
      <div class="relative overflow-hidden rounded-2xl border border-border bg-neutral-surface p-4 shadow-level-1">
        <svg class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 200 120"
             preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">
          <circle cx="170" cy="12" r="42" class="fill-primary" opacity="0.06" />
          <circle cx="24" cy="108" r="22" class="fill-primary" opacity="0.05" />
        </svg>
        <h2 class="relative flex items-center gap-2 text-[15px] font-bold">
          <i class="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          开始整理你的家
        </h2>
        <p class="relative mt-1 text-xs text-text-tertiary">三步上手，物品再也不怕找不到</p>
        <ol class="relative mt-3 flex flex-col gap-2">
          <!-- 步骤 1：添加空间 -->
          <li class="flex items-center gap-3 rounded-xl bg-neutral-sunken px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="onboard.room ? 'bg-success text-white' : 'bg-primary text-white'">
              <Check v-if="onboard.room" :size="14" aria-hidden="true" />
              <template v-else>1</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">添加空间</p>
              <p class="text-2xs text-text-tertiary">先建房间，如客厅、卧室</p>
            </div>
            <NuxtLink v-if="!onboard.room" to="/locations" class="shrink-0 text-xs font-semibold text-primary-dark">去添加</NuxtLink>
          </li>
          <!-- 步骤 2：添加家具（可选） -->
          <li class="flex items-center gap-3 rounded-xl bg-neutral-sunken px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="onboard.furniture ? 'bg-success text-white' : 'bg-neutral-surface text-text-secondary ring-1 ring-border'">
              <Check v-if="onboard.furniture" :size="14" aria-hidden="true" />
              <template v-else>2</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">添加家具<span class="ml-1 text-2xs font-normal text-text-tertiary">可选</span></p>
              <p class="text-2xs text-text-tertiary">如电视柜、衣柜，不放物品也可跳过</p>
            </div>
            <NuxtLink v-if="onboard.room && !onboard.furniture" to="/locations"
                      class="shrink-0 text-xs font-semibold text-primary-dark">去添加</NuxtLink>
          </li>
          <!-- 步骤 3：录入物品 -->
          <li class="flex items-center gap-3 rounded-xl bg-neutral-sunken px-3 py-2.5">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  :class="onboard.item ? 'bg-success text-white' : (onboard.room ? 'bg-primary text-white' : 'bg-neutral-surface text-text-secondary ring-1 ring-border')">
              <Check v-if="onboard.item" :size="14" aria-hidden="true" />
              <template v-else>3</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">录入第一件物品</p>
              <p class="text-2xs text-text-tertiary">拍照、选好空间就行</p>
            </div>
            <NuxtLink v-if="onboard.room && !onboard.item" to="/add" class="shrink-0 text-xs font-semibold text-primary-dark">去录入</NuxtLink>
          </li>
        </ol>
      </div>
    </section>

    <!-- 空间看板 -->
    <section class="mt-5" aria-label="空间看板">
      <SectionTitle title="空间看板">
        <template #aux>
          <span v-if="rooms.length">共 {{ totalItems }} 件 · {{ rooms.length }} 个房间</span>
        </template>
      </SectionTitle>
      <div v-if="rooms.length" class="mt-3 grid grid-cols-2 gap-2.5">
        <RoomCard v-for="room in rooms" :key="room.id" :room="room" :total-count="totalItems" :variant="boardStyle" />
      </div>
    </section>

    <!-- 最近查看：2 列图文卡 -->
    <section v-if="recentViews.length" class="mt-5" aria-label="最近查看">
      <SectionTitle title="最近查看">
        <template #aux>
          <NuxtLink to="/items" class="flex items-center gap-0.5 hover:text-text-secondary">
            全部<ChevronRight :size="12" aria-hidden="true" />
          </NuxtLink>
        </template>
      </SectionTitle>
      <div class="mt-3 grid grid-cols-2 gap-2.5">
        <ItemRecentCard v-for="item in recentViews" :key="item.id" :item="item" />
      </div>
    </section>

    <!-- 最近添加：仅展示 30 天内新增物品 -->
    <section class="mt-5" aria-label="最近添加">
      <SectionTitle title="最近添加">
        <template #aux>
          <NuxtLink to="/items" class="flex items-center gap-0.5 hover:text-text-secondary">
            全部<ChevronRight :size="12" aria-hidden="true" />
          </NuxtLink>
        </template>
      </SectionTitle>
      <p v-if="!loading && !recentList.length && !totalItems"
         class="mt-2 rounded-2xl border border-border bg-neutral-surface p-4 text-sm text-text-tertiary shadow-level-1">
        还没有物品，去底部"添加"录入第一件吧
      </p>
      <p v-else-if="!loading && !recentList.length && totalItems"
         class="mt-2 rounded-2xl border border-border bg-neutral-surface p-4 text-sm text-text-tertiary shadow-level-1">
        最近 30 天没有新增物品
      </p>
      <ul v-else-if="recentList.length" class="mt-3 flex flex-col gap-2">
        <li v-for="item in recentList" :key="item.id">
          <RecentItemRow :item="item" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Check, ChevronRight } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const auth = useAuthStore()
const { boardStyle } = usePreferences()

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

// 最近添加：limit 拉全一点，前端过滤 30 天内新增
const { data: recent, status: recentStatus, refresh: refreshRecent } = await useAsyncData('recent-items', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/items?limit=30')
  return res.items
}, { server: false, default: () => [], getCachedData: swrCache })

// 最近添加的展示列表：30 天内新增（依赖客户端时间，放 computed 保证 hydration 稳定）
const RECENT_DAYS = 30
const recentList = computed(() => {
  const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  return recent.value.filter(i => new Date(i.createdAt).getTime() >= cutoff)
})

// 最近查看（当前用户视角；onMounted 刷新以覆盖从详情页返回的缓存）
const { data: recentViews, status: recentViewsStatus, refresh: refreshRecentViews } = await useAsyncData('recent-views', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/recent-views?limit=10')
  return res.items
}, { server: false, default: () => [], getCachedData: swrCache })

// 引导卡步骤完成状态：房间已建 / 房间下有家具 / 已录入物品（按全部物品判定，不受 30 天窗口影响）
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

// 问候语与日期：抽取到 useGreeting 复用
const { greeting, today } = useGreeting()

// 切换住所后刷新本页数据
function onSwitched() {
  refreshRooms()
  refreshRecent()
  refreshRecentViews()
}

// 列表数据在详情页删除后由 onMounted 统一刷新，无需本地移除逻辑

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
