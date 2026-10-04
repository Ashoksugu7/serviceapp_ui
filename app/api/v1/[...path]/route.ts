import { NextResponse, type NextRequest } from 'next/server'
import { apiURL, SESSION_COOKIE, sessionToken } from '@/lib/session'

// Forwards browser calls to the Go API, attaching the bearer token from the
// session cookie. Login/logout go through /api/auth/* instead.
async function forward(request: NextRequest, ctx: RouteContext<'/api/v1/[...path]'>) {
  const { path } = await ctx.params
  if (path[0] === 'auth' && (path[1] === 'login' || path[1] === 'logout')) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Use /api/auth instead.' } }, { status: 404 })
  }

  const token = await sessionToken()
  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const upstream = await fetch(apiURL(`/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`), {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: 'no-store',
  })

  const response = new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status })
  const upstreamType = upstream.headers.get('content-type')
  if (upstreamType) response.headers.set('Content-Type', upstreamType)
  if (upstream.status === 401) response.cookies.delete(SESSION_COOKIE)
  return response
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE }
