<template>
  <main class="mx-auto max-w-4xl px-4">
    <AppTopbar title="用户管理" fallback="/admin" />

    <!-- 搜索 -->
    <form class="mt-4 flex gap-2" role="search" @submit.prevent="search">
      <input
        v-model="queryDraft"
        type="search"
        placeholder="搜索用户名 / 邮箱 / 昵称"
        class="h-10 flex-1 rounded-md border border-neutral-input bg-neutral-surface px-3 text-sm outline-none focus:border-primary"
        aria-label="搜索用户"
      />
      <button type="submit" class="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:brightness-95">
        搜索
      </button>
    </form>

    <p v-if="pending" class="mt-6 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else>
      <p class="mt-4 text-xs text-text-tertiary">共 {{ total }} 个用户</p>

      <!-- 用户列表 -->
      <ul class="mt-2 flex flex-col gap-2">
        <li v-for="u in users" :key="u.id">
          <button type="button"
                  class="w-full rounded-lg border border-border bg-neutral-surface p-3.5 text-left shadow-level-1 hover:border-border-strong"
                  @click="openDetail(u.id)">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="flex items-center gap-2 truncate text-sm font-bold">
                  {{ u.displayName ?? u.username ?? u.email ?? u.id.slice(0, 8) }}
                  <span v-if="u.isPro"
                        class="shrink-0 rounded-full bg-primary px-2 py-0.5 text-2xs font-semibold text-white">PRO</span>
                </p>
                <p class="mt-0.5 truncate text-xs text-text-tertiary">
                  {{ u.username ?? '（微信用户）' }}<template v-if="u.email"> · {{ u.email }}</template>
                </p>
              </div>
              <div class="shrink-0 text-right text-2xs text-text-secondary">
                <p>住所 {{ u.householdCount }} · 物品 {{ u.itemCount }}</p>
                <p class="mt-0.5 text-text-tertiary">{{ u.createdAt.slice(0, 10) }} 注册 · {{ providerLabel(u.provider) }}</p>
              </div>
            </div>
          </button>
        </li>
      </ul>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="mt-4 flex items-center justify-center gap-3">
        <button type="button" class="rounded-md border border-border bg-neutral-surface px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span class="text-xs text-text-secondary">{{ page }} / {{ totalPages }}</span>
        <button type="button" class="rounded-md border border-border bg-neutral-surface px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </div>
    </template>

    <!-- 详情抽屉 -->
    <Teleport to="body">
      <div v-if="detail" class="fixed inset-0 z-50 flex justify-end bg-black/30" @click.self="detail = null">
        <aside class="flex h-full w-full max-w-md flex-col overflow-y-auto bg-neutral-bg p-5 shadow-level-2" aria-label="用户详情">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold">{{ detail.user.displayName ?? detail.user.username ?? '用户' }}</h2>
              <p class="mt-1 text-xs text-text-tertiary">
                {{ detail.user.username ?? '（微信用户）' }}<template v-if="detail.user.email"> · {{ detail.user.email }}</template>
              </p>
              <p class="mt-0.5 text-xs text-text-tertiary">
                {{ detail.user.createdAt.slice(0, 10) }} 注册 · {{ providerLabel(detail.user.provider) }}
              </p>
            </div>
            <button type="button" class="rounded-full border border-border bg-neutral-surface px-3 py-1.5 text-xs font-medium"
                    @click="detail = null">关闭</button>
          </div>

          <!-- 数据概览 -->
          <div class="mt-4 grid grid-cols-2 gap-2">
            <div class="rounded-md border border-border bg-neutral-surface p-3">
              <p class="text-xl font-bold">{{ detail.itemCount }}</p>
              <p class="text-xs text-text-secondary">物品（未删）</p>
            </div>
            <div class="rounded-md border border-border bg-neutral-surface p-3">
              <p class="text-xl font-bold">{{ detail.photoCount }}</p>
              <p class="text-xs text-text-secondary">照片</p>
            </div>
          </div>

          <!-- 订阅管理 -->
          <section class="mt-4 rounded-lg border border-border bg-neutral-surface p-4">
            <h3 class="text-sm font-bold">订阅管理</h3>
            <p class="mt-1 text-xs text-text-tertiary">
              当前：{{ detail.subscription ? `${detail.subscription.planType}（${detail.subscription.status}）` : 'free' }}
            </p>
            <div class="mt-3 flex gap-2">
              <button type="button"
                      class="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-40"
                      :disabled="acting || isDetailPro"
                      @click="grantSubscription">开通云同步</button>
              <button type="button"
                      class="flex-1 rounded-md border border-error px-3 py-2 text-xs font-semibold text-error hover:bg-red-50 disabled:opacity-40"
                      :disabled="acting || !detail.subscription"
                      @click="revokeSubscription">取消订阅</button>
            </div>
          </section>

          <!-- 住所列表 -->
          <section class="mt-4">
            <h3 class="text-sm font-bold">住所（{{ detail.households.length }}）</h3>
            <ul class="mt-2 flex flex-col gap-2">
              <li v-for="h in detail.households" :key="h.id"
                  class="rounded-md border border-border bg-neutral-surface p-3 text-xs">
                <p class="text-sm font-semibold">{{ h.name }}</p>
                <p class="mt-0.5 text-text-tertiary">
                  {{ h.role === 'owner' ? '创建者' : '成员' }} · 加入于 {{ String(h.joinedAt).slice(0, 10) }}
                </p>
              </li>
              <li v-if="!detail.households.length" class="p-3 text-xs text-text-tertiary">暂无住所</li>
            </ul>
          </section>
        </aside>
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
interface AdminUserRow {
  id: string
  username: string | null
  email: string | null
  displayName: string | null
  provider: string
  createdAt: string
  householdCount: number
  itemCount: number
  planType: string
  isPro: boolean
}
interface UserDetail {
  user: { id: string; username: string | null; email: string | null; displayName: string | null; provider: string; createdAt: string }
  households: Array<{ id: string; name: string; role: string; joinedAt: string }>
  itemCount: number
  photoCount: number
  subscription: { planType: string; status: string; expiresAt: string | null; paymentProvider: string | null } | null
}

