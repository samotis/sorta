import ICAL from 'ical.js'

// ─── Text helpers ─────────────────────────────────────────────────────────────

function escapeText(str) {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function unescapeText(str) {
  if (!str) return ''
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\;/g, ';')
    .replace(/\\,/g, ',')
    .replace(/\\\\/g, '\\')
}

// RFC 5545: fold lines longer than 75 octets (CRLF + single space)
function foldLine(line) {
  if (line.length <= 75) return line
  const segments = [line.slice(0, 75)]
  let pos = 75
  while (pos < line.length) {
    segments.push(' ' + line.slice(pos, pos + 74))
    pos += 74
  }
  return segments.join('\r\n')
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toICSDate(dateStr) {
  return dateStr.replace(/-/g, '')
}

function toICSDateTime(isoStr) {
  const d = new Date(isoStr)
  const pad = n => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// ─── RRULE mapping ────────────────────────────────────────────────────────────

const REPEAT_TO_RRULE = {
  daily:    'FREQ=DAILY',
  weekdays: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
  weekly:   'FREQ=WEEKLY',
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

// ─── VALARM builder ───────────────────────────────────────────────────────────

function buildVALARM(title, remindAt) {
  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    foldLine(`DESCRIPTION:${escapeText(title)}`),
    `TRIGGER;VALUE=DATE-TIME:${toICSDateTime(remindAt)}`,
    'END:VALARM',
  ].join('\r\n')
}

// ─── Serializers ──────────────────────────────────────────────────────────────

function taskToVEVENT(task) {
  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:task-${task.id}@sorta`),
    foldLine(`SUMMARY:${escapeText(task.title)}`),
    foldLine(`DTSTART;VALUE=DATE:${toICSDate(task.scheduledDate)}`),
    foldLine(`DTEND;VALUE=DATE:${toICSDate(nextDay(task.scheduledDate))}`),
    foldLine(`STATUS:${task.completed ? 'COMPLETED' : 'CONFIRMED'}`),
    foldLine(`CREATED:${toICSDateTime(task.createdAt)}`),
    foldLine(`X-SORTA-HOURS:${task.estimatedHours}`),
    foldLine(`X-SORTA-BACKLOG:${task.isBacklog ? 'TRUE' : 'FALSE'}`),
    foldLine(`X-SORTA-LIFE:${task.isLife ? 'TRUE' : 'FALSE'}`),
    foldLine(`X-SORTA-POSITION:${task.position}`),
  ]

  if (task.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(task.description)}`))
  }

  if (task.repeat && REPEAT_TO_RRULE[task.repeat]) {
    lines.push(`RRULE:${REPEAT_TO_RRULE[task.repeat]}`)
  }

  if (Array.isArray(task.completedDates) && task.completedDates.length) {
    lines.push(foldLine(`X-SORTA-COMPLETED-DATES:${task.completedDates.join(',')}`))
  }

  if (task.remindAt) {
    lines.push(buildVALARM(task.title, task.remindAt))
  }

  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

