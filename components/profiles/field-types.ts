import { Calendar, CheckSquare, Hash, ListChecks, Package, Type, UserCog, Wrench, type LucideIcon } from 'lucide-react'
import type { ProfileField } from '@/lib/types'

export type FieldType = ProfileField['type']

export const fieldTypes: { value: FieldType; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'text', label: 'Text', icon: Type, hint: 'Free text, phone or email.' },
  { value: 'number', label: 'Number', icon: Hash, hint: 'Amounts or quantities, optionally calculated.' },
  { value: 'date', label: 'Date', icon: Calendar, hint: 'Plain date, quick-pick chips or an on/off reminder.' },
  { value: 'choice', label: 'Choice', icon: ListChecks, hint: 'Pick from a list of options.' },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, hint: 'A single yes/no tick.' },
  { value: 'linked_product', label: 'Product', icon: Package, hint: "One of this profile's active products." },
  { value: 'linked_charges', label: 'Services', icon: Wrench, hint: "Any of this profile's active services and charges." },
  { value: 'staff_role', label: 'Staff', icon: UserCog, hint: 'Active staff who have the chosen role.' },
]

export function fieldType(type: FieldType) {
  return fieldTypes.find((item) => item.value === type) ?? fieldTypes[0]
}

export const defaultConfig: Record<FieldType, Record<string, unknown>> = {
  text: { multiline: false, format: 'plain' },
  number: { currency: false, formula: null },
  date: { quick_pick: false, toggle_based: false },
  choice: { options: [], multiple: false, buttons: false },
  checkbox: {},
  linked_product: {},
  linked_charges: {},
  staff_role: { role_id: '' },
}

export const formulaOps = [
  { value: '+', label: '+ add' },
  { value: '-', label: '− subtract' },
  { value: '*', label: '× multiply' },
  { value: '/', label: '÷ divide' },
] as const

// Keys are permanent, so they are generated once from the label, e.g. "Serial No" → "a_serial_no".
export function keyFromLabel(label: string, prefix: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const key = `${prefix.toLowerCase().replace(/[^a-z]/g, '') || 'f'}_${slug}`
  return key.slice(0, 64).replace(/_+$/, '')
}

export const KEY_PATTERN = '[a-z][a-z0-9_]{0,63}'
