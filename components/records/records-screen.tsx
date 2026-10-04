'use client'

import clsx from 'clsx'
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, Phone, Plus, Search, SlidersHorizontal, Truck, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Chip, EmptyState, Input, PageHeader, Select, Skeleton } from '@/components/ui'
import { useCompanyId } from '@/components/shell/identity'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, apiErrorMessage } from '@/lib/api-client'
import { formatDate, localToday } from '@/lib/dates'
import { buildQuery, useDebounced, useList, type ListParams } from '@/lib/queries'
import {
  activeFilterCount, emptyRecordFilters, parseRecordFilters, recordFiltersToApi, recordFiltersToSearch,
  type DateRange, type RecordFilters, type RecordSort,
} from '@/lib/records-filter'
import type { ListResponse, ServiceProfile, ServiceRequest, ServiceRequestFacets } from '@/lib/types'

type RecordList = ListResponse<ServiceRequest> & { facets?: ServiceRequestFacets }

const PAGE_SIZE = 25
const sortOptions: { value: RecordSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'service_date', label: 'Service date' },
  { value: 'request_no', label: 'Record number' },
]
const rangeOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'custom', label: 'Custom' },
]
const outStoreLabels: Record<string, string> = { at_shop: 'At a shop', received: 'Received back', none: 'Never sent' }

export function RecordsScreen({ initialSearch }: { initialSearch: string }) {
  const companyId = useCompanyId()!
  const router = useRouter()
  const base = `/companies/${companyId}`
  const [filters, setFilters] = useState<RecordFilters>(() => parseRecordFilters(new URLSearchParams(initialSearch)))
  const [searchText, setSearchText] = useState(filters.q)
  const debouncedSearch = useDebounced(searchText)
  const [showMore, setShowMore] = useState(() => Boolean(filters.profile || filters.createdBy || filters.outStore || filters.overdue))

  // Any change other than paging returns to the first page.
  const update = (patch: Partial<RecordFilters>) => setFilters((current) => ({ ...current, page: 1, ...patch }))
  // The search box is debounced; the other filters apply immediately.
  const effective = useMemo(() => ({ ...filters, q: debouncedSearch }), [filters, debouncedSearch])
  // Keep the URL in step so the view can be bookmarked or shared.
  useEffect(() => {
    window.history.replaceState(null, '', `/records${recordFiltersToSearch(effective)}`)
  }, [effective])

  const apiParams = useMemo(() => recordFiltersToApi(effective, PAGE_SIZE, localToday()) as ListParams, [effective])
  const path = `${base}/service-requests`
  const records = useQuery({
    queryKey: [path, apiParams],
    queryFn: () => api<RecordList>(`${path}${buildQuery(apiParams)}`),
    placeholderData: keepPreviousData,
  })
  const profiles = useList<ServiceProfile>(`${base}/service-profiles`)
  const profileList = useMemo(() => [...(profiles.data?.items ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name)), [profiles.data])
  const facets = records.data?.facets
  const activeCount = activeFilterCount(effective)

  const chips: { label: string; clear: Partial<RecordFilters> }[] = [
    effective.q.trim() && { label: `“${effective.q.trim()}”`, clear: { q: '' } },
    filters.state && { label: filters.state === 'open' ? 'Open' : 'Closed', clear: { state: '' } },
    filters.status && { label: `Status: ${filters.status}`, clear: { status: '' } },
    filters.profile && { label: `Profile: ${profileList.find((p) => p.id === filters.profile)?.name ?? '…'}`, clear: { profile: '' } },
    filters.range && { label: filters.range === 'custom' ? `${formatDate(filters.from)} – ${formatDate(filters.to)}` : rangeOptions.find((r) => r.value === filters.range)!.label, clear: { range: '', from: '', to: '' } },
    filters.createdBy && { label: `By ${facets?.creators.find((c) => c.id === filters.createdBy)?.name ?? 'user'}`, clear: { createdBy: '' } },
    filters.outStore && { label: outStoreLabels[filters.outStore], clear: { outStore: '' } },
    filters.overdue && { label: 'Overdue at shop', clear: { overdue: false } },
  ].filter(Boolean) as { label: string; clear: Partial<RecordFilters> }[]

  return (
    <>
      <PageHeader
        eyebrow="Transaction"
        title="Records"
        description={records.data ? `${records.data.total} record${records.data.total === 1 ? '' : 's'}${activeCount ? (records.data.total === 1 ? ' matches your filters' : ' match your filters') : ''}` : 'Every service entry.'}
        actions={
          <Link href="/service-entry" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
            <Plus size={15} /> New entry
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => { setSearchText(event.target.value); setFilters((current) => ({ ...current, page: 1 })) }}
                placeholder="Search record no, customer, mobile or details"
                aria-label="Search records"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <Select aria-label="Sort" value={filters.sort} onChange={(event) => update({ sort: event.target.value as RecordSort })} className="sm:w-48">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            <Button variant={showMore ? 'primary' : 'secondary'} icon={SlidersHorizontal} onClick={() => setShowMore((open) => !open)}>
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Open or closed" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {([['', 'All', (facets?.open ?? 0) + (facets?.closed ?? 0)], ['open', 'Open', facets?.open], ['closed', 'Closed', facets?.closed]] as const).map(([value, label, count]) => (
                <button
                  key={value || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={filters.state === value}
                  onClick={() => update({ state: value, status: '' })}
                  className={clsx('rounded-md px-3 py-1 text-xs font-medium transition', filters.state === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                >
                  {label}{count !== undefined && <span className="ml-1 tabular-nums text-slate-400">{count}</span>}
                </button>
              ))}
            </div>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            {rangeOptions.map((option) => (
              <Chip key={option.value} active={filters.range === option.value} onClick={() => update(filters.range === option.value ? { range: '', from: '', to: '' } : { range: option.value })}>
                {option.label}
              </Chip>
            ))}
            {filters.range === 'custom' && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Input type="date" aria-label="From date" className="w-auto py-1" value={filters.from} max={filters.to || undefined} onChange={(event) => update({ from: event.target.value })} />
                to
                <Input type="date" aria-label="To date" className="w-auto py-1" value={filters.to} min={filters.from || undefined} onChange={(event) => update({ to: event.target.value })} />
              </span>
            )}
          </div>

          {facets && facets.statuses.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Statuses">
              {facets.statuses
                .filter((status) => !filters.state || (filters.state === 'closed') === status.closed)
                .map((status) => (
                  <Chip
                    key={status.status_name}
                    active={filters.status === status.status_name}
                    aria-pressed={filters.status === status.status_name}
                    onClick={() => update({ status: filters.status === status.status_name ? '' : status.status_name })}
                  >
                    {status.status_name} <span className="tabular-nums opacity-60">{status.count}</span>
                  </Chip>
                ))}
            </div>
          )}

          {showMore && (
            <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select aria-label="Profile" value={filters.profile} onChange={(event) => update({ profile: event.target.value })}>
                <option value="">All profiles</option>
                {profileList.map((profile) => <option key={profile.id} value={profile.id}>{profile.is_active ? profile.name : `${profile.name} (archived)`}</option>)}
              </Select>
              <Select aria-label="Created by" value={filters.createdBy} onChange={(event) => update({ createdBy: event.target.value })}>
                <option value="">Anyone</option>
                {(facets?.creators ?? []).map((creator) => <option key={creator.id} value={creator.id}>{creator.name} ({creator.count})</option>)}
              </Select>
              <Select aria-label="Out-Store" value={filters.outStore} onChange={(event) => update({ outStore: event.target.value as RecordFilters['outStore'] })}>
                <option value="">Any Out-Store</option>
                {Object.entries(outStoreLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={filters.overdue} onChange={(event) => update({ overdue: event.target.checked })} />
                Overdue at shop
              </label>
            </div>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => { if ('q' in chip.clear) setSearchText(''); else update(chip.clear) }}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  {chip.label} <X size={12} />
                </button>
              ))}
              <button type="button" onClick={() => { setFilters({ ...emptyRecordFilters, sort: filters.sort }); setSearchText('') }} className="ml-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                Clear all
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        {records.error ? (
          <div className="p-5"><Alert>{apiErrorMessage(records.error)}</Alert></div>
        ) : records.isPending ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-12 w-full" />)}</div>
        ) : !records.data || records.data.items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={activeCount ? 'No records match these filters' : 'No service records yet'}
            description={activeCount ? 'Try a different search or clear the filters.' : 'Entries saved from Service Entry appear here.'}
          />
        ) : (
          <div className={clsx(records.isFetching && 'opacity-70 transition-opacity')}>
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_7rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Record</span><span>Customer</span><span>Status</span><span className="text-right">Date</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {records.data.items.map((record) => <RecordRow key={record.id} record={record} onOpen={() => router.push(`/records/${record.id}`)} />)}
            </ul>
            <Pager
              page={records.data.page}
              total={records.data.total}
              onPage={(page) => { setFilters((current) => ({ ...current, page })); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
          </div>
        )}
      </Card>
    </>
  )
}