const auth = useAuthStore()

const queryDraft = ref('')
const query = ref('')
const users = ref<AdminUserRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const pending = ref(true)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const detail = ref<UserDetail | null>(null)
const acting = ref(false)
const dialog = useDialog()

const isDetailPro = computed(() => {
  const s = detail.value?.subscription
  return !!s && s.planType !== 'free' && s.status === 'active' && (!s.expiresAt || new Date(s.expiresAt) > new Date())
})

function providerLabel(p: string): string {
  return p === 'wechat' ? '微信' : '账号'
}

async function load() {
  pending.value = true
  try {
    const res = await apiFetch<{ users: AdminUserRow[]; total: number }>(
      `/api/admin/users?query=${encodeURIComponent(query.value)}&page=${page.value}&pageSize=${pageSize}`,
    )
    users.value = res.users
    total.value = res.total
  } finally {
    pending.value = false
  }
}

function search() {
  query.value = queryDraft.value.trim()
  page.value = 1
  void load()
}

function goPage(p: number) {
  page.value = p
  void load()
}

async function openDetail(id: string) {
  detail.value = await apiFetch<UserDetail>(`/api/admin/users/${id}`)
}

async function grantSubscription() {
  if (!detail.value || acting.value) return
  acting.value = true
  try {
    await apiFetch(`/api/admin/users/${detail.value.user.id}/subscription`, {
      method: 'POST',
      body: { planType: 'cloud_sync_permanent' },
    })
    detail.value = await apiFetch<UserDetail>(`/api/admin/users/${detail.value.user.id}`)
    await load()
  } finally {
    acting.value = false
  }
}

async function revokeSubscription() {
  const ok = await dialog.confirmDialog({
    title: '取消该用户的订阅？',
    message: '取消后该用户所在住所的云同步将停用（本地数据不受影响）。',
    confirmText: '取消订阅',
    danger: true,
  })
  if (ok) await doRevoke()
}

async function doRevoke() {
  if (!detail.value || acting.value) return
  acting.value = true
  try {
    await apiFetch(`/api/admin/users/${detail.value.user.id}/subscription`, {
      method: 'POST',
      body: { planType: null },
    })
    detail.value = await apiFetch<UserDetail>(`/api/admin/users/${detail.value.user.id}`)
    await load()
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  if (!auth.loaded) await auth.fetchMe()
  if (!auth.isAdmin) {
    await navigateTo('/')
    return
  }
  await load()
})
</script>
