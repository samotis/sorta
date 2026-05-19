/**
 * useCalendar — manages the visible day range and scroll navigation.
 *
 * Strategy: render a fixed window of days (DAYS_BEFORE today through
 * DAYS_AFTER today). The scroll container uses CSS scroll-snap.
 * Arrow buttons call scrollBy(±columnWidth). The Today button scrolls
 * to a stored element ref for today's column.
 */

import { ref, computed, nextTick } from 'vue'

const DAYS_BEFORE = 14
const DAYS_AFTER  = 90

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function toDateString(date) {
  // Returns 'YYYY-MM-DD' in local time (avoids UTC offset surprises)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayString() {
  return toDateString(new Date())
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateString(d)
}

export function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

export function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Composable ──────────────────────────────────────────────────────────────

export function useCalendar() {
  // Ref to the scroll container DOM element (set by CalendarView)
  const scrollContainerRef = ref(null)

  // Map of dateStr → column DOM element refs (populated by DayColumn)
  const columnRefs = ref({})

  const today = todayString()

  // Build the full day array once
  const days = computed(() => {
    const result = []
    for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) {
      result.push(addDays(today, i))
    }
    return result
  })

  function registerColumnRef(dateStr, el) {
    if (el) {
      columnRefs.value[dateStr] = el
    }
  }

  async function scrollToToday() {
    await nextTick()
    const el = columnRefs.value[today]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }

  function getColumnWidth() {
    const container = scrollContainerRef.value
    if (!container) return 320
    const firstCol = container.querySelector('[data-day-column]')
    if (!firstCol) return 320
    // Include gap — gap is defined in CSS as $column-gap (1rem = 16px)
    return firstCol.offsetWidth + 16
  }

  function scrollForward() {
    const container = scrollContainerRef.value
    if (!container) return
    container.scrollBy({ left: getColumnWidth(), behavior: 'smooth' })
  }

  function scrollBack() {
    const container = scrollContainerRef.value
    if (!container) return
    container.scrollBy({ left: -getColumnWidth(), behavior: 'smooth' })
  }

  return {
    days,
    today,
    scrollContainerRef,
    registerColumnRef,
    scrollToToday,
    scrollForward,
    scrollBack,
  }
}
