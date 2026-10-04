'use client'

import { useState } from 'react'
import { Field, Input, Select } from '@/components/ui'
import { QuickDateInput } from '@/components/ui/date-input'
import { Drawer, useToast } from '@/components/ui/overlay'
import { RecordPicker } from '@/components/records/record-picker'
import { APIError, formError } from '@/lib/api-client'
import { localToday } from '@/lib/dates'
import { useApiMutation, useList } from '@/lib/queries'
import type { OutStoreEntry, OutStoreShop, ServiceProfile } from '@/lib/types'

type Draft = { recordId: string; recordLabel?: string; profileId?: string; shopId: string; sentDate: string; dueDate: string; price: string; remarks: string }

// Sends a record to an Out-Store shop, or edits an entry that is still out.
export function OutStoreEntryDrawer({ base, entry, record, onClose }: {
  base: string
  entry?: OutStoreEntry
  record?: { id: string; label: string; profileId: string }
  onClose: () => void
}) {
  const shops = useList<OutStoreShop>(`${base}/out-store-shops`)
  const profiles = useList<ServiceProfile>(`${base}/service-profiles`)
  // Sending changes the record's status too, so refresh records as well.
  const save = useApiMutation<OutStoreEntry>([`${base}/out-store-entries`, `${base}/service-requests`])
  const notify = useToast()
  const [draft, setDraft] = useState<Draft>(() =>
    entry
      ? { recordId: entry.service_request_id, shopId: entry.shop_id, sentDate: entry.sent_date, dueDate: entry.due_date ?? '', price: entry.price ?? '', remarks: entry.remarks ?? '' }
      : { recordId: record?.id ?? '', recordLabel: record?.label, profileId: record?.profileId, shopId: '', sentDate: localToday(), dueDate: '', price: '', remarks: '' },
  )
  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))
  const errors = save.error instanceof APIError && save.error.fields ? save.error.fields : {}

  const readyProfiles = new Set(
    (profiles.data?.items ?? []).filter((profile) => profile.out_store_enabled && profile.sent_status_id && profile.received_status_id).map((profile) => profile.id),
  )
  const profileId = draft.profileId
  const shopList = (shops.data?.items ?? []).filter(
    (shop) => (shop.status === 'ACTIVE' || shop.id === entry?.shop_id) && (!shop.profile_id || !profileId || shop.profile_id === profileId),
  )

  function submit() {
    const details = { shop_id: draft.shopId, sent_date: draft.sentDate, due_date: draft.dueDate || null, price: draft.price || null, remarks: draft.remarks.trim() || null }
    save.mutate(
      entry
        ? { path: `${base}/out-store-entries/${entry.id}`, method: 'PATCH', body: details }
        : { path: `${base}/out-store-entries`, method: 'POST', body: { ...details, service_request_id: draft.recordId } },
      { onSuccess: () => { notify(entry ? 'Out-Store entry was updated.' : `${draft.recordLabel ?? 'Record'} was sent to Out-Store.`); onClose() } },
    )
  }

  const profileBlocked = !entry && profileId && profiles.data && !readyProfiles.has(profileId)

  return (
    <Drawer
      open
      title={entry ? 'Edit Out-Store entry' : 'Send to Out-Store'}
      description={entry ? 'Only entries still at the shop can be changed.' : "The record moves to its profile's Sent status."}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={entry ? 'Save changes' : 'Send'}
      submitting={save.isPending}
      error={formError(save.error)}
    >
      {!entry && (
        <Field label="Record" required error={errors.service_request_id}>
          {record ? (
            <Input readOnly value={record.label} />
          ) : (
            <RecordPicker
              base={base}
              value={draft.recordId}
              label={draft.recordLabel}
              invalid={!!errors.service_request_id}
              onChange={(picked) => set({ recordId: picked?.id ?? '', recordLabel: picked ? `${picked.request_no} · ${picked.customer_name ?? ''}` : undefined, profileId: picked?.profile_id, shopId: '' })}
            />
          )}
        </Field>
      )}
      {profileBlocked && <p className="text-xs text-amber-700">This record&apos;s profile is not set up for Out-Store. An admin can enable it in Service Profiles.</p>}
      <Field label="Shop" required error={errors.shop_id}>
        <Select required value={draft.shopId} invalid={!!errors.shop_id} onChange={(event) => set({ shopId: event.target.value })}>
          <option value="">{shopList.length ? 'Select shop' : 'No active shops'}</option>
          {shopList.map((shop) => <option key={shop.id} value={shop.id}>{shop.shop_name}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sent on" required error={errors.sent_date}>
          <Input type="date" required value={draft.sentDate} invalid={!!errors.sent_date} onChange={(event) => set({ sentDate: event.target.value })} />
        </Field>
        <Field label="Expected back" error={errors.due_date}>
          <QuickDateInput value={draft.dueDate} onChange={(dueDate) => set({ dueDate })} from={draft.sentDate} includeToday={false} min={draft.sentDate} invalid={!!errors.due_date} />
        </Field>
      </div>
      <Field label="Shop price" error={errors.price} hint="Informational only.">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
          <Input type="number" min={0} step="0.01" className="pl-7" value={draft.price} invalid={!!errors.price} onChange={(event) => set({ price: event.target.value })} />
        </div>
      </Field>
      <Field label="Remarks" error={errors.remarks}>
        <Input maxLength={4000} value={draft.remarks} onChange={(event) => set({ remarks: event.target.value })} />
      </Field>
    </Drawer>
  )
}
