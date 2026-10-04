'use client'

import clsx from 'clsx'
import { ClipboardList, Copy, RefreshCw, RotateCcw, Save, Settings2, Truck } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardBody, Checkbox, Chip, EmptyState, Field, Input, PageHeader, SegmentedTabs, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { APIError, apiErrorMessage, formError } from '@/lib/api-client'
import { addDays, localToday, QUICK_PICKS } from '@/lib/dates'
import { activeFields, buildFormData, evaluateFormulas, formDataErrors, type FormValues } from '@/lib/forms/form-values'
import { useAll, useApiMutation, useResource } from '@/lib/queries'
import { rules, useFormCheck } from '@/lib/validation'
import { editableValues } from '@/lib/forms/record-values'
import type { Charge, Customer, FormDefinition, OutStoreShop, Product, ServiceProfile, ServiceRequestDetail, Staff } from '@/lib/types'
import { CustomerLookup, type CustomerChoice } from './customer-lookup'
import { DynamicFieldInput, type EntryOptions } from './field-input'

type Created = { id: string; request_no: string; out_store_entry: unknown | null; customer: Customer | null }
type OutStoreDraft = { enabled: boolean; shop_id: string; due_date: string; price: string; remarks: string }
type EntryDraft = { serviceDate: string; customer: CustomerChoice; values: FormValues; outStore: OutStoreDraft }

const emptyOutStore: OutStoreDraft = { enabled: false, shop_id: '', due_date: '', price: '', remarks: '' }
const freshDraft = (): EntryDraft => ({ serviceDate: localToday(), customer: null, values: {}, outStore: emptyOutStore })

