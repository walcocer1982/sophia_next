'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Rings } from '@/components/ui/rings'

interface AvatarInstructorProps {
  name: string
  avatar?: string
  state?: 'idle' | 'thinking' | 'speaking'
  className?: string
}

/**
 * Avatar animado para instructor IA con anillos orbitales
 *
 * Estados:
 * - idle: Anillos negros normales (instructor-card sidebar)
 * - thinking: Anillos azules rápidos (typing indicator)
 * - speaking: Anillos verdes medio (último mensaje del chat)
 */
export function AvatarInstructor({
  name,
  avatar,
  state = 'idle',
  className,
}: AvatarInstructorProps) {
  const initial = name.charAt(0).toUpperCase()

  // Mapear estado del instructor a props genéricos de Rings
  const getRingProps = () => {
    switch(state) {
      case 'thinking':
        // Azul, muy rápido - IA procesando
        return { speed: 'faster' as const, color: 'orange' as const }
      case 'speaking':
        // Verde, rápido - IA generando respuesta
        return { speed: 'fast' as const, color: 'green' as const }
      case 'idle':
      default:
        // Negro/blanco, regular - estado por defecto
        return { speed: 'slow' as const, color: 'black' as const }
    }
  }

  const ringProps = getRingProps()

  return (
    <div className={className}>
      <Avatar className="h-10 w-10 relative overflow-visible">
        <Rings size={40} {...ringProps} />
        <AvatarImage src={avatar} alt={name} />
        <AvatarFallback
          className="bg-instructor-100 text-instructor-700 text-sm font-semibold"
        >
          {/* Inicial del instructor */}
          {initial}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
