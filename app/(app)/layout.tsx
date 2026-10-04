import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/shell/app-shell'
import { getDashboard, requireIdentity } from '@/lib/session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const identity = await requireIdentity()
  // A temporary password must be replaced before using the app (T28).
  if (identity.user.must_change_password) redirect('/change-password')
  const outStoreEnabled = identity.user.role !== 'SUPER_ADMIN' && (await getDashboard())?.features?.out_store_enabled === true
  return <AppShell identity={identity} outStoreEnabled={outStoreEnabled}>{children}</AppShell>
}
