import ICAL from 'ical.js'

function icsTimeToDateStr(icalTime) {
  if (!icalTime) return null
  if (icalTime.isDate) {
    return `${icalTime.year}-${String(icalTime.month).padStart(2, '0')}-${String(icalTime.day).padStart(2, '0')}`
  }
  const dt = icalTime.toJSDate()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function rruleToRepeat(rrule) {
  if (!rrule) return null
  const freq = (rrule.freq || '').toUpperCase()
  const byday = rrule.parts?.BYDAY || []
  if (freq === 'DAILY' && Array.isArray(byday) && byday.length >= 5) return 'weekdays'
  if (freq === 'DAILY') return 'daily'
  if (freq === 'WEEKLY') return 'weekly'
  return null
}

function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rruleUntilDate(rrule, dtstart) {
  if (!rrule) return null

  if (rrule.until) return icsTimeToDateStr(rrule.until)

  const count = rrule.count
  if (!count || count <= 1 || !dtstart) return null

  const freq = (rrule.freq || '').toUpperCase()
  const byday = rrule.parts?.BYDAY || []
  const d = dtstart.toJSDate()

  if (freq === 'WEEKLY') {
    const end = new Date(d)
    end.setDate(end.getDate() + (count - 1) * 7)
    return dateToStr(end)
  }

  if (freq === 'DAILY' && Array.isArray(byday) && byday.length >= 5) {
    // weekdays — walk forward counting weekdays
    let remaining = count - 1
    const end = new Date(d)
    while (remaining > 0) {
      end.setDate(end.getDate() + 1)
      const dow = end.getDay()
      if (dow !== 0 && dow !== 6) remaining--
    }
    return dateToStr(end)
  }

  if (freq === 'DAILY') {
    const end = new Date(d)
    end.setDate(end.getDate() + (count - 1))
    return dateToStr(end)
  }

  return null
}

function calcEstimatedHours(vevent) {
  const dtstart = vevent.getFirstPropertyValue('dtstart')
  if (!dtstart || dtstart.isDate) return 1

  const dtend = vevent.getFirstPropertyValue('dtend')
  const durationProp = vevent.getFirstPropertyValue('duration')

  let ms = 0
  if (dtend) {
    ms = dtend.toJSDate().getTime() - dtstart.toJSDate().getTime()
  } else if (durationProp && typeof durationProp.toSeconds === 'function') {
    ms = durationProp.toSeconds() * 1000
  }

  if (ms <= 0) return 1
  return Math.min(Math.max(Math.round((ms / 3600000) * 4) / 4, 0.25), 8)
}

export function parseCalendarEvents(icsText, calendarId) {
  const comp = new ICAL.Component(ICAL.parse(icsText))
  const calendarName = comp.getFirstPropertyValue('x-wr-calname') || ''
  const events = []

  for (const vevent of comp.getAllSubcomponents('vevent')) {
    const uid = vevent.getFirstPropertyValue('uid') || ''
    if (!uid) continue

    const summary = vevent.getFirstPropertyValue('summary') || ''
    if (!summary) continue

    const status = (vevent.getFirstPropertyValue('status') || '').toUpperCase()
    if (status === 'CANCELLED') continue

    // Recurring event exceptions — skip to avoid duplicates with the parent series
    if (vevent.getFirstProperty('recurrence-id')) continue

    const dtstart = vevent.getFirstPropertyValue('dtstart')
    const scheduledDate = icsTimeToDateStr(dtstart)
    if (!scheduledDate) continue

    const rrule = vevent.getFirstPropertyValue('rrule')

    events.push({
      calendarUid:           uid,
      calendarId,
      isCalendarEvent:       true,
      title:                 summary,
      description:           '',
      scheduledDate,
      estimatedHours:        calcEstimatedHours(vevent),
      repeat:                rruleToRepeat(rrule),
      repeatUntil:           rruleUntilDate(rrule, dtstart),
      completed:             false,
      isBacklog:             false,
      isLife:                false,
      remindAt:              null,
      reminderDismissed:     false,
      dismissedReminderDates: [],
      completedDates:        [],
      createdAt:             new Date().toISOString(),
    })
  }

  // Some feeds list recurring occurrences as separate VEVENTs with the same UID — keep first only
  const seen = new Set()
  const deduped = events.filter(e => {
    if (seen.has(e.calendarUid)) return false
    seen.add(e.calendarUid)
    return true
  })

  return { calendarName, events: deduped }
}
