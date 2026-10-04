'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, APIError } from './api-client'
import type { ListResponse, ServiceProfile } from './types'

export type ListParams = Record<string, string | number | undefined>

export function buildQuery(params: ListParams = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

// Query keys start with the API path, which already contains the company ID,
// so data from one company can never be served for another.
export function useList<T>(path: string | null, params: ListParams = {}) {
  return useQuery({
    queryKey: [path, params],
    queryFn: () => api<ListResponse<T>>(`${path}${buildQuery(params)}`),
    enabled: path !== null,
    placeholderData: keepPreviousData,
  })
}

// Every row of a list, for dropdowns and lookups (products, staff, shops,
// profiles, fields, statuses). The API pages lists (T37), so this reads pages
// of 100 until it has them all. Screens that show a list use useList with the
// page, search and filters instead.
const ALL_PAGE_SIZE = 100
const MAX_PAGES = 50

export function useAll<T>(path: string | null, params: ListParams = {}) {
  return useQuery({
    queryKey: [path, 'all', params],
    queryFn: async (): Promise<ListResponse<T>> => {
      const items: T[] = []
      for (let page = 1; page <= MAX_PAGES; page++) {
        const response = await api<ListResponse<T>>(`${path}${buildQuery({ ...params, page, page_size: ALL_PAGE_SIZE })}`)
        items.push(...response.items)
        if (items.length >= response.total || response.items.length === 0) break
      }
      return { items, page: 1, page_size: items.length, total: items.length }
    },
    enabled: path !== null,
  })
}

export function useResource<T>(path: string | null) {
  return useQuery({ queryKey: [path], queryFn: () => api<T>(path!), enabled: path !== null })
}

type MutationInput = { path: string; method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown }

// Runs a write and refreshes every cached query under the given path prefixes.
export function useApiMutation<T>(invalidate: (string | null)[]) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ path, method, body }: MutationInput) =>
      api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: () =>
      Promise.all(
        invalidate
          .filter((prefix): prefix is string => prefix !== null)
          .map((prefix) =>
            client.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith(prefix) }),
          ),
      ),
  })
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof APIError && error.fields ? error.fields : {}
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useProfiles(companyId: string | null) {
  return useAll<ServiceProfile>(companyId ? `/companies/${companyId}/service-profiles` : null)
}

// Empty form inputs become null so optional API fields are cleared, not set to "".
export function formValues(form: HTMLFormElement): Record<string, string | null> {
  const values: Record<string, string | null> = {}
  new FormData(form).forEach((value, key) => {
    const text = String(value).trim()
    values[key] = text === '' ? null : text
  })
  return values
}

// Search text, filters and page for a list screen. Changing a filter returns to page 1.
export function useListState<F extends Record<string, string>>(initialFilters: F, pageSize = 25) {
  const [q, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<F>(initialFilters)
  const debouncedQ = useDebounced(q)
  return {
    q,
    setQ: (value: string) => { setSearch(value); setPage(1) },
    page,
    setPage,
    filters,
    setFilter: <K extends keyof F>(key: K, value: F[K]) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1) },
    params: { ...filters, q: debouncedQ, page, page_size: pageSize } as ListParams,
  }
}
