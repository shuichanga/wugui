<template>
  <main class="mx-auto max-w-md px-4">
    <header class="relative -mx-4 flex h-12 items-center justify-between bg-primary px-4 text-white">
      <button type="button" class="flex items-center gap-1 text-sm text-white/90 hover:text-white" @click="goBack">
        <ArrowLeft :size="16" aria-hidden="true" />
        <span>返回</span>
      </button>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-lg">关于</h1>
      <span class="w-12" aria-hidden="true"></span>
    </header>

    <!-- 品牌区 -->
    <section class="mt-6 flex flex-col items-center text-center">
      <div class="flex items-center gap-3">
        <img src="/apple-touch-icon.png" alt="物归" class="h-10 w-10 rounded-xl" />
        <h2 class="text-xl font-semibold">物归</h2>
      </div>
      <p class="mt-2 text-sm text-text-tertiary">归位每一件物品</p>
      <p v-if="appVersion" class="mt-1 font-mono text-xs text-text-tertiary">v{{ appVersion }}</p>
    </section>

    <!-- 简介 -->
    <section class="mt-6 rounded-lg border border-border bg-neutral-surface p-4">
      <h2 class="text-sm font-semibold text-text-secondary">关于物归</h2>
      <p class="mt-2 text-sm leading-relaxed text-text-secondary">
        物归是一个家庭物品管理应用。为每一件物品拍照、选定收纳位置，全家人共享同一份清单，
        再也不会"我以为在厨房，你以为是客厅"。
      </p>
    </section>

    <!-- 数据说明 -->
    <section class="mt-4 rounded-lg border border-border bg-neutral-surface p-4">
      <h2 class="text-sm font-semibold text-text-secondary">数据存储</h2>
      <ul class="mt-2 flex flex-col gap-2 text-sm text-text-secondary">
        <li class="flex items-start gap-2">
          <Database :size="16" class="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <span>物品元数据存于 Cloudflare D1</span>
        </li>
        <li class="flex items-start gap-2">
          <ImageIcon :size="16" class="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <span>照片存于 Cloudflare R2</span>
        </li>
        <li class="flex items-start gap-2">
          <ShieldCheck :size="16" class="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
          <span>密码使用 Argon2 加盐散列，仅存哈希</span>
        </li>
      </ul>
      <p class="mt-3 text-xs text-text-tertiary">
        可在"我的"页导出 JSON 或 CSV 作为本地备份。
      </p>
    </section>

    <!-- 开源与反馈 -->
    <section class="mt-4 rounded-lg border border-border bg-neutral-surface p-4">
      <h2 class="text-sm font-semibold text-text-secondary">开源与反馈</h2>
      <p class="mt-2 text-sm text-text-secondary">
        物归是开源项目，欢迎提交问题或参与共建。
      </p>
      <a href="https://github.com/shuichanga/wugui" target="_blank" rel="noopener noreferrer"
         class="mt-3 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-primary/90">
        <Github :size="16" aria-hidden="true" />
        GitHub 仓库
      </a>
    </section>

    <!-- 底部 -->
    <footer class="mt-8 mb-4 text-center">
      <p class="text-xs text-text-tertiary">© {{ year }} 物归 · 用心整理每一个家</p>
      <p class="text-xs text-text-tertiary">make with <a href="https://shuichanga.cn" target="_blank" rel="noopener noreferrer">水常</a></p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { ArrowLeft, Database, Github, Image as ImageIcon, ShieldCheck } from 'lucide-vue-next'

const config = useRuntimeConfig()
const appVersion = config.public.appVersion
const year = new Date().getFullYear()

function goBack() {
  if (window.history.length > 1) history.back()
  else navigateTo('/settings')
}
</script>
