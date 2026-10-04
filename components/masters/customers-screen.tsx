'use client'

import { Contact, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, Field, Input, Table, Td, Textarea, Th } from '@/components/ui'
import { ListCard, SearchInput } from '@/components/ui/list'
import { Drawer, useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useList, useListState } from '@/lib/queries'
import { digitsOf } from '@/lib/customers'
import { rules, useFormCheck } from '@/lib/validation'
import type { Customer } from '@/lib/types'

export function CustomersScreen() {
  const companyId = useCompanyId()!
  const canWrite = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}/customers`
  const list = useListState({})
  const query = useList<Customer>(base, list.params)
  const save = useApiMutation<Customer>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ customer: Customer | null } | null>(null)
  const editing = editor?.customer ?? null
  const check = useFormCheck()
  const errors = { ...fieldErrors(save.error), ...check.errors }

  function open(customer: Customer | null) {
    save.reset()
    check.clear()
    setEditor({ customer })
  }

  function submit(form: HTMLFormElement) {
    const { name, contact, email, address } = formValues(form)
    if (!check.check({ name, contact, email, address }, { name: rules.name, contact: rules.requiredPhone, email: rules.email, address: rules.address })) return
    save.mutate(
      { path: editing ? `${base}/${editing.id}` : base, method: editing ? 'PATCH' : 'POST', body: { name, contact, email, address } },
      {
        onSuccess: (customer) => {
          notify(editing ? `${customer.name} was updated.` : `${customer.name} was added.`)
          setEditor(null)
        },
      },
    )
  }

  return (
    <>
      <ListCard
        query={query}
        page={list.page}
        onPage={list.setPage}
        toolbar={
          <>
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search name or mobile no" />
            {canWrite && <Button icon={Plus} className="sm:ml-auto" onClick={() => open(null)}>Add customer</Button>}
          </>
        }
        empty={{
          icon: Contact,
          title: 'No customers found',
          description: canWrite ? 'Each customer is identified by their mobile number.' : 'An admin can add customers for this company.',
        }}
      >
        {(customers) => (
          <Table>
            <thead><tr><Th>Customer</Th><Th>Mobile no</Th><Th className="hidden md:table-cell">Address</Th>{canWrite && <Th />}</tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{customer.name}</div>
                    {customer.email && <div className="text-xs text-slate-400">{customer.email}</div>}
                  </Td>
                  <Td className="tabular-nums"><a href={`tel:${digitsOf(customer.contact)}`} className="hover:text-brand-700">{customer.contact}</a></Td>
                  <Td className="hidden max-w-xs truncate text-slate-500 md:table-cell">{customer.address ?? '—'}</Td>
                  {canWrite && <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => open(customer)}>Edit</Button></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add customer'}
        description="Each mobile number can belong to only one customer."
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create customer'}
        submitting={save.isPending}
        error={check.summary ?? formError(save.error)}
        noValidate
        onInput={check.onInput}
      >
        <Field label="Customer name" required error={errors.name}><Input name="name" required defaultValue={editing?.name} invalid={!!errors.name} /></Field>
        <Field label="Mobile no" required error={errors.contact}><Input name="contact" type="tel" inputMode="tel" maxLength={50} required defaultValue={editing?.contact} invalid={!!errors.contact} /></Field>
        <Field label="Email" error={errors.email}><Input name="email" type="email" defaultValue={editing?.email ?? ''} invalid={!!errors.email} /></Field>
        <Field label="Address" error={errors.address}><Textarea name="address" defaultValue={editing?.address ?? ''} invalid={!!errors.address} /></Field>
      </Drawer>
    </>
  )
}
