import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { DashboardSummary, Identity, UserRole } from './types'

export const SESSION_COOKIE = 'so360_session'
export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '')

export function apiURL(path: string): string {
  return `${API_BASE_URL}/api/v1${path}`
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value
}

async function serverGet<T>(path: string, token: string): Promise<{ status: number; body: T | null }> {
  const response = await fetch(apiURL(path), { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  return { status: response.status, body: response.ok ? ((await response.json()) as T) : null }
}

// Loads the current identity once per request. The Go API stays authoritative:
// it re-checks the session, user and company state on every call.
const getSession = cache(async (): Promise<{ identity: Identity | null; reason?: 'expired' | 'suspended' }> => {
  const token = await sessionToken()
  if (!token) return { identity: null, reason: 'expired' }
  const { status, body } = await serverGet<Identity>('/auth/me', token)
  if (body) return { identity: body }
  return { identity: null, reason: status === 403 ? 'suspended' : 'expired' }
})

export async function getIdentity(): Promise<Identity | null> {
  return (await getSession()).identity
}

export const getDashboard = cache(async (): Promise<DashboardSummary | null> => {
  const token = await sessionToken()
  if (!token) return null
  const { body } = await serverGet<DashboardSummary>('/dashboard', token)
  return body
})

export async function requireIdentity(): Promise<Identity> {
  const { identity, reason } = await getSession()
  if (!identity) redirect(`/api/auth/expired?reason=${reason}`)
  return identity
}

export async function requireRole(roles: UserRole[]): Promise<Identity> {
  const identity = await requireIdentity()
  if (!roles.includes(identity.user.role)) redirect('/?denied=1')
  return identity
}
