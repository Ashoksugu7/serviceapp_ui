function pad(value: number) {
  return String(value).padStart(2, '0')
}

// Calendar dates are the user's local date as YYYY-MM-DD, never converted through UTC.
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function localToday(): string {
  return toISODate(new Date())
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return toISODate(new Date(year, month - 1, day + days))
}

export const QUICK_PICKS = [
  { label: 'Today', days: 0 },
  { label: '+3 days', days: 3 },
  { label: '+7 days', days: 7 },
  { label: '+14 days', days: 14 },
] as const

const displayFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return displayFormat.format(new Date(year, month - 1, day))
}
