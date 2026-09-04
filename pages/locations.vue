<template>
  <!-- 嵌套路由：位置详情子路由时只渲染子页面 -->
  <template v-if="isChild">
    <NuxtPage />
  </template>
  <main v-else class="mx-auto max-w-md px-4 pt-4">
    <header class="flex items-center justify-between">
      <h1 class="text-xl">位置</h1>
      <button type="button" class="flex items-center gap-1 text-sm text-primary" @click="formOpen = !formOpen">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ formOpen ? '收起' : '新增位置' }}</span>
      </button>
    </header>

    <!-- 新增位置 -->
    <form v-if="formOpen" class="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-neutral-surface p-4" @submit.prevent="addLocation">
      <section>
        <label for="loc-name" class="mb-1 block text-sm font-medium">名称</label>
        <input id="loc-name" v-model="form.name" type="text" class="input-base" placeholder="例如：客厅、电视柜、第2抽屉" required />
      </section>
      <section>
        <label for="loc-parent" class="mb-1 block text-sm font-medium">上级位置 <span class="font-normal text-text-tertiary">（不选则为房间）</span></label>
        <select id="loc-parent" v-model="form.parentId" class="input-base">
          <option value="">无（新建房间）</option>
          <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        </select>
      </section>
      <p v-if="error" class="rounded-md border border-border bg-neutral-sunken p-2 text-sm text-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn-primary" :disabled="adding">{{ adding ? '添加中…' : '添加' }}</button>
    </form>

    <!-- 位置树 -->
    <section class="mt-4" aria-label="位置树">
      <p v-if="pending" class="p-4 text-sm text-text-tertiary">加载中…</p>
      <p v-else-if="!tree?.length" class="p-4 text-sm text-text-tertiary">还没有位置，点右上角"新增位置"创建第一个房间</p>
      <ul v-else>
        <LocationNode v-for="room in tree" :key="room.id" :node="room" @delete="removeLocation" />
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'

// 嵌套路由：/locations/:id 时父组件只作为出口
const route = useRoute()
const isChild = computed(() => route.name === 'locations-id')

const { data: tree, pending, refresh } = await useAsyncData('location-tree', () =>
  apiFetch<LocationTreeNode[]>('/api/locations'),
{ server: false })

const formOpen = ref(false)
const form = reactive({ name: '', parentId: '' })
const error = ref('')
const adding = ref(false)

// 上级位置候选：房间和家具（扁平化带缩进）
const parentOptions = computed(() => {
  const opts: { id: string; label: string }[] = []
  const walk = (nodes: LocationTreeNode[] | undefined, depth: number) => {
    for (const n of nodes ?? []) {
      if (n.level !== 'compartment') {
        opts.push({ id: n.id, label: `${'　'.repeat(depth)}${n.name}` })
        walk(n.children, depth + 1)
      }
    }
  }
  walk(tree.value, 0)
  return opts
})

async function addLocation() {
  error.value = ''
  adding.value = true
  try {
    await apiFetch('/api/locations', {
      method: 'POST',
      body: { name: form.name, parentId: form.parentId || undefined },
    })
    form.name = ''
    form.parentId = ''
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '添加失败'
  } finally {
    adding.value = false
  }
}

const { confirmDialog, alertDialog } = useDialog()

async function removeLocation(id: string) {
  if (!(await confirmDialog({
    title: '删除位置',
    message: '确定删除该位置？',
    confirmText: '删除',
    danger: true,
  }))) return
  try {
    await apiFetch(`/api/locations/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: unknown) {
    await alertDialog('删除失败', (e as { data?: { statusMessage?: string } })?.data?.statusMessage)
  }
}
</script>
