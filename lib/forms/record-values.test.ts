import { describe, expect, it } from 'vitest'
import type { ProfileField } from '@/lib/types'
import { displayValue, formDataChanges } from './record-values'

const base = { company_id: 'c', profile_id: 'p', required: false, enabled: true, is_system: false }
const field = (key: string, type: ProfileField['type'], config: Record<string, unknown> = {}, extra: Partial<ProfileField> = {}): ProfileField =>
  ({ ...base, id: key, key, label: key, type, sort_order: 0, config, ...extra })

const fields = [
  field('total', 'number', { currency: true }),
  field('advance', 'number', { currency: true }),
  field('balance', 'number', { formula: { a: 'total', op: '-', b: 'advance' } }),
  field('notes', 'text'),
  field('services', 'linked_charges'),
  field('old', 'text', {}, { enabled: false }),
]

describe('formDataChanges', () => {
  const original = { total: 1500, advance: 500, balance: 1000, notes: 'Screen', services: ['a'], old: 'kept' }

  it('sends only changed keys and never calculated or disabled ones', () => {
    expect(formDataChanges(fields, original, { ...original, total: '2000', balance: 1500 })).toEqual({ total: 2000 })
  })

  it('clears emptied values with null', () => {
    expect(formDataChanges(fields, original, { ...original, notes: '', services: [] })).toEqual({ notes: null, services: null })
  })

  it('returns nothing when unchanged', () => {
    expect(formDataChanges(fields, original, { ...original, total: '1500' })).toEqual({})
  })
})

describe('displayValue', () => {
  it('resolves linked labels and marks inactive ones', () => {
    const linked = { services: [{ id: 'a', label: 'Diagnosis', selectable: true }, { id: 'b', label: 'Old Service', selectable: false }] }
    expect(displayValue(fields[4], ['a', 'b'], linked)).toBe('Diagnosis, Old Service (inactive)')
  })

  it('formats toggle dates and empty values', () => {
    expect(displayValue(field('r', 'date', { toggle_based: true }), { on: false, date: null })).toBe('Off')
    expect(displayValue(fields[3], '')).toBe('—')
  })
})
