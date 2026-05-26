/**
 * useTasks — central state for all task data.
 *
 * All task objects follow this shape:
 * {
 *   id:                  String   (crypto.randomUUID)
 *   title:               String
 *   description:         String
 *   estimatedHours:      Number   (e.g. 0.25 … 8.0)
 *   completed:           Boolean  (for non-repeating tasks; for repeating = series cancelled)
 *   scheduledDate:       String|null  ('YYYY-MM-DD' or null = unscheduled)
 *   isBacklog:           Boolean  (true = in the sidebar backlog section)
 *   position:            Number   (sort order within its list)
 *   remindAt:            String|null  (ISO 8601 datetime)
 *   reminderDismissed:   Boolean
 *   createdAt:           String   (ISO 8601 datetime)
 *   repeat:              String|null  ('daily' | 'weekdays' | 'weekly' | null)
 *   completedDates:      String[]  (['YYYY-MM-DD', …] for per-day completion on repeating tasks)
 *   isLife:              Boolean  (true = in the Life section of a day column)
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

function _dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() // 0=Sun … 6=Sat
}

export function taskOccursOn(task, dateStr) {
  if (!task.scheduledDate) return false
  if (!task.repeat) return task.scheduledDate === dateStr
  if (dateStr < task.scheduledDate) return false
  if (task.repeat === 'daily') return true
  if (task.repeat === 'weekdays') {
    const dow = _dayOfWeek(dateStr)
    return dow !== 0 && dow !== 6
  }
  if (task.repeat === 'weekly') {
    return _dayOfWeek(dateStr) === _dayOfWeek(task.scheduledDate)
  }
  return false
}

export function isCompletedOnDate(task, dateStr) {
  if (!task.repeat) return task.completed
  return Array.isArray(task.completedDates) && task.completedDates.includes(dateStr)
}

function tasksForDate(date) {
  return tasks.value
    .filter(t => t.scheduledDate === date)
    .sort((a, b) => a.position - b.position)
}

function unscheduledTasks() {
  return tasks.value
    .filter(t => t.scheduledDate === null && !t.isBacklog)
    .sort((a, b) => a.position - b.position)
}

function backlogTasks() {
  return tasks.value
    .filter(t => t.scheduledDate === null && t.isBacklog)
    .sort((a, b) => a.position - b.position)
}

function nextPosition(date) {
  const list = date === null ? unscheduledTasks() : tasksForDate(date)
  return list.length > 0 ? Math.max(...list.map(t => t.position)) + 1 : 0
}

function firstPosition() {
  const list = unscheduledTasks()
  return list.length > 0 ? Math.min(...list.map(t => t.position)) - 1 : 0
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function migrateTask(t) {
  if (!('repeat' in t)) t.repeat = null
  if (!('completedDates' in t)) t.completedDates = []
  if (!('isLife' in t)) t.isLife = false
  return t
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateTask)
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

  function addTask({ title, description = '', estimatedHours = 1, scheduledDate = null, remindAt = null, repeat = null }) {
    const cleanTitle = sanitize(title)
    if (!cleanTitle) return null

    const task = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      description: sanitize(description),
      estimatedHours: clampHours(estimatedHours),
      completed: false,
      scheduledDate: scheduledDate || null,
      isBacklog: false,
      isLife: false,
      position: scheduledDate ? nextPosition(scheduledDate) : firstPosition(),
      remindAt: remindAt || null,
      reminderDismissed: false,
      createdAt: new Date().toISOString(),
      repeat: repeat || null,
      completedDates: [],
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

    // Clear per-day completions when repeat mode is removed
    const current = tasks.value[idx]
    if ('repeat' in updates && !updates.repeat && current.repeat) {
      updates.completedDates = []
    }

    tasks.value[idx] = { ...tasks.value[idx], ...updates }
  }

  function deleteTask(id) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx === -1) return
    tasks.value.splice(idx, 1)
  }

  function deleteAllTasks() {
    tasks.value = []
    localStorage.removeItem('sorta_backlog_open')
    localStorage.removeItem('sorta_life_open')
  }

  function toggleComplete(id) {
    const task = tasks.value.find(t => t.id === id)
    if (!task) return
    task.completed = !task.completed
  }

  function toggleCompleteOnDate(id, date) {
    const task = tasks.value.find(t => t.id === id)
    if (!task) return
    if (!Array.isArray(task.completedDates)) task.completedDates = []
    const idx = task.completedDates.indexOf(date)
    if (idx === -1) {
      task.completedDates.push(date)
    } else {
      task.completedDates.splice(idx, 1)
    }
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
      t.isBacklog = false
      t.isLife = false
      t.position = index
    })
  }

  function syncBacklogList(newList) {
    newList.forEach((task, index) => {
      const t = tasks.value.find(t => t.id === task.id)
      if (!t) return
      t.scheduledDate = null
      t.isBacklog = true
      t.isLife = false
      t.position = index
    })
  }

  function syncLifeList(newList, newDate) {
    newList.forEach((task, index) => {
      const t = tasks.value.find(t => t.id === task.id)
      if (!t) return
      t.scheduledDate = newDate
      t.isBacklog = false
      t.isLife = true
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
    return tasks.value
      .filter(t => taskOccursOn(t, date))
      .reduce((sum, t) => sum + t.estimatedHours, 0)
  }

  function completedHoursForDate(date) {
    return tasks.value
      .filter(t => taskOccursOn(t, date) && isCompletedOnDate(t, date))
      .reduce((sum, t) => sum + t.estimatedHours, 0)
  }

  function importTasks(newTasks) {
    for (const task of newTasks) {
      tasks.value.push({
        ...task,
        title:       sanitize(task.title),
        description: sanitize(task.description),
      })
    }
  }

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    deleteAllTasks,
    toggleComplete,
    toggleCompleteOnDate,
    syncList,
    syncBacklogList,
    syncLifeList,
    getTasksForDate,
    getUnscheduledTasks,
    totalHoursForDate,
    completedHoursForDate,
    importTasks,
  }
}
