'use client'

import { Plus, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Field, Input, Select, Table, Td, Th } from '@/components/ui'
import { FilterSelect, ListCard, SearchInput, statusLabel, statusTone } from '@/components/ui/list'
import { Drawer, useToast } from '@/components/ui/overlay'
import { useCompanyId, useIdentity } from '@/components/shell/identity'
import { formError } from '@/lib/api-client'
import { formatAmount } from '@/lib/format'
import { fieldErrors, formValues, useApiMutation, useListState, useLocalList } from '@/lib/queries'
import type { StandbyItem } from '@/lib/types'

export function StandbyItemsScreen() {
  const companyId = useCompanyId()!
  const canWrite = useIdentity().user.role === 'ADMIN'
  const base = `/companies/${companyId}/standby-items`
  const list = useListState({ status: '' })
  const query = useLocalList<StandbyItem>(base, list.params, (item) => [item.name, item.serial_no, item.category])
  const save = useApiMutation<StandbyItem>([base])
  const notify = useToast()
  const [editor, setEditor] = useState<{ item: StandbyItem | null } | null>(null)
  const editing = editor?.item ?? null
  const errors = fieldErrors(save.error)

  function open(item: StandbyItem | null) {
    save.reset()
    setEditor({ item })
  }

  function submit(form: HTMLFormElement) {
    const values = formValues(form)
    const details = { name: values.name, serial_no: values.serial_no, category: values.category, price: values.price }
    save.mutate(
      // Issued status is owned by the issue/return workflow, so only edits set status.
      { path: editing ? `${base}/${editing.id}` : base, method: editing ? 'PATCH' : 'POST', body: editing ? { ...details, status: values.status } : details },
      { onSuccess: (item) => { notify(editing ? `${item.name} was updated.` : `${item.name} was added.`); setEditor(null) } },
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
            <SearchInput value={list.q} onChange={list.setQ} placeholder="Search items or serial no" />
            <FilterSelect
              label="Status"
              value={list.filters.status}
              onChange={(value) => list.setFilter('status', value)}
              options={[{ value: '', label: 'All statuses' }, { value: 'AVAILABLE', label: 'Available' }, { value: 'ISSUED', label: 'Issued' }, { value: 'UNDER_MAINTENANCE', label: 'Under maintenance' }]}
            />
            {canWrite && <Button icon={Plus} className="sm:ml-auto" onClick={() => open(null)}>Add item</Button>}
          </>
        }
        empty={{ icon: Wrench, title: 'No stand-by items found', description: 'Loaner units that can be issued to customers while their item is in service.' }}
      >
        {(items) => (
          <Table>
            <thead><tr><Th>Item</Th><Th>Serial no</Th><Th>Category</Th><Th className="text-right">Price</Th><Th>Status</Th>{canWrite && <Th />}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-900">{item.name}</Td>
                  <Td className="font-mono text-xs">{item.serial_no ?? '—'}</Td>
                  <Td>{item.category ?? '—'}</Td>
                  <Td className="text-right tabular-nums">{formatAmount(item.price)}</Td>
                  <Td><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge></Td>
                  {canWrite && (
                    <Td className="text-right">
                      {item.status === 'ISSUED'
                        ? <span className="text-xs text-slate-400" title="Return the item before editing">Issued</span>
                        : <Button size="sm" variant="ghost" onClick={() => open(item)}>Edit</Button>}
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ListCard>

      <Drawer
        open={editor !== null}
        title={editing ? `Edit ${editing.name}` : 'Add stand-by item'}
        onClose={() => setEditor(null)}
        onSubmit={(event) => submit(event.currentTarget)}
        submitLabel={editing ? 'Save changes' : 'Create item'}
        submitting={save.isPending}
        error={formError(save.error)}
      >
        <Field label="Item name" required error={errors.name}><Input name="name" required defaultValue={editing?.name} invalid={!!errors.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Serial no" error={errors.serial_no}><Input name="serial_no" defaultValue={editing?.serial_no ?? ''} invalid={!!errors.serial_no} /></Field>
          <Field label="Category" error={errors.category}><Input name="category" defaultValue={editing?.category ?? ''} invalid={!!errors.category} /></Field>
        </div>
        <Field label="Price" error={errors.price} hint="Informational only; no billing.">
          <Input name="price" type="number" min="0" step="0.01" defaultValue={editing?.price ?? ''} invalid={!!errors.price} />
        </Field>
        {editing && (
          <Field label="Status" error={errors.status}>
            <Select name="status" defaultValue={editing.status === 'UNDER_MAINTENANCE' ? 'UNDER_MAINTENANCE' : 'AVAILABLE'}>
              <option value="AVAILABLE">Available</option>
              <option value="UNDER_MAINTENANCE">Under maintenance</option>
            </Select>
          </Field>
        )}
      </Drawer>
    </>
  )
}
