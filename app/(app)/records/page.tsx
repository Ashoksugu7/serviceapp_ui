import type { Metadata } from 'next'
import { RecordsScreen } from '@/components/records/records-screen'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Records' }

export default async function Page({ searchParams }: PageProps<'/records'>) {
  await requireRole(['ADMIN', 'USER'])
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value)
  }
  return <RecordsScreen initialSearch={params.toString()} />
}
