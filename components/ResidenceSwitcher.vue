<template>
  <div class="relative">
    <button type="button" class="flex items-center gap-1 text-sm text-text-secondary"
            aria-label="切换住所" :aria-expanded="open"
            @click="open = !open">
      <Home :size="16" aria-hidden="true" />
      <span class="max-w-32 truncate">{{ auth.currentHousehold?.name ?? '…' }}</span>
      <ChevronDown :size="16" class="transition-transform" :class="{ 'rotate-180': open }" aria-hidden="true" />
    </button>

    <!-- 点击空白处关闭 -->
    <div v-if="open" class="fixed inset-0 z-20" @click="open = false" />

    <div v-if="open"
         class="absolute left-0 top-9 z-30 w-56 rounded-lg border border-border bg-neutral-surface p-1.5 shadow-level-2">
      <p class="px-2 py-1 text-xs text-text-tertiary">切换住所</p>
      <button v-for="h in auth.households" :key="h.id" type="button"
              class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-neutral-sunken"
              :class="h.id === auth.currentHouseholdId ? 'font-medium text-primary' : 'text-text-primary'"
              @click="switchTo(h)">
        <span class="truncate">{{ h.name }}</span>
        <Check v-if="h.id === auth.currentHouseholdId" :size="16" aria-hidden="true" />
      </button>
      <div class="my-1 border-t border-border" />
      <NuxtLink to="/settings"
                class="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-text-secondary hover:bg-neutral-sunken"
                @click="open = false">
        <Settings :size="16" aria-hidden="true" />
        <span>管理住所</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Home, ChevronDown, Check, Settings } from 'lucide-vue-next'

const auth = useAuthStore()
const emit = defineEmits<{ switched: [] }>()

const open = ref(false)
const switching = ref(false)

async function switchTo(h: { id: string }) {
  if (switching.value) return
  if (h.id === auth.currentHouseholdId) {
    open.value = false
    return
  }
  switching.value = true
  try {
    await auth.switchTo(h.id)
    open.value = false
    emit('switched')
  } finally {
    switching.value = false
  }
}
</script>
