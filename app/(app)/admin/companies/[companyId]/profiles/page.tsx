import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ProfilesScreen } from '@/components/profiles/profiles-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Service Profiles' }

// Platform admins may configure any company's profiles and forms.
export default async function Page({ params }: PageProps<'/admin/companies/[companyId]/profiles'>) {
  await requireRole(['SUPER_ADMIN'])
  const { companyId } = await params
  return (
    <>
      <Link href={`/admin/companies/${companyId}`} className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Company
      </Link>
      <PageHeader eyebrow="Platform" title="Service Profiles" description="Form fields, statuses and numbering for this company's service entries." />
      <ProfilesScreen companyId={companyId} canWrite />
    </>
  )
}
