// Strips VEVENT blocks that ended more than LOOKBACK_DAYS ago.
// Repeating events (RRULE) are kept unless their UNTIL date is also past the cutoff.
const LOOKBACK_DAYS = 14

function cutoffDateStr() {
  const d = new Date()
  d.setDate(d.getDate() - LOOKBACK_DAYS)
  return d.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
}

function filterEvents(icsText) {
  const cutoff = cutoffDateStr()
  const lines = icsText.split(/\r?\n/)
  const out = []
  let inEvent = false
  let block = []
  let dtstart = null
  let hasRrule = false
  let rruleUntil = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      block = [line]
      dtstart = null
      hasRrule = false
      rruleUntil = null
    } else if (line === 'END:VEVENT') {
      block.push(line)
      const keep =
        !dtstart ||
        dtstart >= cutoff ||
        (hasRrule && (!rruleUntil || rruleUntil >= cutoff))
      if (keep) out.push(...block)
      inEvent = false
    } else if (inEvent) {
      block.push(line)
      if (line.startsWith('DTSTART')) {
        const m = line.match(/(\d{8})/)
        if (m) dtstart = m[1]
      } else if (line.startsWith('RRULE')) {
        hasRrule = true
        const m = line.match(/UNTIL=(\d{8})/)
        if (m) rruleUntil = m[1]
      }
    } else {
      out.push(line)
    }
  }

  return out.join('\r\n')
}

export const handler = async (event) => {
  const url = event.queryStringParameters?.url

  if (!url || !url.startsWith('https://')) {
    return {
      statusCode: 400,
      body: 'Missing or invalid URL — must start with https://',
    }
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Sorta/1.0 Calendar Sync' },
    })
    const text = await res.text()
    const filtered = filterEvents(text)
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
      body: filtered,
    }
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.code || err.cause.message})` : ''
    console.error('[ical-proxy] fetch error:', err.message, err.cause ?? '')
    return {
      statusCode: 502,
      body: `Failed to fetch calendar: ${err.message}${cause}`,
    }
  }
}
