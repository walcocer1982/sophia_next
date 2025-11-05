import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy de Next.js 16 para protección de rutas
 *
 * Estrategia: Proteger TODO excepto rutas públicas explícitas.
 * Esto permite que cualquier nueva ruta automáticamente requiera autenticación
 * sin necesidad de actualizar este archivo.
 *
 * Para agregar rutas públicas: añadirlas al array PUBLIC_PATHS
 * Para proteger rutas: simplemente créalas (estarán protegidas por defecto)
 */

// Lista de rutas públicas que NO requieren autenticación
const PUBLIC_PATHS = [
  '/',        // Landing page
  '/login',   // Página de login
]

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Verificar si es una ruta pública
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  // Si NO es ruta pública y NO hay sesión → Redirect a login
  if (!isPublicPath && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si intenta ir a /login pero ya está autenticado → Redirect a /lessons
  if (pathname === '/login' && session) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
    return NextResponse.redirect(
      new URL(callbackUrl || '/lessons', request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Archivos públicos (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
