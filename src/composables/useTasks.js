/**
 * useTasks — central state for all task data.
 *
 * All task objects follow this shape:
 * {
 *   id:                  String   (crypto.randomUUID)
 *   title:               String
 *   description:         String
 *   estimatedHours:      Number   (e.g. 0.25 … 8.0)
 *   completed:           Boolean
 *   scheduledDate:       String|null  ('YYYY-MM-DD' or null = unscheduled)
 *   position:            Number   (sort order within its list)
 *   remindAt:            String|null  (ISO 8601 datetime)
 *   reminderDismissed:   Boolean
 *   createdAt:           String   (ISO 8601 datetime)
 * }
 */

import { ref, watch } from 'vue'
import DOMPurify from 'dompurify'

const STORAGE_KEY = 'sorta_v1'

// ─── Shared singleton state ───────────────────────────────────────────────────
const tasks = ref([])
let _initialized = false

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitize(str) {
  if (typeof str !== 'string') return ''
  // Strip all HTML — tasks are plain text
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}

function clampHours(value) {
  const n = parseFloat(value)
  if (isNaN(n)) return 1
  return Math.min(Math.max(Math.round(n * 4) / 4, 0.25), 8)
}

function tasksForDate(date) {
  return tasks.value
    .filter(t => t.scheduledDate === date)
    .sort((a, b) => a.position - b.position)
}

function unscheduledTasks() {
  return tasks.value
    .filter(t => t.scheduledDate === null)
    .sort((a, b) => a.position - b.position)
}

function nextPosition(date) {
  const list = date === null ? unscheduledTasks() : tasksForDate(date)
  return list.length > 0 ? Math.max(...list.map(t => t.position)) + 1 : 0
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveToStorage(taskList) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskList))
  } catch {
    // Storage quota exceeded or unavailable — fail silently
  }
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useTasks() {
  // Initialize once across all component instances
  if (!_initialized) {
    tasks.value = loadFromStorage()
    watch(tasks, (val) => saveToStorage(val), { deep: true })
    _initialized = true
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  function addTask({ title, description = '', estimatedHours = 1, scheduledDate = null, remindAt = null }) {
    const cleanTitle = sanitize(title)
    if (!cleanTitle) return null

    const task = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      description: sanitize(description),
      estimatedHours: clampHours(estimatedHours),
      completed: false,
      scheduledDate: scheduledDate || null,
      position: nextPosition(scheduledDate || null),
      remindAt: remindAt || null,
      reminderDismissed: false,
      createdAt: new Date().toISOString(),
    }

    tasks.value.push(task)
    return task
  }

  function updateTask(id, fields) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx === -1) return

    const updates = { ...fields }

    if ('title' in updates)       updates.title       = sanitize(updates.title)
    if ('description' in updates) updates.description = sanitize(updates.description)
    if ('estimatedHours' in updates) updates.estimatedHours = clampHours(updates.estimatedHours)

    tasks.value[idx] = { ...tasks.value[idx], ...updates }
  }

  function deleteTask(id) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx === -1) return
    tasks.value.splice(idx, 1)
  }

  function toggleComplete(id) {
    const task = tasks.value.find(t => t.id === id)
    if (!task) return
    task.completed = !task.completed
  }

  // ── Drag-and-drop mutation ──────────────────────────────────────────────────
  // Called when vue-draggable-plus fires its update event.
  // `newList` is the reordered array of task objects for the destination list,
  // `newDate` is the scheduledDate string for that column (null = sidebar).

  function syncList(newList, newDate) {
    newList.forEach((task, index) => {
      const t = tasks.value.find(t => t.id === task.id)
      if (!t) return
      t.scheduledDate = newDate
      t.position = index
    })
  }

  // ── Computed helpers exposed to components ──────────────────────────────────

  function getTasksForDate(date) {
    return tasksForDate(date)
  }

  function getUnscheduledTasks() {
    return unscheduledTasks()
  }

  function totalHoursForDate(date) {
    return tasksForDate(date).reduce((sum, t) => sum + t.estimatedHours, 0)
  }

  function completedHoursForDate(date) {
    return tasksForDate(date)
      .filter(t => t.completed)
      .reduce((sum, t) => sum + t.estimatedHours, 0)
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    syncList,
    getTasksForDate,
    getUnscheduledTasks,
    totalHoursForDate,
    completedHoursForDate,
  }
}
