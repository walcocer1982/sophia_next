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

// Rutas que requieren rol ADMIN o SUPERADMIN
const ADMIN_PATHS = ['/planner']

// Rutas que requieren rol SUPERADMIN
const SUPERADMIN_PATHS = ['/admin']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // «Ver como» es solo lectura. Este es el único punto que ve el método HTTP de
  // todas las rutas a la vez, así que el bloqueo vive acá y no repartido por
  // diez endpoints: mientras la cookie esté puesta, nada muta.
  // Se exceptúan /api/ver-como (para poder salir del modo) y /api/auth.
  if (
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.cookies.get('ver-como') &&
    !pathname.startsWith('/api/ver-como') &&
    !pathname.startsWith('/api/auth')
  ) {
    return NextResponse.json(
      { error: 'Estás viendo como otra persona. Salí del modo para poder editar.' },
      { status: 409 }
    )
  }

  // Las rutas de API se van acá: el proxy solo las mira para el bloqueo de
  // arriba. Si siguieran, la regla de «sin sesión -> redirigir a /login» les
  // devolvería un redirect en vez de un 401. Y evita llamar a auth() en cada
  // request de API, que antes no ocurría.
  if (pathname.startsWith('/api')) return NextResponse.next()

  const session = await auth()

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

  // Si intenta ir a /login pero ya está autenticado → Redirect según rol
  if (pathname === '/login' && session) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
    const role = session.user?.role || 'STUDENT'
    const defaultRedirect = role === 'STUDENT' ? '/lessons' : '/planner'
    return NextResponse.redirect(
      new URL(callbackUrl || defaultRedirect, request.url)
    )
  }

  if (session) {
    const role = session.user?.role || 'STUDENT'
    const careerId = session.user?.careerId

    // Users without career → redirect to career selection (SUPERADMIN exempt)
    if (!careerId && role !== 'SUPERADMIN' && pathname !== '/select-career') {
      return NextResponse.redirect(new URL('/select-career', request.url))
    }

    // Students without enrollment → redirect to section selection
    const hasEnrollment = session.user?.hasEnrollment
    if (role === 'STUDENT' && careerId && !hasEnrollment && pathname !== '/select-section' && pathname !== '/select-career') {
      return NextResponse.redirect(new URL('/select-section', request.url))
    }

    // SUPERADMIN paths → solo SUPERADMIN
    const isSuperadminPath = SUPERADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
    if (isSuperadminPath && role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/lessons', request.url))
    }

    // ADMIN paths → solo ADMIN o SUPERADMIN
    const isAdminPath = ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
    if (isAdminPath && role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/lessons', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - api solo pasa por el bloqueo de «ver como» y sale
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Archivos públicos (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
