import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthCard } from '@/components/shell/auth-card'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Reset password' }

// Opened from the emailed link: /reset-password?token=… (T29).
export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const { token } = await searchParams
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return (
      <AuthCard title="Link not valid" description="This password reset link is incomplete or has been changed.">
        <Link href="/forgot-password" className="block text-center text-sm font-medium text-brand-600 hover:text-brand-700">Request a new link</Link>
      </AuthCard>
    )
  }
  return (
    <AuthCard title="Choose a new password" description="You will be signed out of all devices.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  )
}
