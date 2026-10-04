import { describe, expect, it } from 'vitest'
import { daysBetween, daysLabel, describeOutStore, describeStandby } from './history'
import type { HistoryOutStoreValue, HistoryStandbyValue } from './types'

const entry: HistoryOutStoreValue = {
  entry_id: 'e1', shop_id: 's1', shop_name: 'Vendor', sent_date: '2026-09-20', due_date: null, price: null, remarks: null, received_back_at: null,
}

describe('describeOutStore', () => {
  it('describes a dispatch with its details', () => {
    const event = describeOutStore({ ...entry, event: 'sent', due_date: '2026-09-25', price: '125.50' })
    expect(event.title).toBe('Sent to Vendor')
    expect(event.detail).toContain('due 25 Sept 2026')
    expect(event.detail).toContain('₹125.50')
  })

  it('lists only the values an edit changed', () => {
    const event = describeOutStore({ ...entry, event: 'changed', shop_id: 's2', shop_name: 'Other shop', remarks: 'Diagnosing' }, entry)
    expect(event.detail).toBe('Shop: Vendor → Other shop; Remarks: — → Diagnosing')
  })

  it('counts days at the shop on receive-back', () => {
    const event = describeOutStore({ ...entry, event: 'received', received_back_at: '2026-09-23T10:00:00+05:30' })
    expect(event.title).toBe('Received back from Vendor')
    expect(event.detail).toMatch(/^3 days at the shop/)
  })
})

describe('describeStandby', () => {
  const lent: HistoryStandbyValue = {
    event: 'issued', issue_id: 'i1', standby_item_id: 'x', item_name: 'Loaner', serial_no: 'SL-1', customer_name: 'Ravi',
    customer_contact: '98765 43210', issued_date: '2026-09-20', due_date: '2026-09-25', returned_at: null, days_out: null,
  }
  it('names the item, customer and due date when lent', () => {
    expect(describeStandby(lent)).toEqual({ kind: 'standby', title: 'Stand-by lent: Loaner (SL-1)', detail: 'To Ravi · 98765 43210 · return by 25 Sept 2026' })
  })
  it('shows days out on return', () => {
    expect(describeStandby({ ...lent, event: 'returned', days_out: 1 }).detail).toBe('Out 1 day · lent 20 Sept 2026 · Ravi')
  })
})

describe('days', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-09-28', '2026-10-02')).toBe(4)
    expect(daysLabel(0)).toBe('same day')
  })
})
