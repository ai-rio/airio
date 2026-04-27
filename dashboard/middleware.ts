import { convexAuthNextjsMiddleware } from '@convex-dev/auth/nextjs/server'
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server'

const authMiddleware = convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const isProtected =
      request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/audit') ||
      request.nextUrl.pathname.startsWith('/billing')

    if (isProtected) {
      const isAuth = await convexAuth.isAuthenticated()
      if (!isAuth) {
        const signIn = new URL('/sign-in', request.url)
        signIn.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search)
        return NextResponse.redirect(signIn)
      }
    }
  },
  { convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL, verbose: false }
)

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  return authMiddleware(request, event)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
