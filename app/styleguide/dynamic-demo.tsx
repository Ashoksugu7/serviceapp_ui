'use client'

import { useMemo, useState } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui'
import { CustomerLookup, type CustomerChoice } from '@/components/service-entry/customer-lookup'
import { DynamicFieldInput } from '@/components/service-entry/field-input'
import { buildFormData, evaluateFormulas, type FormValues } from '@/lib/forms/form-values'
import type { Customer, ProfileField } from '@/lib/types'

const base = { company_id: 'c', profile_id: 'p', required: false, enabled: true, is_system: false }
const f = (key: string, label: string, type: ProfileField['type'], sort_order: number, config: Record<string, unknown> = {}, required = false): ProfileField =>
  ({ ...base, id: key, key, label, type, sort_order, config, required })

const fields: ProfileField[] = [
  f('jc_attendedby', 'Attended By', 'staff_role', 0, { role_id: 'r1' }),
  f('jc_servicetype', 'Service Type', 'choice', 1, { options: ['In-Person', 'In-Store'], buttons: true }, true),
  f('jc_duedate', 'Due Date', 'date', 2, { quick_pick: true }),
  f('jc_product', 'Product', 'linked_product', 3),
  f('jc_complaint', 'Complaint', 'text', 4, { multiline: true }, true),
  f('jc_advance', 'Advance Amount', 'number', 5, { currency: true }),
  f('jc_totalamount', 'Total Amount', 'number', 6, { currency: true }),
  f('jc_balance', 'Balance Due', 'number', 7, { currency: true, formula: { a: 'jc_totalamount', op: '-', b: 'jc_advance' } }),
  f('jc_services', 'Services Provided', 'linked_charges', 8),
  f('jc_reminder', 'Reminder', 'date', 9, { toggle_based: true }),
  f('jc_warranty', 'Under Warranty', 'checkbox', 10),
]
const customers: Customer[] = [
  { id: 'c1', company_id: 'c', name: 'Ravi Kumar', contact: '98765 43210', email: null, address: null },
  { id: 'c2', company_id: 'c', name: 'Meena S', contact: '91234 56789', email: null, address: null },
]
const options = {
  products: [{ id: 'p1', company_id: 'c', profile_id: 'p', name: 'Laptop', brand: 'Dell', category: null, status: 'ACTIVE' as const }],
  charges: ['Diagnosis', 'OS Install', 'Screen Replacement'].map((name, index) => ({ id: `s${index}`, company_id: 'c', profile_id: 'p', name, description: null, status: 'ACTIVE' as const })),
  staff: [{ id: 'st1', company_id: 'c', name: 'Arun', contact: '1', email: null, specialization: null, status: 'ACTIVE' as const, role_ids: ['r1'] }],
}

// Development preview of the Service Entry field renderer with sample data.
export function DynamicDemo() {
  const [values, setValues] = useState<FormValues>({})
  const [customer, setCustomer] = useState<CustomerChoice>({ kind: 'existing', customer: customers[0] })
  const calculated = useMemo(() => evaluateFormulas(fields, values), [values])
  return (
    <Card className="mt-8 overflow-visible">
      <CardHeader title="Service Entry fields" description="All field types rendered from a sample profile." />
      <CardBody className="grid gap-5 sm:grid-cols-2">
        <CustomerLookup label="Mobile No" base="/companies/demo" value={customer} allowCreate onChange={setCustomer} />
        {fields.map((field) => (
          <DynamicFieldInput
            key={field.key}
            field={field}
            value={values[field.key]}
            calculated={calculated[field.key]}
            error={field.key === 'jc_complaint' ? 'required' : undefined}
            options={options}
            onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
          />
        ))}
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 sm:col-span-2">{JSON.stringify(buildFormData(fields, values), null, 2)}</pre>
      </CardBody>
    </Card>
  )
}
