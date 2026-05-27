/**
 * useReminders — polls every 30 s for tasks whose remindAt has passed.
 *
 * Non-repeating tasks: fires once; dismissed via reminderDismissed flag.
 * Repeating tasks: fires once per occurrence day (time-of-day taken from
 *   remindAt); dismissed via dismissedReminderDates (same pattern as
 *   completedDates). activeReminder shape: { task, date } where date is
 *   the YYYY-MM-DD occurrence date (null for non-repeating).
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { useTasks } from './useTasks'
import { taskOccursOn } from './useTasks'

const POLL_INTERVAL = 30_000 // 30 seconds

function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useReminders() {
  const { tasks, updateTask } = useTasks()
  const activeReminder = ref(null) // { task, date } or null
  let intervalId = null

  function checkReminders() {
    if (activeReminder.value) return // Don't stack dialogs

    const now = new Date()
    const todayStr = toDateStr(now)

    for (const task of tasks.value) {
      if (!task.remindAt) continue

      if (task.repeat) {
        if (!taskOccursOn(task, todayStr)) continue
        if (Array.isArray(task.dismissedReminderDates) && task.dismissedReminderDates.includes(todayStr)) continue

        // Apply the stored reminder's time-of-day to today's date (local time)
        const template = new Date(task.remindAt)
        const todayRemindAt = new Date(
          now.getFullYear(), now.getMonth(), now.getDate(),
          template.getHours(), template.getMinutes(), template.getSeconds()
        )

        if (now >= todayRemindAt) {
          activeReminder.value = { task: { ...task }, date: todayStr }
          return
        }
      } else {
        if (task.reminderDismissed) continue
        if (now >= new Date(task.remindAt)) {
          activeReminder.value = { task: { ...task }, date: null }
          return
        }
      }
    }
  }

  function dismissReminder() {
    if (!activeReminder.value) return
    const { task, date } = activeReminder.value

    if (date !== null && task.repeat) {
      const current = tasks.value.find(t => t.id === task.id)
      const existing = current?.dismissedReminderDates || []
      if (!existing.includes(date)) {
        updateTask(task.id, { dismissedReminderDates: [...existing, date] })
      }
    } else {
      updateTask(task.id, { reminderDismissed: true })
    }

    activeReminder.value = null
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
