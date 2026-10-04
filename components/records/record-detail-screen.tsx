'use client'

import clsx from 'clsx'
import { ArrowLeft, Copy, History, Lock, Mail, MapPin, Pencil, Phone, Save, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { CustomerLookup } from '@/components/service-entry/customer-lookup'
import { DynamicFieldInput } from '@/components/service-entry/field-input'
import { RecordOutStoreCard } from '@/components/out-store/record-out-store-card'
import { APIError, apiErrorMessage, formError } from '@/lib/api-client'
import { formatDate } from '@/lib/dates'
import { activeFields, evaluateFormulas, formDataErrors, formulaOf, type FormValues } from '@/lib/forms/form-values'
import { displayValue, editableValues, formDataChanges } from '@/lib/forms/record-values'
import { useAll, useApiMutation, useList, useResource } from '@/lib/queries'
import { describeOutStore, describeStandby, type HistoryEvent, type HistoryKind } from '@/lib/history'
import type { Charge, Customer, HistoryOutStoreValue, HistoryStandbyValue, Product, RequestHistory, ServiceRequestDetail, Staff } from '@/lib/types'

type EditDraft = { serviceDate: string; customerId: string; values: FormValues }

export function RecordDetailScreen({ recordId }: { recordId: string }) {
  const companyId = useCompanyId()!
  const identity = useIdentity()
  const isAdmin = identity.user.role === 'ADMIN'
  const base = `/companies/${companyId}`
  const path = `${base}/service-requests/${recordId}`
  const record = useResource<ServiceRequestDetail>(path)
  const [editing, setEditing] = useState(false)

  const back = (
    <Link href="/records" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
      <ArrowLeft size={14} /> Records
    </Link>
  )
  if (record.error) return <>{back}<Alert>{apiErrorMessage(record.error)}</Alert></>
  if (!record.data) return <>{back}<Skeleton className="mb-6 h-14 w-64" /><Skeleton className="h-96 w-full" /></>

  const data = record.data
  const definition = data.form_definition
  const status = definition.statuses.find((item) => item.id === data.status_id)
  const closed = status?.closed ?? false

  return (
    <>
      {back}
      <PageHeader
        eyebrow={definition.name}
        title={data.request_no}
        description={`${formatDate(data.service_date)} · ${data.customer.name}`}
        actions={
          <>
            <Badge tone={closed ? 'neutral' : 'brand'}>{data.status_name}</Badge>
            <Link href={`/service-entry?copy=${data.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Copy size={15} /> Copy to new
            </Link>
            {!editing && (
              <Button icon={closed ? Lock : Pencil} disabled={closed} title={closed ? 'Closed records cannot be edited' : undefined} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {editing
            ? <EditCard key={data.updated_at} base={base} path={path} record={data} onDone={() => setEditing(false)} />
            : <ReadCard record={data} closed={closed} isAdmin={isAdmin} />}
        </div>
        <div className="space-y-6">
          <StatusCard path={path} record={data} isAdmin={isAdmin} disabled={editing} />
          <RecordOutStoreCard base={base} record={data} closed={closed} />
          <CustomerCard customer={data.customer} labels={definition.core_fields} />
          <HistoryCard path={path} record={data} />
        </div>
      </div>
    </>
  )
}

function ReadCard({ record, closed, isAdmin }: { record: ServiceRequestDetail; closed: boolean; isAdmin: boolean }) {
  const fields = record.form_definition.fields
  const shown = activeFields(fields)
  const hidden = fields.filter((field) => !field.enabled && record.form_data[field.key] !== undefined && record.form_data[field.key] !== null)
  const coreLabel = (key: string) => record.form_definition.core_fields.find((field) => field.key === key)?.label ?? key

  return (
    <Card>
      {closed && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-xs text-slate-500">
          <Lock size={13} /> This record is closed. {isAdmin ? 'Move it to an open status to edit it.' : 'An admin can reopen it.'}
        </div>
      )}
      <CardBody>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Item label={coreLabel('service_date')} value={formatDate(record.service_date)} />
          <Item label={coreLabel('customer_name')} value={`${record.customer.name} · ${record.customer.contact}`} />
          {shown.map((field) => (
            <Item
              key={field.id}
              label={field.label}
              value={displayValue(field, record.form_data[field.key], record.linked_values)}
              wide={field.type === 'linked_charges' || (field.type === 'text' && field.config.multiline === true)}
              calculated={!!formulaOf(field)}
            />
          ))}
        </dl>
        {hidden.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Fields no longer on the form</div>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {hidden.map((field) => <Item key={field.id} label={field.label} value={displayValue(field, record.form_data[field.key], record.linked_values)} />)}
            </dl>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function Item({ label, value, wide, calculated }: { label: string; value: string; wide?: boolean; calculated?: boolean }) {
  return (
    <div className={clsx(wide && 'sm:col-span-2')}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}{calculated && <span className="ml-1 font-normal normal-case text-slate-400">(calculated)</span>}</dt>
      <dd className={clsx('mt-1 whitespace-pre-line text-sm', value === '—' ? 'text-slate-400' : 'text-slate-800')}>{value}</dd>
    </div>
  )
}

function EditCard({ base, path, record, onDone }: { base: string; path: string; record: ServiceRequestDetail; onDone: () => void }) {
  const fields = useMemo(() => activeFields(record.form_definition.fields), [record.form_definition.fields])
  const products = useAll<Product>(`${base}/products`)
  const charges = useAll<Charge>(`${base}/charges`)
  const staff = useAll<Staff>(`${base}/staff`)
  // The lookup searches customers on the server; keep the one picked here.
  const [chosen, setChosen] = useState<Customer | null>(record.customer)
  const save = useApiMutation<ServiceRequestDetail>([`${base}/service-requests`])
  const notify = useToast()
  const [draft, setDraft] = useState<EditDraft>(() => ({ serviceDate: record.service_date, customerId: record.customer_id, values: editableValues(fields, record.form_data) }))
  const calculated = useMemo(() => evaluateFormulas(fields, draft.values), [fields, draft.values])
  const options = { products: products.data?.items ?? [], charges: charges.data?.items ?? [], staff: staff.data?.items ?? [] }
  const apiFields = save.error instanceof APIError && save.error.fields ? save.error.fields : {}
  const valueErrors = formDataErrors(apiFields)
  const coreLabel = (key: string) => record.form_definition.core_fields.find((field) => field.key === key)?.label ?? key
  const customer = chosen && chosen.id === draft.customerId ? chosen : undefined

  function submit() {
    const formData = formDataChanges(fields, record.form_data, draft.values)
    const body = {
      ...(draft.serviceDate !== record.service_date ? { service_date: draft.serviceDate } : {}),
      ...(draft.customerId !== record.customer_id ? { customer_id: draft.customerId } : {}),
      ...(Object.keys(formData).length ? { form_data: formData } : {}),
    }
    if (Object.keys(body).length === 0) {
      onDone()
      return
    }
    save.mutate({ path, method: 'PATCH', body }, { onSuccess: () => { notify(`${record.request_no} was updated.`); onDone() } })
  }

  return (
    <Card className="overflow-visible">
      <form onSubmit={(event) => { event.preventDefault(); submit() }}>
        <CardHeader title="Edit record" description="Only changed values are saved and recorded in the history." />
        <CardBody className="space-y-5">
          {formError(save.error) && <Alert>{formError(save.error)}</Alert>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={coreLabel('service_date')} required error={apiFields.service_date}>
              <Input type="date" required value={draft.serviceDate} invalid={!!apiFields.service_date} onChange={(event) => setDraft((current) => ({ ...current, serviceDate: event.target.value }))} />
            </Field>
            <CustomerLookup
              label={coreLabel('customer_contact')}
              base={base}
              value={customer ? { kind: 'existing', customer } : null}
              errors={apiFields}
              onChange={(choice) => {
                const picked = choice?.kind === 'existing' ? choice.customer : null
                setChosen(picked)
                setDraft((current) => ({ ...current, customerId: picked?.id ?? '' }))
              }}
            />
            {draft.customerId !== record.customer_id && (
              <p className="-mt-2 text-xs text-slate-500 sm:col-span-2">The customer cannot change once the record has been sent to Out-Store or has a stand-by loan.</p>
            )}
            {fields.map((field) => (
              <DynamicFieldInput
                key={field.id}
                field={field}
                value={draft.values[field.key]}
                calculated={calculated[field.key]}
                error={valueErrors[field.key]}
                options={options}
                linked={record.linked_values[field.key]}
                onChange={(value) => setDraft((current) => ({ ...current, values: { ...current.values, [field.key]: value } }))}
              />
            ))}
          </div>
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
          <Button variant="secondary" icon={X} onClick={onDone}>Cancel</Button>
          <Button type="submit" icon={Save} loading={save.isPending} disabled={!draft.customerId}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}

function StatusCard({ path, record, isAdmin, disabled }: { path: string; record: ServiceRequestDetail; isAdmin: boolean; disabled: boolean }) {
  const change = useApiMutation<unknown>([path.replace(/\/[^/]+$/, '')])
  const notify = useToast()
  const statuses = [...record.form_definition.statuses].sort((a, b) => a.sort_order - b.sort_order)
  const current = statuses.find((status) => status.id === record.status_id)
  const locked = (current?.closed ?? false) && !isAdmin
  const [next, setNext] = useState(record.status_id)
  const choices = statuses.filter((status) => status.enabled || status.id === record.status_id)

  return (
    <Card>
      <CardHeader title="Status" />
      <CardBody className="space-y-3">
        <ol className="flex flex-wrap gap-1">
          {statuses.filter((status) => status.enabled).map((status) => (
            <li
              key={status.id}
              className={clsx(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                status.id === record.status_id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500',
              )}
            >
              {status.name}
            </li>
          ))}
        </ol>
        {locked ? (
          <p className="flex items-start gap-2 text-xs text-slate-500"><Lock size={13} className="mt-0.5 shrink-0" /> Closed. Only an admin can reopen this record.</p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (next === record.status_id) return
              change.mutate(
                { path: `${path}/status`, method: 'PATCH', body: { status_id: next } },
                {
                  onSuccess: () => notify(`Status changed to ${statuses.find((status) => status.id === next)?.name}.`),
                  onError: (error) => notify(apiErrorMessage(error), 'danger'),
                },
              )
            }}
          >
            <Select aria-label="New status" value={next} disabled={disabled} onChange={(event) => setNext(event.target.value)}>
              {choices.map((status) => (
                <option key={status.id} value={status.id} disabled={!status.enabled}>
                  {status.name}{status.closed ? ' (closes)' : ''}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary" loading={change.isPending} disabled={disabled || next === record.status_id}>Update</Button>
          </form>
        )}
      </CardBody>
    </Card>
  )
}

function CustomerCard({ customer, labels }: { customer: Customer; labels: ServiceRequestDetail['form_definition']['core_fields'] }) {
  const label = labels.find((field) => field.key === 'customer_name')?.label ?? 'Customer'
  return (
    <Card>
      <CardHeader title={label} />
      <CardBody className="space-y-2.5 text-sm">
        <div className="font-medium text-slate-900">{customer.name}</div>
        <div className="flex items-center gap-2 text-slate-600"><Phone size={14} className="text-slate-400" /><a href={`tel:${customer.contact}`} className="hover:text-brand-700">{customer.contact}</a></div>
        {customer.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={14} className="text-slate-400" />{customer.email}</div>}
        {customer.address && <div className="flex items-start gap-2 whitespace-pre-line text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />{customer.address}</div>}
      </CardBody>
    </Card>
  )
}

const dotColor: Record<HistoryKind, string> = { status: 'bg-brand-500', out_store: 'bg-amber-500', standby: 'bg-violet-500', field: 'bg-slate-300' }

const timeFormat = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })

function HistoryCard({ path, record }: { path: string; record: ServiceRequestDetail }) {
  const identity = useIdentity()
  const history = useList<RequestHistory>(`${path}/history`, { sort: 'created_at', order: 'desc', page_size: 100 })
  const definition = record.form_definition
  const statusName = (id: unknown) => definition.statuses.find((status) => status.id === id)?.name ?? 'Unknown status'
  const fieldByKey = new Map(definition.fields.map((field) => [field.key, field]))
  const coreLabel = (key: string) => definition.core_fields.find((field) => field.key === key)?.label ?? key
  const actor = (entry: RequestHistory) => (entry.changed_by === identity.user.id ? 'You' : entry.changed_by_name ?? 'Former user')

  function describe(entry: RequestHistory): HistoryEvent {
    if (entry.field_key === 'core.status') {
      return entry.old_value === null || entry.old_value === undefined
        ? { kind: 'status', title: `Created as ${statusName(entry.new_value)}` }
        : { kind: 'status', title: 'Status changed', detail: `${statusName(entry.old_value)} → ${statusName(entry.new_value)}` }
    }
    if (entry.field_key === 'core.out_store') return describeOutStore(entry.new_value as HistoryOutStoreValue, entry.old_value as HistoryOutStoreValue | null)
    if (entry.field_key === 'core.standby') return describeStandby(entry.new_value as HistoryStandbyValue)
    if (entry.field_key === 'core.service_date') {
      return { kind: 'field', title: `${coreLabel('service_date')} changed`, detail: `${formatDate(String(entry.old_value))} → ${formatDate(String(entry.new_value))}` }
    }
    if (entry.field_key === 'core.customer_id') {
      return { kind: 'field', title: 'Customer changed', detail: entry.new_value === record.customer_id ? `now ${record.customer.name}` : undefined }
    }
    const field = fieldByKey.get(entry.field_key)
    if (!field) return { kind: 'field', title: `${entry.field_key} changed` }
    return {
      kind: 'field',
      title: `${field.label} changed`,
      detail: `${displayValue(field, entry.old_value, record.linked_values)} → ${displayValue(field, entry.new_value, record.linked_values)}`,
    }
  }

  const entries = history.data?.items ?? []
  return (
    <Card>
      <CardHeader title="History" />
      {history.isPending ? (
        <div className="space-y-2 p-5">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-8 w-full" />)}</div>
      ) : history.error ? (
        <p className="p-5 text-sm text-rose-600">{apiErrorMessage(history.error)}</p>
      ) : entries.length === 0 ? (
        <p className="flex items-center gap-2 p-5 text-sm text-slate-400"><History size={14} /> No changes yet.</p>
      ) : (
        <ol className="relative space-y-4 px-5 py-4 before:absolute before:bottom-6 before:left-[27px] before:top-6 before:w-px before:bg-slate-200">
          {entries.map((entry) => {
            const { kind, title, detail } = describe(entry)
            return (
              <li key={entry.id} className="relative flex gap-3">
                <span className={clsx('relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white', dotColor[kind])} />
                <div className="min-w-0 text-sm">
                  <div className="font-medium text-slate-800">{title}</div>
                  {detail && <div className="break-words text-xs text-slate-500">{detail}</div>}
                  <div className="mt-0.5 text-[11px] text-slate-400">{actor(entry)} · {timeFormat.format(new Date(entry.created_at))}</div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Card>
  )
}
