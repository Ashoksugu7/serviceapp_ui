import { describe, expect, it } from 'vitest'
import { rules, validate } from './validation'

describe('validate', () => {
  const customer = { name: rules.name, contact: rules.requiredPhone, email: rules.email, address: rules.address }

  it('accepts a valid customer with optional fields left empty', () => {
    expect(validate({ name: 'Ravi Kumar', contact: '+91 98765-43210', email: null, address: '' }, customer)).toEqual({})
  })

  it('reports required fields', () => {
    expect(validate({ name: '  ', contact: null }, customer)).toEqual({ name: 'is required', contact: 'is required' })
  })

  it('checks mobile numbers by digit count and characters', () => {
    expect(validate({ name: 'A', contact: '12345' }, customer).contact).toBe('must be a mobile number with 6 to 20 digits')
    expect(validate({ name: 'A', contact: '1'.repeat(21) }, customer).contact).toBe('must be a mobile number with 6 to 20 digits')
    expect(validate({ name: 'A', contact: '98765 abc 43210' }, customer).contact).toBe('can contain only digits, spaces, +, - and brackets')
    expect(validate({ name: 'A', contact: '(044) 2345 6789' }, customer)).toEqual({})
  })

  it('checks email format', () => {
    expect(validate({ name: 'A', contact: '9876543210', email: 'ravi@example' }, customer).email).toMatch(/^must be a valid email address/)
    expect(validate({ name: 'A', contact: '9876543210', email: 'ravi@example.com' }, customer)).toEqual({})
  })

  it('checks length limits with the current length', () => {
    expect(validate({ name: 'A', contact: '9876543210', address: 'x'.repeat(4001) }, customer).address).toBe('can be at most 4000 characters (now 4001)')
    expect(validate({ name: 'x'.repeat(201), contact: '9876543210' }, customer).name).toBe('can be at most 200 characters (now 201)')
  })
})
