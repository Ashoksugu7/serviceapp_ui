'use client'

import clsx from 'clsx'
import { Mail, MapPin, Phone, Search, UserCheck, UserPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Field, Input, Textarea, controlClass } from '@/components/ui'
import { digitsOf, looksLikePhone, matchCustomers } from '@/lib/customers'
import { useDebounced, useList } from '@/lib/queries'
import type { Customer } from '@/lib/types'

export type NewCustomerDraft = { name: string; contact: string; address: string; email: string }
export type CustomerChoice = { kind: 'existing'; customer: Customer } | { kind: 'new'; draft: NewCustomerDraft } | null

// Find a customer by mobile number or name, searching the API as you type
// (UI12). An exact mobile-number match is used straight away; an unknown full
// mobile number opens new-customer fields (when allowCreate) that are saved
// together with the record.
export function CustomerLookup({ base, value, onChange, allowCreate, label, errors = {} }: {
  /** Company path, e.g. /companies/{id}. */
  base: string
  value: CustomerChoice
  onChange: (choice: CustomerChoice) => void
  allowCreate?: boolean
  label: string
  errors?: Record<string, string>
}) {
  const [query, setQuery] = useState(() => (value?.kind === 'new' ? value.draft.contact : ''))
  const text = useDebounced(query.trim(), 250)
  const results = useList<Customer>(value?.kind === 'existing' || !text ? null : `${base}/customers`, { q: text, page_size: 8, sort: 'name' })
  // Results for older text are ignored so a fast typist never gets a stale match.
  const settled = !results.isFetching && results.data !== undefined && text === query.trim()
  const { exact, suggestions } = settled ? matchCustomers(results.data.items, text) : { exact: null, suggestions: [] }
  const phone = looksLikePhone(query)
  const creating = value?.kind === 'new'

  useEffect(() => {
    if (!settled || value?.kind === 'existing') return
    if (exact) onChange({ kind: 'existing', customer: exact })
    // A full mobile number that nobody has yet starts a new customer right away.
    else if (allowCreate && !creating && digitsOf(text).length >= 10 && looksLikePhone(text) && suggestions.length === 0) {
      onChange({ kind: 'new', draft: { name: '', contact: text, address: '', email: '' } })
    }
  }, [settled, exact, text]) // eslint-disable-line react-hooks/exhaustive-deps

  if (value?.kind === 'existing') {
    const { customer } = value
    return (
      <Field label={label} required group error={errors.customer_id} className="sm:col-span-2">
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-medium text-slate-900">{customer.name}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><Phone size={12} />{customer.contact}</span>
              {customer.email && <span className="inline-flex items-center gap-1"><Mail size={12} />{customer.email}</span>}
              {customer.address && <span className="inline-flex items-center gap-1"><MapPin size={12} />{customer.address}</span>}
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={X} onClick={() => { setQuery(''); onChange(null) }}>Change</Button>
        </div>
      </Field>
    )
  }

  function search(next: string) {
    setQuery(next)
    // Keep a started new-customer form in step with the number being typed.
    if (creating) onChange(looksLikePhone(next) ? { kind: 'new', draft: { ...value.draft, contact: next.trim() } } : null)
  }

  const setDraft = (patch: Partial<NewCustomerDraft>) => creating && onChange({ kind: 'new', draft: { ...value.draft, ...patch } })

  return (
    <div className="space-y-3 sm:col-span-2">
      <Field label={label} required error={errors.customer_id} hint="Mobile number or name. Each mobile number belongs to one customer.">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            value={query}
            placeholder="Type a mobile number or name"
            aria-invalid={!!errors.customer_id || undefined}
            className={clsx(controlClass(!!errors.customer_id), 'pl-9')}
            onChange={(event) => search(event.target.value)}
          />
        </div>
      </Field>

      {!creating && suggestions.length > 0 && (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {suggestions.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onChange({ kind: 'existing', customer })}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{customer.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">{customer.contact}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!creating && query.trim() && !settled && <p className="text-xs text-slate-400">Searching…</p>}

      {!creating && settled && !exact && suggestions.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
          <span>No customer found{phone ? ' with this mobile number' : ''}.</span>
          {allowCreate && (
            <Button
              size="sm"
              variant="secondary"
              icon={UserPlus}
              onClick={() => onChange({ kind: 'new', draft: { name: phone ? '' : query.trim(), contact: phone ? query.trim() : '', address: '', email: '' } })}
            >
              Add as new customer
            </Button>
          )}
        </div>
      )}

      {creating && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700"><UserPlus size={15} /> New customer</span>
            <button type="button" onClick={() => onChange(null)} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={errors['customer.name']}>
              <Input maxLength={200} value={value.draft.name} invalid={!!errors['customer.name']} onChange={(event) => setDraft({ name: event.target.value })} />
            </Field>
            <Field label="Mobile no" required error={errors['customer.contact']}>
              <Input type="tel" inputMode="tel" maxLength={50} value={value.draft.contact} invalid={!!errors['customer.contact']} onChange={(event) => setDraft({ contact: event.target.value })} />
            </Field>
            <Field label="Address" error={errors['customer.address']} className="sm:col-span-2">
              <Textarea rows={2} maxLength={4000} value={value.draft.address} invalid={!!errors['customer.address']} onChange={(event) => setDraft({ address: event.target.value })} />
            </Field>
            <Field label="Email" hint="Optional" error={errors['customer.email']}>
              <Input type="text" inputMode="email" autoComplete="email" maxLength={254} value={value.draft.email} invalid={!!errors['customer.email']} onChange={(event) => setDraft({ email: event.target.value })} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-slate-500">The customer is added when this entry is saved. Each mobile number can belong to only one customer.</p>
        </div>
      )}
    </div>
  )
}
