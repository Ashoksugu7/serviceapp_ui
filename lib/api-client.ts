import type { APIErrorPayload } from './types'

export class APIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
  }
}

function sendToLogin(reason: 'expired' | 'suspended') {
  // A route handler clears the cookie first, so this must be a full navigation.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (typeof window !== 'undefined') window.location.assign(`/api/auth/expired?reason=${reason}`)
}

// Browser-side calls go through the Next.js /api/v1 proxy, which adds the
// bearer token from the httpOnly session cookie.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api/v1${path}`, { ...init, headers })
  if (response.status === 204) return undefined as T

  const data = (await response.json().catch(() => ({}))) as T & APIErrorPayload
  if (!response.ok) {
    const error = (data as APIErrorPayload).error
    // Only an invalid session or a suspended company ends the session; other
    // 403s are ordinary permission errors shown on the page.
    if (response.status === 401) sendToLogin('expired')
    else if (response.status === 403 && error?.code === 'COMPANY_SUSPENDED') sendToLogin('suspended')
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    else if (response.status === 403 && error?.code === 'PASSWORD_CHANGE_REQUIRED') window.location.assign('/change-password')
    throw new APIError(error?.message ?? 'Request failed', response.status, error?.code, error?.fields)
  }
  return data
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof APIError)) return 'Unable to reach the API. Try again shortly.'
  const fields = error.fields ? Object.values(error.fields).join(' ') : ''
  return fields || error.message
}

// Banner text for a form: field messages are shown next to their inputs, so
// the banner keeps only the API's summary; other errors show in full.
export function formError(error: unknown): string | null {
  if (!error) return null
  if (error instanceof APIError && error.fields && Object.keys(error.fields).length > 0) return error.message
  return apiErrorMessage(error)
}
