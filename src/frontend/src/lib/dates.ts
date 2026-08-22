// Local-time date helpers. Deliberately avoid Date.toISOString()/UTC parsing here —
// that shifts the calendar day near midnight depending on the browser's timezone,
// the same class of bug fixed on the backend for "today" (see docker-compose TZ).

export function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

export function addMonths(d: Date, count: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + count, 1)
}
