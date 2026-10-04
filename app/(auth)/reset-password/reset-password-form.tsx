'use client'

import { CheckCircle2, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field } from '@/components/ui'
import { PasswordInput } from '@/components/ui/password-input'

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<{ message: string; expired: boolean } | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const password = String(data.get('new_password') ?? '')
    setError(null)
    setFields({})
    if (password !== String(data.get('confirm_password') ?? '')) {
      setFields({ confirm_password: 'does not match the new password' })
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/v1/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (response.ok) {
        setDone(true)
        return
      }
      const body = (await response.json().catch(() => ({})))?.error
      if (body?.fields) setFields(body.fields)
      else setError({ message: body?.message ?? 'The password was not changed. Try again.', expired: body?.code === 'RESET_TOKEN_INVALID' })
    } catch {
      setError({ message: 'Unable to reach the server. Try again shortly.', expired: false })
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></span>
        <p className="text-sm text-slate-600">Your password was changed. Sign in with your new password.</p>
        <Link href="/login" className="mt-1 inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700">Sign in</Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && (
        <Alert>
          {error.message}{' '}
          {error.expired && <Link href="/forgot-password" className="font-medium underline">Request a new link</Link>}
        </Alert>
      )}
      <Field label="New password" required error={fields.new_password}>
        <PasswordInput name="new_password" required autoComplete="new-password" maxLength={128} rules autoFocus invalid={!!fields.new_password} />
      </Field>
      <Field label="Confirm new password" required error={fields.confirm_password}>
        <PasswordInput name="confirm_password" required autoComplete="new-password" maxLength={128} invalid={!!fields.confirm_password} />
      </Field>
      <Button type="submit" size="lg" icon={KeyRound} loading={saving} className="w-full">Save password</Button>
    </form>
  )
}
