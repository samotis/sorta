<template>
  <Teleport to="body">
    <Transition>
      <div
        v-if="activeReminder"
        class="reminder-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reminder-title"
        aria-describedby="reminder-desc"
      >
        <div class="reminder-dialog" ref="dialogEl">
          <p class="reminder-dialog__eyebrow">Reminder</p>
          <h2 class="reminder-dialog__title" id="reminder-title">{{ activeReminder.title }}</h2>
          <p
            v-if="activeReminder.description"
            class="reminder-dialog__description"
            id="reminder-desc"
          >{{ activeReminder.description }}</p>
          <button
            class="reminder-dialog__dismiss-btn"
            ref="dismissBtnRef"
            @click="dismissReminder"
          >
            Got it
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useReminders } from '@/composables/useReminders'

const { activeReminder, dismissReminder } = useReminders()
const dialogEl    = ref(null)
const dismissBtnRef = ref(null)

// Focus the dismiss button when the dialog appears
watch(activeReminder, async (val) => {
  if (val) {
    await nextTick()
    dismissBtnRef.value?.focus()
  }
})
</script>