function RecordRow({ record, onOpen }: { record: ServiceRequest; onOpen: () => void }) {
  const overdue = record.out_store_status === 'SENT' && !!record.out_store_due_date && record.out_store_due_date < localToday()
  return (
    <li
      onClick={onOpen}
      className="group grid cursor-pointer gap-1.5 px-5 py-3 hover:bg-slate-50/70 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.3fr)_7rem] md:items-center md:gap-4"
    >
      <div className="flex items-baseline justify-between gap-2 md:block">
        <Link href={`/records/${record.id}`} onClick={(event) => event.stopPropagation()} className="font-mono text-sm font-semibold text-slate-900 group-hover:text-brand-700">
          {record.request_no}
        </Link>
        <div className="text-xs text-slate-400">{record.profile_name}</div>
        <span className="text-xs tabular-nums text-slate-500 md:hidden">{formatDate(record.service_date)}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-800">{record.customer_name}</div>
        {record.customer_contact && (
          <a
            href={`tel:${record.customer_contact.replace(/\s/g, '')}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs tabular-nums text-slate-500 hover:text-brand-700"
          >
            <Phone size={11} /> {record.customer_contact}
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={record.closed ? 'neutral' : 'brand'}>{record.status_name}</Badge>
        {record.out_store_status === 'SENT' && (
          <span className={clsx('inline-flex items-center gap-1 text-[11px] font-medium', overdue ? 'text-rose-600' : 'text-amber-700')}>
            {overdue ? <AlertTriangle size={12} /> : <Truck size={12} />}
            {overdue ? 'Overdue at shop' : 'At shop'}{record.out_store_due_date && ` · ${formatDate(record.out_store_due_date)}`}
          </span>
        )}
        {record.created_by_name && <span className="hidden w-full text-[11px] text-slate-400 lg:block">by {record.created_by_name}</span>}
      </div>
      <div className="hidden text-right text-sm tabular-nums text-slate-500 md:block">{formatDate(record.service_date)}</div>
    </li>
  )
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span>Page {page} of {pages} · {total} records</span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        <Button variant="secondary" size="sm" icon={ChevronRight} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" />
      </div>
    </div>
  )
}
