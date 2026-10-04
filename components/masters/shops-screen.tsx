'use client'

import { Plus, Store } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Field, Input, Select, Table, Td, Textarea, Th } from '@/components/ui'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { Drawer, useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { formError } from '@/lib/api-client'
import { fieldErrors, formValues, useApiMutation, useListState, useLocalList, useProfiles } from '@/lib/queries'
import type { OutStoreShop } from '@/lib/types'

export function ShopsScreen() {
  const companyId = useCompanyId()!
  const canWrite = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}/out-store-shops`
  const profiles = useProfiles(companyId).data?.items ?? []
  const list = useListState({ status: '' })
  const query = useLocalList<OutStoreShop>(base, list.params, (shop) => [shop.shop_name, shop.contact_person, shop.contact, shop.address])
  const save = useApiMutation<OutStoreShop>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ shop: OutStoreShop | null } | null>(null)
  const editing = editor?.shop ?? null
  const errors = fieldErrors(save.error)
  const scope = (id: string | null) => (id ? profiles.find((profile) => profile.id === id)?.name ?? '—' : 'All profiles')

  function open(shop: OutStoreShop | null) {
    save.reset()
    setEditor({ shop })
  }

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    const details = { shop_name: values.shop_name, contact_person: values.contact_person, contact: values.contact, address: values.address, status: values.status ?? 'ACTIVE' }
    save.mutate(
      { path: editing ? `${base}/${editing.id}` : base, method: editing ? 'PATCH' : 'POST', body: editing ? details : { ...details, profile_id: values.profile_id } },
      { onSuccess: (shop) => { notify(editing ? `${shop.shop_name} was updated.` : `${shop.shop_name} was added.`); setEditor(null) } },
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
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search shops" />
            <FilterSelect label="Status" value={list.filters.status} onChange={(value) => list.setFilter('status', value)} options={[{ value: '', label: 'All statuses' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
            {canWrite && <Button icon={Plus} className="sm:ml-auto" onClick={() => open(null)}>Add shop</Button>}
          </>
        }
        empty={{ icon: Store, title: 'No shops found', description: 'External repair shops that items are sent to from Out-Store Entry.' }}
      >
        {(shops) => (
          <Table>
            <thead><tr><Th>Shop</Th><Th>Contact</Th><Th>Profile</Th><Th>Status</Th>{canWrite && <Th />}</tr></thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-slate-50/60">
                  <Td>
                    <div className="font-medium text-slate-900">{shop.shop_name}</div>
                    {shop.address && <div className="max-w-xs truncate text-xs text-slate-400">{shop.address}</div>}
                  </Td>
                  <Td>
                    {shop.contact_person ?? '—'}
                    {shop.contact && <div className="text-xs tabular-nums text-slate-400">{shop.contact}</div>}
                  </Td>
                  <Td>{scope(shop.profile_id)}</Td>
                  <Td><Badge tone={statusTone(shop.status)}>{statusLabel(shop.status)}</Badge></Td>
                  {canWrite && <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => open(shop)}>Edit</Button></Td>}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.shop_name}` : 'Add Out-Store shop'}
        description={editing ? `Serves: ${scope(editing.profile_id)}` : undefined}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create shop'}
        submitting={save.isPending}
        error={formError(save.error)}
      >
        {!editing && (
          <Field label="Serves profile" error={errors.profile_id} hint="Cannot be changed after creation.">
            <Select name="profile_id" defaultValue="">
              <option value="">All profiles</option>
              {profiles.filter((profile) => profile.is_active).map((profile) => <option key={profile.id} value={profile.id}>{profile.name} ({profile.prefix})</option>)}
            </Select>
          </Field>
        )}
        <Field label="Shop name" required error={errors.shop_name}><Input name="shop_name" required defaultValue={editing?.shop_name} invalid={!!errors.shop_name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person" error={errors.contact_person}><Input name="contact_person" defaultValue={editing?.contact_person ?? ''} invalid={!!errors.contact_person} /></Field>
          <Field label="Contact no" error={errors.contact}><Input name="contact" type="tel" defaultValue={editing?.contact ?? ''} invalid={!!errors.contact} /></Field>
        </div>
        <Field label="Address" error={errors.address}><Textarea name="address" defaultValue={editing?.address ?? ''} invalid={!!errors.address} /></Field>
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
