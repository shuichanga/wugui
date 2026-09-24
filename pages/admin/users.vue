<template>
  <main class="mx-auto max-w-md px-4 md:max-w-6xl">
    <!-- 页头 -->
    <header class="mt-4 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold md:text-2xl">用户管理</h1>
        <p class="mt-1 text-xs text-text-tertiary md:text-sm">共 {{ total }} 个用户</p>
      </div>
      <nav class="flex gap-2">
        <NuxtLink to="/admin"
                  class="rounded-lg border border-border bg-neutral-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong md:text-sm">
          看板
        </NuxtLink>
        <button type="button"
                class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 md:text-sm"
                @click="openCreate">
          添加用户
        </button>
      </nav>
    </header>

    <!-- 搜索 -->
    <form class="mt-4 flex gap-2" role="search" @submit.prevent="search">
      <input
        v-model="queryDraft"
        type="search"
        placeholder="搜索用户名 / 邮箱 / 昵称"
        class="h-10 flex-1 rounded-md border border-neutral-input bg-neutral-surface px-3 text-sm outline-none focus:border-primary"
        aria-label="搜索用户"
      />
      <button type="submit" class="h-10 rounded-md border border-border bg-neutral-surface px-4 text-sm font-medium hover:border-border-strong">
        搜索
      </button>
    </form>

    <p v-if="pending" class="mt-6 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else>
      <!-- PC：表格 -->
      <div class="mt-4 hidden overflow-hidden rounded-lg border border-border bg-neutral-surface shadow-level-1 md:block">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border bg-surface-tint text-left text-xs text-text-tertiary">
              <th class="px-4 py-2.5 font-medium">用户</th>
              <th class="px-4 py-2.5 font-medium">注册方式</th>
              <th class="px-4 py-2.5 font-medium">数据</th>
              <th class="px-4 py-2.5 font-medium">订阅</th>
              <th class="px-4 py-2.5 font-medium">注册时间</th>
              <th class="px-4 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-b border-border-tint last:border-0 hover:bg-surface-tint/60">
              <td class="px-4 py-3">
                <p class="flex items-center gap-2 font-semibold">
                  <span class="truncate">{{ u.displayName ?? u.username ?? '（未命名）' }}</span>
                  <span v-if="u.isPro" class="shrink-0 rounded-full bg-primary px-2 py-0.5 text-2xs font-semibold text-white">PRO</span>
                </p>
                <p class="mt-0.5 text-xs text-text-tertiary">{{ u.username ?? '（微信用户）' }}<template v-if="u.email"> · {{ u.email }}</template></p>
              </td>
              <td class="px-4 py-3 text-xs text-text-secondary">{{ providerLabel(u.provider) }}</td>
              <td class="px-4 py-3 text-xs text-text-secondary">住所 {{ u.householdCount }} · 物品 {{ u.itemCount }}</td>
              <td class="px-4 py-3 text-xs">
                <span v-if="u.isPro" class="font-medium text-primary-dark">已开通</span>
                <span v-else class="text-text-tertiary">未开通</span>
              </td>
              <td class="px-4 py-3 text-xs text-text-tertiary">{{ u.createdAt.slice(0, 10) }}</td>
              <td class="px-4 py-3 text-right">
                <button type="button" class="rounded-md px-2 py-1 text-xs font-medium text-primary-dark hover:bg-tint" @click="openEdit(u)">详情</button>
                <button type="button" class="ml-1 rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-red-50" @click="askDelete(u)">删除</button>
              </td>
            </tr>
            <tr v-if="!users.length">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-text-tertiary">没有匹配的用户</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 移动端：卡片流 -->
      <ul class="mt-4 flex flex-col gap-2 md:hidden">
        <li v-for="u in users" :key="u.id"
            class="rounded-2xl border border-border bg-neutral-surface p-3.5 shadow-level-1">
          <button type="button" class="w-full text-left" @click="openEdit(u)">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="flex items-center gap-2 truncate text-sm font-bold">
                  {{ u.displayName ?? u.username ?? u.id.slice(0, 8) }}
                  <span v-if="u.isPro" class="shrink-0 rounded-full bg-primary px-2 py-0.5 text-2xs font-semibold text-white">PRO</span>
                </p>
                <p class="mt-0.5 truncate text-xs text-text-tertiary">
                  {{ u.username ?? '（微信用户）' }}<template v-if="u.email"> · {{ u.email }}</template>
                </p>
              </div>
              <div class="shrink-0 text-right text-2xs text-text-secondary">
                <p>住所 {{ u.householdCount }} · 物品 {{ u.itemCount }}</p>
                <p class="mt-0.5 text-text-tertiary">{{ u.createdAt.slice(0, 10) }} · {{ providerLabel(u.provider) }}</p>
              </div>
            </div>
          </button>
          <div class="mt-2.5 flex justify-end gap-2 border-t border-border-tint pt-2.5">
            <button type="button" class="rounded-md bg-tint px-3 py-1.5 text-xs font-semibold text-primary-dark" @click="openEdit(u)">详情 / 编辑</button>
            <button type="button" class="rounded-md border border-error px-3 py-1.5 text-xs font-semibold text-error" @click="askDelete(u)">删除</button>
          </div>
        </li>
        <li v-if="!users.length" class="rounded-2xl border border-border bg-neutral-surface p-6 text-center text-sm text-text-tertiary shadow-level-1">
          没有匹配的用户
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

    <!-- 添加 / 编辑抽屉（PC 右侧 slide-over，移动端全屏） -->
    <Teleport to="body">
      <div v-if="drawer" class="fixed inset-0 z-50 flex justify-end bg-black/30" @click.self="closeDrawer">
        <aside class="flex h-full w-full flex-col overflow-y-auto bg-neutral-bg p-5 shadow-level-2 sm:max-w-md" role="dialog" aria-modal="true" aria-label="用户管理">
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-lg font-bold">{{ drawer.mode === 'create' ? '添加用户' : '用户详情' }}</h2>
            <button type="button" class="rounded-full border border-border bg-neutral-surface px-3 py-1.5 text-xs font-medium"
                    @click="closeDrawer">关闭</button>
          </div>

          <!-- 表单 -->
          <form class="mt-4 flex flex-col gap-3" @submit.prevent="saveDrawer">
            <label class="flex flex-col gap-1 text-xs text-text-secondary">
              昵称
              <input v-model="form.displayName" type="text" maxlength="64"
                     class="h-10 rounded-md border border-neutral-input bg-neutral-surface px-3 text-sm text-text outline-none focus:border-primary" />
            </label>
            <label class="flex flex-col gap-1 text-xs text-text-secondary">
              用户名（2-20 位字母、数字或下划线{{ drawer.mode === 'create' ? '' : '，留空则不修改' }}）
              <input v-model="form.username" type="text" maxlength="20"
                     class="h-10 rounded-md border border-neutral-input bg-neutral-surface px-3 text-sm text-text outline-none focus:border-primary" />
            </label>
            <label class="flex flex-col gap-1 text-xs text-text-secondary">
              {{ drawer.mode === 'create' ? '密码（至少 8 位）' : '重置密码（至少 8 位，留空则不修改）' }}
              <input v-model="form.password" type="text" maxlength="64" autocomplete="new-password"
                     class="h-10 rounded-md border border-neutral-input bg-neutral-surface px-3 text-sm text-text outline-none focus:border-primary" />
            </label>
            <button type="submit" :disabled="acting"
                    class="mt-1 h-10 rounded-md bg-primary text-sm font-semibold text-white hover:brightness-95 disabled:opacity-40">
              {{ acting ? '保存中…' : (drawer.mode === 'create' ? '创建用户' : '保存修改') }}
            </button>
          </form>

          <!-- 编辑模式扩展区 -->
          <template v-if="drawer.mode === 'edit' && detail">
            <!-- 订阅管理 -->
            <section class="mt-5 rounded-lg border border-border bg-neutral-surface p-4">
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
                    class="rounded-lg border border-border bg-neutral-surface p-3 text-xs">
                  <p class="text-sm font-semibold">{{ h.name }}</p>
                  <p class="mt-0.5 text-text-tertiary">
                    {{ h.role === 'owner' ? '创建者' : '成员' }} · 加入于 {{ String(h.joinedAt).slice(0, 10) }}
                  </p>
                </li>
                <li v-if="!detail.households.length" class="rounded-lg border border-border bg-neutral-surface p-3 text-xs text-text-tertiary">暂无住所</li>
              </ul>
            </section>

            <!-- 数据概览 + 危险区 -->
            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-lg border border-border bg-neutral-surface p-3">
                <p class="text-lg font-bold">{{ detail.itemCount }}</p>
                <p class="text-xs text-text-secondary">物品（未删）</p>
              </div>
              <div class="rounded-lg border border-border bg-neutral-surface p-3">
                <p class="text-lg font-bold">{{ detail.photoCount }}</p>
                <p class="text-xs text-text-secondary">照片</p>
              </div>
            </div>
            <button type="button"
                    class="mt-5 rounded-md border border-error py-2.5 text-sm font-semibold text-error hover:bg-red-50 disabled:opacity-40"
                    :disabled="acting"
                    @click="askDelete()">
              删除该用户（级联清除其全部数据）
            </button>
          </template>
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
const dialog = useDialog()
const { toast } = useToast()

