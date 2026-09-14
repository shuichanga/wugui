<template>
  <main class="mx-auto max-w-md px-4">
    <AppTopbar title="我的" fallback="/">
      <template #right>
        <NuxtLink to="/about" class="text-sm font-medium text-primary-dark hover:text-primary" aria-label="关于">
          关于
        </NuxtLink>
      </template>
    </AppTopbar>

    <p v-if="!auth.loaded" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>

    <template v-else>
      <!-- 当前用户 -->
      <section class="mt-4 flex items-center gap-3.5 rounded-2xl border border-border bg-neutral-surface p-3.5 shadow-level-1">
        <div class="relative shrink-0">
          <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="56" />
          <label class="absolute -bottom-1 -right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-primary text-white ring-2 ring-neutral-bg"
                 title="更换头像">
            <Camera :size="12" aria-hidden="true" />
            <input type="file" accept="image/*" class="hidden" :disabled="avatarUploading" @change="onAvatarPick" />
          </label>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[17px] font-bold">{{ auth.user?.displayName ?? '未设置昵称' }}</p>
          <p class="mt-1 truncate text-xs text-text-tertiary">{{ auth.user?.email }}</p>
        </div>
        <button v-if="auth.user?.avatarUrl" type="button"
                class="shrink-0 rounded-full bg-tint px-3 py-1.5 text-xs font-semibold text-primary-dark"
                :disabled="avatarUploading" @click="removeAvatar">
          移除头像
        </button>
      </section>

      <!-- 我的住所 -->
      <section class="mt-6" aria-label="我的住所">
        <SectionTitle title="我的住所">
          <template #aux>{{ auth.households.length }} 个</template>
        </SectionTitle>

        <p v-if="!auth.households.length"
           class="mt-3 rounded-2xl border border-border bg-neutral-surface p-3.5 text-sm text-text-secondary shadow-level-1">
          你还没有加入任何住所：创建一个自己的住所，或输入家人分享给你的邀请码加入。
        </p>

        <ul v-else class="mt-3 flex flex-col gap-2">
          <li v-for="h in auth.households" :key="h.id"
              class="rounded-2xl border border-border bg-neutral-surface p-3.5 shadow-level-1">
            <div class="flex items-center justify-between gap-2">
              <p class="flex min-w-0 items-center gap-2 text-sm font-bold">
                <span class="truncate">{{ h.name }}</span>
                <span v-if="h.id === auth.currentHouseholdId"
                      class="shrink-0 rounded-full bg-tint px-2 py-0.5 text-2xs font-semibold text-primary-dark">当前</span>
                <span v-else-if="h.role === 'owner'"
                      class="shrink-0 rounded-full border border-border px-2 py-0.5 text-2xs font-normal text-text-tertiary">我创建的</span>
              </p>
              <button v-if="h.id !== auth.currentHouseholdId" type="button"
                      class="shrink-0 rounded-full bg-tint px-3 py-1.5 text-xs font-semibold text-primary-dark"
                      @click="switchTo(h.id)">
                切换
              </button>
            </div>

            <!-- 邀请码行 -->
            <div v-if="h.role === 'owner' && h.inviteCode"
                 class="mt-2.5 flex items-center gap-2 rounded-md border border-border-tint bg-surface-tint px-2.5 py-2">
              <span class="shrink-0 text-2xs text-text-tertiary">邀请码</span>
              <button type="button" class="truncate font-mono text-sm font-bold tracking-widest"
                      title="点击复制" @click="copyCode(h.inviteCode!)">{{ h.inviteCode }}</button>
              <Copy :size="14" class="ml-auto shrink-0 text-text-tertiary" aria-hidden="true" />
            </div>

            <!-- 住所管理链接行 -->
            <div class="mt-2.5 flex items-center gap-1.5 text-xs">
              <template v-if="h.role === 'owner'">
                <button type="button" class="font-medium text-primary-dark hover:text-primary" @click="toggleMembers(h)">
                  {{ expandedId === h.id ? '收起成员' : '管理成员' }}
                </button>
                <span class="text-border-strong">·</span>
                <button type="button" class="font-medium text-primary-dark hover:text-primary" @click="startRename(h)">改名</button>
                <span class="text-border-strong">·</span>
                <button type="button" class="font-medium text-primary-dark hover:text-primary" @click="resetInvite(h)">重置邀请码</button>
              </template>
              <button v-else type="button" class="font-medium text-error" @click="leaveHousehold(h)">退出该住所</button>
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
        <div class="mt-3 flex gap-2.5">
          <button type="button" class="btn-secondary flex-1 px-2 py-2.5 text-sm" @click="showCreate = !showCreate">
            创建住所
          </button>
          <button type="button" class="btn-secondary flex-1 px-2 py-2.5 text-sm" @click="showJoin = !showJoin">
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

      <!-- 外观偏好 -->
      <section class="mt-6" aria-label="外观偏好">
        <h2 class="text-sm font-semibold text-text-secondary">外观偏好</h2>
        <div class="mt-2 flex items-center justify-between rounded-lg border border-border bg-neutral-surface p-3">
          <div>
            <p class="text-sm font-medium">空间看板背景</p>
            <p class="mt-0.5 text-xs text-text-tertiary">房间卡的配色风格</p>
          </div>
          <div class="flex rounded-lg bg-neutral-sunken p-1" role="group" aria-label="看板背景风格">
            <button type="button"
                    class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                    :class="boardStyle === 'clean' ? 'bg-neutral-surface text-primary shadow-level-1' : 'text-text-secondary'"
                    :aria-pressed="boardStyle === 'clean'"
                    @click="setBoardStyle('clean')">
              简洁
            </button>
            <button type="button"
                    class="rounded-md px-3 py-1 text-xs font-medium transition-colors"
                    :class="boardStyle === 'colorful' ? 'bg-neutral-surface text-primary shadow-level-1' : 'text-text-secondary'"
                    :aria-pressed="boardStyle === 'colorful'"
                    @click="setBoardStyle('colorful')">
              彩色
            </button>
          </div>
        </div>

        <!-- 主题配色：每张卡 = 该主题微缩首页预览（问候语/住所取真实数据，房间名为示意） -->
        <div class="mt-2 rounded-lg border border-border bg-neutral-surface p-3">
          <p class="text-sm font-medium">主题配色</p>
          <p class="mt-0.5 text-xs text-text-tertiary">整体界面的配色方案</p>
          <div class="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="主题配色">
            <button v-for="t in THEME_OPTIONS" :key="t.id" type="button"
                    class="rounded-lg border p-2 transition-colors"
                    :class="theme === t.id ? 'border-primary bg-tint' : 'border-border bg-neutral-surface hover:bg-neutral-sunken/60'"
                    :aria-pressed="theme === t.id"
                    @click="setTheme(t.id)">
              <span class="block rounded-md p-2" :style="{ backgroundColor: t.bg, color: t.ink, fontFamily: t.font }">
                <span class="block truncate text-xs font-bold leading-tight">{{ greeting }}</span>
                <span class="mt-0.5 block truncate text-2xs opacity-60">
                  {{ hydrated ? `${today} · ${auth.currentHousehold?.name ?? ''}` : '\u00A0' }}
                </span>
                <span class="mt-2 flex flex-col gap-1 rounded-md border p-1.5"
                      :style="{ backgroundColor: t.surface, borderColor: t.border }">
                  <span class="flex items-center gap-1">
                    <span class="h-3 w-3 shrink-0 rounded" :style="{ backgroundColor: t.tint }" />
                    <span class="min-w-0 flex-1 truncate text-2xs font-semibold">客厅</span>
                    <span class="shrink-0 text-2xs opacity-55">2件</span>
                  </span>
                  <span class="h-0.5 overflow-hidden rounded-full" :style="{ backgroundColor: t.track }">
                    <span class="block h-full w-2/5 rounded-full" :style="{ backgroundColor: t.signal }" />
                  </span>
                  <span class="flex items-center gap-1">
                    <span class="h-3 w-3 shrink-0 rounded" :style="{ backgroundColor: t.tint }" />
                    <span class="min-w-0 flex-1 truncate text-2xs font-semibold">主卧</span>
                    <span class="shrink-0 text-2xs opacity-55">空</span>
                  </span>
                </span>
                <span class="mt-2 flex h-5 items-center justify-center rounded-md text-2xs font-semibold text-white"
                      :style="{ backgroundColor: t.primary }">
                  ＋ 添加物品
                </span>
              </span>
              <span class="mt-2 flex items-center justify-center gap-1 text-xs font-medium"
                    :class="theme === t.id ? 'text-primary' : 'text-text-secondary'">
                <span v-if="theme === t.id" class="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                  <Check :size="10" :stroke-width="3" aria-hidden="true" />
                </span>
                {{ t.label }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- 数据备份 -->
      <section v-if="auth.households.length" class="mt-6" aria-label="数据备份">
        <SectionTitle title="数据备份" />
        <div class="mt-3 overflow-hidden rounded-2xl border border-border bg-neutral-surface shadow-level-1">
          <button type="button"
                  class="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-neutral-sunken/50"
                  :disabled="exporting !== ''" @click="exportData('json')">
            <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-tint text-primary">
              <Code2 :size="16" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">导出 JSON 备份</span>
              <small class="mt-0.5 block text-2xs text-text-tertiary">完整数据，用于迁移或恢复</small>
            </span>
            <ChevronRight :size="16" class="shrink-0 text-text-disabled" aria-hidden="true" />
          </button>
          <button type="button"
                  class="flex w-full items-center gap-3 border-t border-border px-3.5 py-3 text-left transition-colors hover:bg-neutral-sunken/50"
                  :disabled="exporting !== ''" @click="exportData('csv')">
            <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-info-soft text-info">
              <Table :size="16" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">导出 CSV 表格</span>
              <small class="mt-0.5 block text-2xs text-text-tertiary">适合在表格软件中查看</small>
            </span>
            <ChevronRight :size="16" class="shrink-0 text-text-disabled" aria-hidden="true" />
          </button>
          <label class="flex w-full cursor-pointer items-center gap-3 border-t border-border px-3.5 py-3 transition-colors hover:bg-neutral-sunken/50"
                 :class="importing ? 'pointer-events-none opacity-60' : ''">
            <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-warning-soft text-warning">
              <Upload :size="16" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{{ importing ? '导入中…' : '合并导入' }}</span>
              <small class="mt-0.5 block text-2xs text-text-tertiary">缺失的新增，已存在的跳过</small>
            </span>
            <ChevronRight :size="16" class="shrink-0 text-text-disabled" aria-hidden="true" />
            <input type="file" accept=".json,application/json" class="hidden" :disabled="importing" @change="onImportPick" />
          </label>
        </div>
      </section>

      <!-- 退出登录 -->
      <div class="mt-8 mb-4">
        <button type="button"
                class="w-full rounded-xl border border-border bg-neutral-surface py-3 text-sm font-semibold text-error shadow-level-1"
                @click="onLogout">
          退出登录
        </button>
        <p class="mt-6 text-center text-2xs tracking-wide text-text-disabled">物归 v{{ appVersion }} · 开源项目</p>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { Camera, Check, ChevronRight, Code2, Copy, Table, Upload } from 'lucide-vue-next'
import { compressImage } from '~/composables/useImageCompress'
import type { ThemeId } from '~/composables/usePreferences'

const auth = useAuthStore()
const { confirmDialog, alertDialog } = useDialog()
const { toast } = useToast()
const { theme, setTheme, boardStyle, setBoardStyle } = usePreferences()
const { greeting, today } = useGreeting()
const hydrated = useHydrated()

// 主题缩略卡：微缩首页预览用各主题真实色值/字体栈内联渲染（内容示意，非组件样式 token；字体随卡所属主题而非当前激活主题）
const THEME_OPTIONS: { id: ThemeId; label: string; bg: string; ink: string; surface: string; border: string; tint: string; track: string; signal: string; primary: string; font: string }[] = [
  {
    id: 'oasis', label: '清新绿洲', bg: '#f3f6f2', ink: '#182720', surface: '#ffffff', border: '#e4eae5', tint: '#e3f3ea', track: '#eaf0ea', signal: '#16a34a', primary: '#16a34a',
    font: `'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif`,
  },
  {
    id: 'timber', label: '暖木收纳', bg: '#f6f1e7', ink: '#3d3527', surface: '#fffdf8', border: '#eae1cd', tint: '#f0e7d4', track: '#efe6d2', signal: '#33604a', primary: '#33604a',
    font: `'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', serif`,
  },
  {
    id: 'inkstone', label: '现代墨石', bg: '#f2f2f0', ink: '#17191b', surface: '#ffffff', border: '#e6e6e3', tint: '#f2f2f0', track: '#ededea', signal: '#0e9f6e', primary: '#17191b',
    font: `'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif`,
  },
]
const appVersion = useRuntimeConfig().public.appVersion
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
    flash(errMsg(err) || '头像更新失败', 'error')
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
    flash(errMsg(err) || '移除失败', 'error')
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

function flash(text: string, type: 'success' | 'error' = 'success') {
  toast(text, type)
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
    flash(errMsg(e) || '改名失败', 'error')
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
    flash(errMsg(e) || '重置失败', 'error')
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
    flash(errMsg(e) || '移除失败', 'error')
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
    flash(errMsg(e) || '退出失败', 'error')
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
    flash(errMsg(e) || '创建失败', 'error')
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
    flash(errMsg(e) || '加入失败', 'error')
  }
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    flash('邀请码已复制')
  } catch {
    flash(`复制失败，邀请码：${code}`, 'error')
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
    flash(errMsg(e) || '导出失败', 'error')
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
    flash('文件不是有效的 JSON', 'error')
    return
  }
  const locCount = Array.isArray(data.locations) ? data.locations.length : 0
  const itemCount = Array.isArray(data.items) ? data.items.length : 0
  if (!locCount && !itemCount) {
    flash('文件中没有可导入的数据', 'error')
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
    flash(errMsg(err) || '导入失败', 'error')
  } finally {
    importing.value = false
  }
}
</script>
