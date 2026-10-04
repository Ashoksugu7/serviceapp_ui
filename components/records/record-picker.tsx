'use client'

import clsx from 'clsx'
import { ChevronsUpDown, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { controlClass } from '@/components/ui'
import { formatDate } from '@/lib/dates'
import { useDebounced, useList } from '@/lib/queries'
import type { ServiceRequest } from '@/lib/types'

// Searches service records on the server (number, customer or details).
export function RecordPicker({ base, value, label, customerId, invalid, onChange }: {
  base: string
  value: string
  label?: string
  customerId?: string
  invalid?: boolean
  onChange: (record: ServiceRequest | null) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const results = useList<ServiceRequest>(open ? `${base}/service-requests` : null, { q, customer_id: customerId, page_size: 20, sort: 'created_at', order: 'desc' })

  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        className={clsx(controlClass(invalid), 'pl-9 pr-9')}
        placeholder={label ?? 'Search record number or customer'}
        value={open ? query : label ?? ''}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ChevronsUpDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {value && (
            <li role="option" aria-selected={false} onMouseDown={(event) => { event.preventDefault(); onChange(null); setOpen(false) }} className="cursor-pointer px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
              No record
            </li>
          )}
          {results.isPending && <li className="px-3 py-2 text-sm text-slate-400">Searching…</li>}
          {results.data?.items.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No records found.</li>}
          {results.data?.items.map((record) => (
            <li
              key={record.id}
              role="option"
              aria-selected={record.id === value}
              onMouseDown={(event) => { event.preventDefault(); onChange(record); setOpen(false); setQuery('') }}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-brand-50"
            >
              <span className="w-20 shrink-0 font-mono text-xs font-semibold text-slate-700">{record.request_no}</span>
              <span className="min-w-0 flex-1 truncate text-slate-800">{record.customer_name}</span>
              <span className="shrink-0 text-xs text-slate-400">{record.status_name} · {formatDate(record.service_date)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
