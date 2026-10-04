'use client'

import { MailCheck, Send } from 'lucide-react'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Alert, Button, Field, Input } from '@/components/ui'

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const identifier = String(new FormData(event.currentTarget).get('identifier') ?? '').trim()
    setError(null)
    setSending(true)
    try {
      const response = await fetch('/api/v1/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      if (response.ok) setSent(true)
      else setError((await response.json().catch(() => ({})))?.error?.message ?? 'The request failed. Try again.')
    } catch {
      setError('Unable to reach the server. Try again shortly.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><MailCheck size={20} /></span>
        <p className="text-sm text-slate-600">If an account matches, we&apos;ve emailed a link to reset your password. It works once and expires in 30 minutes.</p>
        <p className="text-xs text-slate-400">No email? Check spam, or ask your administrator to reset your password.</p>
        <Link href="/login" className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700">Back to sign in</Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <Field label="Email or mobile number">
        <Input name="identifier" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus placeholder="you@company.com or 98765 43210" />
      </Field>
      <Button type="submit" size="lg" icon={Send} loading={sending} className="w-full">Send reset link</Button>
      <Link href="/login" className="text-center text-xs font-medium text-slate-500 hover:text-slate-700">Back to sign in</Link>
    </form>
  )
}
