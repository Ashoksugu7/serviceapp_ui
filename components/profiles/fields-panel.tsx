'use client'

import clsx from 'clsx'
import { ArrowDown, ArrowUp, Lock, Pencil, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Skeleton } from '@/components/ui'
import { Drawer, useToast } from '@/components/ui/overlay'
import { api, apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, useAll, useApiMutation, useResource } from '@/lib/queries'
import type { FormDefinition, ProfileField, ServiceProfile } from '@/lib/types'
import { FieldEditor, type FieldDraft } from './field-editor'
import { fieldType } from './field-types'

const CORE_KEYS = ['service_date', 'customer_contact', 'customer_name'] as const
const CORE_HINTS: Record<(typeof CORE_KEYS)[number], string> = {
  service_date: 'Date',
  customer_contact: 'Finds or adds the customer',
  customer_name: 'Filled from customer',
}

export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = [...items]
  const target = index + direction
  if (target < 0 || target >= next.length) return items
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function FieldsPanel({ profilePath, profile, canWrite }: { profilePath: string; profile: ServiceProfile; canWrite: boolean }) {
  const fieldsPath = `${profilePath}/fields`
  const fields = useAll<ProfileField>(fieldsPath)
  const form = useResource<FormDefinition>(`${profilePath}/form`)
  const save = useApiMutation<ProfileField>([fieldsPath, `${profilePath}/form`])
  const client = useQueryClient()
  const notify = useToast()
  const [editor, setEditor] = useState<{ field: ProfileField | null } | null>(null)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [reordering, setReordering] = useState(false)

  const ordered = [...(fields.data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
  const numberFields = ordered.filter((field) => field.type === 'number')

  function saveField(draft: FieldDraft) {
    const editing = editor?.field
    const body = editing
      ? { label: draft.label, required: draft.required, enabled: draft.enabled, config: draft.config, ...(draft.type !== editing.type ? { type: draft.type } : {}) }
      : { ...draft, sort_order: (ordered.at(-1)?.sort_order ?? -1) + 1 }
    save.mutate(
      { path: editing ? `${fieldsPath}/${editing.id}` : fieldsPath, method: editing ? 'PATCH' : 'POST', body },
      { onSuccess: (field) => { notify(editing ? `${field.label} was updated.` : `${field.label} was added.`); setEditor(null) } },
    )
  }

  // Rewrites sort_order as 0..n for every field whose position changed.
  async function move(index: number, direction: -1 | 1) {
    const next = moveItem(ordered, index, direction)
    if (next === ordered) return
    setReordering(true)
    try {
      await Promise.all(
        next
          .map((field, position) => ({ field, position }))
          .filter(({ field, position }) => field.sort_order !== position)
          .map(({ field, position }) => api(`${fieldsPath}/${field.id}`, { method: 'PATCH', body: JSON.stringify({ sort_order: position }) })),
      )
    } catch (error) {
      notify(apiErrorMessage(error), 'danger')
    } finally {
      await client.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith(profilePath) })
      setReordering(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Built-in fields"
          description="Always on the form. They can be renamed but not removed."
          actions={canWrite && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setLabelsOpen(true)}>Rename</Button>}
        />
        <ul className="divide-y divide-slate-100">
          {CORE_KEYS.map((key) => (
            <li key={key} className="flex items-center gap-3 px-5 py-2.5 text-sm">
              <Lock size={14} className="shrink-0 text-slate-300" />
              <span className="font-medium text-slate-800">{profile.core_labels[key]}</span>
              <span className="ml-auto text-xs text-slate-400">{CORE_HINTS[key]}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Form fields"
          description="Shown on Service Entry in this order, after the built-in fields."
          actions={canWrite && <Button size="sm" icon={Plus} onClick={() => { save.reset(); setEditor({ field: null }) }}>Add field</Button>}
        />
        {fields.isPending ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-10 w-full" />)}</div>
        ) : fields.error ? (
          <p className="p-5 text-sm text-rose-600">{apiErrorMessage(fields.error)}</p>
        ) : ordered.length === 0 ? (
          <EmptyState icon={Plus} title="No fields yet" description="Add fields such as Complaint, Serial No or Service Engineer." />
        ) : (
          <ul className={clsx('divide-y divide-slate-100', reordering && 'pointer-events-none opacity-60')}>
            {ordered.map((field, index) => {
              const { icon: Icon, label: typeLabel } = fieldType(field.type)
              return (
                <li key={field.id} className={clsx('flex items-center gap-3 px-5 py-2.5', !field.enabled && 'bg-slate-50/70')}>
                  {canWrite && (
                    <div className="flex flex-col">
                      <button aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
                        <ArrowUp size={13} />
                      </button>
                      <button aria-label={`Move ${field.label} down`} disabled={index === ordered.length - 1} onClick={() => move(index, 1)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  )}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={clsx('truncate text-sm font-medium', field.enabled ? 'text-slate-900' : 'text-slate-400 line-through')}>
                      {field.label}
                      {field.required && <span className="ml-0.5 text-brand-600">*</span>}
                    </div>
                    <div className="truncate font-mono text-[11px] text-slate-400">{field.key}</div>
                  </div>
                  <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                    <Badge>{typeLabel}</Badge>
                    {field.type === 'number' && !!field.config.formula && <Badge tone="brand">Calculated</Badge>}
                    {!field.enabled && <Badge tone="warning">Hidden</Badge>}
                  </div>
                  {canWrite && <Button size="sm" variant="ghost" onClick={() => { save.reset(); setEditor({ field }) }}>Edit</Button>}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <FieldEditor
        open={editor !== null}
        field={editor?.field ?? null}
        prefix={profile.prefix}
        numberFields={numberFields}
        staffRoles={form.data?.staff_roles ?? []}
        saving={save.isPending}
        error={save.error}
        onClose={() => setEditor(null)}
        onSave={saveField}
      />

      {labelsOpen && <CoreLabelsDrawer profilePath={profilePath} profile={profile} onClose={() => setLabelsOpen(false)} />}
    </div>
  )
}

function CoreLabelsDrawer({ profilePath, profile, onClose }: { profilePath: string; profile: ServiceProfile; onClose: () => void }) {
  const save = useApiMutation<ServiceProfile>([profilePath.replace(/\/[^/]+$/, '')])
  const notify = useToast()
  const errors = fieldErrors(save.error)
  const names: Record<(typeof CORE_KEYS)[number], string> = { service_date: 'Date', customer_contact: 'Customer mobile number', customer_name: 'Customer name' }

  return (
    <Drawer
      open
      title="Rename built-in fields"
      description="Only the labels change; records are not affected."
      onClose={onClose}
      submitLabel="Save labels"
      submitting={save.isPending}
      error={formError(save.error)}
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget)
        const core_labels = Object.fromEntries(CORE_KEYS.map((key) => [key, String(data.get(key) ?? '').trim()]))
        save.mutate({ path: profilePath, method: 'PATCH', body: { core_labels } }, { onSuccess: () => { notify('Labels were updated.'); onClose() } })
      }}
    >
      {CORE_KEYS.map((key) => (
        <Field key={key} label={names[key]} required error={errors[`core_labels.${key}`] ?? errors[key]}>
          <Input name={key} required maxLength={200} defaultValue={profile.core_labels[key]} />
        </Field>
      ))}
    </Drawer>
  )
}
