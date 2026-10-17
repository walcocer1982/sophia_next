'use client'

/**
 * «Escuchar»: lee un mensaje de Sophia con la voz del navegador. Empieza al
 * tocar (antes pedía el audio completo a OpenAI y había que esperar varios
 * segundos con el ícono girando). Sin voz en español en el equipo, no se muestra.
 */
import { Volume2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLectura } from '@/hooks/use-lectura'

interface PlayAudioButtonProps {
  text: string
  className?: string
}

export function PlayAudioButton({ text, className }: PlayAudioButtonProps) {
  const { soportado, leyendo, leer, detener } = useLectura()
  if (!soportado) return null
  const activo = leyendo !== null
  return (
    <Button
      type="button"
      onClick={() => (activo ? detener() : leer(text))}
      variant="ghost"
      size="sm"
      className={`h-7 gap-1 text-xs ${className ?? 'text-gray-500 hover:text-gray-700'}`}
      aria-pressed={activo}
    >
      {activo ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3 w-3" />}
      {activo ? 'Detener' : 'Escuchar'}
    </Button>
  )
}
