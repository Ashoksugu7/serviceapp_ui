'use client'

import { Package, Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Field, Input, SegmentedTabs, Select, Table, Td, Textarea, Th } from '@/components/ui'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { Drawer, useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useListState, useLocalList, useProfiles } from '@/lib/queries'
import type { Charge, Product, ServiceProfile } from '@/lib/types'

type Kind = 'products' | 'charges'

// Products and charges/services are both profile-scoped catalogues, shown as two tabs.
export function CatalogScreen() {
  const [kind, setKind] = useState<Kind>('products')
  const companyId = useCompanyId()!
  const profiles = useProfiles(companyId).data?.items ?? []
  return (
    <div className="space-y-4">
      <SegmentedTabs
        value={kind}
        onChange={setKind}
        items={[{ value: 'products', label: 'Products', icon: Package }, { value: 'charges', label: 'Services & Charges', icon: Wrench }]}
      />
      {kind === 'products'
        ? <ProductsList companyId={companyId} profiles={profiles} />
        : <ChargesList companyId={companyId} profiles={profiles} />}
    </div>
  )
}

function profileOptions(profiles: ServiceProfile[]) {
  return [{ value: '', label: 'All profiles' }, ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))]
}

function ProfileSelect({ profiles, error }: { profiles: ServiceProfile[]; error?: string }) {
  const active = profiles.filter((profile) => profile.is_active)
  return (
    <Field label="Service profile" required error={error} hint="Cannot be changed after creation.">
      <Select name="profile_id" required defaultValue={active[0]?.id ?? ''} invalid={!!error}>
        <option value="" disabled>Select profile</option>
        {active.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} ({profile.prefix})</option>)}
      </Select>
    </Field>
  )
}

function ProductsList({ companyId, profiles }: { companyId: string; profiles: ServiceProfile[] }) {
  const canWrite = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}/products`
  const list = useListState({ profile_id: '', status: '' })
  const query = useLocalList<Product>(base, list.params, (product) => [product.name, product.brand, product.category])
  const save = useApiMutation<Product>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ product: Product | null } | null>(null)
  const editing = editor?.product ?? null
  const errors = fieldErrors(save.error)
  const profileName = (id: string) => profiles.find((profile) => profile.id === id)?.name ?? '—'

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    const details = { name: values.name, brand: values.brand, category: values.category, status: values.status ?? 'ACTIVE' }
    save.mutate(
      { path: editing ? `${base}/${editing.id}` : base, method: editing ? 'PATCH' : 'POST', body: editing ? details : { ...details, profile_id: values.profile_id } },
      { onSuccess: (product) => { notify(editing ? `${product.name} was updated.` : `${product.name} was added.`); setEditor(null) } },
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
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search products" />
            <FilterSelect label="Profile" value={list.filters.profile_id} onChange={(value) => list.setFilter('profile_id', value)} options={profileOptions(profiles)} />
            <FilterSelect label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'DISCONTINUED', label: 'Discontinued' }]} />
            {canWrite && <Button icon={Plus} className="sm:ml-auto" onClick={() => { save.reset(); setEditor({ product: null }) }}>Add product</Button>}
          </>
        }
        empty={{ icon: Package, title: 'No products found', description: 'Products appear in the Product field of their service profile.' }}
      >
        {(products) => (
          <Table>
            <thead><tr><Th>Product</Th><Th>Profile</Th><Th>Category</Th><Th>Status</Th>{canWrite && <Th />}</tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {product.brand && <div className="text-xs text-slate-400">{product.brand}</div>}
                  </Td>
                  <Td>{profileName(product.profile_id)}</Td>
                  <Td>{product.category ?? '—'}</Td>
                  <Td><Badge tone={statusTone(product.status)}>{statusLabel(product.status)}</Badge></Td>
                  {canWrite && <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => { save.reset(); setEditor({ product }) }}>Edit</Button></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add product'}
        description={editing ? `Profile: ${profileName(editing.profile_id)}` : undefined}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create product'}
        submitting={save.isPending}
        error={formError(save.error)}
      >
        {!editing && <ProfileSelect profiles={profiles} error={errors.profile_id} />}
        <Field label="Name" required error={errors.name}><Input name="name" required defaultValue={editing?.name} invalid={!!errors.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" error={errors.brand}><Input name="brand" defaultValue={editing?.brand ?? ''} invalid={!!errors.brand} /></Field>
          <Field label="Category" error={errors.category}><Input name="category" defaultValue={editing?.category ?? ''} invalid={!!errors.category} /></Field>
        </div>
        <Field label="Status" error={errors.status}>
          <Select name="status" defaultValue={editing?.status ?? 'ACTIVE'}>
            <option value="ACTIVE">Active</option>
            <option value="DISCONTINUED">Discontinued</option>
          </Select>
        </Field>
      </Drawer>
    </>
  )
}

function ChargesList({ companyId, profiles }: { companyId: string; profiles: ServiceProfile[] }) {
  const canWrite = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}/charges`
  const list = useListState({ profile_id: '', status: '' })
  const query = useLocalList<Charge>(base, list.params, (charge) => [charge.name, charge.description])
  const save = useApiMutation<Charge>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ charge: Charge | null } | null>(null)
  const editing = editor?.charge ?? null
  const errors = fieldErrors(save.error)
  const profileName = (id: string) => profiles.find((profile) => profile.id === id)?.name ?? '—'

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    const details = { name: values.name, description: values.description, status: values.status ?? 'ACTIVE' }
    save.mutate(
      { path: editing ? `${base}/${editing.id}` : base, method: editing ? 'PATCH' : 'POST', body: editing ? details : { ...details, profile_id: values.profile_id } },
      { onSuccess: (charge) => { notify(editing ? `${charge.name} was updated.` : `${charge.name} was added.`); setEditor(null) } },
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
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search services" />
            <FilterSelect label="Profile" value={list.filters.profile_id} onChange={(value) => list.setFilter('profile_id', value)} options={profileOptions(profiles)} />
            <FilterSelect label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
            {canWrite && <Button icon={Plus} className="sm:ml-auto" onClick={() => { save.reset(); setEditor({ charge: null }) }}>Add service</Button>}
          </>
        }
        empty={{ icon: Wrench, title: 'No services found', description: 'Services appear in the Services Provided field of their profile.' }}
      >
        {(charges) => (
          <Table>
            <thead><tr><Th>Service / charge</Th><Th>Profile</Th><Th>Status</Th>{canWrite && <Th />}</tr></thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{charge.name}</div>
                    {charge.description && <div className="max-w-md truncate text-xs text-slate-400">{charge.description}</div>}
                  </Td>
                  <Td>{profileName(charge.profile_id)}</Td>
                  <Td><Badge tone={statusTone(charge.status)}>{statusLabel(charge.status)}</Badge></Td>
                  {canWrite && <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => { save.reset(); setEditor({ charge }) }}>Edit</Button></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add service / charge'}
        description={editing ? `Profile: ${profileName(editing.profile_id)}` : undefined}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create service'}
        submitting={save.isPending}
        error={formError(save.error)}
      >
        {!editing && <ProfileSelect profiles={profiles} error={errors.profile_id} />}
        <Field label="Name" required error={errors.name}><Input name="name" required defaultValue={editing?.name} invalid={!!errors.name} /></Field>
        <Field label="Description" error={errors.description}><Textarea name="description" defaultValue={editing?.description ?? ''} invalid={!!errors.description} /></Field>
        <Field label="Status" error={errors.status}>
          <Select name="status" defaultValue={editing?.status ?? 'ACTIVE'}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      </Drawer>
    </>
  )
}