const queryDraft = ref('')
const query = ref('')
const users = ref<AdminUserRow[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const pending = ref(true)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

type Drawer = { mode: 'create' } | { mode: 'edit'; userId: string } | null
const drawer = ref<Drawer>(null)
const detail = ref<UserDetail | null>(null)
const acting = ref(false)
const form = ref({ displayName: '', username: '', password: '' })

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

function openCreate() {
  form.value = { displayName: '', username: '', password: '' }
  detail.value = null
  drawer.value = { mode: 'create' }
}

async function openEdit(u: AdminUserRow) {
  detail.value = await apiFetch<UserDetail>(`/api/admin/users/${u.id}`)
  form.value = {
    displayName: detail.value.user.displayName ?? '',
    username: detail.value.user.username ?? '',
    password: '',
  }
  drawer.value = { mode: 'edit', userId: u.id }
}

function closeDrawer() {
  drawer.value = null
}

/** 创建 / 保存（按抽屉模式走不同端点；编辑时空字段不下发） */
async function saveDrawer() {
  if (acting.value || !drawer.value) return
  acting.value = true
  try {
    if (drawer.value.mode === 'create') {
      if (!form.value.username.trim() || form.value.password.length < 8) {
        toast('请填写用户名和至少 8 位的密码')
        return
      }
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: {
          username: form.value.username.trim(),
          password: form.value.password,
          displayName: form.value.displayName.trim() || null,
        },
      })
      toast('用户已创建')
    } else {
      const body: Record<string, unknown> = {}
      if (form.value.displayName.trim() || form.value.displayName === '') body.displayName = form.value.displayName.trim()
      if (form.value.username.trim()) body.username = form.value.username.trim()
      if (form.value.password) body.password = form.value.password
      if (!Object.keys(body).length) {
        toast('没有需要保存的修改')
        return
      }
      await apiFetch(`/api/admin/users/${drawer.value.userId}`, { method: 'PATCH', body })
      toast('已保存')
    }
    closeDrawer()
    await load()
  } catch (e) {
    toast(errMsg(e) || '操作失败')
  } finally {
    acting.value = false
  }
}

