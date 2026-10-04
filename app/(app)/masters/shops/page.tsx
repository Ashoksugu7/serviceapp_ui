import type { Metadata } from 'next'
import { ShopsScreen } from '@/components/masters/shops-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Out-Store Shops' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Masters" title="Out-Store Shops" description="External shops that items are sent to for repair." />
      <ShopsScreen />
    </>
  )
}
