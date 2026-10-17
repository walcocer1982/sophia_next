'use client'

/**
 * «Qué vas a lograr»: el objetivo y los puntos clave de la lección, en una
 * ventana. Desde el 14 oct 2026 vive en el riel de avance (a la izquierda,
 * junto a las actividades); en pantallas angostas, donde no hay riel, sigue
 * en la barra de la lección.
 */
import { Target } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { tituloParaAlumno } from '@/lib/titulo-leccion'

interface QueVasALograrProps {
  lessonTitle: string
  objective: string
  keyPoints: string[]
  /** 'barra': píldora chica (celular). 'riel': ancho completo con texto; 'icono': solo el ícono (riel angosto). */
  forma: 'barra' | 'riel' | 'icono'
  className?: string
}

export function QueVasALograr({ lessonTitle, objective, keyPoints, forma, className }: QueVasALograrProps) {
  const titulo = tituloParaAlumno(lessonTitle)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Qué vas a lograr"
          title="Qué vas a lograr"
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-white/20 text-[#e6edf1] hover:bg-white/5',
            forma === 'barra' && 'h-9 shrink-0 px-2.5',
            forma === 'riel' && 'min-h-10 w-full justify-center px-3 text-[13px] font-semibold',
            forma === 'icono' && 'h-10 w-10 justify-center',
            className,
          )}
        >
          <Target className="h-4 w-4 shrink-0" aria-hidden />
          {forma === 'riel' && <span>Qué vas a lograr</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription className="text-base text-gray-800">{objective}</DialogDescription>
        </DialogHeader>
        {keyPoints.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-gray-700">Puntos clave</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-800">
              {keyPoints.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
