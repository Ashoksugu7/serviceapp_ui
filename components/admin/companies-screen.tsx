'use client'

import { Building2, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge, Button, Field, Input, Table, Td, Textarea, Th } from '@/components/ui'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { Drawer } from '@/components/ui/overlay'
import { CredentialNotice, type CredentialResult } from './credential-notice'
import { formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useListState, useLocalList } from '@/lib/queries'
import type { Company, CompanyOnboarded } from '@/lib/types'

export function CompaniesScreen() {
  const list = useListState({ status: '' })
  const query = useLocalList<Company>('/companies', list.params, (company) => [company.name, company.email, company.contact])
  const onboard = useApiMutation<CompanyOnboarded>(['/companies'])
  const [open, setOpen] = useState(false)
  const [credentials, setCredentials] = useState<CredentialResult | null>(null)
  const errors = fieldErrors(onboard.error)

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    onboard.mutate(
      {
        path: '/companies',
        method: 'POST',
        body: {
          name: values.name,
          email: values.email,
          contact: values.contact,
          address: values.address,
          admin: { name: values.admin_name, email: values.admin_email, phone: values.admin_phone },
        },
      },
      {
        onSuccess: (result) => {
          setOpen(false)
          setCredentials({ title: `${result.company.name} is ready`, email: result.admin.email, delivery: result.delivery })
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
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search companies" />
            <FilterSelect label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} />
            <Button icon={Plus} className="sm:ml-auto" onClick={() => { onboard.reset(); setOpen(true) }}>Onboard company</Button>
          </>
        }
        empty={{ icon: Building2, title: 'No companies found', description: 'Onboard a company to create its first admin account.' }}
      >
        {(companies) => (
          <Table>
            <thead><tr><Th>Company</Th><Th>Contact</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="group hover:bg-slate-50/60">
                  <Td>
                    <Link href={`/admin/companies/${company.id}`} className="font-medium text-slate-900 group-hover:text-brand-700">{company.name}</Link>
                    <div className="text-xs text-slate-400">{company.email ?? 'No email'}</div>
                  </Td>
                  <Td>{company.contact ?? '—'}</Td>
                  <Td><Badge tone={statusTone(company.status)}>{statusLabel(company.status)}</Badge></Td>
                  <Td className="text-right">
                    <Link href={`/admin/companies/${company.id}`} aria-label={`Open ${company.name}`} className="inline-flex rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <ChevronRight size={16} />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={open}
        title="Onboard company"
        description="Creates the company and its first admin account together."
        onClose={() => setOpen(false)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel="Create company"
        submitting={onboard.isPending}
        error={formError(onboard.error)}
      >
        <Field label="Company name" required error={errors.name}><Input name="name" required invalid={!!errors.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={errors.email}><Input name="email" type="email" invalid={!!errors.email} /></Field>
          <Field label="Contact" error={errors.contact}><Input name="contact" invalid={!!errors.contact} /></Field>
        </div>
        <Field label="Address" error={errors.address}><Textarea name="address" invalid={!!errors.address} /></Field>

        <div className="border-t border-slate-100 pt-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">First admin</div>
        <Field label="Full name" required error={errors['admin.name']}><Input name="admin_name" required invalid={!!errors['admin.name']} /></Field>
        <Field label="Email" required error={errors['admin.email']}><Input name="admin_email" type="email" required invalid={!!errors['admin.email']} /></Field>
        <Field label="Mobile no" error={errors['admin.phone'] ?? errors.phone} hint="Optional. Lets the admin sign in with this number.">
          <Input name="admin_phone" type="tel" inputMode="tel" maxLength={30} invalid={!!(errors['admin.phone'] ?? errors.phone)} />
        </Field>
        <p className="text-xs text-slate-500">A temporary password is created and emailed to the admin, who sets their own at first sign-in.</p>
      </Drawer>
      <CredentialNotice result={credentials} onClose={() => setCredentials(null)} />
    </>
  )
}
