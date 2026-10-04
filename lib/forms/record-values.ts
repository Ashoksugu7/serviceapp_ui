import { formatDate } from '@/lib/dates'
import { formatAmount } from '@/lib/format'
import type { ProfileField } from '@/lib/types'
import { activeFields, buildFormData, formulaOf, type FormValues, type ToggleDate } from './form-values'

export type LinkedLabels = Record<string, { id: string; label: string; selectable: boolean }[]>

// Human-readable text for a stored form value; linked IDs resolve through the
// detail response's linked_values so inactive records still read correctly.
export function displayValue(field: ProfileField, value: unknown, linked: LinkedLabels = {}): string {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return '—'
  switch (field.type) {
    case 'number':
      return field.config.currency ? formatAmount(value as number) : String(value)
    case 'date':
      if (typeof value === 'object') {
        const toggle = value as ToggleDate
        return toggle.on ? `On · ${formatDate(toggle.date)}` : 'Off'
      }
      return formatDate(String(value))
    case 'checkbox':
      return value === true ? 'Yes' : 'No'
    case 'choice':
      return Array.isArray(value) ? value.join(', ') : String(value)
    case 'linked_product':
    case 'linked_charges':
    case 'staff_role': {
      const labels = linked[field.key] ?? []
      const ids = Array.isArray(value) ? (value as string[]) : [String(value)]
      return ids
        .map((id) => {
          const match = labels.find((item) => item.id === id)
          return match ? `${match.label}${match.selectable ? '' : ' (inactive)'}` : 'Unavailable'
        })
        .join(', ')
    }
    default:
      return String(value)
  }
}

// Editable values for the form inputs, starting from stored form_data.
export function editableValues(fields: ProfileField[], formData: FormValues): FormValues {
  const values: FormValues = {}
  for (const field of activeFields(fields)) {
    if (field.key in formData) values[field.key] = formData[field.key]
  }
  return values
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// PATCH form_data: only changed enabled, non-calculated keys. A value that was
// stored but is now empty is sent as null so the API clears it.
export function formDataChanges(fields: ProfileField[], original: FormValues, values: FormValues): FormValues {
  const next = buildFormData(fields, values)
  const changes: FormValues = {}
  for (const field of activeFields(fields)) {
    if (formulaOf(field)) continue
    const key = field.key
    if (key in next) {
      if (!same(next[key], original[key])) changes[key] = next[key]
    } else if (original[key] !== undefined && original[key] !== null) {
      changes[key] = null
    }
  }
  return changes
}