function taskToVTODO(task) {
  const lines = [
    'BEGIN:VTODO',
    foldLine(`UID:task-${task.id}@sorta`),
    foldLine(`SUMMARY:${escapeText(task.title)}`),
    foldLine(`STATUS:${task.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`),
    foldLine(`CREATED:${toICSDateTime(task.createdAt)}`),
    foldLine(`X-SORTA-HOURS:${task.estimatedHours}`),
    foldLine(`X-SORTA-BACKLOG:${task.isBacklog ? 'TRUE' : 'FALSE'}`),
    foldLine(`X-SORTA-POSITION:${task.position}`),
  ]

  if (task.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(task.description)}`))
  }

  if (task.remindAt) {
    lines.push(buildVALARM(task.title, task.remindAt))
  }

  lines.push('END:VTODO')
  return lines.join('\r\n')
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportTasksToICS(tasks) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sorta//Task Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const task of tasks) {
    lines.push(task.scheduledDate ? taskToVEVENT(task) : taskToVTODO(task))
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(tasks, filename = 'sorta-tasks.ics') {
  const content = exportTasksToICS(tasks)
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Import ───────────────────────────────────────────────────────────────────

function icsTimeToDateStr(icalTime) {
  if (!icalTime) return null
  if (icalTime.isDate) {
    const m = String(icalTime.month).padStart(2, '0')
    const d = String(icalTime.day).padStart(2, '0')
    return `${icalTime.year}-${m}-${d}`
  }
  const dt = icalTime.toJSDate()
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function clampHours(h) {
  const n = parseFloat(h)
  if (isNaN(n)) return 1
  return Math.min(Math.max(Math.round(n * 4) / 4, 0.25), 8)
}

function extractIdFromUid(uid) {
  const match = uid.match(/^task-(.+)@sorta$/)
  return match ? { id: match[1], isSorta: true } : { id: crypto.randomUUID(), isSorta: false }
}

function buildExistingUidSet(existingTasks) {
  const uids = new Set()
  for (const t of existingTasks) {
    uids.add(`task-${t.id}@sorta`)
    if (t.sourceUid) uids.add(t.sourceUid)
  }
  return uids
}

function extractRemindAt(component) {
  try {
    const valarm = component.getFirstSubcomponent('valarm')
    if (!valarm) return null
    const triggerProp = valarm.getFirstProperty('trigger')
    if (!triggerProp) return null
    const val = triggerProp.getFirstValue()
    if (val && typeof val.toJSDate === 'function') {
      return val.toJSDate().toISOString()
    }
  } catch { /* ignore */ }
  return null
}

function parseVEVENT(vevent, existingUids) {
  const uid = vevent.getFirstPropertyValue('uid') || ''
  if (existingUids.has(uid)) return null

  const summary = unescapeText(vevent.getFirstPropertyValue('summary') || '')
  if (!summary) return null

  const { id, isSorta } = extractIdFromUid(uid)
  const description = unescapeText(vevent.getFirstPropertyValue('description') || '')
  const dtstart = vevent.getFirstPropertyValue('dtstart')
  const scheduledDate = icsTimeToDateStr(dtstart)
  const status = (vevent.getFirstPropertyValue('status') || 'CONFIRMED').toUpperCase()
  const completed = status === 'COMPLETED'

  const createdProp = vevent.getFirstPropertyValue('created')
  const createdAt = createdProp ? createdProp.toJSDate().toISOString() : new Date().toISOString()

  const hours = clampHours(vevent.getFirstPropertyValue('x-sorta-hours') ?? 1)
  const isBacklog = (vevent.getFirstPropertyValue('x-sorta-backlog') || '').toUpperCase() === 'TRUE'
  const isLife    = (vevent.getFirstPropertyValue('x-sorta-life')    || '').toUpperCase() === 'TRUE'
  const position = parseInt(vevent.getFirstPropertyValue('x-sorta-position') || '0', 10) || 0

  const rrule = vevent.getFirstPropertyValue('rrule')
  const repeat = rruleToRepeat(rrule)

  const completedDatesRaw = vevent.getFirstPropertyValue('x-sorta-completed-dates') || ''
  const completedDates = completedDatesRaw ? completedDatesRaw.split(',').filter(Boolean) : []

  const remindAt = extractRemindAt(vevent)
  const reminderDismissed = remindAt ? new Date(remindAt) <= new Date() : false

  return {
    id,
    title: summary,
    description,
    estimatedHours: hours,
    completed,
    scheduledDate,
    isBacklog,
    isLife,
    position,
    repeat,
    completedDates,
    remindAt,
    reminderDismissed,
    createdAt,
    ...(!isSorta && uid ? { sourceUid: uid } : {}),
  }
}

function parseVTODO(vtodo, existingUids) {
  const uid = vtodo.getFirstPropertyValue('uid') || ''
  if (existingUids.has(uid)) return null

  const summary = unescapeText(vtodo.getFirstPropertyValue('summary') || '')
  if (!summary) return null

  const { id, isSorta } = extractIdFromUid(uid)
  const description = unescapeText(vtodo.getFirstPropertyValue('description') || '')
  const status = (vtodo.getFirstPropertyValue('status') || 'NEEDS-ACTION').toUpperCase()
  const completed = status === 'COMPLETED'

  const createdProp = vtodo.getFirstPropertyValue('created')
  const createdAt = createdProp ? createdProp.toJSDate().toISOString() : new Date().toISOString()

  const hours = clampHours(vtodo.getFirstPropertyValue('x-sorta-hours') ?? 1)
  const isBacklog = (vtodo.getFirstPropertyValue('x-sorta-backlog') || '').toUpperCase() === 'TRUE'
  const position = parseInt(vtodo.getFirstPropertyValue('x-sorta-position') || '0', 10) || 0

  const remindAt = extractRemindAt(vtodo)
  const reminderDismissed = remindAt ? new Date(remindAt) <= new Date() : false

  return {
    id,
    title: summary,
    description,
    estimatedHours: hours,
    completed,
    scheduledDate: null,
    isBacklog,
    isLife: false,
    position,
    repeat: null,
    completedDates: [],
    remindAt,
    reminderDismissed,
    createdAt,
    ...(!isSorta && uid ? { sourceUid: uid } : {}),
  }
}

export function importTasksFromICS(icsString, existingTasks = []) {
  const existingUids = buildExistingUidSet(existingTasks)
  const imported = []

  try {
    const parsed = ICAL.parse(icsString)
    const comp = new ICAL.Component(parsed)

    for (const vevent of comp.getAllSubcomponents('vevent')) {
      const task = parseVEVENT(vevent, existingUids)
      if (task) imported.push(task)
    }

    for (const vtodo of comp.getAllSubcomponents('vtodo')) {
      const task = parseVTODO(vtodo, existingUids)
      if (task) imported.push(task)
    }
  } catch (err) {
    console.error('ICS parse error:', err)
    throw new Error('Could not read the .ics file. Make sure it is a valid iCalendar file.')
  }

  return imported
}
