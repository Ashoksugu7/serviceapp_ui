'use client'

import { ClipboardList, Plus, RefreshCw, Save, Settings } from 'lucide-react'
import { useState } from 'react'
import { FilterSelect, SearchInput } from '@/components/ui/list'
import { Drawer } from '@/components/ui/overlay'
import { FieldEditor } from '@/components/profiles/field-editor'
import { PasswordInput } from '@/components/ui/password-input'
import { DynamicDemo } from './dynamic-demo'
import type { ProfileField } from '@/lib/types'
import {
  Alert, Badge, Button, Card, CardBody, Checkbox, Chip, EmptyState, Field, Input,
  PageHeader, SegmentedTabs, Select, Skeleton, StatTile, Table, Td, Textarea, Th,
} from '@/components/ui'

// Development-only page for checking components against computer-services.html.
export function Styleguide() {
  const [profile, setProfile] = useState<'jobcard' | 'refill'>('jobcard')
  const [pick, setPick] = useState('Today')
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState('')
  const [fieldDemo, setFieldDemo] = useState<ProfileField | null | undefined>(undefined)
  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <PageHeader eyebrow="Transaction" title="Service Entry" actions={<Badge tone="brand">A1002</Badge>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={profile}
          onChange={setProfile}
          items={[{ value: 'jobcard', label: 'Job Card', icon: ClipboardList }, { value: 'refill', label: 'Refill', icon: RefreshCw }]}
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setFieldDemo(null)}>New field</Button>
          <Button variant="secondary" size="sm" icon={Settings} onClick={() => setFieldDemo(demoFields[2])}>Manage Field Profile</Button>
        </div>
      </div>
      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field label="Date" required><Input type="date" defaultValue="2026-09-24" /></Field>
          <Field label="Customer No" required><Select><option>Select customer</option></Select></Field>
          <Field label="Customer Name"><Input readOnly placeholder="Auto-filled from Customer No" /></Field>
          <Field label="Contact No" error="Contact is required."><Input invalid /></Field>
          <Field label="Due Date" hint="Quick pick">
            <Input type="date" />
            <div className="flex flex-wrap gap-1.5">
              {['Today', '+3 days', '+7 days', '+14 days'].map((label) => <Chip key={label} active={pick === label} onClick={() => setPick(label)}>{label}</Chip>)}
            </div>
          </Field>
          <Field label="Complaint" required className="sm:col-span-2"><Textarea placeholder="Complaint" /></Field>
          <Field label="Temporary password" required><PasswordInput name="demo_password" rules /></Field>
          <Checkbox label="Send to Out-Store" />
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="secondary">Reset</Button>
          <Button icon={Save}>Save entry</Button>
        </div>
      </Card>

      <DynamicDemo />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Open records" value={12} icon={ClipboardList} tone="brand" />
        <StatTile label="At Out-Store" value={3} tone="warning" />
        <StatTile label="Customers" value={148} />
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-12" /></div>
      </div>

      <Card className="mt-8">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or mobile no" />
          <FilterSelect label="Status" value="" onChange={() => undefined} options={[{ value: '', label: 'All statuses' }]} />
          <Button icon={Plus} className="sm:ml-auto" onClick={() => setDrawer(true)}>Add customer</Button>
        </div>
        <Table>
          <thead><tr><Th>Mobile no</Th><Th>Name</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
          <tbody>
            <tr><Td className="font-medium tabular-nums text-slate-900">98765 43210</Td><Td>Ravi Kumar</Td><Td><Badge tone="success">Active</Badge></Td><Td className="text-right"><Button size="sm" variant="ghost">Edit</Button></Td></tr>
            <tr><Td className="font-medium tabular-nums text-slate-900">91234 56789</Td><Td>Meena S</Td><Td><Badge tone="warning">Issued</Badge></Td><Td className="text-right"><Button size="sm" variant="danger">Deactivate</Button></Td></tr>
          </tbody>
        </Table>
      </Card>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Alert>Customer number already exists.</Alert>
        <Alert tone="success">Service request A1002 was created.</Alert>
      </div>
      <Card className="mt-8"><EmptyState icon={ClipboardList} title="No records yet" description="Records created from Service Entry will appear here." action={<Button icon={Plus}>New entry</Button>} /></Card>
      <Drawer open={drawer} title="Add customer" description="The customer number is assigned when you save." onClose={() => setDrawer(false)} onSubmit={() => setDrawer(false)} submitLabel="Create customer" error="Request validation failed">
        <Field label="Customer name" required><Input /></Field>
        <Field label="Contact no" required error="must not be empty"><Input invalid /></Field>
        <Field label="Email"><Input type="email" /></Field>
        <Field label="Address"><Textarea /></Field>
      </Drawer>
      <FieldEditor
        open={fieldDemo !== undefined}
        field={fieldDemo ?? null}
        prefix="A"
        numberFields={demoFields.filter((field) => field.type === 'number')}
        staffRoles={[{ id: 'r1', name: 'Service Engineer', is_system: true }, { id: 'r2', name: 'Delivered By', is_system: false }]}
        saving={false}
        error={null}
        onClose={() => setFieldDemo(undefined)}
        onSave={() => setFieldDemo(undefined)}
      />
    </main>
  )
}

const demoField = { company_id: 'c', profile_id: 'p', required: false, enabled: true, is_system: false }
const demoFields: ProfileField[] = [
  { ...demoField, id: '1', key: 'jc_totalamount', label: 'Total Amount', type: 'number', sort_order: 0, config: { currency: true, formula: null } },
  { ...demoField, id: '2', key: 'jc_advance', label: 'Advance Amount', type: 'number', sort_order: 1, config: { currency: true, formula: null } },
  { ...demoField, id: '3', key: 'jc_balance', label: 'Balance Due', type: 'number', sort_order: 2, config: { currency: true, formula: { a: 'jc_totalamount', op: '-', b: 'jc_advance' } } },
]
