import { Boxes, Building2, CheckCircle2, ClipboardList, Contact, FolderOpen, PauseCircle, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, StatTile, Table, Td, Th } from '@/components/ui'
import { roleLabel } from '@/lib/nav'
import { getDashboard, requireIdentity } from '@/lib/session'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage({ searchParams }: PageProps<'/'>) {
  const identity = await requireIdentity()
  const dashboard = await getDashboard()
  const denied = (await searchParams).denied === '1'
  const companyName = identity.company?.name ?? 'Platform administration'

  return (
    <>
      <PageHeader eyebrow={`${roleLabel(identity.user.role)} workspace`} title="Dashboard" description={`You are working in ${companyName}.`} />
      {denied && <div className="mb-5"><Alert>You do not have access to that screen.</Alert></div>}

      {!dashboard ? (
        <Alert>The dashboard could not be loaded. Refresh to try again.</Alert>
      ) : dashboard.scope === 'platform' ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Companies" value={dashboard.companies?.total ?? 0} icon={Building2} />
          <StatTile label="Active" value={dashboard.companies?.active ?? 0} icon={CheckCircle2} tone="brand" />
          <StatTile label="Suspended" value={dashboard.companies?.suspended ?? 0} icon={PauseCircle} tone="warning" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Open records" value={dashboard.metrics?.open_records ?? 0} icon={FolderOpen} tone="brand" />
            <StatTile label="Closed records" value={dashboard.metrics?.closed_records ?? 0} icon={CheckCircle2} />
            <StatTile label="At Out-Store" value={dashboard.metrics?.out_store_sent ?? 0} icon={Truck} tone="warning" />
            <StatTile label="Customers" value={dashboard.metrics?.customers ?? 0} icon={Contact} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader title="Records by status" />
              {dashboard.records_by_status?.length ? (
                <ul className="divide-y divide-slate-100">
                  {dashboard.records_by_status.map((status) => (
                    <li key={status.status_id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <span className="text-slate-600">{status.status_name}</span>
                      <span className="font-semibold tabular-nums text-slate-900">{status.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={ClipboardList} title="No service records yet" />
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title="Recent service records"
                actions={<Link href="/records" className="text-xs font-medium text-brand-600 hover:text-brand-700">View all</Link>}
              />
              {dashboard.recent_records?.length ? (
                <Table>
                  <thead>
                    <tr><Th>Request</Th><Th>Customer</Th><Th>Status</Th><Th className="text-right">Date</Th></tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/60">
                        <Td className="font-medium text-slate-900">
                          {record.request_no}
                          <div className="text-xs font-normal text-slate-400">{record.profile_name}</div>
                        </Td>
                        <Td>
                          {record.customer_name}
                          <div className="text-xs tabular-nums text-slate-400">{record.customer_contact}</div>
                        </Td>
                        <Td><Badge tone={record.closed ? 'neutral' : 'brand'}>{record.status_name}</Badge></Td>
                        <Td className="text-right tabular-nums text-slate-500">{record.service_date}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="No service records yet"
                  description="Records created from Service Entry will appear here."
                />
              )}
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatTile label="Total records" value={dashboard.metrics?.service_records ?? 0} icon={ClipboardList} />
            <StatTile label="Stand-by available" value={dashboard.metrics?.standby_available ?? 0} icon={Boxes} tone="brand" />
            <StatTile label="Stand-by issued" value={dashboard.metrics?.standby_issued ?? 0} icon={Boxes} tone="warning" />
          </div>
        </div>
      )}
    </>
  )
}
