import type { Metadata } from 'next'
import { RecordDetailScreen } from '@/components/records/record-detail-screen'
import { requireRole } from '@/lib/session'

export const metadata: Metadata = { title: 'Record' }

export default async function Page({ params }: PageProps<'/records/[recordId]'>) {
  await requireRole(['ADMIN', 'USER'])
  const { recordId } = await params
  return <RecordDetailScreen recordId={recordId} />
}
