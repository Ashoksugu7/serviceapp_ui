'use client'

import clsx from 'clsx'
import { PackageCheck, Pencil, Send, Truck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge, Button, SegmentedTabs, Table, Td, Th } from '@/components/ui'
import { FilterSelect, ListCard } from '@/components/ui/list'
import { ConfirmDialog, useToast } from '@/components/ui/overlay'
import { useCompanyId } from '@/components/shell/identity'
import { apiErrorMessage } from '@/lib/api-client'
import { formatDate, localToday } from '@/lib/dates'
import { formatAmount } from '@/lib/format'
import { useApiMutation, useList, useListState, useResource } from '@/lib/queries'
import type { OutStoreEntry, OutStoreShop, ServiceRequestDetail } from '@/lib/types'
import { OutStoreEntryDrawer } from './entry-drawer'

type Tab = 'SENT' | 'RECEIVED_BACK' | ''

export function isOverdue(entry: OutStoreEntry): boolean {
  return entry.status === 'SENT' && !!entry.due_date && entry.due_date < localToday()
}

export function OutStoreScreen() {
  const companyId = useCompanyId()!
  const base = `/companies/${companyId}`
  const [tab, setTab] = useState<Tab>('SENT')
  const list = useListState({ shop_id: '' })
  // Out-Store entries are paged and filtered by the API.
  const entries = useList<OutStoreEntry>(`${base}/out-store-entries`, { ...list.params, status: tab, sort: 'sent_date', order: tab === 'SENT' ? 'asc' : 'desc' })
  const shops = useList<OutStoreShop>(`${base}/out-store-shops`)
  const shopName = (id: string) => shops.data?.items.find((shop) => shop.id === id)?.shop_name ?? '—'
  const [drawer, setDrawer] = useState<{ entry?: OutStoreEntry } | null>(null)
  const [receiving, setReceiving] = useState<OutStoreEntry | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={tab}
          onChange={(value) => { setTab(value); list.setPage(1) }}
          items={[{ value: 'SENT', label: 'At shops', icon: Truck }, { value: 'RECEIVED_BACK', label: 'Received back', icon: PackageCheck }, { value: '', label: 'All' }]}
        />
        <Button icon={Send} onClick={() => setDrawer({})}>Send to Out-Store</Button>
      </div>

      <ListCard
        query={entries}
        page={list.page}
        onPage={list.setPage}
        toolbar={
          <FilterSelect
            label="Shop"
            value={list.filters.shop_id}
            onChange={(value) => list.setFilter('shop_id', value)}
            options={[{ value: '', label: 'All shops' }, ...(shops.data?.items ?? []).map((shop) => ({ value: shop.id, label: shop.shop_name }))]}
          />
        }
        empty={{
          icon: Truck,
          title: tab === 'SENT' ? 'Nothing is out at a shop' : 'No Out-Store entries',
          description: 'Send a record from here, from Service Entry or from the record page.',
        }}
      >
        {(items) => (
          <Table>
            <thead>
              <tr><Th>Record</Th><Th>Shop</Th><Th>Sent</Th><Th>Expected back</Th><Th className="hidden text-right md:table-cell">Price</Th><Th>Status</Th><Th /></tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60">
                  <Td><RecordCell base={base} id={entry.service_request_id} /></Td>
                  <Td>
                    {shopName(entry.shop_id)}
                    {entry.remarks && <div className="max-w-[12rem] truncate text-xs text-slate-400" title={entry.remarks}>{entry.remarks}</div>}
                  </Td>
                  <Td className="tabular-nums">{formatDate(entry.sent_date)}</Td>
                  <Td className={clsx('tabular-nums', isOverdue(entry) && 'font-medium text-rose-600')}>
                    {formatDate(entry.due_date)}
                    {isOverdue(entry) && <div className="text-[11px] font-normal">Overdue</div>}
                  </Td>
                  <Td className="hidden text-right tabular-nums md:table-cell">{formatAmount(entry.price)}</Td>
                  <Td>
                    {entry.status === 'SENT'
                      ? <Badge tone="warning">At shop</Badge>
                      : <Badge tone="success">Back {entry.received_back_at ? formatDate(entry.received_back_at.slice(0, 10)) : ''}</Badge>}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    {entry.status === 'SENT' && (
                      <>
                        <Button size="sm" variant="ghost" icon={Pencil} aria-label="Edit entry" onClick={() => setDrawer({ entry })} />
                        <Button size="sm" variant="secondary" icon={PackageCheck} onClick={() => setReceiving(entry)}>Receive</Button>
                      </>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      {drawer && <OutStoreEntryDrawer base={base} entry={drawer.entry} onClose={() => setDrawer(null)} />}
      <ReceiveDialog base={base} entry={receiving} shopName={receiving ? shopName(receiving.shop_id) : ''} onClose={() => setReceiving(null)} />
    </div>
  )
}

// The entries list only carries IDs, so each row resolves its record (cached).
function RecordCell({ base, id }: { base: string; id: string }) {
  const record = useResource<ServiceRequestDetail>(`${base}/service-requests/${id}`)
  if (!record.data) return <span className="text-slate-400">{record.error ? 'Unavailable' : '…'}</span>
  return (
    <Link href={`/records/${id}`} className="group">
      <span className="font-mono text-sm font-semibold text-slate-900 group-hover:text-brand-700">{record.data.request_no}</span>
      <span className="block text-xs text-slate-500">{record.data.customer.name} · {record.data.status_name}</span>
    </Link>
  )
}

export function ReceiveDialog({ base, entry, shopName, onClose }: { base: string; entry: OutStoreEntry | null; shopName: string; onClose: () => void }) {
  const receive = useApiMutation<OutStoreEntry>([`${base}/out-store-entries`, `${base}/service-requests`])
  const notify = useToast()
  return (
    <ConfirmDialog
      open={entry !== null}
      title="Receive back from shop?"
      message={<>The item is marked back from <span className="font-medium text-slate-800">{shopName}</span> today, and the record moves to its profile&apos;s Received status.</>}
      confirmLabel="Receive back"
      busy={receive.isPending}
      onClose={onClose}
      onConfirm={() => entry && receive.mutate(
        { path: `${base}/out-store-entries/${entry.id}/receive-back`, method: 'POST', body: {} },
        {
          onSuccess: () => { notify('Item received back.'); onClose() },
          onError: (error) => { notify(apiErrorMessage(error), 'danger'); onClose() },
        },
      )}
    />
  )
}
