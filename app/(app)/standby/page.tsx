import type { Metadata } from 'next'
import { StandbyScreen } from '@/components/standby/standby-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Stand-by' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Transaction" title="Stand-by" description="Lend loaner units to customers and record their return." />
      <StandbyScreen />
    </>
  )
}
