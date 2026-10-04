import { addDays, localToday } from './dates'

// Records page filters (UI09). Kept in the URL so a filtered view can be
// bookmarked or shared, and mapped to the T34 API parameters.
export type RecordSort = 'newest' | 'oldest' | 'updated' | 'service_date' | 'request_no'
export type DateRange = '' | 'today' | '7d' | '30d' | 'custom'

export type RecordFilters = {
  q: string
  state: '' | 'open' | 'closed'
  status: string
  profile: string
  range: DateRange
  from: string
  to: string
  createdBy: string
  outStore: '' | 'at_shop' | 'received' | 'none'
  overdue: boolean
  sort: RecordSort
  page: number
}

export const emptyRecordFilters: RecordFilters = {
  q: '', state: '', status: '', profile: '', range: '', from: '', to: '', createdBy: '', outStore: '', overdue: false, sort: 'newest', page: 1,
}

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

export function parseRecordFilters(params: URLSearchParams): RecordFilters {
  const page = Number(params.get('page'))
  return {
    q: params.get('q') ?? '',
    state: pick(params.get('state'), ['', 'open', 'closed'] as const, ''),
    status: params.get('status') ?? '',
    profile: params.get('profile') ?? '',
    range: pick(params.get('range'), ['', 'today', '7d', '30d', 'custom'] as const, ''),
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    createdBy: params.get('by') ?? '',
    outStore: pick(params.get('out_store'), ['', 'at_shop', 'received', 'none'] as const, ''),
    overdue: params.get('overdue') === '1',
    sort: pick(params.get('sort'), ['newest', 'oldest', 'updated', 'service_date', 'request_no'] as const, 'newest'),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

// URL query for the page (defaults are left out to keep links short).
export function recordFiltersToSearch(filters: RecordFilters): string {
  const params = new URLSearchParams()
  const set = (key: string, value: string) => value && params.set(key, value)
  set('q', filters.q.trim())
  set('state', filters.state)
  set('status', filters.status)
  set('profile', filters.profile)
  set('range', filters.range)
  if (filters.range === 'custom') {
    set('from', filters.from)
    set('to', filters.to)
  }
  set('by', filters.createdBy)
  set('out_store', filters.outStore)
  if (filters.overdue) params.set('overdue', '1')
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  const query = params.toString()
  return query ? `?${query}` : ''
}

const sorts: Record<RecordSort, { sort: string; order: 'asc' | 'desc' }> = {
  newest: { sort: 'created_at', order: 'desc' },
  oldest: { sort: 'created_at', order: 'asc' },
  updated: { sort: 'updated_at', order: 'desc' },
  service_date: { sort: 'service_date', order: 'desc' },
  request_no: { sort: 'request_no', order: 'desc' },
}

export function dateRangeOf(filters: RecordFilters, today = localToday()): { from: string; to: string } {
  switch (filters.range) {
    case 'today': return { from: today, to: today }
    case '7d': return { from: addDays(today, -6), to: today }
    case '30d': return { from: addDays(today, -29), to: today }
    case 'custom': return { from: filters.from, to: filters.to }
    default: return { from: '', to: '' }
  }
}

// Parameters for GET /service-requests (T34).
export function recordFiltersToApi(filters: RecordFilters, pageSize = 25, today = localToday()): Record<string, string | number | undefined> {
  const { from, to } = dateRangeOf(filters, today)
  return {
    q: filters.q.trim() || undefined,
    state: filters.state || undefined,
    status_name: filters.status || undefined,
    profile_id: filters.profile || undefined,
    date_from: from || undefined,
    date_to: to || undefined,
    created_by: filters.createdBy || undefined,
    out_store: filters.outStore || undefined,
    overdue: filters.overdue ? 'true' : undefined,
    ...sorts[filters.sort],
    page: filters.page,
    page_size: pageSize,
    facets: 'true',
  }
}

export function activeFilterCount(filters: RecordFilters): number {
  return [filters.q.trim(), filters.state, filters.status, filters.profile, filters.range, filters.createdBy, filters.outStore, filters.overdue ? '1' : ''].filter(Boolean).length
}
