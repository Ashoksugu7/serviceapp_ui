import type { Metadata } from 'next'
import { StandbyItemsScreen } from '@/components/masters/standby-items-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Stand-by Items' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Masters" title="Stand-by Items" description="Loaner units that can be issued to customers." />
      <StandbyItemsScreen />
    </>
  )
}
