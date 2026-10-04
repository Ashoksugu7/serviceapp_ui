import type { Metadata } from 'next'
import { ProfilesScreen } from '@/components/profiles/profiles-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Service Profiles' }

export default async function Page() {
  const identity = await requireRole(['ADMIN'])
  return (
    <>
      <PageHeader eyebrow="Settings" title="Service Profiles" description="Each profile is a type of service entry with its own number series, form fields and statuses." />
      <ProfilesScreen companyId={identity.company!.id} canWrite />
    </>
  )
}
