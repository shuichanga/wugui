<template>
  <div class="relative">
    <!-- 搜索图标按钮 -->
    <button type="button"
            class="flex items-center text-sm text-white/90 hover:text-white"
            aria-label="搜索" :aria-expanded="open"
            @click="toggle">
      <Search :size="20" aria-hidden="true" />
    </button>

    <!-- 全屏遮罩：模糊背景 + 点击关闭 -->
    <div v-if="open"
         class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]"
         @click="close">

      <!-- 悬浮面板 -->
      <div class="w-full max-w-sm rounded-lg border border-white/15 bg-white/5 p-3 shadow-level-2 backdrop-blur-[10px]"
           @click.stop>
        <!-- 搜索输入 -->
        <form class="relative" @submit.prevent="doSearch">
          <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/70" aria-hidden="true" />
          <input v-model="keyword" ref="inputRef" type="search"
                 class="w-full rounded-md border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-base text-white placeholder-white/50 outline-none focus:border-white/40"
                 placeholder="搜索物品名称、标签、备注" />
        </form>

        <!-- 常用标签 -->
        <div v-if="tags.length" class="mt-3">
          <p class="mb-1 text-xs text-white/60">常用标签</p>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="t in tags" :key="t.tag" type="button"
                    class="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
                    @click="searchByTag(t.tag)">
              {{ t.tag }}
            </button>
          </div>
        </div>

        <!-- 搜索历史 -->
        <div v-if="history.length" class="mt-3">
          <div class="flex items-center justify-between">
            <p class="text-xs text-white/60">搜索历史</p>
            <button type="button" class="text-xs text-white/60 hover:text-white/90" @click="clearHistory">清空</button>
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            <button v-for="h in history" :key="h" type="button"
                    class="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-white/20 hover:text-white"
                    @click="searchByKeyword(h)">
              <History :size="12" aria-hidden="true" />
              {{ h }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search, History } from 'lucide-vue-next'

const emit = defineEmits<{ search: [keyword: string] }>()

const open = ref(false)
const keyword = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const tags = ref<{ tag: string; count: number }[]>([])
const history = ref<string[]>([])

const HISTORY_KEY = 'wugui-search-history'
const MAX_HISTORY = 10

function loadHistory() {
  if (import.meta.server) return
  try {
    history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    history.value = []
  }
}

function saveHistory(kw: string) {
  if (import.meta.server) return
  const item = kw.trim()
  if (!item) return
  const filtered = history.value.filter(h => h !== item)
  history.value = [item, ...filtered].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

function clearHistory() {
  history.value = []
  if (!import.meta.server) localStorage.removeItem(HISTORY_KEY)
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    loadHistory()
    try {
      const res = await apiFetch<{ tags: { tag: string; count: number }[] }>('/api/tags')
      tags.value = res.tags
    } catch {
      tags.value = []
    }
    nextTick(() => inputRef.value?.focus())
  }
}

function close() {
  open.value = false
  keyword.value = ''
}

function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  saveHistory(kw)
  emit('search', kw)
  close()
}

function searchByTag(tag: string) {
  saveHistory(tag)
  emit('search', tag)
  close()
}

function searchByKeyword(kw: string) {
  saveHistory(kw)
  emit('search', kw)
  close()
}
</script>
