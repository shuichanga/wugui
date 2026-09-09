<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <!-- 顶栏：住所切换 + 标题 + 设置入口 -->
    <header class="relative -mx-4 flex items-center justify-between bg-primary px-4 py-3 text-white">
      <div class="flex items-center gap-2">
        <ResidenceSwitcher @switched="onSwitched" :inverse="true" />
        <SearchPopover @search="onSearch" />
      </div>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-xl text-white">物归</h1>
      <NuxtLink to="/settings" aria-label="设置">
        <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="32" />
      </NuxtLink>
    </header>

    <!-- 搜索结果 -->
    <template v-if="searched">
      <section class="mt-4" aria-label="搜索结果">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-secondary">
            搜索"{{ lastKeyword }}" · {{ results.length }}件
          </h2>
          <button type="button" class="text-sm text-primary" @click="clearSearch">清除</button>
        </div>
        <p v-if="!results.length" class="mt-2 p-4 text-sm text-text-tertiary">没有找到匹配的物品</p>
        <ul v-else class="mt-2 flex flex-col gap-2">
          <li v-for="item in results" :key="item.id">
            <ItemCard :item="item" />
          </li>
        </ul>
      </section>
    </template>

    <!-- 新手引导：空间或物品未就绪时显示 -->
    <section v-if="!searched && (!rooms.length || !recent.length)" class="mt-4" aria-label="新手引导">
      <div class="rounded-lg border border-primary/40 bg-neutral-surface p-4">
        <h2 class="text-base font-semibold">开始整理你的家</h2>
        <p class="mt-1 text-sm text-text-secondary">三步上手，物品再也不怕找不到</p>
        <ol class="mt-3 flex flex-col gap-2">
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
    <section v-if="!searched" class="mt-4" aria-label="空间看板">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-text-secondary">空间看板</h2>
        <span v-if="rooms.length" class="text-xs text-text-tertiary">共 {{ totalItems }} 件 · {{ rooms.length }} 个房间</span>
      </div>
      <div v-if="rooms.length" class="mt-2 grid grid-cols-2 gap-3">
        <RoomCard v-for="room in rooms" :key="room.id" :room="room" :total-count="totalItems" />
      </div>
    </section>

    <!-- 最近查看：横向滚动缩略卡 -->
    <section v-if="!searched && recentViews.length" class="mt-6" aria-label="最近查看">
      <h2 class="text-sm font-semibold text-text-secondary">最近查看</h2>
      <ul class="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
        <li v-for="item in recentViews" :key="item.id" class="shrink-0">
          <NuxtLink :to="`/items/${item.id}`"
                    class="flex w-28 flex-col rounded-lg border border-border bg-neutral-surface p-2">
            <img v-if="item.photoUrl" :src="item.photoUrl" alt="物品照片"
                 class="h-20 w-full rounded-md object-cover" loading="lazy" />
            <div v-else class="flex h-20 w-full items-center justify-center rounded-md bg-neutral-sunken">
              <Package :size="20" class="text-text-tertiary" aria-hidden="true" />
            </div>
            <p class="mt-1.5 truncate text-sm font-medium">{{ item.name }}</p>
            <p class="truncate text-xs font-medium" :style="{ color: viewRoomColor(item) }">
              {{ firstRoom(item) }}
            </p>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- 最近添加 -->
    <section v-if="!searched" class="mt-6" aria-label="最近添加">
      <h2 class="text-sm font-semibold text-text-secondary">最近添加</h2>
      <p v-if="!recent.length" class="mt-2 p-4 text-sm text-text-tertiary">
        还没有物品，去底部"添加"录入第一件吧
      </p>
      <ul v-else class="mt-2 flex flex-col gap-2">
        <li v-for="item in recent" :key="item.id">
          <ItemCard :item="item" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Check, Package } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const auth = useAuthStore()

// 空间看板：仅第一层级（房间）；hasChildren 用于引导卡"已添加家具"判定
const { data: rooms, refresh: refreshRooms } = await useAsyncData('rooms-dashboard', async () => {
  const tree = await apiFetch<LocationTreeNode[]>('/api/locations')
  return tree.map(node => ({
    id: node.id,
    name: node.name,
    count: node.itemCount,
    hasChildren: (node.children?.length ?? 0) > 0,
  }))
}, { server: false, default: () => [] })

const totalItems = computed(() => rooms.value.reduce((sum, r) => sum + r.count, 0))

// 最近添加
const { data: recent, refresh: refreshRecent } = await useAsyncData('recent-items', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/items?limit=10')
  return res.items
}, { server: false, default: () => [] })

// 最近查看（当前用户视角；onMounted 刷新以覆盖从详情页返回的缓存）
const { data: recentViews, refresh: refreshRecentViews } = await useAsyncData('recent-views', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/recent-views?limit=10')
  return res.items
}, { server: false, default: () => [] })

// 最近查看卡片：首段房间名 + 房间色（与 ItemCard 色条语义一致）
const { getRoomColors } = useRoomStyle()
function firstRoom(item: ItemSummary): string {
  const path = item.locationPath || ''
  const idx = path.indexOf('/')
  return idx === -1 ? path : path.slice(0, idx)
}
function viewRoomColor(item: ItemSummary): string {
  return getRoomColors(firstRoom(item)).accent
}

// 引导卡步骤完成状态：房间已建 / 房间下有家具 / 已录入物品
const onboard = computed(() => ({
  room: rooms.value.length > 0,
  furniture: rooms.value.some(r => r.hasChildren),
  item: recent.value.length > 0,
}))

// 搜索
const lastKeyword = ref('')
const searched = ref(false)
const results = ref<ItemSummary[]>([])

async function onSearch(kw: string) {
  lastKeyword.value = kw
  const res = await apiFetch<{ items: ItemSummary[] }>(`/api/items?keyword=${encodeURIComponent(kw)}`)
  results.value = res.items
  searched.value = true
}

function clearSearch() {
  lastKeyword.value = ''
  searched.value = false
  refreshRecent()
}

// 切换住所后刷新本页数据
function onSwitched() {
  refreshRooms()
  refreshRecent()
  refreshRecentViews()
}

// 列表内左滑删除：本地移除 + 刷新空间计数
function onDeleted(id: string) {
  recent.value = recent.value.filter(x => x.id !== id)
  results.value = results.value.filter(x => x.id !== id)
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
