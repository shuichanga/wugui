<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <header class="flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-1 text-sm text-text-secondary" aria-label="返回首页">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>首页</span>
      </NuxtLink>
      <h1 class="text-lg">设置</h1>
      <span class="w-12" aria-hidden="true"></span>
    </header>

    <p v-if="!auth.loaded" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else>
      <!-- 当前用户 -->
      <section class="mt-4 flex items-center gap-3 rounded-lg border border-border bg-neutral-surface p-4">
        <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :size="48" />
        <div class="min-w-0">
          <p class="truncate text-base font-medium">{{ auth.user?.displayName ?? '未设置昵称' }}</p>
          <p class="truncate text-sm text-text-secondary">{{ auth.user?.email }}</p>
        </div>
      </section>

      <!-- 我的家庭 -->
      <section class="mt-6" aria-label="我的家庭">
        <h2 class="text-sm font-semibold text-text-secondary">我的家庭</h2>

        <ul class="mt-2 flex flex-col gap-2">
          <li v-for="h in auth.households" :key="h.id"
              class="rounded-lg border border-border bg-neutral-surface p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="flex items-center gap-2 truncate text-sm font-medium">
                  {{ h.name }}
                  <span v-if="h.id === auth.currentHouseholdId"
                        class="shrink-0 rounded bg-primary px-1.5 py-0.5 text-xs text-white">当前</span>
                  <span v-else-if="h.role === 'owner'"
                        class="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-text-tertiary">我创建的</span>
                </p>
                <p v-if="h.role === 'owner' && h.inviteCode" class="mt-0.5 text-xs text-text-tertiary">
                  邀请码
                  <button type="button" class="font-mono text-text-secondary underline decoration-dotted"
                          title="点击复制" @click="copyCode(h.inviteCode!)">{{ h.inviteCode }}</button>
                </p>
              </div>
              <button v-if="h.id !== auth.currentHouseholdId" type="button"
                      class="shrink-0 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                      @click="switchTo(h.id)">
                切换
              </button>
            </div>

            <!-- 家庭管理操作 -->
            <div class="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
              <template v-if="h.role === 'owner'">
                <button type="button" class="text-xs text-primary" @click="startRename(h)">改名</button>
                <button type="button" class="text-xs text-primary" @click="resetInvite(h)">重置邀请码</button>
                <button type="button" class="text-xs text-primary" @click="toggleMembers(h)">
                  {{ expandedId === h.id ? '收起成员' : '管理成员' }}
                </button>
              </template>
              <button v-else type="button" class="text-xs text-error" @click="leaveHousehold(h)">退出该家庭</button>
            </div>

            <!-- 改名表单 -->
            <form v-if="renamingId === h.id" class="mt-2 flex gap-2"
                  @submit.prevent="submitRename(h)">
              <input v-model="renameDraft" type="text" class="input-base flex-1" maxlength="20" required />
              <button type="submit" class="btn-primary px-3 py-1 text-xs">保存</button>
              <button type="button" class="btn-secondary px-3 py-1 text-xs" @click="renamingId = ''">取消</button>
            </form>

            <!-- 成员列表 -->
            <ul v-if="expandedId === h.id" class="mt-2 flex flex-col gap-1">
              <li v-if="membersPending" class="text-xs text-text-tertiary">加载中…</li>
              <li v-for="m in members" :key="m.userId"
                  class="flex items-center justify-between rounded-md bg-neutral-sunken px-2 py-1.5 text-xs">
                <span class="truncate">
                  {{ m.displayName ?? m.email.split('@')[0] }}
                  <span class="text-text-tertiary">（{{ m.role === 'owner' ? '创建者' : '成员' }}）</span>
                </span>
                <button v-if="m.role === 'member'" type="button" class="shrink-0 text-error"
                        aria-label="移除成员" @click="kickMember(h, m)">
                  移除
                </button>
              </li>
            </ul>
          </li>
        </ul>

        <!-- 创建 / 加入 -->
        <div class="mt-3 flex gap-2">
          <button type="button" class="btn-secondary flex-1 px-2 py-2 text-sm" @click="showCreate = !showCreate">
            创建新家庭
          </button>
          <button type="button" class="btn-secondary flex-1 px-2 py-2 text-sm" @click="showJoin = !showJoin">
            加入家庭
          </button>
        </div>

        <form v-if="showCreate" class="mt-2 flex gap-2" @submit.prevent="createHousehold">
          <input v-model="createName" type="text" class="input-base flex-1" placeholder="新家庭名称" maxlength="20" required />
          <button type="submit" class="btn-primary px-3 py-1 text-sm">创建</button>
        </form>
        <form v-if="showJoin" class="mt-2 flex gap-2" @submit.prevent="joinHousehold">
          <input v-model="joinCode" type="text" class="input-base flex-1 uppercase" placeholder="输入 6 位邀请码" maxlength="6" required />
          <button type="submit" class="btn-primary px-3 py-1 text-sm">加入</button>
        </form>
      </section>

      <!-- 消息 -->
      <p v-if="msg" class="mt-4 rounded-md border border-border bg-neutral-surface p-3 text-sm text-success" role="status">
        {{ msg }}
      </p>

      <!-- 退出登录 -->
      <div class="mt-8 mb-4">
        <button type="button" class="w-full rounded-lg border border-border py-3 text-sm font-semibold text-error"
                @click="auth.logout()">
          退出登录
        </button>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

