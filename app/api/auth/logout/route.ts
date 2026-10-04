import { NextResponse } from 'next/server'
import { apiURL, SESSION_COOKIE, sessionToken } from '@/lib/session'

export async function POST() {
  const token = await sessionToken()
  if (token) {
    await fetch(apiURL('/auth/logout'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => undefined)
  }
  const response = new NextResponse(null, { status: 204 })
  response.cookies.delete(SESSION_COOKIE)
  return response
}
