'use client'

/**
 * La barra única de la lección (14 oct 2026): en /learn no hay barra global.
 * Logo (vuelve al inicio), título sin código interno, los controles de la prueba
 * en línea y el menú de usuario. El avance en segmentos y «Qué vas a lograr»
 * van en el riel (cuaderno.tsx); en celular, donde no hay riel, el avance va en
 * texto bajo el título y el objetivo sigue aquí. Antes eran tres
 * barras apiladas (la blanca global, esta y la franja de prueba) y la blanca
 * cortaba la pantalla navy en dos.
 */
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { QueVasALograr } from './que-vas-a-lograr'
import { inicioPorRol } from '@/lib/inicio'
import { tituloParaAlumno } from '@/lib/titulo-leccion'
import { UserMenu } from '@/components/user-menu'

interface LessonBarProps {
  lessonTitle: string
  objective: string
  keyPoints: string[]
  current: number
  total: number
  /** La sesión ya se cerró: todos los segmentos llenos y «Lección completada». */
  completed?: boolean
  /** «Probar como estudiante»: el menú de usuario se dibuja como el de un alumno. */
  comoEstudiante?: boolean
  /** Controles extra en línea (los de la prueba). */
  children?: React.ReactNode
}

export function LessonBar({ lessonTitle, objective, keyPoints, current, total, completed = false, comoEstudiante = false, children }: LessonBarProps) {
  const { data: session } = useSession()
  const actual = Math.min(Math.max(current, 1), total)
  const titulo = tituloParaAlumno(lessonTitle)
  return (
    <header className="shrink-0 border-b border-white/10 bg-[#0d1f3c] text-[#e6edf1]">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <Link href={inicioPorRol(session?.user?.role)} className="shrink-0" aria-label="Volver al inicio">
          <Image src="/sophia_icon.svg" alt="Sophia" width={30} height={30} />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold text-white" title={titulo}>{titulo}</h1>
          {/* Donde no hay riel (celular), el avance va bajo el título en texto */}
          <p className="text-xs text-[#a9b8c2] lg:hidden">
            {completed ? 'Lección completada' : `Actividad ${actual} de ${total}`}
          </p>
        </div>

        {children}

        {/* En escritorio este botón está en el riel de avance (cuaderno.tsx) */}
        <QueVasALograr lessonTitle={lessonTitle} objective={objective} keyPoints={keyPoints} forma="barra" className="lg:hidden" />

        <UserMenu comoEstudiante={comoEstudiante} oscuro />
      </div>
    </header>
  )
}
