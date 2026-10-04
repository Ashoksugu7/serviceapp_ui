'use client'

import { KeyRound, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Field, Input, Select, Table, Td, Th } from '@/components/ui'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { ConfirmDialog, Drawer, useToast } from '@/components/ui/overlay'
import { CredentialNotice, type CredentialResult } from './credential-notice'
import { apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useList, useListState } from '@/lib/queries'
import { rules, useFormCheck } from '@/lib/validation'
import type { CredentialDelivery, User } from '@/lib/types'

export function UsersManager({ companyId }: { companyId: string }) {
  const base = `/companies/${companyId}/users`
  const list = useListState({ status: '', role: '' })
  const query = useList<User>(base, list.params)
  const save = useApiMutation<User>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ user: User | null } | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [credentials, setCredentials] = useState<CredentialResult | null>(null)
  const reset = useApiMutation<{ user: User; delivery: CredentialDelivery }>([base])

  function open(user: User | null) {
    save.reset()
    check.clear()
    setEditor({ user })
  }

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    if (!check.check(values, { name: rules.name, email: rules.requiredEmail, phone: rules.phone })) return
    const editing = editor?.user
    const body: Record<string, string | null> = { name: values.name, email: values.email, phone: values.phone, role: values.role }
    if (editing) body.status = values.status
    save.mutate(
      { path: editing ? `${base}/${editing.id}` : base, method: editing ? 'PATCH' : 'POST', body },
      {
        onSuccess: (user) => {
          setEditor(null)
          if (editing) notify(`${user.name} was updated.`)
          else setCredentials({ title: `${user.name} was added`, email: user.email, delivery: (user as User & { delivery: CredentialDelivery }).delivery })
        },
      },
    )
  }

  const check = useFormCheck()
  const errors = { ...fieldErrors(save.error), ...check.errors }
  const editing = editor?.user ?? null

  return (
    <>
      <ListCard
        query={query}
        page={list.page}
        onPage={list.setPage}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search name, email or mobile" />
            <FilterSelect label="Role" value={list.filters.role} onChange={(value) => list.setFilter('role', value)} options={[{ value: '', label: 'All roles' }, { value: 'ADMIN', label: 'Admin' }, { value: 'USER', label: 'User' }]} />
            <FilterSelect label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
            <Button icon={Plus} className="sm:ml-auto" onClick={() => open(null)}>Add user</Button>
          </>
        }
        empty={{ icon: Users, title: 'No users found', description: 'Add an Admin or User account for this company.' }}
      >
        {(users) => (
          <Table>
            <thead><tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-400">{user.email}{user.phone && ` · ${user.phone}`}</div>
                  </Td>
                  <Td><Badge tone={user.role === 'ADMIN' ? 'brand' : 'neutral'}>{user.role === 'ADMIN' ? 'Admin' : 'User'}</Badge></Td>
                  <Td><Badge tone={statusTone(user.status)}>{statusLabel(user.status)}</Badge></Td>
                  <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => open(user)}>Edit</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add user'}
        description={editing ? editing.email : 'Admins manage company settings; users run day-to-day service work.'}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create user'}
        submitting={save.isPending}
        error={check.summary ?? formError(save.error)}
        noValidate
        onInput={check.onInput}
      >
        <Field label="Full name" required error={errors.name}>
          <Input name="name" required defaultValue={editing?.name} invalid={!!errors.name} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input name="email" type="email" required defaultValue={editing?.email} invalid={!!errors.email} />
        </Field>
        <Field label="Mobile no" error={errors.phone} hint="Optional. Lets the user sign in with this number.">
          <Input name="phone" type="tel" inputMode="tel" maxLength={30} defaultValue={editing?.phone ?? ''} invalid={!!errors.phone} />
        </Field>
        <Field label="Role" required error={errors.role}>
          <Select name="role" defaultValue={editing?.role ?? 'USER'}>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        {editing && (
          <Field label="Status" error={errors.status}>
            <Select name="status" defaultValue={editing.status}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        )}
        {editing ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-800">Password</div>
              <div className="text-xs text-slate-500">Send a new temporary password and sign them out everywhere.</div>
            </div>
            <Button size="sm" variant="secondary" icon={KeyRound} onClick={() => setResetting(editing)}>Reset</Button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">A temporary password is created and emailed to the user, who sets their own at first sign-in.</p>
        )}
      </Drawer>

      <ConfirmDialog
        open={resetting !== null}
        title={`Reset ${resetting?.name ?? ''}'s password?`}
        message="They are signed out everywhere and receive a new temporary password."
        confirmLabel="Reset password"
        busy={reset.isPending}
        onClose={() => setResetting(null)}
        onConfirm={() => resetting && reset.mutate(
          { path: `${base}/${resetting.id}/reset-password`, method: 'POST' },
          {
            onSuccess: (result) => {
              setResetting(null)
              setEditor(null)
              setCredentials({ title: `${resetting.name}'s password was reset`, email: resetting.email, delivery: result.delivery })
            },
            onError: (error) => { notify(apiErrorMessage(error), 'danger'); setResetting(null) },
          },
        )}
      />
      <CredentialNotice result={credentials} onClose={() => setCredentials(null)} />
    </>
  )
}
