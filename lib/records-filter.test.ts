import { describe, expect, it } from 'vitest'
import { emptyRecordFilters, parseRecordFilters, recordFiltersToApi, recordFiltersToSearch } from './records-filter'

describe('record filters', () => {
  it('round-trips through the URL and drops defaults', () => {
    const filters = { ...emptyRecordFilters, q: '98765', state: 'open' as const, status: 'Pending', outStore: 'at_shop' as const, overdue: true, sort: 'updated' as const, page: 2 }
    const search = recordFiltersToSearch(filters)
    expect(search).toBe('?q=98765&state=open&status=Pending&out_store=at_shop&overdue=1&sort=updated&page=2')
    expect(parseRecordFilters(new URLSearchParams(search))).toEqual(filters)
    expect(recordFiltersToSearch(emptyRecordFilters)).toBe('')
  })

  it('ignores unknown values from hand-edited links', () => {
    const parsed = parseRecordFilters(new URLSearchParams('state=done&sort=customer&page=-3&out_store=lost'))
    expect(parsed).toEqual(emptyRecordFilters)
  })

  it('maps presets and sort to API parameters', () => {
    const api = recordFiltersToApi({ ...emptyRecordFilters, range: '7d', sort: 'oldest' }, 25, '2026-10-04')
    expect(api).toMatchObject({ date_from: '2026-09-28', date_to: '2026-10-04', sort: 'created_at', order: 'asc', facets: 'true' })
    const custom = recordFiltersToApi({ ...emptyRecordFilters, range: 'custom', from: '2026-09-01', to: '2026-09-15', overdue: true }, 25, '2026-10-04')
    expect(custom).toMatchObject({ date_from: '2026-09-01', date_to: '2026-09-15', overdue: 'true' })
  })
})
