<template>
  <main class="mx-auto max-w-md px-4">
    <header class="relative -mx-4 flex h-12 items-center justify-between bg-primary px-4 text-white">
      <span class="w-12" aria-hidden="true"></span>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-lg">我的</h1>
      <NuxtLink to="/about" class="flex h-full w-12 items-center justify-end text-sm text-white/90 hover:text-white" aria-label="关于">
        关于
      </NuxtLink>
    </header>

    <p v-if="!auth.loaded" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else>
      <!-- 当前用户 -->
      <section class="mt-4 flex items-center gap-3 rounded-lg border border-border bg-neutral-surface p-4">
        <div class="relative shrink-0">
          <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="48" />
          <label class="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-primary text-white ring-2 ring-neutral-bg"
                 title="更换头像">
            <Camera :size="12" aria-hidden="true" />
            <input type="file" accept="image/*" class="hidden" :disabled="avatarUploading" @change="onAvatarPick" />
          </label>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-medium">{{ auth.user?.displayName ?? '未设置昵称' }}</p>
          <p class="truncate text-sm text-text-secondary">{{ auth.user?.email }}</p>
        </div>
        <button v-if="auth.user?.avatarUrl" type="button" class="shrink-0 text-xs text-error"
                :disabled="avatarUploading" @click="removeAvatar">移除头像</button>
      </section>

      <!-- 我的住所 -->
      <section class="mt-6" aria-label="我的住所">
        <h2 class="text-sm font-semibold text-text-secondary">我的住所</h2>

        <p v-if="!auth.households.length"
           class="mt-2 rounded-lg border border-border bg-neutral-surface p-3 text-sm text-text-secondary">
          你还没有加入任何住所：创建一个自己的住所，或输入家人分享给你的邀请码加入。
        </p>

        <ul v-else class="mt-2 flex flex-col gap-2">
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

            <!-- 住所管理操作 -->
            <div class="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
              <template v-if="h.role === 'owner'">
                <button type="button" class="text-xs text-primary" @click="startRename(h)">改名</button>
                <button type="button" class="text-xs text-primary" @click="resetInvite(h)">重置邀请码</button>
                <button type="button" class="text-xs text-primary" @click="toggleMembers(h)">
                  {{ expandedId === h.id ? '收起成员' : '管理成员' }}
                </button>
              </template>
              <button v-else type="button" class="text-xs text-error" @click="leaveHousehold(h)">退出该住所</button>
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
            创建新住所
          </button>
          <button type="button" class="btn-secondary flex-1 px-2 py-2 text-sm" @click="showJoin = !showJoin">
            加入住所
          </button>
        </div>

        <form v-if="showCreate" class="mt-2 flex gap-2" @submit.prevent="createHousehold">
          <input v-model="createName" type="text" class="input-base flex-1" placeholder="新住所名称" maxlength="20" required />
          <button type="submit" class="btn-primary px-3 py-1 text-sm">创建</button>
        </form>
        <form v-if="showJoin" class="mt-2 flex gap-2" @submit.prevent="joinHousehold">
          <input v-model="joinCode" type="text" class="input-base flex-1 uppercase" placeholder="输入 6 位邀请码" maxlength="6" required />
          <button type="submit" class="btn-primary px-3 py-1 text-sm">加入</button>
        </form>
      </section>

      <!-- 数据导入 / 导出 -->
      <section v-if="auth.households.length" class="mt-6" aria-label="数据导入导出">
        <h2 class="text-sm font-semibold text-text-secondary">数据备份</h2>
        <div class="mt-2 rounded-lg border border-border bg-neutral-surface p-3">
          <p class="text-xs text-text-tertiary">导出当前住所的全部空间和物品（含标签），JSON 适合备份，CSV 可用表格软件打开。</p>
          <div class="mt-2 flex gap-2">
            <button type="button" class="btn-secondary flex-1 px-2 py-2 text-sm" :disabled="exporting !== ''" @click="exportData('json')">
              {{ exporting === 'json' ? '导出中…' : '导出 JSON' }}
            </button>
            <button type="button" class="btn-secondary flex-1 px-2 py-2 text-sm" :disabled="exporting !== ''" @click="exportData('csv')">
              {{ exporting === 'csv' ? '导出中…' : '导出 CSV' }}
            </button>
          </div>
          <label class="btn-secondary mt-2 block w-full cursor-pointer px-2 py-2 text-center text-sm"
                 :class="importing ? 'pointer-events-none opacity-60' : ''">
            {{ importing ? '导入中…' : '合并导入备份（JSON）' }}
            <input type="file" accept=".json,application/json" class="hidden" :disabled="importing" @change="onImportPick" />
          </label>
          <p class="mt-1.5 text-xs text-text-tertiary">合并导入：缺失的空间和物品会新增，已存在的物品跳过，不删除任何现有数据。</p>
        </div>
      </section>

      <!-- 退出登录 -->
      <div class="mt-8 mb-4">
        <button type="button" class="w-full rounded-lg border border-border py-3 text-sm font-semibold text-error"
                @click="onLogout">
          退出登录
        </button>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { Camera } from 'lucide-vue-next'
import { compressImage } from '~/composables/useImageCompress'

const auth = useAuthStore()
const { confirmDialog, alertDialog } = useDialog()
const { toast } = useToast()
const avatarUploading = ref(false)

