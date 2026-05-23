<template>
  <Teleport to="body">
    <Transition>
      <div
        v-if="pending"
        class="reminder-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-all-title"
        @click.self="cancelDeleteAll"
        @keydown.esc="cancelDeleteAll"
      >
        <div class="reminder-dialog confirm-dialog" ref="dialogEl">
          <p class="reminder-dialog__eyebrow">Data Management</p>
          <h2 class="reminder-dialog__title" id="confirm-delete-all-title">Delete all data?</h2>
          <p class="reminder-dialog__description">This will remove all tasks and settings. This cannot be undone.</p>
          <div class="confirm-dialog__actions">
            <button class="confirm-dialog__cancel-btn" ref="cancelBtnRef" @click="cancelDeleteAll">
              Cancel
            </button>
            <button class="confirm-dialog__delete-btn" @click="confirmDeleteAll">
              Delete All
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useConfirmDeleteAll } from '@/composables/useConfirmDeleteAll'

const { pending, confirmDeleteAll, cancelDeleteAll } = useConfirmDeleteAll()
const dialogEl    = ref(null)
const cancelBtnRef = ref(null)

watch(pending, async (val) => {
  if (val) {
    await nextTick()
    cancelBtnRef.value?.focus()
  }
})
</script>
