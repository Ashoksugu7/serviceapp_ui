'use client'

import clsx from 'clsx'
import { PackageCheck, Send, Truck } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, CardHeader } from '@/components/ui'
import { formatDate } from '@/lib/dates'
import { formatAmount } from '@/lib/format'
import { useAll, useList } from '@/lib/queries'
import type { OutStoreEntry, ServiceProfile, ServiceRequestDetail } from '@/lib/types'
import { OutStoreEntryDrawer } from './entry-drawer'
import { isOverdue, ReceiveDialog } from './out-store-screen'

// Out-Store entries for one record, with send / receive actions.
export function RecordOutStoreCard({ base, record, closed }: { base: string; record: ServiceRequestDetail; closed: boolean }) {
  const entries = useList<OutStoreEntry>(`${base}/out-store-entries`, { service_request_id: record.id, sort: 'sent_date', order: 'desc', page_size: 100 })
  const profiles = useAll<ServiceProfile>(`${base}/service-profiles`)
  const [sending, setSending] = useState(false)
  const [receiving, setReceiving] = useState<OutStoreEntry | null>(null)

  const profile = profiles.data?.items.find((item) => item.id === record.profile_id)
  const ready = !!profile?.out_store_enabled && !!profile.sent_status_id && !!profile.received_status_id
  const items = entries.data?.items ?? []
  if (!ready && items.length === 0) return null

  const outstanding = items.some((entry) => entry.status === 'SENT')

  return (
    <Card>
      <CardHeader
        title="Out-Store"
        actions={ready && !outstanding && !closed && <Button size="sm" variant="secondary" icon={Send} onClick={() => setSending(true)}>Send</Button>}
      />
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-4 text-sm text-slate-400"><Truck size={14} /> Not sent to a shop.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((entry) => (
            <li key={entry.id} className="space-y-1 px-5 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{entry.shop_name ?? 'Shop'}</span>
                {entry.status === 'SENT' ? <Badge tone="warning">At shop</Badge> : <Badge tone="success">Back</Badge>}
              </div>
              <div className="text-xs text-slate-500">
                Sent {formatDate(entry.sent_date)}
                {entry.due_date && <span className={clsx(isOverdue(entry) && 'font-medium text-rose-600')}> · due {formatDate(entry.due_date)}</span>}
                {entry.price && <> · {formatAmount(entry.price)}</>}
                {entry.received_back_at && <> · back {formatDate(entry.received_back_at.slice(0, 10))}</>}
              </div>
              {entry.status === 'SENT' && (
                <Button size="sm" variant="secondary" icon={PackageCheck} className="mt-1" onClick={() => setReceiving(entry)}>Receive back</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {sending && (
        <OutStoreEntryDrawer
          base={base}
          record={{ id: record.id, label: `${record.request_no} · ${record.customer.name}`, profileId: record.profile_id }}
          onClose={() => setSending(false)}
        />
      )}
      <ReceiveDialog base={base} entry={receiving} shopName={receiving?.shop_name ?? ''} onClose={() => setReceiving(null)} />
    </Card>
  )
}
