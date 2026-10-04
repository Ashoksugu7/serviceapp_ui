import type { Metadata } from 'next'
import { AuthCard } from '@/components/shell/auth-card'
import { requireIdentity } from '@/lib/session'
import { ChangePasswordForm } from './change-password-form'

export const metadata: Metadata = { title: 'Change password' }

// Also reached automatically while a temporary password is active (T28).
export default async function ChangePasswordPage({ searchParams }: PageProps<'/change-password'>) {
  const identity = await requireIdentity()
  const { next } = await searchParams
  const nextPath = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/'
  const required = identity.user.must_change_password

  return (
    <AuthCard
      title={required ? 'Choose your password' : 'Change password'}
      description={required ? `Welcome, ${identity.user.name}. Replace your temporary password to continue.` : `Signed in as ${identity.user.email}.`}
    >
      <ChangePasswordForm nextPath={nextPath} required={required} />
    </AuthCard>
  )
}
