'use client'

/**
 * Tarjeta de cierre de la lección (decisión del 13 oct 2026). Hasta entonces
 * «Gracias por participar» quedaba en la tarjeta de siempre con la caja de
 * texto abierta, y el alumno seguía escribiendo sin saber que había terminado.
 * Muestra solo «terminaste», sin nota: cómo se comunica la nota al alumno es
 * una decisión pendiente del equipo.
 */
import Link from 'next/link'
import { CheckCircle2, MessageSquareText, ScrollText } from 'lucide-react'
import { tituloParaAlumno } from '@/lib/titulo-leccion'

interface LessonCompleteCardProps {
  lessonTitle: string
  /** A dónde vuelve: /lessons para el alumno, el curso del planner en una sesión de prueba. */
  exitHref: string
  exitLabel: string
  /** Vista Tutor: abre el cajón con toda la conversación. */
  onReread?: () => void
  /** Reabre la caja de texto para una pregunta suelta. */
  onAskMore: () => void
}

export function LessonCompleteCard({ lessonTitle, exitHref, exitLabel, onReread, onAskMore }: LessonCompleteCardProps) {
  return (
    <section
      aria-label="Lección completada"
      className="w-full rounded-2xl border border-[#fbc50b]/35 bg-[#0f2238] p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-[#fbc50b]" aria-hidden />
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight text-white">Terminaste la lección</p>
          <p className="mt-1 text-sm text-[#a9b8c2]">{tituloParaAlumno(lessonTitle)}. Tu avance quedó guardado.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={exitHref}
          className="inline-flex min-h-11 items-center rounded-full bg-[#fbc50b] px-5 text-sm font-bold text-[#09222d] hover:bg-[#ffd43d]"
        >
          {exitLabel}
        </Link>
        {onReread && (
          <button
            type="button"
            onClick={onReread}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 px-4 text-sm font-semibold text-[#e6edf1] hover:bg-white/5"
          >
            <ScrollText className="h-4 w-4" aria-hidden /> Releer la conversación
          </button>
        )}
        <button
          type="button"
          onClick={onAskMore}
          className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-[#a9b8c2] underline-offset-2 hover:text-white hover:underline sm:ml-auto"
        >
          <MessageSquareText className="h-4 w-4" aria-hidden /> Hacer una pregunta más
        </button>
      </div>
    </section>
  )
}
