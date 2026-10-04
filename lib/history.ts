import { formatDate, toISODate } from './dates'
import { formatAmount } from './format'
import type { HistoryOutStoreValue, HistoryStandbyValue } from './types'

export type HistoryKind = 'status' | 'out_store' | 'standby' | 'field'

export interface HistoryEvent {
  kind: HistoryKind
  title: string
  detail?: string
}

/** Local calendar date of an API timestamp. */
export function localDate(timestamp: string): string {
  return toISODate(new Date(timestamp))
}

export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((date) => {
    const [year, month, day] = date.slice(0, 10).split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  })
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

export function daysLabel(days: number): string {
  if (days === 0) return 'same day'
  return days === 1 ? '1 day' : `${days} days`
}

const join = (parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ')

// Out-Store entry changes, labelled for people; entry_id and shop_id are not shown.
const outStoreChanges: { key: keyof HistoryOutStoreValue; label: string; show: (value: HistoryOutStoreValue) => string }[] = [
  { key: 'shop_id', label: 'Shop', show: (value) => value.shop_name },
  { key: 'sent_date', label: 'Sent', show: (value) => formatDate(value.sent_date) },
  { key: 'due_date', label: 'Due', show: (value) => formatDate(value.due_date) },
  { key: 'price', label: 'Price', show: (value) => formatAmount(value.price) },
  { key: 'remarks', label: 'Remarks', show: (value) => value.remarks || '—' },
]

export function describeOutStore(value: HistoryOutStoreValue, previous?: HistoryOutStoreValue | null): HistoryEvent {
  switch (value.event) {
    case 'sent':
      return {
        kind: 'out_store',
        title: `Sent to ${value.shop_name}`,
        detail: join([
          `Sent ${formatDate(value.sent_date)}`,
          value.due_date && `due ${formatDate(value.due_date)}`,
          value.price && formatAmount(value.price),
          value.remarks,
        ]),
      }
    case 'received': {
      const back = value.received_back_at ? localDate(value.received_back_at) : null
      return {
        kind: 'out_store',
        title: `Received back from ${value.shop_name}`,
        detail: back ? `${daysLabel(daysBetween(value.sent_date, back))} at the shop · sent ${formatDate(value.sent_date)}` : undefined,
      }
    }
    default: {
      const changes = previous
        ? outStoreChanges.filter(({ key }) => previous[key] !== value[key]).map(({ label, show }) => `${label}: ${show(previous)} → ${show(value)}`)
        : []
      return { kind: 'out_store', title: `Out-Store details changed · ${value.shop_name}`, detail: changes.join('; ') || undefined }
    }
  }
}

export function describeStandby(value: HistoryStandbyValue): HistoryEvent {
  const item = value.serial_no ? `${value.item_name} (${value.serial_no})` : value.item_name
  if (value.event === 'returned') {
    return {
      kind: 'standby',
      title: `Stand-by returned: ${item}`,
      detail: join([value.days_out !== null && `Out ${daysLabel(value.days_out)}`, `lent ${formatDate(value.issued_date)}`, value.customer_name]),
    }
  }
  return {
    kind: 'standby',
    title: `Stand-by lent: ${item}`,
    detail: join([`To ${value.customer_name}`, value.customer_contact, value.due_date && `return by ${formatDate(value.due_date)}`]),
  }
}
