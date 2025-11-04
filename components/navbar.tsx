'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
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
import { User, LogOut, Settings, Home, BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { nameInitials } from '@/lib/utils'

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false })
      router.push('/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <header className="h-14 border-b  bg-white flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-6">
        <Image src="/sophia_icon.svg" alt="Sophia Logo" width={32} height={32} />
      </Link>

      {/* Navigation Links */}
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            pathname === '/'
              ? 'text-instructor-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Home className="h-4 w-4" />
          Inicio
        </Link>
        <Link
          href="/lessons"
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            pathname === '/topics'
              ? 'text-instructor-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Clases
        </Link>
      </nav>

      {/* User Menu */}
      {session?.user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 rounded-xl flex items-center gap-2 px-4 ring-0">
              <span className='text-xs hidden sm:block'>{session.user.name || ''}</span>
              <span className='text-xs block sm:hidden'>{nameInitials(session.user.name || '')}</span>
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
                  {session.user.email || 'Estudiante'}
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
    </header>
  )
}
