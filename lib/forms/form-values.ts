import type { ProfileField } from '@/lib/types'

export type FormValues = Record<string, unknown>
export type ToggleDate = { on: boolean; date: string | null }
type Formula = { a: string; op: '+' | '-' | '*' | '/'; b: string }

export function formulaOf(field: ProfileField): Formula | null {
  const formula = field.type === 'number' ? field.config.formula : null
  return formula && typeof formula === 'object' ? (formula as Formula) : null
}

// Fields shown on Service Entry: enabled, in configured order.
export function activeFields(fields: ProfileField[]): ProfileField[] {
  return fields.filter((field) => field.enabled).sort((a, b) => a.sort_order - b.sort_order)
}

function toNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : 0
  return Number.isFinite(number) ? number : 0
}

// Preview of calculated fields. The server recomputes them with decimal
// arithmetic on save; empty operands count as 0 and ÷0 shows as empty.
export function evaluateFormulas(fields: ProfileField[], values: FormValues): Record<string, number | null> {
  const formulas = new Map(fields.flatMap((field) => {
    const formula = formulaOf(field)
    return formula ? [[field.key, formula] as const] : []
  }))
  const results: Record<string, number | null> = {}
  const resolve = (key: string, depth: number): number | null => {
    if (key in results) return results[key]
    const formula = formulas.get(key)
    if (!formula) return toNumber(values[key])
    if (depth > 20) return null
    const a = resolve(formula.a, depth + 1)
    const b = resolve(formula.b, depth + 1)
    let result: number | null = null
    if (a !== null && b !== null) {
      if (formula.op === '+') result = a + b
      else if (formula.op === '-') result = a - b
      else if (formula.op === '*') result = a * b
      else result = b === 0 ? null : a / b
    }
    results[key] = result === null ? null : Math.round(result * 100) / 100
    return results[key]
  }
  for (const key of formulas.keys()) resolve(key, 0)
  return results
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

// Builds form_data for the API: only enabled, non-calculated fields; empty
// optional values are omitted; numbers are sent as JSON numbers.
export function buildFormData(fields: ProfileField[], values: FormValues): FormValues {
  const data: FormValues = {}
  for (const field of activeFields(fields)) {
    if (formulaOf(field)) continue
    const value = values[field.key]
    switch (field.type) {
      case 'checkbox':
        data[field.key] = value === true
        break
      case 'number':
        if (!isEmpty(value)) data[field.key] = Number(value)
        break
      case 'date':
        if (field.config.toggle_based) {
          const toggle = (value as ToggleDate | undefined) ?? { on: false, date: null }
          data[field.key] = toggle.on ? { on: true, date: toggle.date || null } : { on: false, date: null }
        } else if (!isEmpty(value)) {
          data[field.key] = value
        }
        break
      case 'text':
        if (typeof value === 'string' && value.trim() !== '') data[field.key] = value
        break
      default:
        if (!isEmpty(value)) data[field.key] = value
    }
  }
  return data
}

// Maps API field errors (raw key or form_data.key) to field keys.
export function formDataErrors(fields: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [key, message] of Object.entries(fields)) errors[key.replace(/^form_data\./, '')] = message
  return errors
}
