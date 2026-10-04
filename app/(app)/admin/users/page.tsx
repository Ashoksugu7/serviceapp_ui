import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UsersManager } from '@/components/admin/users-manager'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Users' }

export default async function Page() {
  const identity = await requireRole(['SUPER_ADMIN', 'ADMIN'])
  // Platform admins manage users from each company's page.
  if (!identity.company) redirect('/admin/companies')
  return (
    <>
      <PageHeader eyebrow="Settings" title="Users" description={`Admin and User accounts for ${identity.company.name}.`} />
      <UsersManager companyId={identity.company.id} />
    </>
  )
}
