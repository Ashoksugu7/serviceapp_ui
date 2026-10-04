'use client'

import { ArrowLeft, Mail, MapPin, Pencil, Phone, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Skeleton, Textarea } from '@/components/ui'
import { statusLabel, statusTone } from '@/components/ui/list'
import { ConfirmDialog, Drawer, useToast } from '@/components/ui/overlay'
import { apiErrorMessage, formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useResource } from '@/lib/queries'
import type { Company } from '@/lib/types'
import { UsersManager } from './users-manager'

export function CompanyDetailScreen({ companyId }: { companyId: string }) {
  const path = `/companies/${companyId}`
  const company = useResource<Company>(path)
  // Refreshes this company and the companies list, so statuses stay in sync.
  const update = useApiMutation<Company>(['/companies'])
  const notify = useToast()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const errors = fieldErrors(update.error)

  const back = (
    <Link href="/admin/companies" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
      <ArrowLeft size={14} /> Companies
    </Link>
  )

  if (company.error) return <>{back}<Alert>{apiErrorMessage(company.error)}</Alert></>
  if (!company.data) {
    return <>{back}<Skeleton className="mb-6 h-14 w-64" /><Skeleton className="h-40 w-full" /></>
  }
  const data = company.data
  const suspending = data.status === 'ACTIVE'

  function saveDetails(form: HTMLFormElement) {
    const values = formValues(form)
    update.mutate(
      { path, method: 'PATCH', body: { name: values.name, email: values.email, contact: values.contact, address: values.address } },
      { onSuccess: (result) => { notify(`${result.name} was updated.`); setEditing(false) } },
    )
  }

  function toggleStatus() {
    update.mutate(
      { path, method: 'PATCH', body: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } },
      {
        onSuccess: (result) => { notify(`${result.name} is now ${result.status.toLowerCase()}.`); setConfirming(false) },
        onError: (error) => { notify(apiErrorMessage(error), 'danger'); setConfirming(false) },
      },
    )
  }

  return (
    <>
      {back}
      <PageHeader
        eyebrow="Company"
        title={data.name}
        actions={
          <>
            <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
            <Link
              href={`/admin/companies/${companyId}/profiles`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Settings2 size={15} /> Service profiles
            </Link>
            <Button variant="secondary" icon={Pencil} onClick={() => { update.reset(); setEditing(true) }}>Edit</Button>
            <Button variant={suspending ? 'danger' : 'primary'} onClick={() => setConfirming(true)}>
              {suspending ? 'Suspend' : 'Reactivate'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Details" />
          <CardBody className="space-y-3 text-sm">
            <Detail icon={<Mail size={15} />} value={data.email} empty="No email" />
            <Detail icon={<Phone size={15} />} value={data.contact} empty="No contact" />
            <Detail icon={<MapPin size={15} />} value={data.address} empty="No address" />
          </CardBody>
        </Card>
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Users</h2>
          <UsersManager companyId={companyId} />
        </div>
      </div>

      <Drawer
        open={editing}
        title="Edit company"
        onClose={() => setEditing(false)}
        onSubmit={(event) => saveDetails(event.currentTarget)}
        submitLabel="Save changes"
        submitting={update.isPending}
        error={formError(update.error)}
      >
        <Field label="Company name" required error={errors.name}><Input name="name" required defaultValue={data.name} invalid={!!errors.name} /></Field>
        <Field label="Email" error={errors.email}><Input name="email" type="email" defaultValue={data.email ?? ''} invalid={!!errors.email} /></Field>
        <Field label="Contact" error={errors.contact}><Input name="contact" defaultValue={data.contact ?? ''} invalid={!!errors.contact} /></Field>
        <Field label="Address" error={errors.address}><Textarea name="address" defaultValue={data.address ?? ''} invalid={!!errors.address} /></Field>
      </Drawer>

      <ConfirmDialog
        open={confirming}
        title={suspending ? `Suspend ${data.name}?` : `Reactivate ${data.name}?`}
        message={suspending
          ? 'Everyone in this company is signed out and cannot sign in until it is reactivated. Data is kept.'
          : 'Users of this company will be able to sign in again.'}
        confirmLabel={suspending ? 'Suspend company' : 'Reactivate'}
        danger={suspending}
        busy={update.isPending}
        onConfirm={toggleStatus}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

function Detail({ icon, value, empty }: { icon: ReactNode; value: string | null | undefined; empty: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className={value ? 'whitespace-pre-line text-slate-700' : 'text-slate-400'}>{value || empty}</span>
    </div>
  )
}
