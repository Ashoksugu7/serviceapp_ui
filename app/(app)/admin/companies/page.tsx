import type { Metadata } from 'next'
import { CompaniesScreen } from '@/components/admin/companies-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Companies' }

export default async function Page() {
  await requireRole(['SUPER_ADMIN'])
  return (
    <>
      <PageHeader eyebrow="Platform" title="Companies" description="Onboard companies, create their first admin, and suspend or reactivate access." />
      <CompaniesScreen />
    </>
  )
}
