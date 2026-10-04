'use client'

import clsx from 'clsx'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Badge, Button, Card, CardHeader, Checkbox, EmptyState, Field, Input, Skeleton } from '@/components/ui'
import { ConfirmDialog, Drawer, useToast } from '@/components/ui/overlay'
import { api, apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, useAll, useApiMutation } from '@/lib/queries'
import type { ProfileStatus, ServiceProfile } from '@/lib/types'
import { moveItem } from './fields-panel'

export function StatusesPanel({ profilePath, profile, canWrite }: { profilePath: string; profile: ServiceProfile; canWrite: boolean }) {
  const statusesPath = `${profilePath}/statuses`
  const statuses = useAll<ProfileStatus>(statusesPath)
  const save = useApiMutation<ProfileStatus>([profilePath])
  const client = useQueryClient()
  const notify = useToast()
  const [editor, setEditor] = useState<{ status: ProfileStatus | null } | null>(null)
  const [reordering, setReordering] = useState(false)
  // Unused statuses can be deleted; the API explains why a used one cannot (T32).
  const remove = useApiMutation<void>([profilePath])
  const [deleting, setDeleting] = useState<ProfileStatus | null>(null)
  const ordered = [...(statuses.data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const editing = editor?.status ?? null
  const errors = fieldErrors(save.error)

  async function move(index: number, direction: -1 | 1) {
    const next = moveItem(ordered, index, direction)
    if (next === ordered) return
    setReordering(true)
    try {
      await Promise.all(
        next
          .map((status, position) => ({ status, position }))
          .filter(({ status, position }) => status.sort_order !== position)
          .map(({ status, position }) => api(`${statusesPath}/${status.id}`, { method: 'PATCH', body: JSON.stringify({ sort_order: position }) })),
      )
    } catch (error) {
      notify(apiErrorMessage(error), 'danger')
    } finally {
      await client.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith(profilePath) })
      setReordering(false)
    }
  }

  function submit(form: HTMLFormElement) {
    const data = new FormData(form)
    const body = {
      name: String(data.get('name') ?? '').trim(),
      initial: data.get('initial') === 'on',
      closed: data.get('closed') === 'on',
      enabled: data.get('enabled') === 'on',
      ...(editing ? {} : { sort_order: (ordered.at(-1)?.sort_order ?? -1) + 1 }),
    }
    save.mutate(
      { path: editing ? `${statusesPath}/${editing.id}` : statusesPath, method: editing ? 'PATCH' : 'POST', body },
      { onSuccess: (status) => { notify(editing ? `${status.name} was updated.` : `${status.name} was added.`); setEditor(null) } },
    )
  }

  const mapped = (id: string) =>
    id === profile.sent_status_id ? 'Out-Store sent' : id === profile.received_status_id ? 'Out-Store received' : null

  return (
    <Card>
      <CardHeader
        title="Statuses"
        description="The workflow a record moves through. New records start at the initial status; closed statuses finish the job."
        actions={canWrite && <Button size="sm" icon={Plus} onClick={() => { save.reset(); setEditor({ status: null }) }}>Add status</Button>}
      />
      {statuses.isPending ? (
        <div className="space-y-2 p-5">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-9 w-full" />)}</div>
      ) : statuses.error ? (
        <p className="p-5 text-sm text-rose-600">{apiErrorMessage(statuses.error)}</p>
      ) : ordered.length === 0 ? (
        <EmptyState icon={Plus} title="No statuses yet" description="Add at least one initial status before creating records." />
      ) : (
        <ol className={clsx('divide-y divide-slate-100', reordering && 'pointer-events-none opacity-60')}>
          {ordered.map((status, index) => (
            <li key={status.id} className={clsx('flex items-center gap-3 px-5 py-2.5', !status.enabled && 'bg-slate-50/70')}>
              {canWrite && (
                <div className="flex flex-col">
                  <button aria-label={`Move ${status.name} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={13} /></button>
                  <button aria-label={`Move ${status.name} down`} disabled={index === ordered.length - 1} onClick={() => move(index, 1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={13} /></button>
                </div>
              )}
              <span className="w-5 text-right text-xs tabular-nums text-slate-400">{index + 1}</span>
              <span className={clsx('flex-1 text-sm font-medium', status.enabled ? 'text-slate-900' : 'text-slate-400 line-through')}>{status.name}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {status.initial && <Badge tone="brand">Initial</Badge>}
                {status.closed && <Badge>Closed</Badge>}
                {mapped(status.id) && <Badge tone="warning">{mapped(status.id)}</Badge>}
                {!status.enabled && <Badge tone="danger">Disabled</Badge>}
              </div>
              {canWrite && (
                <div className="flex shrink-0 items-center">
                  <Button size="sm" variant="ghost" onClick={() => { save.reset(); setEditor({ status }) }}>Edit</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Delete ${status.name}`} onClick={() => { remove.reset(); setDeleting(status) }} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add status'}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save status' : 'Add status'}
        submitting={save.isPending}
        error={formError(save.error)}
      >
        <Field label="Name" required error={errors.name}><Input name="name" required maxLength={200} defaultValue={editing?.name} invalid={!!errors.name} /></Field>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4">
          <Checkbox name="initial" defaultChecked={editing?.initial} label="Initial — new records start here (replaces the current initial status)" />
          <Checkbox name="closed" defaultChecked={editing?.closed} label="Closed — the job is finished; users cannot edit closed records" />
          <Checkbox name="enabled" defaultChecked={editing?.enabled ?? true} label="Enabled — can be selected on records" />
        </div>
        {(errors.initial || errors.closed || errors.enabled) && <p className="text-xs text-rose-600">{errors.initial ?? errors.closed ?? errors.enabled}</p>}
        <p className="text-xs text-slate-500">Disabled statuses stay on existing records. The initial status and statuses used by Out-Store cannot be disabled.</p>
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? ''}?`}
        message={
          <div className="space-y-3">
            <p>The status is removed from this profile. Only statuses that no record has ever used can be deleted; otherwise disable it.</p>
            {remove.error && <Alert>{apiErrorMessage(remove.error)}</Alert>}
          </div>
        }
        confirmLabel="Delete status"
        danger
        busy={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(
          { path: `${statusesPath}/${deleting.id}`, method: 'DELETE' },
          { onSuccess: () => { notify(`${deleting.name} was deleted.`); setDeleting(null) } },
        )}
      />
    </Card>
  )
}