async function grantSubscription() {
  if (!drawer.value || drawer.value.mode !== 'edit' || acting.value) return
  acting.value = true
  try {
    await apiFetch(`/api/admin/users/${drawer.value.userId}/subscription`, {
      method: 'POST',
      body: { planType: 'cloud_sync_permanent' },
    })
    detail.value = await apiFetch<UserDetail>(`/api/admin/users/${drawer.value.userId}`)
    toast('已开通')
    await load()
  } catch (e) {
    toast(errMsg(e) || '操作失败')
  } finally {
    acting.value = false
  }
}

async function revokeSubscription() {
  if (!drawer.value || drawer.value.mode !== 'edit') return
  const ok = await dialog.confirmDialog({
    title: '取消该用户的订阅？',
    message: '取消后该用户所在住所的云同步将停用（本地数据不受影响）。',
    confirmText: '取消订阅',
    danger: true,
  })
  if (!ok || acting.value) return
  acting.value = true
  try {
    await apiFetch(`/api/admin/users/${drawer.value.userId}/subscription`, {
      method: 'POST',
      body: { planType: null },
    })
    detail.value = await apiFetch<UserDetail>(`/api/admin/users/${drawer.value.userId}`)
    toast('已取消订阅')
    await load()
  } catch (e) {
    toast(errMsg(e) || '操作失败')
  } finally {
    acting.value = false
  }
}

function askDelete(u?: AdminUserRow) {
  if (drawer.value && drawer.value.mode === 'edit') {
    const d = detail.value
    if (!d) return
    void doDelete(d.user.id, d.user.displayName ?? d.user.username ?? '该用户', d.itemCount)
    return
  }
  if (!u) return
  void doDelete(u.id, u.displayName ?? u.username ?? '该用户', u.itemCount)
}

async function doDelete(userId: string, label: string, itemCount: number) {
  const ok = await dialog.confirmDialog({
    title: `删除用户「${label}」？`,
    message: `将级联删除其创建的住所与全部数据${itemCount ? `（含 ${itemCount} 件物品）` : ''}、订阅和头像，且不可恢复。`,
    confirmText: '永久删除',
    danger: true,
  })
  if (!ok || acting.value) return
  acting.value = true
  try {
    await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    toast('已删除')
    closeDrawer()
    await load()
  } catch (e) {
    toast(errMsg(e) || '删除失败')
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
