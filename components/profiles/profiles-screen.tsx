'use client'

import clsx from 'clsx'
import { ClipboardList, ListOrdered, Plus, Settings2, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Alert, Badge, Button, Card, Checkbox, EmptyState, Field, Input, SegmentedTabs, Skeleton } from '@/components/ui'
import { Drawer, useToast } from '@/components/ui/overlay'
import { apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, useAll, useApiMutation } from '@/lib/queries'
import type { ServiceProfile } from '@/lib/types'
import { FieldsPanel } from './fields-panel'
import { SettingsPanel } from './settings-panel'
import { StatusesPanel } from './statuses-panel'

type Tab = 'fields' | 'statuses' | 'settings'

function suggestPrefix(name: string) {
  return name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'C'
}

export function ProfilesScreen({ companyId, canWrite }: { companyId: string; canWrite: boolean }) {
  const profilesPath = `/companies/${companyId}/service-profiles`
  const profiles = useAll<ServiceProfile>(profilesPath)
  const create = useApiMutation<ServiceProfile>([profilesPath])
  const notify = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('fields')
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)
  const [prefix, setPrefix] = useState('')
  const [prefixEdited, setPrefixEdited] = useState(false)
  const errors = fieldErrors(create.error)

  const all = [...(profiles.data?.items ?? [])].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name))
  const visible = all.filter((profile) => showArchived || profile.is_active)
  const selected = all.find((profile) => profile.id === selectedId) ?? visible[0] ?? null
  const activeCount = all.filter((profile) => profile.is_active).length

  if (profiles.error) return <Alert>{apiErrorMessage(profiles.error)}</Alert>
  if (profiles.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Profiles</span>
          {canWrite && (
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => { create.reset(); setPrefix(''); setPrefixEdited(false); setCreating(true) }}>
              New
            </Button>
          )}
        </div>
        <nav aria-label="Service profiles" className="p-2">
          {visible.map((profile) => {
            const active = profile.id === selected?.id
            return (
              <button
                key={profile.id}
                onClick={() => setSelectedId(profile.id)}
                aria-current={active ? 'true' : undefined}
                className={clsx('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition', active ? 'bg-brand-50' : 'hover:bg-slate-50')}
              >
                <span className={clsx('flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 font-mono text-xs font-semibold', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
                  {profile.prefix}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={clsx('block truncate text-sm font-medium', active ? 'text-brand-700' : profile.is_active ? 'text-slate-800' : 'text-slate-400')}>{profile.name}</span>
                  <span className="block text-xs text-slate-400">{profile.is_active ? `Next ${profile.prefix}${profile.next_number}` : 'Archived'}</span>
                </span>
              </button>
            )
          })}
        </nav>
        {all.length > activeCount && (
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Checkbox label="Show archived" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          </div>
        )}
      </Card>

      {selected ? (
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
              {!selected.is_active && <Badge tone="warning">Archived</Badge>}
              {selected.out_store_enabled && <Badge tone="brand">Out-Store</Badge>}
            </div>
            <SegmentedTabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'fields', label: 'Form fields', icon: SlidersHorizontal },
                { value: 'statuses', label: 'Statuses', icon: ListOrdered },
                { value: 'settings', label: 'Settings', icon: Settings2 },
              ]}
            />
          </div>
          {tab === 'fields' && <FieldsPanel key={selected.id} profilePath={`${profilesPath}/${selected.id}`} profile={selected} canWrite={canWrite} />}
          {tab === 'statuses' && <StatusesPanel key={selected.id} profilePath={`${profilesPath}/${selected.id}`} profile={selected} canWrite={canWrite} />}
          {tab === 'settings' && (
            <SettingsPanel
              key={selected.id}
              profilesPath={profilesPath}
              profile={selected}
              canWrite={canWrite}
              isLastActive={selected.is_active && activeCount <= 1}
              onArchived={() => setSelectedId(null)}
            />
          )}
        </div>
      ) : (
        <Card>
          <EmptyState icon={ClipboardList} title="No service profiles" description="Create a profile for each kind of service you take in, then add its form fields." />
        </Card>
      )}

      <Drawer
        open={creating}
        title="New service profile"
        description="Starts with the built-in fields (date, mobile number, customer name) and the statuses Open, In Progress, Sent to Out-Store, Received from Out-Store, Closed and Returned Not Repaired. Add form fields after creating it."
        onClose={() => setCreating(false)}
        submitLabel="Create profile"
        submitting={create.isPending}
        error={formError(create.error)}
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget)
          create.mutate(
            { path: profilesPath, method: 'POST', body: { name: String(data.get('name') ?? '').trim(), prefix: prefix.trim().toUpperCase() } },
            {
              onSuccess: (profile) => {
                notify(`${profile.name} was created. Records will be numbered ${profile.prefix}${profile.next_number} onwards.`)
                setCreating(false)
                setSelectedId(profile.id)
                setTab('fields')
              },
            },
          )
        }}
      >
        <Field label="Name" required error={errors.name}>
          <Input
            name="name"
            required
            maxLength={200}
            placeholder="e.g. Laptop Repair"
            invalid={!!errors.name}
            onChange={(event) => !prefixEdited && setPrefix(suggestPrefix(event.target.value))}
          />
        </Field>
        <Field label="Number prefix" required error={errors.prefix} hint={`1–10 letters, unique in the company. First record: ${prefix || 'XX'}1001`}>
          <Input
            required
            pattern="[A-Za-z]{1,10}"
            maxLength={10}
            className="uppercase"
            value={prefix}
            invalid={!!errors.prefix}
            onChange={(event) => { setPrefixEdited(true); setPrefix(event.target.value.toUpperCase().replace(/[^A-Z]/g, '')) }}
          />
        </Field>
      </Drawer>
    </div>
  )
}
