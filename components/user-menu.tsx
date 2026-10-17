'use client'

/**
 * Menú de usuario (nombre, rol, perfil, configuración, cerrar sesión). Lo usan
 * la barra global y la barra de la lección (/learn no tiene barra global desde
 * el 14 oct 2026). `oscuro` lo adapta a la barra navy de la lección.
 */
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, nameInitials } from '@/lib/utils'

export function UserMenu({ comoEstudiante = false, oscuro = false }: { comoEstudiante?: boolean; oscuro?: boolean }) {
  const { data: session } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Force redirect to login after signout (with callbackUrl)
      await signOut({ callbackUrl: '/login' })
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  // «Probar como estudiante»: el menú se dibuja con el rol de alumno.
  const role = comoEstudiante ? 'STUDENT' : session?.user?.role || 'STUDENT'
  const roleLabel = role === 'SUPERADMIN' ? 'Super Admin'
    : role === 'ADMIN' ? 'Instructor Líder'
    : role === 'INSTRUCTOR' ? 'Instructor'
    : 'Estudiante'
  const roleBadgeClass = role === 'SUPERADMIN'
    ? 'bg-red-100 text-red-700 border-red-200'
    : role === 'ADMIN'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : role === 'INSTRUCTOR'
        ? 'bg-blue-100 text-blue-700 border-blue-200'
        : ''

  return (
    <>
      {session?.user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={cn('relative h-10 rounded-xl flex items-center gap-2 px-2 sm:px-4 ring-0', oscuro && 'text-[#e6edf1] hover:bg-white/10 hover:text-white')}>
              <span className={cn('text-xs', oscuro ? 'hidden md:block' : 'hidden sm:block')}>{session.user.name || ''}</span>
              <span className='text-xs block sm:hidden'>{nameInitials(session.user.name || '')}</span>
              {role !== 'STUDENT' && (
                <Badge variant="outline" className={`hidden sm:inline-flex text-[10px] px-1.5 py-0 ${roleBadgeClass}`}>
                  {roleLabel}
                </Badge>
              )}
              <Avatar className="size-8">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'Usuario'} />
                <AvatarFallback className="bg-student-100 text-student-700">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white border-slate-200" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session.user.name || 'Usuario'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {roleLabel}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')} className='cursor-pointer'>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')} className='cursor-pointer'>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className='cursor-pointer'>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/login">
          <Button variant="default" size="sm">
            Iniciar sesión
          </Button>
        </Link>
      )}
    </>
  )
}
