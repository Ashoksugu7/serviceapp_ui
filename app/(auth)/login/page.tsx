import type { Metadata } from 'next'
import { AuthCard } from '@/components/shell/auth-card'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

const reasons: Record<string, string> = {
  expired: 'Your session has ended. Sign in again to continue.',
  suspended: 'Your company account is suspended. Contact your platform administrator.',
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { reason, next } = await searchParams
  const nextPath = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  return (
    <AuthCard title="Sign in to ServiceOps360" description="Use the account created by your administrator." footer="Computer Services · Service operations">
      <LoginForm nextPath={nextPath} notice={typeof reason === 'string' ? reasons[reason] : undefined} />
    </AuthCard>
  )
}