// 更换头像：前端压缩到 256px，multipart 上传
async function onAvatarPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  avatarUploading.value = true
  try {
    const compressed = await compressImage(file, 256, 0.85)
    const fd = new FormData()
    fd.append('file', compressed)
    await apiFetch('/api/me/avatar', { method: 'POST', body: fd })
    await auth.fetchMe()
    flash('头像已更新')
  } catch (err: unknown) {
    flash(errMsg(err) || '头像更新失败')
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar() {
  if (!(await confirmDialog({ title: '移除头像', message: '确定移除头像？将恢复为默认头像。', danger: true }))) return
  avatarUploading.value = true
  try {
    await apiFetch('/api/me/avatar', { method: 'DELETE' })
    await auth.fetchMe()
    flash('头像已移除')
  } catch (err: unknown) {
    flash(errMsg(err) || '移除失败')
  } finally {
    avatarUploading.value = false
  }
}

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
  toast(text)
}

async function onLogout() {
  if (!(await confirmDialog({
    title: '退出登录',
    message: '确定退出当前账号？',
    confirmText: '退出',
    danger: true,
  }))) return
  await auth.logout()
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
    flash(errMsg(e) || '改名失败')
  }
}

async function resetInvite(h: { id: string }) {
  if (!(await confirmDialog({
    title: '重置邀请码',
    message: '重置后旧邀请码将失效',
    confirmText: '重置',
  }))) return
  try {
    await apiFetch(`/api/households/${h.id}/invite/reset`, { method: 'POST' })
    await auth.fetchMe()
    flash('邀请码已重置')
  } catch (e: unknown) {
    flash(errMsg(e) || '重置失败')
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
  if (!(await confirmDialog({
    title: '移除成员',
    message: `确定移除 ${m.displayName ?? '该成员'}？`,
    confirmText: '移除',
    danger: true,
  }))) return
  try {
    await apiFetch(`/api/households/${h.id}/members/${m.userId}`, { method: 'DELETE' })
    members.value = members.value.filter(x => x.userId !== m.userId)
    flash('已移除')
  } catch (e: unknown) {
    flash(errMsg(e) || '移除失败')
  }
}

async function leaveHousehold(h: { id: string; name: string }) {
  if (!(await confirmDialog({
    title: '退出住所',
    message: `确定退出「${h.name}」？`,
    confirmText: '退出',
    danger: true,
  }))) return
  try {
    await apiFetch(`/api/households/${h.id}/members/me`, { method: 'DELETE' })
    await auth.fetchMe()
    flash('已退出')
  } catch (e: unknown) {
    flash(errMsg(e) || '退出失败')
  }
}

async function createHousehold() {
  try {
    await apiFetch('/api/households', { method: 'POST', body: { name: createName.value } })
    showCreate.value = false
    createName.value = ''
    await auth.fetchMe()
    await navigateTo('/')
  } catch (e: unknown) {
    flash(errMsg(e) || '创建失败')
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
    await navigateTo('/')
  } catch (e: unknown) {
    flash(errMsg(e) || '加入失败')
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

// ---- 数据导出 ----
interface ExportData {
  household: { id: string; name: string; exportedAt: string }
  locations: { id: string; parentId: string | null; level: string; name: string; path: string }[]
  items: {
    name: string; quantity: number; notes: string | null; tags: string[]
    locationPath: string; ownerName: string; createdAt: string; updatedAt: string
  }[]
}

const exporting = ref<'' | 'json' | 'csv'>('')

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // 延迟释放：同步 revoke 在部分移动端浏览器会导致下载静默失败
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function toCsv(data: ExportData): string {
  const header = ['物品名称', '数量', '标签', '收纳空间', '录入人', '备注', '创建时间', '更新时间']
  const rows = data.items.map(it => [
    it.name,
    String(it.quantity),
    it.tags.join('、'),
    it.locationPath,
    it.ownerName,
    it.notes ?? '',
    it.createdAt,
    it.updatedAt,
  ].map(csvCell).join(','))
  // BOM 让 Excel 正确识别 UTF-8 中文
  return `\uFEFF${[header.map(csvCell).join(','), ...rows].join('\r\n')}`
}

async function exportData(format: 'json' | 'csv') {
  exporting.value = format
  try {
    const data = await apiFetch<ExportData>('/api/export')
    const stamp = data.household.exportedAt.slice(0, 10)
    const safeName = data.household.name.replace(/[\\/:*?"<>|]/g, '_')
    if (format === 'json') {
      downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        `物归-${safeName}-${stamp}.json`,
      )
    } else {
      downloadBlob(new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8' }), `物归-${safeName}-${stamp}.csv`)
    }
    flash(`已导出 ${data.items.length} 件物品`)
  } catch (e: unknown) {
    flash(errMsg(e) || '导出失败')
  } finally {
    exporting.value = ''
  }
}

// ---- 合并导入 ----
const importing = ref(false)

async function onImportPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  let data: { household?: { name?: string }; locations?: unknown[]; items?: unknown[] }
  try {
    data = JSON.parse(await file.text())
  } catch {
    flash('文件不是有效的 JSON')
    return
  }
  const locCount = Array.isArray(data.locations) ? data.locations.length : 0
  const itemCount = Array.isArray(data.items) ? data.items.length : 0
  if (!locCount && !itemCount) {
    flash('文件中没有可导入的数据')
    return
  }

  if (!(await confirmDialog({
    title: '合并导入',
    message: `从「${data.household?.name ?? file.name}」导入 ${locCount} 个空间、${itemCount} 件物品？已存在的物品将跳过，不会删除现有数据。`,
    confirmText: '导入',
  }))) return

  importing.value = true
  try {
    const res = await apiFetch<{ createdLocations: number; createdItems: number; skippedItems: number }>(
      '/api/import',
      { method: 'POST', body: data },
    )
    flash(`导入完成：新增 ${res.createdLocations} 个空间、${res.createdItems} 件物品，跳过 ${res.skippedItems} 件`)
    refreshNuxtData('rooms-dashboard')
    refreshNuxtData('recent-items')
  } catch (err: unknown) {
    flash(errMsg(err) || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>
