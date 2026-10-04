'use client'

import { KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '@/components/ui'
import { PasswordInput } from '@/components/ui/password-input'
import { api, APIError, apiErrorMessage } from '@/lib/api-client'

export function ChangePasswordForm({ nextPath, required }: { nextPath: string; required: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const current = String(data.get('current_password') ?? '')
    const next = String(data.get('new_password') ?? '')
    setError(null)
    setFields({})
    if (next !== String(data.get('confirm_password') ?? '')) {
      setFields({ confirm_password: 'does not match the new password' })
      return
    }
    setSaving(true)
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: next }) })
      // Full navigation so the server layout reloads the identity without the flag.
      window.location.assign(nextPath)
    } catch (cause) {
      if (cause instanceof APIError && cause.fields) setFields(cause.fields)
      else setError(apiErrorMessage(cause))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <Field label={required ? 'Temporary password' : 'Current password'} required error={fields.current_password}>
        <PasswordInput name="current_password" required autoComplete="current-password" autoFocus invalid={!!fields.current_password} />
      </Field>
      <Field label="New password" required error={fields.new_password}>
        <PasswordInput name="new_password" required autoComplete="new-password" maxLength={128} rules invalid={!!fields.new_password} />
      </Field>
      <Field label="Confirm new password" required error={fields.confirm_password}>
        <PasswordInput name="confirm_password" required autoComplete="new-password" maxLength={128} invalid={!!fields.confirm_password} />
      </Field>
      <Button type="submit" size="lg" icon={KeyRound} loading={saving} className="mt-1 w-full">Save password</Button>
      {!required && <Link href="/" className="text-center text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</Link>}
      <p className="text-center text-xs text-slate-400">You stay signed in here; other devices are signed out.</p>
    </form>
  )
}
