<template>
  <Teleport to="body">
    <div v-if="dialog.state.open"
         class="fixed inset-0 z-50 flex items-center justify-center p-6"
         role="dialog" aria-modal="true" :aria-label="dialog.state.title"
         @keydown.esc="cancel">
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-black/40" @click="cancel" />

      <!-- 弹窗卡片 -->
      <section class="relative w-full max-w-xs rounded-lg border border-border bg-neutral-surface p-4 shadow-level-2">
        <h2 class="text-base font-semibold">{{ dialog.state.title }}</h2>
        <p v-if="dialog.state.message" class="mt-1 text-sm text-text-secondary">
          {{ dialog.state.message }}
        </p>
        <div class="mt-4 flex gap-2">
          <button v-if="dialog.state.showCancel" type="button"
                  class="btn-secondary flex-1 py-2 text-sm"
                  @click="cancel">
            {{ dialog.state.cancelText }}
          </button>
          <button v-if="dialog.state.danger" type="button"
                  class="flex-1 rounded-lg bg-error py-2 text-sm font-semibold text-white hover:brightness-90"
                  @click="confirm">
            {{ dialog.state.confirmText }}
          </button>
          <button v-else type="button"
                  class="btn-primary flex-1 py-2 text-sm"
                  @click="confirm">
            {{ dialog.state.confirmText }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const dialog = useDialog()

function cancel() {
  dialog.closeDialog(false)
}

function confirm() {
  dialog.closeDialog(true)
}
</script>
