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
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
      body: text,
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
