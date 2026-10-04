import type { Metadata } from 'next'
import { CatalogScreen } from '@/components/masters/catalog-screen'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Products & Services' }

export default async function Page() {
  await requireRole(['ADMIN', 'USER'])
  return (
    <>
      <PageHeader eyebrow="Masters" title="Products & Services" description="Products and services offered on each service profile." />
      <CatalogScreen />
    </>
  )
}
