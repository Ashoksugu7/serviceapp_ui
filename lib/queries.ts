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

// The company, user and master list endpoints currently return every row and
// ignore q/status/profile_id/page (see api/internal/httpapi/management.go
// writeList), so these screens filter and page in the browser. Swap back to
// useList once the API honours the documented query parameters.
export function useLocalList<T extends object>(path: string | null, params: ListParams, searchText: (item: T) => (string | null | undefined)[]) {
  const query = useQuery({
    queryKey: [path, 'all'],
    queryFn: () => api<ListResponse<T>>(path!),
    enabled: path !== null,
  })
  const { q, page = 1, page_size: pageSize = 25, ...rest } = params
  const filters = Object.entries(rest).filter(([key]) => key !== 'sort' && key !== 'order')
  const needle = String(q ?? '').trim().toLowerCase()
  const matches = (query.data?.items ?? []).filter((item) => {
    for (const [key, value] of filters) {
      if (value !== undefined && value !== '' && String((item as Record<string, unknown>)[key] ?? '') !== String(value)) return false
    }
    return !needle || searchText(item).some((text) => text?.toLowerCase().includes(needle))
  })
  const size = Number(pageSize)
  const current = Math.min(Number(page), Math.max(1, Math.ceil(matches.length / size)))
  const data: ListResponse<T> | undefined = query.data && {
    items: matches.slice((current - 1) * size, current * size),
    page: current,
    page_size: size,
    total: matches.length,
  }
  return { data, isPending: query.isPending, error: query.error }
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
  return useList<ServiceProfile>(companyId ? `/companies/${companyId}/service-profiles` : null, { page_size: 100 })
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