const auth = useAuthStore()
const msg = ref('')

const showCreate = ref(false)
const createName = ref('')
const showJoin = ref(false)
const joinCode = ref('')

const renamingId = ref('')
const renameDraft = ref('')
const expandedId = ref('')
const members = ref<{ userId: string; role: string; email: string; displayName: string | null }[]>([])
const membersPending = ref(false)

function flash(text: string) {
  msg.value = text
  setTimeout(() => { msg.value = '' }, 3000)
}

onMounted(() => {
  if (!auth.loaded) auth.fetchMe()
})

async function switchTo(id: string) {
  await auth.switchTo(id)
  await navigateTo('/')
}

function startRename(h: { id: string; name: string }) {
  renamingId.value = h.id
  renameDraft.value = h.name
}

async function submitRename(h: { id: string }) {
  try {
    await apiFetch(`/api/households/${h.id}`, { method: 'PATCH', body: { name: renameDraft.value } })
    renamingId.value = ''
    await auth.fetchMe()
    flash('已改名')
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '改名失败')
  }
}

async function resetInvite(h: { id: string }) {
  if (!confirm('重置后旧邀请码将失效，确定？')) return
  try {
    await apiFetch(`/api/households/${h.id}/invite/reset`, { method: 'POST' })
    await auth.fetchMe()
    flash('邀请码已重置')
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '重置失败')
  }
}

async function toggleMembers(h: { id: string }) {
  if (expandedId.value === h.id) {
    expandedId.value = ''
    return
  }
  expandedId.value = h.id
  membersPending.value = true
  try {
    members.value = await apiFetch(`/api/households/${h.id}/members`)
  } finally {
    membersPending.value = false
  }
}

async function kickMember(h: { id: string }, m: { userId: string; displayName?: string | null }) {
  if (!confirm(`确定移除 ${m.displayName ?? '该成员'}？`)) return
  try {
    await apiFetch(`/api/households/${h.id}/members/${m.userId}`, { method: 'DELETE' })
    members.value = members.value.filter(x => x.userId !== m.userId)
    flash('已移除')
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '移除失败')
  }
}

async function leaveHousehold(h: { id: string; name: string }) {
  if (!confirm(`确定退出「${h.name}」？`)) return
  try {
    await apiFetch(`/api/households/${h.id}/members/me`, { method: 'DELETE' })
    await auth.fetchMe()
    flash('已退出')
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '退出失败')
  }
}

async function createHousehold() {
  try {
    await apiFetch('/api/households', { method: 'POST', body: { name: createName.value } })
    showCreate.value = false
    createName.value = ''
    await auth.fetchMe()
    flash('已创建并切换到新家庭')
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '创建失败')
  }
}

async function joinHousehold() {
  try {
    const res = await apiFetch<{ name: string }>('/api/households/join', {
      method: 'POST',
      body: { inviteCode: joinCode.value },
    })
    showJoin.value = false
    joinCode.value = ''
    await auth.fetchMe()
    flash(`已加入「${res.name}」`)
  } catch (e: unknown) {
    flash((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '加入失败')
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    flash('邀请码已复制')
  } catch {
    flash(`复制失败，邀请码：${code}`)
  }
}
</script>
