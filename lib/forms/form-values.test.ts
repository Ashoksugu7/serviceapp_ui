import { describe, expect, it } from 'vitest'
import type { ProfileField } from '@/lib/types'
import { addDays } from '@/lib/dates'
import { buildFormData, evaluateFormulas } from './form-values'

const base = { company_id: 'c', profile_id: 'p', required: false, enabled: true, is_system: false }
const field = (key: string, type: ProfileField['type'], sort_order: number, config: Record<string, unknown> = {}, extra: Partial<ProfileField> = {}): ProfileField =>
  ({ ...base, id: key, key, label: key, type, sort_order, config, ...extra })

const fields: ProfileField[] = [
  field('total', 'number', 0, { currency: true }),
  field('advance', 'number', 1, { currency: true }),
  field('balance', 'number', 2, { currency: true, formula: { a: 'total', op: '-', b: 'advance' } }),
  field('notes', 'text', 3),
  field('reminder', 'date', 4, { toggle_based: true }),
  field('delivered', 'checkbox', 5),
  field('services', 'linked_charges', 6),
  field('hidden', 'text', 7, {}, { enabled: false }),
]

describe('evaluateFormulas', () => {
  it('calculates with empty operands as zero', () => {
    expect(evaluateFormulas(fields, { total: '1500', advance: '' })).toEqual({ balance: 1500 })
    expect(evaluateFormulas(fields, { total: 1500, advance: 500.5 })).toEqual({ balance: 999.5 })
  })

  it('returns null for division by zero and chains formulas', () => {
    const chain = [
      field('a', 'number', 0),
      field('b', 'number', 1),
      field('ratio', 'number', 2, { formula: { a: 'a', op: '/', b: 'b' } }),
      field('double', 'number', 3, { formula: { a: 'ratio', op: '+', b: 'ratio' } }),
    ]
    expect(evaluateFormulas(chain, { a: 10, b: 0 })).toEqual({ ratio: null, double: null })
    expect(evaluateFormulas(chain, { a: 10, b: 4 })).toEqual({ ratio: 2.5, double: 5 })
  })
})

describe('buildFormData', () => {
  it('omits calculated, disabled and empty optional values', () => {
    const data = buildFormData(fields, { total: '1500', advance: '', balance: 1500, notes: '  ', hidden: 'x', services: [] })
    expect(data).toEqual({ total: 1500, reminder: { on: false, date: null }, delivered: false })
  })

  it('keeps toggle dates, checkboxes and linked arrays', () => {
    const data = buildFormData(fields, { reminder: { on: true, date: '2026-10-01' }, delivered: true, services: ['s1', 's2'], notes: 'Screen cracked' })
    expect(data).toEqual({ reminder: { on: true, date: '2026-10-01' }, delivered: true, services: ['s1', 's2'], notes: 'Screen cracked' })
  })
})

describe('addDays', () => {
  it('crosses month ends in local calendar dates', () => {
    expect(addDays('2026-09-24', 7)).toBe('2026-10-01')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })
})
