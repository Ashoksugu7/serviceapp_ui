import type { Metadata } from 'next'
import { StaffScreen } from '@/components/masters/staff-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Staff' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Masters" title="Staff" description="Staff and the roles that decide where they can be selected on Service Entry." />
      <StaffScreen />
    </>
  )
}
