'use client'

import { useState, type FormEvent } from 'react'

// Checks run in the browser before a form is sent (UI05). They mirror the API
// rules so most mistakes are shown under the field straight away; the API
// still validates everything and its field errors are shown the same way.

export type FieldRule = {
  required?: boolean
  /** email: one @ and a dotted domain; phone: digits, spaces, + - ( ) with 6–20 digits. */
  kind?: 'email' | 'phone'
  max?: number
}

export type FormRules = Record<string, FieldRule>
export type FormValues = Record<string, string | null | undefined>

export const LIMITS = { name: 200, email: 254, contact: 50, address: 4000, text: 200 } as const

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARS = /^[+\d\s()-]+$/

export function phoneError(value: string): string | null {
  const digits = value.replace(/\D/g, '').length
  if (!PHONE_CHARS.test(value)) return 'can contain only digits, spaces, +, - and brackets'
  if (digits < 6 || digits > 20) return 'must be a mobile number with 6 to 20 digits'
  return null
}

export function emailError(value: string): string | null {
  return EMAIL.test(value) ? null : 'must be a valid email address, like name@example.com'
}

/** Returns a message per invalid field, in the API's wording; empty when all pass. */
export function validate(values: FormValues, rules: FormRules): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const [field, rule] of Object.entries(rules)) {
    const value = (values[field] ?? '').trim()
    if (!value) {
      if (rule.required) errors[field] = 'is required'
      continue
    }
    const max = rule.max ?? (rule.kind === 'email' ? LIMITS.email : rule.kind === 'phone' ? LIMITS.contact : undefined)
    if (max !== undefined && value.length > max) {
      errors[field] = `can be at most ${max} characters (now ${value.length})`
      continue
    }
    const message = rule.kind === 'email' ? emailError(value) : rule.kind === 'phone' ? phoneError(value) : null
    if (message) errors[field] = message
  }
  return errors
}

// Field rules shared by the screens.
export const rules = {
  name: { required: true, max: LIMITS.name },
  requiredEmail: { required: true, kind: 'email' },
  email: { kind: 'email' },
  requiredPhone: { required: true, kind: 'phone' },
  phone: { kind: 'phone' },
  address: { max: LIMITS.address },
  text: { max: LIMITS.text },
} satisfies Record<string, FieldRule>

/**
 * Holds browser-side field errors for one form. `check` validates before the
 * request is sent; editing a field clears its message. Merge `errors` over the
 * API's field errors when rendering.
 */
export function useFormCheck() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  return {
    errors,
    /** Banner text while browser-side errors are showing. */
    summary: Object.keys(errors).length > 0 ? 'Check the highlighted fields before saving.' : null,
    check(values: FormValues, formRules: FormRules): boolean {
      const found = validate(values, formRules)
      setErrors(found)
      return Object.keys(found).length === 0
    },
    clear: () => setErrors({}),
    /** Pass to the form's onInput so a corrected field loses its message. */
    onInput(event: FormEvent<HTMLFormElement>) {
      // Input "admin_email" also clears the API-style key "admin.email".
      const name = (event.target as HTMLInputElement).name?.replace(/_/g, '.')
      const key = Object.keys(errors).find((field) => field === name || field.replace(/_/g, '.') === name)
      if (key) {
        setErrors((current) => {
          const next = { ...current }
          delete next[key]
          return next
        })
      }
    },
  }
}
