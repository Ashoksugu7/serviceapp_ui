'use client'

import { ChevronLeft, ChevronRight, Search, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { apiErrorMessage } from '@/lib/api-client'
import type { ListResponse } from '@/lib/types'
import { Alert, Button, Card, EmptyState, Select, Skeleton } from './index'

export function SearchInput({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  )
}

export function FilterSelect({ value, onChange, options, label }: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label: string
}) {
  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="sm:w-44">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </Select>
  )
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
      <span>{from}–{to} of {total}</span>
      <div className="flex gap-1">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" />
        <Button variant="secondary" size="sm" icon={ChevronRight} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" />
      </div>
    </div>
  )
}

// Card that owns the loading, error, empty and pagination states of a list.
export function ListCard<T>({ toolbar, query, empty, page, onPage, children }: {
  toolbar?: ReactNode
  query: { data?: ListResponse<T>; isPending: boolean; error: unknown }
  empty: { icon: LucideIcon; title: string; description?: ReactNode; action?: ReactNode }
  page: number
  onPage: (page: number) => void
  children: (items: T[]) => ReactNode
}) {
  const { data, isPending, error } = query
  return (
    <Card>
      {toolbar && <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">{toolbar}</div>}
      {error ? (
        <div className="p-5"><Alert>{apiErrorMessage(error)}</Alert></div>
      ) : isPending ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-9 w-full" />)}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <>
          {children(data.items)}
          <Pagination page={page} pageSize={data.page_size} total={data.total} onPage={onPage} />
        </>
      )}
    </Card>
  )
}

export function statusTone(status: string): 'success' | 'warning' | 'neutral' | 'danger' {
  switch (status) {
    case 'ACTIVE':
    case 'AVAILABLE':
      return 'success'
    case 'ISSUED':
    case 'SUSPENDED':
      return 'warning'
    case 'UNDER_MAINTENANCE':
    case 'DISCONTINUED':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')
}
