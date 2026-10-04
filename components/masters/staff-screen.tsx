'use client'

import { Lock, Plus, UserCog, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Checkbox, Field, Input, Select, Table, Td, Th } from '@/components/ui'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { ConfirmDialog, Drawer, useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useList, useListState, useLocalList } from '@/lib/queries'
import type { Staff, StaffRole } from '@/lib/types'

export function StaffScreen() {
  const companyId = useCompanyId()!
  const canWrite = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}/staff`
  const rolesPath = `/companies/${companyId}/staff-roles`
  const list = useListState({ status: '' })
  const query = useLocalList<Staff>(base, list.params, (member) => [member.name, member.contact, member.email, member.specialization])
  const roles = useList<StaffRole>(rolesPath, { page_size: 100 })
  const save = useApiMutation<Staff>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ member: Staff | null } | null>(null)
  const editing = editor?.member ?? null
  const errors = fieldErrors(save.error)
  const roleList = roles.data?.items ?? []
  const roleName = (id: string) => roleList.find((role) => role.id === id)?.name ?? 'Unknown role'

  function open(member: Staff | null) {
    save.reset()
    setEditor({ member })
  }

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    const roleIds = new FormData(form).getAll('role_ids').map(String)
    save.mutate(
      {
        path: editing ? `${base}/${editing.id}` : base,
        method: editing ? 'PATCH' : 'POST',
        body: { name: values.name, contact: values.contact, email: values.email, specialization: values.specialization, status: values.status ?? 'ACTIVE', role_ids: roleIds },
      },
      {
        onSuccess: (member) => {
          notify(editing ? `${member.name} was updated.` : `${member.name} was added.`)
          setEditor(null)
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      {canWrite && <RolesCard rolesPath={rolesPath} staffPath={base} roles={roleList} />}

      <ListCard
        query={query}
        page={list.page}
        onPage={list.setPage}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search staff" />
            <FilterSelect label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
            {canWrite && <Button icon={Plus} className="sm:ml-auto" onClick={() => open(null)}>Add staff</Button>}
          </>
        }
        empty={{ icon: UserCog, title: 'No staff found', description: canWrite ? 'Add staff and assign roles such as Attended By or Service Engineer.' : undefined }}
      >
        {(staff) => (
          <Table>
            <thead><tr><Th>Staff</Th><Th>Contact</Th><Th>Roles</Th><Th>Status</Th>{canWrite && <Th />}</tr></thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{member.name}</div>
                    {member.specialization && <div className="text-xs text-slate-400">{member.specialization}</div>}
                  </Td>
                  <Td className="tabular-nums">{member.contact}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {member.role_ids.length ? member.role_ids.map((id) => <Badge key={id}>{roleName(id)}</Badge>) : <span className="text-slate-400">—</span>}
                    </div>
                  </Td>
                  <Td><Badge tone={statusTone(member.status)}>{statusLabel(member.status)}</Badge></Td>
                  {canWrite && <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => open(member)}>Edit</Button></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add staff'}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create staff'}
        submitting={save.isPending}
        error={formError(save.error)}
      >
        <Field label="Name" required error={errors.name}><Input name="name" required defaultValue={editing?.name} invalid={!!errors.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact no" required error={errors.contact}><Input name="contact" type="tel" required defaultValue={editing?.contact} invalid={!!errors.contact} /></Field>
          <Field label="Email" error={errors.email}><Input name="email" type="email" defaultValue={editing?.email ?? ''} invalid={!!errors.email} /></Field>
        </div>
        <Field label="Specialization" error={errors.specialization}><Input name="specialization" defaultValue={editing?.specialization ?? ''} invalid={!!errors.specialization} /></Field>
        <Field label="Status" error={errors.status}>
          <Select name="status" defaultValue={editing?.status ?? 'ACTIVE'}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles</legend>
          {errors.role_ids && <p className="mt-1 text-xs text-rose-600">{errors.role_ids}</p>}
          <div className="mt-2 grid gap-2 rounded-lg border border-slate-200 p-3">
            {roleList.length === 0
              ? <p className="text-sm text-slate-400">Create a role first.</p>
              : roleList.map((role) => (
                <Checkbox key={role.id} name="role_ids" value={role.id} defaultChecked={editing?.role_ids.includes(role.id)} label={role.name} />
              ))}
          </div>
        </fieldset>
      </Drawer>
    </div>
  )
}

function RolesCard({ rolesPath, staffPath, roles }: { rolesPath: string; staffPath: string; roles: StaffRole[] }) {
  const create = useApiMutation<StaffRole>([rolesPath])
  // Removing a role also changes staff role assignments; staffPath covers both lists.
  const remove = useApiMutation<void>([staffPath])
  const notify = useToast()
  const [name, setName] = useState('')
  const [deleting, setDeleting] = useState<StaffRole | null>(null)

  function add(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate(
      { path: rolesPath, method: 'POST', body: { name: name.trim() } },
      { onSuccess: (role) => { notify(`${role.name} role was added.`); setName('') } },
    )
  }

  return (
    <Card>
      <CardHeader title="Staff roles" description="Roles decide which staff appear in role fields on Service Entry. System roles cannot be removed." />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <span key={role.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-2 text-xs font-medium text-slate-700">
              {role.name}
              {role.is_system
                ? <Lock size={12} className="text-slate-400" aria-label="System role" />
                : (
                  <button type="button" aria-label={`Remove ${role.name}`} onClick={() => setDeleting(role)} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                    <X size={12} />
                  </button>
                )}
            </span>
          ))}
        </div>
        <form onSubmit={add} className="flex gap-2 sm:max-w-md">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New role, e.g. Delivered By" aria-label="New role name" invalid={!!create.error} />
          <Button type="submit" variant="secondary" icon={Plus} loading={create.isPending}>Add</Button>
        </form>
        {create.error && <p className="text-xs text-rose-600">{apiErrorMessage(create.error)}</p>}
      </CardBody>

      <ConfirmDialog
        open={deleting !== null}
        title={`Remove ${deleting?.name ?? ''} role?`}
        message="Staff lose this role. Roles used by profile fields cannot be removed."
        confirmLabel="Remove role"
        danger
        busy={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(
          { path: `${rolesPath}/${deleting.id}`, method: 'DELETE' },
          {
            onSuccess: () => { notify(`${deleting.name} role was removed.`); setDeleting(null) },
            onError: (error) => { notify(apiErrorMessage(error), 'danger'); setDeleting(null) },
          },
        )}
      />
    </Card>
  )
}
