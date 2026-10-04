'use client'

import { LogIn } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field, Input } from '@/components/ui'
import { PasswordInput } from '@/components/ui/password-input'

export function LoginForm({ nextPath, notice }: { nextPath: string; notice?: string }) {
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: String(data.get('identifier') ?? '').trim(), password: data.get('password') }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setError(body?.error?.message ?? 'Sign in failed. Try again.')
        setSubmitting(false)
        return
      }
      const body = await response.json().catch(() => ({}))
      // Full navigation so the server layout loads the new session; a
      // temporary password goes to the change-password page first (T28).
      window.location.assign(body?.user?.must_change_password ? `/change-password?next=${encodeURIComponent(nextPath)}` : nextPath)
    } catch {
      setError('Unable to reach the server. Try again shortly.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {notice && !error && <Alert>{notice}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Field label="Email or mobile number">
        <Input name="identifier" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus placeholder="you@company.com or 98765 43210" />
      </Field>
      <Field label="Password">
        <PasswordInput name="password" required autoComplete="current-password" />
      </Field>
      <Link href="/forgot-password" className="-mt-2 self-end text-xs font-medium text-brand-600 hover:text-brand-700">Forgot password?</Link>
      <Button type="submit" size="lg" icon={LogIn} loading={submitting} className="mt-1 w-full">
        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
