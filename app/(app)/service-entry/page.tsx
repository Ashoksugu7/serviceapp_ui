import type { Metadata } from 'next'
import { ServiceEntryScreen } from '@/components/service-entry/service-entry-screen'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Service Entry' }

export default async function Page({ searchParams }: PageProps<'/service-entry'>) {
  await requireRole(['ADMIN', 'USER'])
  const { copy } = await searchParams
  return <ServiceEntryScreen copyFrom={typeof copy === 'string' ? copy : undefined} />
}
