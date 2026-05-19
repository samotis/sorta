/**
 * useReminders — polls every 30 s for tasks whose remindAt has passed
 * and reminderDismissed is false. Surfaces them one at a time via a
 * reactive queue. ReminderDialog consumes the queue.
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useTasks } from './useTasks'

const POLL_INTERVAL = 30_000 // 30 seconds

export function useReminders() {
  const { tasks, updateTask } = useTasks()
  const activeReminder = ref(null) // The task currently shown in the dialog
  let intervalId = null

  function checkReminders() {
    if (activeReminder.value) return // Don't stack dialogs

    const now = new Date()
    const due = tasks.value.find(t => {
      if (!t.remindAt || t.reminderDismissed) return false
      return new Date(t.remindAt) <= now
    })

    if (due) {
      activeReminder.value = { ...due }
    }
  }

  function dismissReminder() {
    if (!activeReminder.value) return
    updateTask(activeReminder.value.id, { reminderDismissed: true })
    activeReminder.value = null
    // Immediately check if another reminder is waiting
    checkReminders()
  }

  onMounted(() => {
    checkReminders()
    intervalId = setInterval(checkReminders, POLL_INTERVAL)
  })

  onUnmounted(() => {
    clearInterval(intervalId)
  })

  return {
    activeReminder,
    dismissReminder,
  }
}
