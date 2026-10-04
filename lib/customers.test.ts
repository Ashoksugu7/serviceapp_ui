import { describe, expect, it } from 'vitest'
import type { Customer } from './types'
import { looksLikePhone, matchCustomers } from './customers'

const customer = (id: string, name: string, contact: string): Customer =>
  ({ id, company_id: 'c', name, contact, email: null, address: null })

const customers = [customer('ravi', 'Ravi Kumar', '98765 43210'), customer('meena', 'Meena S', '91234-56789'), customer('shankar', 'Ravi Shankar', '9000011111')]

describe('matchCustomers', () => {
  it('matches a mobile number regardless of spaces and dashes', () => {
    expect(matchCustomers(customers, '9876543210').exact?.id).toBe('ravi')
    expect(matchCustomers(customers, '91234 56789').exact?.id).toBe('meena')
  })

  it('suggests by name or partial number', () => {
    expect(matchCustomers(customers, 'ravi').suggestions.map((item) => item.id)).toEqual(['ravi', 'shankar'])
    expect(matchCustomers(customers, '98765').suggestions.map((item) => item.id)).toEqual(['ravi'])
  })

  it('no longer matches the retired customer numbers', () => {
    expect(matchCustomers(customers, 'C-1001')).toEqual({ exact: null, suggestions: [] })
  })

  it('finds nothing for a new number', () => {
    expect(matchCustomers(customers, '9555512345')).toEqual({ exact: null, suggestions: [] })
    expect(looksLikePhone('9555512345')).toBe(true)
    expect(looksLikePhone('Ravi')).toBe(false)
  })
})
