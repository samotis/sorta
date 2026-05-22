<template>
  <Teleport to="body">
    <Transition>
      <div
        v-if="pendingTask"
        class="reminder-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        @click.self="cancelDelete"
        @keydown.esc="cancelDelete"
      >
        <div class="reminder-dialog confirm-dialog" ref="dialogEl">
          <p class="reminder-dialog__eyebrow">Delete Task</p>
          <h2 class="reminder-dialog__title" id="confirm-delete-title">{{ pendingTask.title }}</h2>
          <p class="reminder-dialog__description">This cannot be undone.</p>
          <div class="confirm-dialog__actions">
            <button class="confirm-dialog__cancel-btn" ref="cancelBtnRef" @click="cancelDelete">
              Cancel
            </button>
            <button class="confirm-dialog__delete-btn" @click="confirmDelete">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useConfirmDelete } from '@/composables/useConfirmDelete'

const { pendingTask, confirmDelete, cancelDelete } = useConfirmDelete()
const dialogEl    = ref(null)
const cancelBtnRef = ref(null)

watch(pendingTask, async (val) => {
  if (val) {
    await nextTick()
    cancelBtnRef.value?.focus()
  }
})
</script>
