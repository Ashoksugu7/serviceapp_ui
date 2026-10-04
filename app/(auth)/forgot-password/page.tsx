import type { Metadata } from 'next'
import { AuthCard } from '@/components/shell/auth-card'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Forgot your password?" description="Enter your email or mobile number and we'll email you a link to choose a new one.">
      <ForgotPasswordForm />
    </AuthCard>
  )
}
