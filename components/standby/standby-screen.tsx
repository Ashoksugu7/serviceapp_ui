'use client'

import clsx from 'clsx'
import { History, PackageOpen, Phone, RotateCcw, Undo2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge, Button, Field, Input, SegmentedTabs, Select, Table, Td, Textarea, Th } from '@/components/ui'
import { QuickDateInput } from '@/components/ui/date-input'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { ConfirmDialog, Drawer, useToast } from '@/components/ui/overlay'
import { useCompanyId } from '@/components/shell/identity'
import { CustomerLookup } from '@/components/service-entry/customer-lookup'
import { RecordPicker } from '@/components/records/record-picker'
import { APIError, apiErrorMessage, formError } from '@/lib/api-client'
import { formatDate, localToday } from '@/lib/dates'
import { formatAmount } from '@/lib/format'
import { useApiMutation, useList, useListState, useLocalList } from '@/lib/queries'
import { daysLabel, localDate } from '@/lib/history'
import type { Customer, Product, StandbyIssue, StandbyIssueHistory, StandbyItem } from '@/lib/types'

const issuesPath = (base: string, itemId: string) => `${base}/standby-items/${itemId}/issues`

export function StandbyScreen() {
  const companyId = useCompanyId()!
  const base = `/companies/${companyId}`
  const [view, setView] = useState<'items' | 'history'>('items')
  return (
    <div className="space-y-4">
      <SegmentedTabs items={[{ value: 'items', label: 'Items', icon: Wrench }, { value: 'history', label: 'Lending history', icon: History }]} value={view} onChange={setView} />
      {view === 'items' ? <ItemsView base={base} /> : <LendingHistory base={base} />}
    </div>
  )
}

