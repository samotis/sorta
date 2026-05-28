import { ref, watch } from 'vue'
import { useTasks } from './useTasks'
import { parseCalendarEvents } from '@/utils/calendarParser'

const STORAGE_KEY = 'sorta_calendars'
const stored = localStorage.getItem(STORAGE_KEY)
const calendars = ref(stored ? JSON.parse(stored) : [])

watch(calendars, val => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true })

let _intervalStarted = false

function _ensureInterval() {
  if (_intervalStarted) return
  _intervalStarted = true
  setInterval(() => _syncAllCalendars(), 30 * 60 * 1000)
}

async function _syncCalendar(calendarId) {
  const calendar = calendars.value.find(c => c.id === calendarId)
  if (!calendar) return

  const { syncCalendarEvents } = useTasks()

  try {
    const res = await fetch(`/.netlify/functions/ical-proxy?url=${encodeURIComponent(calendar.url)}`)
    if (!res.ok) throw new Error(`Server responded with ${res.status}`)

    const icsText = await res.text()
    const { calendarName, events } = parseCalendarEvents(icsText, calendarId)

    syncCalendarEvents(calendarId, events)

    calendars.value = calendars.value.map(c =>
      c.id === calendarId
        ? { ...c, name: calendarName || c.name || 'Calendar', lastSynced: new Date().toISOString(), error: null }
        : c
    )
  } catch (err) {
    calendars.value = calendars.value.map(c =>
      c.id === calendarId ? { ...c, error: err.message } : c
    )
    throw err
  }
}

async function _syncAllCalendars() {
  await Promise.allSettled(calendars.value.map(c => _syncCalendar(c.id)))
}

// Trigger initial sync on load if calendars are already configured
if (calendars.value.length > 0) {
  _ensureInterval()
  setTimeout(() => _syncAllCalendars(), 200)
}

export function useCalendars() {
  async function addCalendar(url) {
    const trimmedUrl = url.trim()
    if (!trimmedUrl.startsWith('https://')) throw new Error('URL must start with https://')
    if (calendars.value.some(c => c.url === trimmedUrl)) throw new Error('This calendar is already connected.')

    const id = crypto.randomUUID()
    calendars.value = [...calendars.value, { id, url: trimmedUrl, name: '', lastSynced: null, error: null }]
    _ensureInterval()

    try {
      await _syncCalendar(id)
    } catch (err) {
      calendars.value = calendars.value.filter(c => c.id !== id)
      throw err
    }
    return id
  }

  function removeCalendar(calendarId) {
    const { deleteCalendarTasks } = useTasks()
    deleteCalendarTasks(calendarId)
    calendars.value = calendars.value.filter(c => c.id !== calendarId)
  }

  async function syncCalendar(calendarId) {
    await _syncCalendar(calendarId)
  }

  function clearCalendars() {
    calendars.value = []
  }

  return { calendars, addCalendar, removeCalendar, syncCalendar, clearCalendars }
}
