import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'so360_session'

// Optimistic routing only: pages re-validate the session against the Go API.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const signedIn = request.cookies.has(SESSION_COOKIE)

  // Public pages: development styleguide and password reset (T29).
  if (pathname === '/styleguide' || pathname === '/forgot-password' || pathname === '/reset-password') return NextResponse.next()
  if (pathname === '/login') {
    return signedIn ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next()
  }
  if (!signedIn) {
    const login = new URL('/login', request.url)
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
}
