<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <!-- 顶栏：家庭切换 + 标题 + 设置入口 -->
    <header class="flex items-center justify-between">
      <NuxtLink to="/settings" class="flex items-center gap-1 text-sm text-text-secondary" aria-label="家庭设置">
        <Home :size="16" aria-hidden="true" />
        <span class="max-w-32 truncate">{{ auth.currentHousehold?.name ?? '…' }}</span>
        <ChevronDown :size="16" aria-hidden="true" />
      </NuxtLink>
      <h1 class="text-xl">物归</h1>
      <NuxtLink to="/settings" aria-label="设置">
        <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :size="32" />
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

    <!-- 常用位置 -->
    <section v-else class="mt-6" aria-label="常用位置">
      <h2 class="text-sm font-semibold text-text-secondary">常用位置</h2>
      <p v-if="!frequent.length" class="mt-2 p-4 text-sm text-text-tertiary">还没有位置信息</p>
      <ul v-else class="mt-2 grid grid-cols-3 gap-2">
        <li v-for="loc in frequent" :key="loc.id">
          <NuxtLink :to="`/locations/${loc.id}`"
                    class="block rounded-lg border border-border bg-neutral-surface p-3 shadow-level-1">
            <p class="truncate text-sm font-medium">{{ loc.name }}</p>
            <p class="mt-0.5 text-xs text-text-tertiary">{{ loc.count }}件</p>
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
import { Home, ChevronDown, Search } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'

const auth = useAuthStore()

// 常用位置：树上按物品数取前 6
const { data: frequent } = await useAsyncData('frequent-locations', async () => {
  const tree = await apiFetch<LocationTreeNode[]>('/api/locations')
  const all: { id: string; name: string; count: number }[] = []
  const walk = (nodes: LocationTreeNode[]) => {
    for (const n of nodes) {
      all.push({ id: n.id, name: n.name, count: n.itemCount })
      walk(n.children ?? [])
    }
  }
  walk(tree)
  return all.sort((a, b) => b.count - a.count).slice(0, 6)
}, { server: false, default: () => [] })

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

onMounted(() => {
  if (!auth.loaded) auth.fetchMe()
})
</script>
