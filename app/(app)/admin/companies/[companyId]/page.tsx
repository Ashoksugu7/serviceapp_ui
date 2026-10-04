import type { Metadata } from 'next'
import { CompanyDetailScreen } from '@/components/admin/company-detail-screen'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Company' }

export default async function Page({ params }: PageProps<'/admin/companies/[companyId]'>) {
  await requireRole(['SUPER_ADMIN'])
  const { companyId } = await params
  return <CompanyDetailScreen companyId={companyId} />
}
