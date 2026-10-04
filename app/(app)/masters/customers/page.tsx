import type { Metadata } from 'next'
import { CustomersScreen } from '@/components/masters/customers-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Customers' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Masters" title="Customers" description="Customers are identified by their mobile number. Each number belongs to one customer." />
      <CustomersScreen />
    </>
  )
}