// copyFrom: a record ID whose customer and details prefill a new entry ("Copy to new").
export function ServiceEntryScreen({ copyFrom }: { copyFrom?: string }) {
  const companyId = useCompanyId()!
  const canManage = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}`
  const profiles = useAll<ServiceProfile>(`${base}/service-profiles`)
  const active = useMemo(
    () => (profiles.data?.items ?? []).filter((profile) => profile.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles.data],
  )
  const source = useResource<ServiceRequestDetail>(copyFrom ? `${base}/service-requests/${copyFrom}` : null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const profile = active.find((item) => item.id === (profileId ?? source.data?.profile_id)) ?? active[0]
  const copy = source.data && source.data.profile_id === profile?.id ? source.data : undefined

  const eyebrow = 'Transaction'
  if (profiles.error) return <><PageHeader eyebrow={eyebrow} title="Service Entry" /><Alert>{apiErrorMessage(profiles.error)}</Alert></>
  if (profiles.isPending || (copyFrom && source.isPending)) return <><PageHeader eyebrow={eyebrow} title="Service Entry" /><Skeleton className="h-96 w-full" /></>
  if (!profile) {
    return (
      <>
        <PageHeader eyebrow={eyebrow} title="Service Entry" />
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No active service profiles"
            description={canManage ? 'Create or reactivate a profile before taking entries.' : 'Ask an admin to set up a service profile.'}
            action={canManage && <Link href="/settings/profiles" className="text-sm font-medium text-brand-600 hover:text-brand-700">Open Service Profiles</Link>}
          />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={eyebrow}
        title="Service Entry"
        actions={<Badge tone="brand"><span className="font-mono">{profile.prefix}{profile.next_number}</span></Badge>}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={profile.id}
          onChange={setProfileId}
          items={active.map((item, index) => ({ value: item.id, label: item.name, icon: index % 2 ? RefreshCw : ClipboardList }))}
        />
        {canManage && (
          <Link href="/settings/profiles" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <Settings2 size={14} /> Manage Field Profile
          </Link>
        )}
      </div>
      {/* Keyed so switching profile starts a clean form. */}
      {source.error && <div className="mb-4"><Alert>The record to copy could not be loaded. {apiErrorMessage(source.error)}</Alert></div>}
      <EntryForm key={`${profile.id}-${copy?.id ?? ''}`} base={base} profile={profile} copy={copy} />
    </>
  )
}

function EntryForm({ base, profile, copy }: { base: string; profile: ServiceProfile; copy?: ServiceRequestDetail }) {
  const profilePath = `${base}/service-profiles/${profile.id}`
  const form = useResource<FormDefinition>(`${profilePath}/form`)
  const products = useAll<Product>(`${base}/products`)
  const charges = useAll<Charge>(`${base}/charges`)
  const staff = useAll<Staff>(`${base}/staff`)
  const outStoreReady = profile.out_store_enabled && !!profile.sent_status_id && !!profile.received_status_id
  const shops = useAll<OutStoreShop>(outStoreReady ? `${base}/out-store-shops` : null, { status: 'ACTIVE', profile_id: profile.id })
  const create = useApiMutation<Created>([`${base}/service-requests`, `${base}/service-profiles`, `${base}/out-store-entries`])
  const notify = useToast()

  const [draft, setDraft] = useState<EntryDraft>(() =>
    copy ? { ...freshDraft(), customer: { kind: 'existing', customer: copy.customer }, values: editableValues(copy.form_definition.fields, copy.form_data) } : freshDraft(),
  )
  const [last, setLast] = useState<{ created: Created; draft: EntryDraft } | null>(null)
  const [formKey, setFormKey] = useState(0)
  const replaceDraft = (next: EntryDraft) => { setDraft(next); setFormKey((key) => key + 1) }

  const fields = useMemo(() => activeFields(form.data?.fields ?? []), [form.data])
  const calculated = useMemo(() => evaluateFormulas(fields, draft.values), [fields, draft.values])
  const options: EntryOptions = { products: products.data?.items ?? [], charges: charges.data?.items ?? [], staff: staff.data?.items ?? [] }
  const shopList = (shops.data?.items ?? []).filter((shop) => shop.status === 'ACTIVE' && (!shop.profile_id || shop.profile_id === profile.id))
  const labels = profile.core_labels

  // New-customer details are checked in the browser first (UI05); the API checks everything again.
  const check = useFormCheck()
  const apiFields = { ...(create.error instanceof APIError && create.error.fields ? create.error.fields : {}), ...check.errors }
  const valueErrors = formDataErrors(apiFields)
  const outErrors = Object.fromEntries(Object.entries(apiFields).filter(([key]) => key.startsWith('out_store.')).map(([key, message]) => [key.slice(10), message]))

  const setValue = (key: string, value: unknown) => setDraft((current) => ({ ...current, values: { ...current.values, [key]: value } }))
  const setOutStore = (patch: Partial<OutStoreDraft>) => setDraft((current) => ({ ...current, outStore: { ...current.outStore, ...patch } }))

  function submit() {
    const { outStore } = draft
    const newCustomer = draft.customer?.kind === 'new' ? draft.customer.draft : null
    const customerOk = newCustomer
      ? check.check(
          { 'customer.name': newCustomer.name, 'customer.contact': newCustomer.contact, 'customer.email': newCustomer.email, 'customer.address': newCustomer.address },
          { 'customer.name': rules.name, 'customer.contact': rules.requiredPhone, 'customer.email': rules.email, 'customer.address': rules.address },
        )
      : check.check({}, {})
    if (!customerOk) return
    create.mutate(
      {
        path: `${base}/service-requests`,
        method: 'POST',
        body: {
          profile_id: profile.id,
          service_date: draft.serviceDate,
          ...customerPayload(draft.customer),
          form_data: buildFormData(fields, draft.values),
          ...(outStore.enabled
            ? { out_store: { shop_id: outStore.shop_id, due_date: outStore.due_date || null, price: outStore.price || null, remarks: outStore.remarks.trim() || null } }
            : {}),
        },
      },
      {
        onSuccess: (created) => {
          notify(`${created.request_no} was saved${created.customer ? ` for new customer ${created.customer.name}` : ''}${created.out_store_entry ? ' and sent to Out-Store' : ''}.`)
          // Copy to new should reuse the customer that now exists.
          setLast({ created, draft: created.customer ? { ...draft, customer: { kind: 'existing', customer: created.customer } } : draft })
          replaceDraft(freshDraft())
          window.scrollTo({ top: 0, behavior: 'smooth' })
        },
      },
    )
  }

  if (form.error) return <Alert>{apiErrorMessage(form.error)}</Alert>
  if (form.isPending) return <Skeleton className="h-96 w-full" />

  return (
    <>
      <form
        onSubmit={(event) => { event.preventDefault(); submit() }}
        className="space-y-4"
      >
        {copy && !last && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Copy size={15} className="text-slate-400" /> Copied from <span className="font-mono font-semibold text-slate-800">{copy.request_no}</span>. Check the details and save as a new entry.
          </div>
        )}
        {last && (
          <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-emerald-800">
              <span className="font-mono font-semibold">{last.created.request_no}</span> saved{last.created.out_store_entry ? ' and sent to Out-Store' : ''}.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={Copy}
                onClick={() => { replaceDraft({ ...last.draft, serviceDate: localToday(), outStore: emptyOutStore }); setLast(null) }}
              >
                Copy to new
              </Button>
              <Link href="/records" className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100">View records</Link>
            </div>
          </div>
        )}
  
        <Card className="overflow-visible">
          <CardBody className="space-y-5">
            {(check.summary ?? formError(create.error)) && <Alert>{check.summary ?? formError(create.error)}</Alert>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={labels.service_date} required error={apiFields.service_date}>
                <Input type="date" required value={draft.serviceDate} invalid={!!apiFields.service_date} onChange={(event) => setDraft((current) => ({ ...current, serviceDate: event.target.value }))} />
              </Field>
              <CustomerLookup
              key={formKey}
              label={labels.customer_contact}
              base={base}
              value={draft.customer}
              allowCreate
              errors={apiFields}
              onChange={(customer) => { check.clear(); setDraft((current) => ({ ...current, customer })) }}
            />

            {fields.map((field) => (
                <DynamicFieldInput
                  key={field.id}
                  field={field}
                  value={draft.values[field.key]}
                  calculated={calculated[field.key]}
                  error={valueErrors[field.key]}
                  options={options}
                  onChange={(value) => setValue(field.key, value)}
                />
              ))}
            </div>
            {fields.length === 0 && <p className="text-sm text-slate-400">This profile has no extra fields yet.</p>}
          </CardBody>
  
          {outStoreReady && (
            <div className={clsx('border-t border-slate-100 px-5 py-4 sm:px-6', draft.outStore.enabled && 'bg-slate-50/60')}>
              <Checkbox
                checked={draft.outStore.enabled}
                onChange={(event) => setOutStore({ enabled: event.target.checked })}
                label={<span className="inline-flex items-center gap-1.5 font-medium"><Truck size={15} className="text-slate-500" /> Send to Out-Store now</span>}
              />
              {draft.outStore.enabled && (
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Field label="Shop" required error={outErrors.shop_id}>
                    <Select required value={draft.outStore.shop_id} invalid={!!outErrors.shop_id} onChange={(event) => setOutStore({ shop_id: event.target.value })}>
                      <option value="">{shopList.length ? 'Select shop' : 'No active shops'}</option>
                      {shopList.map((shop) => <option key={shop.id} value={shop.id}>{shop.shop_name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Expected back" error={outErrors.due_date}>
                    <Input type="date" min={draft.serviceDate} value={draft.outStore.due_date} invalid={!!outErrors.due_date} onChange={(event) => setOutStore({ due_date: event.target.value })} />
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_PICKS.slice(1).map(({ label, days }) => {
                        const pick = addDays(draft.serviceDate || localToday(), days)
                        return <Chip key={label} active={draft.outStore.due_date === pick} onClick={() => setOutStore({ due_date: pick })}>{label}</Chip>
                      })}
                    </div>
                  </Field>
                  <Field label="Shop price" error={outErrors.price} hint="Informational only.">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
                      <Input type="number" min={0} step="0.01" className="pl-7" value={draft.outStore.price} invalid={!!outErrors.price} onChange={(event) => setOutStore({ price: event.target.value })} />
                    </div>
                  </Field>
                  <Field label="Remarks" error={outErrors.remarks}>
                    <Input maxLength={4000} value={draft.outStore.remarks} onChange={(event) => setOutStore({ remarks: event.target.value })} />
                  </Field>
                </div>
              )}
            </div>
          )}
  
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="text-xs text-slate-400">
              Saves as <span className="font-mono font-medium text-slate-600">{profile.prefix}{profile.next_number}</span> (final number is assigned on save)
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" icon={RotateCcw} onClick={() => { replaceDraft(freshDraft()); create.reset() }}>Reset</Button>
              <Button type="submit" icon={Save} loading={create.isPending} disabled={!draft.customer}>Save entry</Button>
            </div>
          </div>
        </Card>
      </form>

    </>
  )
}

function customerPayload(choice: CustomerChoice) {
  if (choice?.kind === 'existing') return { customer_id: choice.customer.id }
  if (choice?.kind === 'new') {
    const { name, contact, address, email } = choice.draft
    return { customer: { name: name.trim(), contact: contact.trim(), address: address.trim() || null, email: email.trim() || null } }
  }
  return {}
}
