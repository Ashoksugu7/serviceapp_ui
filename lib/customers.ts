import type { Customer } from './types'

export function digitsOf(value: string): string {
  return value.replace(/\D/g, '')
}

// A query that is mostly digits and long enough to be a mobile number.
export function looksLikePhone(query: string): boolean {
  const trimmed = query.trim()
  return digitsOf(trimmed).length >= 6 && /^[+\d\s()-]+$/.test(trimmed)
}

export type CustomerMatch = { exact: Customer | null; suggestions: Customer[] }

// Finds customers by mobile number (digits only, so spaces and dashes don't
// matter) or name. Mobile numbers are unique per company, so a full number is
// an exact match.
export function matchCustomers(customers: Customer[], query: string, limit = 6): CustomerMatch {
  const text = query.trim().toLowerCase()
  if (!text) return { exact: null, suggestions: [] }
  const digits = digitsOf(text)
  const exact = (looksLikePhone(text) && customers.find((customer) => digitsOf(customer.contact) === digits)) || null
  if (exact) return { exact, suggestions: [] }

  const suggestions = customers.filter((customer) =>
    customer.name.toLowerCase().includes(text) ||
    (digits.length >= 3 && digitsOf(customer.contact).includes(digits)),
  )
  return { exact: null, suggestions: suggestions.slice(0, limit) }
}