function ItemsView({ base }: { base: string }) {
  const list = useListState({ status: '' })
  const items = useLocalList<StandbyItem>(`${base}/standby-items`, list.params, (item) => [item.name, item.serial_no, item.category])
  const customers = useList<Customer>(`${base}/customers`)
  const customerName = (id: string) => customers.data?.items.find((customer) => customer.id === id)?.name ?? '—'
  const [issuing, setIssuing] = useState<StandbyItem | null>(null)
  const [returning, setReturning] = useState<{ item: StandbyItem; issue: StandbyIssue } | null>(null)
  const [historyFor, setHistoryFor] = useState<StandbyItem | null>(null)

  return (
    <>
      <ListCard
        query={items}
        page={list.page}
        onPage={list.setPage}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search item or serial no" />
            <FilterSelect
              label="Status"
              value={list.filters.status}
              onChange={(value) => list.setFilter('status', value)}
              options={[{ value: '', label: 'All items' }, { value: 'AVAILABLE', label: 'Available' }, { value: 'ISSUED', label: 'Issued' }, { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' }]}
            />
          </>
        }
        empty={{ icon: Wrench, title: 'No stand-by items found', description: 'Admins add loaner units under Masters → Stand-by Items.' }}
      >
        {(rows) => (
          <Table>
            <thead><tr><Th>Item</Th><Th>Status</Th><Th>With customer</Th><Th /></tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-400">{[item.serial_no, item.category, item.price && formatAmount(item.price)].filter(Boolean).join(' · ') || '—'}</div>
                  </Td>
                  <Td><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge></Td>
                  <Td>
                    {item.status === 'ISSUED'
                      ? <CurrentIssue base={base} item={item} customerName={customerName} onReturn={(issue) => setReturning({ item, issue })} />
                      : <span className="text-slate-400">—</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <Button size="sm" variant="ghost" icon={History} aria-label={`History of ${item.name}`} onClick={() => setHistoryFor(item)} />
                    {item.status === 'AVAILABLE' && <Button size="sm" variant="secondary" icon={PackageOpen} onClick={() => setIssuing(item)}>Issue</Button>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      {issuing && <IssueDrawer base={base} item={issuing} customers={customers.data?.items ?? []} onClose={() => setIssuing(null)} />}
      <ReturnDialog base={base} target={returning} customerName={returning ? customerName(returning.issue.customer_id) : ''} onClose={() => setReturning(null)} />
      {historyFor && <HistoryDrawer base={base} item={historyFor} onClose={() => setHistoryFor(null)} />}
    </>
  )
}

function useIssues(base: string, itemId: string) {
  return useList<StandbyIssueHistory>(issuesPath(base, itemId))
}

// Lent and received-back invalidate item state, lending history and the linked record's timeline.
const standbyKeys = (base: string) => [`${base}/standby-items`, `${base}/standby-issues`, `${base}/service-requests`]

function CurrentIssue({ base, item, customerName, onReturn }: { base: string; item: StandbyItem; customerName: (id: string) => string; onReturn: (issue: StandbyIssue) => void }) {
  const issues = useIssues(base, item.id)
  const issue = issues.data?.items.find((entry) => !entry.returned_at)
  if (!issue) return <span className="text-slate-400">{issues.isPending ? '…' : '—'}</span>
  const overdue = !!issue.due_date && issue.due_date < localToday()
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="font-medium text-slate-800">{issue.customer_name ?? customerName(issue.customer_id)}</div>
        <div className={clsx('text-xs', overdue ? 'font-medium text-rose-600' : 'text-slate-400')}>
          Since {formatDate(issue.issued_date)} ({daysLabel(issue.days_out)}){issue.due_date && ` · due ${formatDate(issue.due_date)}`}{overdue && ' · overdue'}
        </div>
      </div>
      <Button size="sm" variant="secondary" icon={Undo2} onClick={() => onReturn(issue)}>Return</Button>
    </div>
  )
}

function IssueDrawer({ base, item, customers, onClose }: { base: string; item: StandbyItem; customers: Customer[]; onClose: () => void }) {
  const products = useList<Product>(`${base}/products`)
  const issue = useApiMutation<unknown>(standbyKeys(base))
  const notify = useToast()
  const [customerId, setCustomerId] = useState('')
  const customer = customers.find((item) => item.id === customerId)
  const [record, setRecord] = useState<{ id: string; label: string; profileId: string } | null>(null)
  const [issuedDate, setIssuedDate] = useState(localToday())
  const [dueDate, setDueDate] = useState('')
  const [productId, setProductId] = useState('')
  const [notes, setNotes] = useState('')
  const errors = issue.error instanceof APIError && issue.error.fields ? issue.error.fields : {}
  // Product Received must match the linked record's profile, when one is linked.
  const productOptions = (products.data?.items ?? []).filter((product) => product.status === 'ACTIVE' && (!record || product.profile_id === record.profileId))

  return (
    <Drawer
      open
      title={`Issue ${item.name}`}
      description={item.serial_no ? `Serial ${item.serial_no}` : 'Lend this unit to a customer while their item is in service.'}
      onClose={onClose}
      submitLabel="Issue item"
      submitting={issue.isPending}
      error={formError(issue.error)}
      onSubmit={() => issue.mutate(
        {
          path: `${base}/standby-items/${item.id}/issue`,
          method: 'POST',
          body: { customer_id: customerId, issued_date: issuedDate, due_date: dueDate || null, service_request_id: record?.id ?? null, received_product_id: productId || null, notes: notes.trim() || null },
        },
        { onSuccess: () => { notify(`${item.name} was issued.`); onClose() } },
      )}
    >
      <CustomerLookup
        label="Customer"
        customers={customers}
        value={customer ? { kind: 'existing', customer } : null}
        errors={errors}
        onChange={(choice) => { setCustomerId(choice?.kind === 'existing' ? choice.customer.id : ''); setRecord(null) }}
      />
      <Field label="Linked record" error={errors.service_request_id} hint="Optional. Shows this customer's records.">
        <RecordPicker
          base={base}
          value={record?.id ?? ''}
          label={record?.label}
          customerId={customerId || undefined}
          invalid={!!errors.service_request_id}
          onChange={(picked) => { setRecord(picked ? { id: picked.id, label: `${picked.request_no} · ${picked.customer_name ?? ''}`, profileId: picked.profile_id } : null); setProductId('') }}
        />
      </Field>
      <Field label="Product received" error={errors.received_product_id} hint="The customer's item kept in exchange, if any.">
        <Select value={productId} invalid={!!errors.received_product_id} onChange={(event) => setProductId(event.target.value)}>
          <option value="">None</option>
          {productOptions.map((product) => <option key={product.id} value={product.id}>{product.brand ? `${product.name} · ${product.brand}` : product.name}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issued on" required error={errors.issued_date}>
          <Input type="date" required value={issuedDate} invalid={!!errors.issued_date} onChange={(event) => setIssuedDate(event.target.value)} />
        </Field>
        <Field label="Return by" error={errors.due_date}>
          <QuickDateInput value={dueDate} onChange={setDueDate} from={issuedDate} includeToday={false} min={issuedDate} invalid={!!errors.due_date} />
        </Field>
      </div>
      <Field label="Notes" error={errors.notes}><Textarea maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
    </Drawer>
  )
}

function ReturnDialog({ base, target, customerName, onClose }: { base: string; target: { item: StandbyItem; issue: StandbyIssue } | null; customerName: string; onClose: () => void }) {
  const returned = useApiMutation<unknown>(standbyKeys(base))
  const notify = useToast()
  return (
    <ConfirmDialog
      open={target !== null}
      title={`Return ${target?.item.name ?? ''}?`}
      message={<>Marks the item back from <span className="font-medium text-slate-800">{customerName}</span> now and makes it available again.</>}
      confirmLabel="Mark returned"
      busy={returned.isPending}
      onClose={onClose}
      onConfirm={() => target && returned.mutate(
        { path: `${base}/standby-items/${target.item.id}/return`, method: 'POST', body: { issue_id: target.issue.id } },
        {
          onSuccess: () => { notify(`${target.item.name} was returned.`); onClose() },
          onError: (error) => { notify(apiErrorMessage(error), 'danger'); onClose() },
        },
      )}
    />
  )
}

function HistoryDrawer({ base, item, onClose }: { base: string; item: StandbyItem; onClose: () => void }) {
  const issues = useIssues(base, item.id)
  const entries = issues.data?.items ?? []
  return (
    <Drawer open title={`${item.name} history`} description="Every time this item was lent out, who lent it and who received it back." onClose={onClose}>
      {issues.error && <p className="text-sm text-rose-600">{apiErrorMessage(issues.error)}</p>}
      {issues.isPending && <p className="text-sm text-slate-400">Loading…</p>}
      {!issues.isPending && entries.length === 0 && <p className="flex items-center gap-2 text-sm text-slate-400"><RotateCcw size={14} /> Never issued.</p>}
      <ol className="space-y-3">
        {entries.map((entry) => <IssueCard key={entry.id} entry={entry} />)}
      </ol>
    </Drawer>
  )
}

function IssueCard({ entry, showItem }: { entry: StandbyIssueHistory; showItem?: boolean }) {
  return (
    <li className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showItem && <div className="font-medium text-slate-900">{entry.serial_no ? `${entry.item_name} · ${entry.serial_no}` : entry.item_name}</div>}
          <div className={clsx(showItem ? 'text-slate-700' : 'font-medium text-slate-800')}>{entry.customer_name}</div>
          <a href={`tel:${entry.customer_contact.replace(/[^0-9+]/g, '')}`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700"><Phone size={11} />{entry.customer_contact}</a>
        </div>
        {entry.returned_at ? <Badge tone="success">Returned</Badge> : entry.overdue ? <Badge tone="danger">Overdue</Badge> : <Badge tone="warning">With customer</Badge>}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-slate-400">Lent</dt>
        <dd className="text-slate-700">{formatDate(entry.issued_date)}{entry.issued_by_name && ` by ${entry.issued_by_name}`}</dd>
        <dt className="text-slate-400">{entry.returned_at ? 'Returned' : 'Return by'}</dt>
        <dd className={clsx(entry.overdue ? 'font-medium text-rose-600' : 'text-slate-700')}>
          {entry.returned_at ? `${formatDate(localDate(entry.returned_at))}${entry.returned_by_name ? ` to ${entry.returned_by_name}` : ''}` : formatDate(entry.due_date)}
        </dd>
        <dt className="text-slate-400">{entry.returned_at ? 'Days out' : 'Out for'}</dt>
        <dd className="text-slate-700">{daysLabel(entry.days_out)}</dd>
      </dl>
      {entry.service_request_id && (
        <Link href={`/records/${entry.service_request_id}`} className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">
          {entry.request_no ? `Record ${entry.request_no}` : 'Open linked record'}
        </Link>
      )}
      {entry.notes && <p className="mt-1 whitespace-pre-line text-xs text-slate-600">{entry.notes}</p>}
    </li>
  )
}

function LendingHistory({ base }: { base: string }) {
  const list = useListState({ state: '' })
  const issues = useList<StandbyIssueHistory>(`${base}/standby-issues`, {
    contact: list.params.q,
    state: list.filters.state,
    page: list.page,
    page_size: 25,
  })
  return (
    <ListCard
      query={issues}
      page={list.page}
      onPage={list.setPage}
      toolbar={
        <>
          <SearchInput value={list.q} onChange={list.setQ} placeholder="Customer mobile number" />
          <FilterSelect
            label="State"
            value={list.filters.state}
            onChange={(value) => list.setFilter('state', value)}
            options={[{ value: '', label: 'All loans' }, { value: 'open', label: 'With customer' }, { value: 'returned', label: 'Returned' }]}
          />
        </>
      }
      empty={{ icon: History, title: list.q ? 'Nothing lent to this number' : 'Nothing lent yet', description: list.q ? 'Check the mobile number, or clear the search.' : 'Issued stand-by items appear here.' }}
    >
      {(rows) => <ol className="grid gap-3 p-4 md:grid-cols-2">{rows.map((entry) => <IssueCard key={entry.id} entry={entry} showItem />)}</ol>}
    </ListCard>
  )
}
