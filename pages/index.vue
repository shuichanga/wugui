<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <!-- 顶栏：住所切换 + 标题 + 设置入口 -->
    <header class="relative -mx-4 flex items-center justify-between bg-primary px-4 py-3 text-white">
      <ResidenceSwitcher @switched="onSwitched" :inverse="true" />
      <h1 class="absolute left-1/2 -translate-x-1/2 text-xl text-white">物归</h1>
      <NuxtLink to="/settings" aria-label="设置">
        <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="32" />
      </NuxtLink>
    </header>

    <!-- 搜索 -->
    <section class="mt-4" aria-label="搜索物品">
      <form class="relative" @submit.prevent="search">
        <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <input v-model="keyword" type="search" class="input-base pl-9" placeholder="搜索物品名称、标签、备注" />
      </form>
    </section>

    <!-- 搜索结果 -->
    <template v-if="searched">
      <section class="mt-6" aria-label="搜索结果">
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

    <!-- 位置看板 -->
    <section v-else class="mt-6" aria-label="位置看板">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-text-secondary">位置看板</h2>
        <span v-if="rooms.length" class="text-xs text-text-tertiary">共 {{ totalItems }} 件 · {{ rooms.length }} 个房间</span>
      </div>
      <p v-if="!rooms.length" class="mt-2 p-4 text-sm text-text-tertiary">还没有位置信息</p>
      <div v-else class="mt-2 grid grid-cols-2 gap-3">
        <RoomCard v-for="room in rooms" :key="room.id" :room="room" :total-count="totalItems" />
      </div>
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
import { Search } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const auth = useAuthStore()

// 位置看板：仅第一层级（房间）
const { data: rooms, refresh: refreshRooms } = await useAsyncData('rooms-dashboard', async () => {
  const tree = await apiFetch<LocationTreeNode[]>('/api/locations')
  return tree.map(node => ({ id: node.id, name: node.name, count: node.itemCount }))
}, { server: false, default: () => [] })

const totalItems = computed(() => rooms.value.reduce((sum, r) => sum + r.count, 0))

// 最近添加
const { data: recent, refresh: refreshRecent } = await useAsyncData('recent-items', async () => {
  const res = await apiFetch<{ items: ItemSummary[] }>('/api/items?limit=10')
  return res.items
}, { server: false, default: () => [] })

// 搜索
const keyword = ref('')
const lastKeyword = ref('')
const searched = ref(false)
const results = ref<ItemSummary[]>([])

async function search() {
  const kw = keyword.value.trim()
  if (!kw) return
  lastKeyword.value = kw
  const res = await apiFetch<{ items: ItemSummary[] }>(`/api/items?keyword=${encodeURIComponent(kw)}`)
  results.value = res.items
  searched.value = true
}

function clearSearch() {
  keyword.value = ''
  lastKeyword.value = ''
  searched.value = false
  refreshRecent()
}

// 切换住所后刷新本页数据
function onSwitched() {
  refreshRooms()
  refreshRecent()
}

// 列表内左滑删除：本地移除 + 刷新位置计数
function onDeleted(id: string) {
  recent.value = recent.value.filter(x => x.id !== id)
  results.value = results.value.filter(x => x.id !== id)
  refreshRooms()
  refreshNuxtData('location-tree')
}

onMounted(async () => {
  if (!auth.loaded) await auth.fetchMe()
  // 无住所账号（仅注册未加入）：引导到设置页创建/加入住所
  if (auth.loaded && !auth.households.length) {
    await navigateTo('/settings')
  }
})
</script>
