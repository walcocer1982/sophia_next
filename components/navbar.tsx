'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { PARAM_VISTA, esVistaEstudiante } from '@/lib/vista-estudiante'
import { inicioPorRol } from '@/lib/inicio'
import { BookOpen, Sparkles, Shield, LayoutDashboard, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { UserMenu } from '@/components/user-menu'
import { VerComo } from '@/components/ver-como'

/**
 * Lee `?vista=estudiante` de la dirección (necesita su propio Suspense: el
 * layout la envuelve) y dibuja la barra como la vería un alumno. Solo en
 * /learn: la página ignora el parámetro si la sesión no es de prueba.
 */
export function NavbarConVista() {
  const pathname = usePathname()
  const params = useSearchParams()
  // En la lección no hay barra global: la lección tiene su propia barra única
  // (components/learning/lesson-bar.tsx) con logo y menú (14 oct 2026).
  if (pathname.startsWith('/learn/')) return null
  return <Navbar comoEstudiante={esVistaEstudiante(params.get(PARAM_VISTA))} />
}

export function Navbar({ comoEstudiante = false }: { comoEstudiante?: boolean }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  // «Probar como estudiante»: la barra se dibuja con el rol de alumno (sin
  // Diseño, Programación, Monitor, Config ni «Ver como»).
  const role = comoEstudiante ? 'STUDENT' : session?.user?.role || 'STUDENT'
  const isInstructorOrAbove = role === 'INSTRUCTOR' || role === 'ADMIN' || role === 'SUPERADMIN'
  const isSuperadmin = role === 'SUPERADMIN'

  // «Casa» depende del rol (lib/inicio.ts). En la vista de estudiante, el logo
  // lleva a la casa REAL del instructor: /lessons lo devolvería ahí de todos modos.
  const inicio = inicioPorRol(comoEstudiante ? session?.user?.role : role)

  return (
    <header className="h-14 border-b  bg-white flex items-center justify-between gap-2 px-3 sm:px-6 sticky top-0 z-50">
      {/* Logo */}
      <Link href={inicio} className="flex shrink-0 items-center gap-6">
        <Image src="/sophia_icon.svg" alt="Sophia Logo" width={32} height={32} />
      </Link>

      {/* Navigation Links */}
      <nav className="flex min-w-0 items-center gap-4 sm:gap-6">
        {role === 'STUDENT' && (
          <Link
            href="/lessons"
            aria-label="Clases"
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              pathname === '/lessons'
                ? 'text-instructor-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">Clases</span>
          </Link>
        )}
        {isInstructorOrAbove && (
          <>
            <Link
              href="/planner"
              aria-label="Diseño"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/planner')
                  ? 'text-instructor-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden md:inline">Diseño</span>
            </Link>
            <Link
              href="/programacion"
              aria-label="Programación"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/programacion')
                  ? 'text-instructor-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden md:inline">Programación</span>
            </Link>
            <Link
              href="/dashboard"
              aria-label="Monitor"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/dashboard')
                  ? 'text-instructor-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">Monitor</span>
            </Link>
            {/* «Eventos» (kiosko de ferias) se retiró el 14 set 2026: Sophia es
                para los cursos de carrera. Ver investigacion/mejoras-sophia.md. */}
          </>
        )}
        {isSuperadmin && (
          <Link
            href="/admin"
            aria-label="Config"
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/admin')
                ? 'text-instructor-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Config</span>
          </Link>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Solo el superadmin: mirar la app con el alcance de otra persona */}
        {isSuperadmin && <VerComo />}

      <UserMenu comoEstudiante={comoEstudiante} />
      </div>
    </header>
  )
}
