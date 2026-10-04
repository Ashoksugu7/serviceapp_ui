import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

// Server components cannot delete cookies, so an invalid session is routed
// here to clear it before returning to the login page.
export function GET(request: NextRequest) {
  const login = new URL('/login', request.url)
  login.searchParams.set('reason', request.nextUrl.searchParams.get('reason') ?? 'expired')
  const response = NextResponse.redirect(login)
  response.cookies.delete(SESSION_COOKIE)
  return response
}
