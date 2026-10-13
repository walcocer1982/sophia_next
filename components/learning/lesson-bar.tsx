'use client'

/**
 * Barra fina de la lección: progreso «Actividad n de N» y el botón «Qué vas a
 * lograr», que reemplaza a la barra izquierda (objetivo y puntos clave) para
 * dejarle espacio al material de apoyo. Spec: panel-de-apoyo-especificacion.md §11.1.
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

interface LessonBarProps {
  lessonTitle: string
  objective: string
  keyPoints: string[]
  current: number
  total: number
  percentage: number
  /** Botones extra a la derecha (en celular, «Material»). */
  children?: React.ReactNode
}

export function LessonBar({ lessonTitle, objective, keyPoints, current, total, percentage, children }: LessonBarProps) {
  const pct = Math.max(0, Math.min(100, percentage))
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-200 bg-white px-4 py-2.5">
      <div className="flex min-w-0 flex-[1_1_240px] items-center gap-3">
        <div
          className="h-2 flex-1 max-w-xs rounded-full bg-gray-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Avance de la lección"
        >
          <div className="h-2 rounded-full bg-[#fbc50b] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="whitespace-nowrap text-sm text-gray-700">
          Actividad {Math.min(current, total)} de {total}
        </span>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="min-h-11 inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 text-sm text-[#09222d] hover:bg-gray-50"
          >
            <Target className="h-4 w-4" aria-hidden />
            Qué vas a lograr
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{lessonTitle}</DialogTitle>
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
      {children}
    </div>
  )
}
