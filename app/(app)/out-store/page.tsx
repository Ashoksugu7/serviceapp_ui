import type { Metadata } from 'next'
import { OutStoreScreen } from '@/components/out-store/out-store-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Out-Store Entry' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Transaction" title="Out-Store Entry" description="Items sent to external shops for repair, and receiving them back." />
      <OutStoreScreen />
    </>
  )
}
