<template>
  <main class="mx-auto max-w-md px-4 pb-6">
    <AppTopbar title="关于" fallback="/settings" />

    <!-- 品牌区：logo + 版本药丸 + 标语 + 三绿点收尾 -->
    <section class="flex flex-col items-center pt-7 text-center" aria-label="品牌">
      <img src="/apple-touch-icon.png" alt="物归" class="h-[78px] w-[78px] rounded-[24px] shadow-primary" />
      <h2 class="mt-3.5 text-[22px] font-extrabold tracking-widest">物归</h2>
      <p class="mt-1 text-xs tracking-[0.35em] text-text-tertiary">归位每一件物品</p>
      <div class="mt-3 flex gap-1.5" aria-hidden="true">
        <i class="h-1.5 w-1.5 rounded-full bg-primary" />
        <i class="h-1.5 w-1.5 rounded-full bg-primary opacity-55" />
        <i class="h-1.5 w-1.5 rounded-full bg-primary opacity-30" />
      </div>
    </section>

    <!-- 简介 -->
    <section class="mt-6" aria-label="关于物归">
      <SectionTitle title="关于物归">
        <template #aux>
          <span class="rounded-full bg-tint px-2 py-0.5 text-2xs font-semibold text-primary-dark">v{{ appVersion }}</span>
        </template>
      </SectionTitle>
      <div class="mt-3 rounded-2xl border border-border bg-neutral-surface px-3.5 py-3 shadow-level-1">
        <p class="text-sm leading-relaxed text-text-secondary">
          物归是一个开源的家庭物品管理应用，帮你把家里的东西「放得明确、找得回来」。
          多住所、房间—家具—格子三级定位，全家人一起维护。
        </p>
      </div>
    </section>

    <!-- 数据与安全 -->
    <section class="mt-6" aria-label="数据与安全">
      <SectionTitle title="数据与安全" />
      <div class="mt-3 overflow-hidden rounded-2xl border border-border bg-neutral-surface shadow-level-1">
        <div class="flex items-center gap-3 px-3.5 py-3">
          <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-tint text-primary">
            <Database :size="16" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">数据存储</span>
            <small class="mt-0.5 block text-2xs text-text-tertiary">物品存于 Cloudflare D1 · 照片存于 R2</small>
          </span>
        </div>
        <div class="flex items-center gap-3 border-t border-border px-3.5 py-3">
          <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-tint text-primary">
            <ShieldCheck :size="16" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">密码加密</span>
            <small class="mt-0.5 block text-2xs text-text-tertiary">Argon2id 加盐散列，仅存哈希</small>
          </span>
        </div>
      </div>
      <p class="mt-2 px-1 text-2xs text-text-tertiary">可在"我的"页导出 JSON 或 CSV 作为本地备份。</p>
    </section>

    <!-- 项目 -->
    <section class="mt-6" aria-label="项目">
      <SectionTitle title="项目" />
      <a href="https://github.com/shuichanga/wugui" target="_blank" rel="noopener noreferrer"
         class="mt-3 flex h-[46px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-border-strong bg-neutral-surface text-sm font-semibold text-text-primary shadow-level-1 hover:bg-neutral-sunken">
        <Github :size="17" aria-hidden="true" />
        开源仓库 · GitHub
      </a>
    </section>

    <footer class="mt-8 pb-2 text-center">
      <p class="text-2xs tracking-wide text-text-disabled">
        © {{ year }} 物归 · 用心整理每一个家 by <span class="font-semibold text-primary-dark">水常</span>
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { Database, Github, ShieldCheck } from 'lucide-vue-next'

const config = useRuntimeConfig()
const appVersion = config.public.appVersion
const year = new Date().getFullYear()
</script>
