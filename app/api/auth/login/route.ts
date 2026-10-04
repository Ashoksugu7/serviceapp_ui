import { NextResponse } from 'next/server'
import { apiURL, SESSION_COOKIE } from '@/lib/session'
import type { LoginResponse } from '@/lib/types'

// Exchanges credentials with the Go API and keeps the access token in an
// httpOnly cookie so browser code never handles it.
export async function POST(request: Request) {
  const upstream = await fetch(apiURL('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  })
  const data = await upstream.json().catch(() => ({}))
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status })

  const { access_token, expires_in, user, company } = data as LoginResponse
  const response = NextResponse.json({ user, company })
  response.cookies.set(SESSION_COOKIE, access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: expires_in,
  })
  return response
}
