'use client'

import { Archive, RotateCcw, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, Select } from '@/components/ui'
import { ConfirmDialog, useToast } from '@/components/ui/overlay'
import { apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, useApiMutation, useList } from '@/lib/queries'
import type { ProfileStatus, ServiceProfile } from '@/lib/types'

export function SettingsPanel({ profilesPath, profile, canWrite, isLastActive, onArchived }: {
  profilesPath: string
  profile: ServiceProfile
  canWrite: boolean
  isLastActive: boolean
  onArchived: () => void
}) {
  const profilePath = `${profilesPath}/${profile.id}`
  const statuses = useList<ProfileStatus>(`${profilePath}/statuses`)
  const mapping = useApiMutation<ServiceProfile>([profilesPath])
  const details = useApiMutation<ServiceProfile>([profilesPath])
  const archive = useApiMutation<void>([profilesPath])
  const reactivate = useApiMutation<ServiceProfile>([profilesPath])
  const router = useRouter()
  const notify = useToast()
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [form, setForm] = useState({
    name: profile.name,
    prefix: profile.prefix,
    outStore: profile.out_store_enabled,
    sent: profile.sent_status_id ?? '',
    received: profile.received_status_id ?? '',
  })
  const [notice, setNotice] = useState<string | null>(null)
  const saving = mapping.isPending || details.isPending
  const failure = mapping.error ?? details.error
  const errors = fieldErrors(failure)
  const enabledStatuses = [...(statuses.data?.items ?? [])].filter((status) => status.enabled).sort((a, b) => a.sort_order - b.sort_order)
  const set = (patch: Partial<typeof form>) => { setNotice(null); setForm((current) => ({ ...current, ...patch })) }

  // The counter starts at 1001 and moves on the first record, after which the
  // API no longer allows prefix changes.
  const hasRecords = profile.next_number > 1001

  // Out-Store needs its two statuses before it can be switched on, so one save
  // stores the statuses first and then the profile details.
  async function save() {
    setNotice(null)
    mapping.reset()
    details.reset()
    if (form.outStore) {
      if (!form.sent || !form.received) return setNotice('Choose both Out-Store statuses.')
      if (form.sent === form.received) return setNotice('Sent and received back must be different statuses.')
    }
    const mappingChanged = form.outStore && (form.sent !== (profile.sent_status_id ?? '') || form.received !== (profile.received_status_id ?? ''))
    const name = form.name.trim()
    const prefix = form.prefix.trim().toUpperCase()
    const body = {
      ...(name !== profile.name ? { name } : {}),
      ...(prefix !== profile.prefix ? { prefix } : {}),
      ...(form.outStore !== profile.out_store_enabled ? { out_store_enabled: form.outStore } : {}),
    }
    if (!mappingChanged && Object.keys(body).length === 0) return setNotice('Nothing has changed.')
    try {
      if (mappingChanged) {
        await mapping.mutateAsync({ path: `${profilePath}/out-store-mapping`, method: 'PUT', body: { sent_status_id: form.sent, received_status_id: form.received } })
      }
      if (Object.keys(body).length > 0) await details.mutateAsync({ path: profilePath, method: 'PATCH', body })
      notify(`${name || profile.name} was saved.`)
      router.refresh()
    } catch {
      // The error is shown from the mutation state.
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Profile details" />
        <form onSubmit={(event) => { event.preventDefault(); void save() }}>
          <CardBody className="space-y-5">
            {notice && <Alert>{notice}</Alert>}
            {!notice && failure && <Alert>{formError(failure) ?? apiErrorMessage(failure)}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" required error={errors.name}>
                <Input required maxLength={200} value={form.name} disabled={!canWrite} invalid={!!errors.name} onChange={(event) => set({ name: event.target.value })} />
              </Field>
              <Field
                label="Number prefix"
                required
                error={errors.prefix}
                hint={hasRecords ? `Locked after the first record. Next: ${profile.prefix}${profile.next_number}` : `Next record: ${form.prefix || profile.prefix}${profile.next_number}`}
              >
                <Input
                  required
                  pattern="[A-Za-z]{1,10}"
                  maxLength={10}
                  className="uppercase"
                  value={form.prefix}
                  disabled={!canWrite || hasRecords}
                  invalid={!!errors.prefix}
                  onChange={(event) => set({ prefix: event.target.value.toUpperCase().replace(/[^A-Z]/g, '') })}
                />
              </Field>
            </div>

            <div className={form.outStore ? 'rounded-lg border border-slate-200 bg-slate-50/60 p-4' : ''}>
              <Checkbox
                checked={form.outStore}
                disabled={!canWrite}
                onChange={(event) => set({ outStore: event.target.checked })}
                label="Records can be sent to Out-Store shops"
              />
              {form.outStore && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500">When a record is sent to a shop and received back, it moves to these statuses.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Status when sent" required error={errors.sent_status_id}>
                      <Select required value={form.sent} disabled={!canWrite} onChange={(event) => set({ sent: event.target.value })}>
                        <option value="">Select status</option>
                        {enabledStatuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Status when received back" required error={errors.received_status_id}>
                      <Select required value={form.received} disabled={!canWrite} onChange={(event) => set({ received: event.target.value })}>
                        <option value="">Select status</option>
                        {enabledStatuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
                      </Select>
                    </Field>
                  </div>
                  {enabledStatuses.length < 2 && <p className="text-xs text-amber-700">Add at least two statuses in the Statuses tab first.</p>}
                </div>
              )}
            </div>
          </CardBody>
          {canWrite && (
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-3">
              <Button type="submit" icon={Save} loading={saving}>Save</Button>
            </div>
          )}
        </form>
      </Card>

      {canWrite && profile.is_active && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Archive profile</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isLastActive ? 'A company needs at least one active profile.' : 'No new records can be created. Existing records stay readable.'}
              </p>
            </div>
            <Button variant="danger" icon={Archive} disabled={isLastActive} onClick={() => setConfirmArchive(true)}>Archive</Button>
          </CardBody>
        </Card>
      )}

      {canWrite && !profile.is_active && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Archived</h2>
              <p className="mt-0.5 text-xs text-slate-500">Reactivate to take new records with this profile again.</p>
            </div>
            <Button
              variant="secondary"
              icon={RotateCcw}
              loading={reactivate.isPending}
              onClick={() => reactivate.mutate(
                { path: profilePath, method: 'PATCH', body: { is_active: true } },
                {
                  onSuccess: (result) => { notify(`${result.name} is active again.`); router.refresh() },
                  onError: (error) => notify(apiErrorMessage(error), 'danger'),
                },
              )}
            >
              Reactivate
            </Button>
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        open={confirmArchive}
        title={`Archive ${profile.name}?`}
        message="It disappears from Service Entry. Existing records, fields and statuses are kept."
        confirmLabel="Archive profile"
        danger
        busy={archive.isPending}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => archive.mutate(
          { path: profilePath, method: 'DELETE' },
          {
            onSuccess: () => { notify(`${profile.name} was archived.`); setConfirmArchive(false); onArchived(); router.refresh() },
            onError: (error) => { notify(apiErrorMessage(error), 'danger'); setConfirmArchive(false) },
          },
        )}
      />
    </div>
  )
}
