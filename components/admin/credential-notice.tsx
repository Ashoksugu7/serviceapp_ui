'use client'

import { Check, Copy, KeyRound, MailCheck, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'
import type { CredentialDelivery } from '@/lib/types'

export type CredentialResult = { title: string; email: string; delivery: CredentialDelivery }

// Shown after onboarding, adding a user or resetting a password. When the email
// was not delivered the temporary password is shown once, to pass on.
export function CredentialNotice({ result, onClose }: { result: CredentialResult | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null
  const { delivery } = result
  const password = delivery.temporary_password

  async function copy() {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={result.title} className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X size={18} />
        </button>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full ${delivery.email_sent ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {delivery.email_sent ? <MailCheck size={20} /> : <KeyRound size={20} />}
        </span>
        <h2 className="mt-3 text-base font-semibold text-slate-900">{result.title}</h2>
        {delivery.email_sent ? (
          <p className="mt-2 text-sm text-slate-600">
            Sign-in details and a temporary password were emailed to <span className="font-medium text-slate-800">{result.email}</span>. They will choose their own password when they first sign in.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              The email could not be sent. Give <span className="font-medium text-slate-800">{result.email}</span> this temporary password; they will choose their own when they first sign in.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <code className="flex-1 select-all font-mono text-base tracking-wide text-slate-900">{password}</code>
              <Button size="sm" variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
            </div>
            <p className="mt-2 text-xs text-amber-700">This password is shown only once.</p>
          </>
        )}
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}
