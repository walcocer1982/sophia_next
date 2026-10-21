'use client'

/**
 * Marco de /learn (14 oct 2026): la barra única de la lección, el Cuaderno
 * (riel de avance + conversación + caja) y la Pizarra con el material. En
 * escritorio son tres columnas; en pantallas angostas, dos pestañas:
 * «Conversación | Pizarra». No hay barra global en /learn. Todo en tema noche.
 */
import { useCallback, useState } from 'react'
import { Layers, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MaterialProvider, useMaterial } from './material-context'
import { LessonBar } from './lesson-bar'
import { TestModeBanner } from './test-mode-banner'
import { ProgressProvider, useProgress } from './progress-context'
import { Pizarra, useShownBlocks } from './pizarra'
import type { ActivityPanelInfo, BlockWithActivity } from '@/lib/support-blocks'

type Pestana = 'conversacion' | 'pizarra'

interface LearningLayoutProps {
  children: React.ReactNode
  sessionId: string
  lessonTitle: string
  objective: string
  keyPoints: string[]
  /** Material de apoyo de toda la lección; la pizarra filtra por actividad. */
  allBlocks: BlockWithActivity[]
  /** Ids de las actividades en orden. */
  activityOrder: string[]
  /** Por actividad: tipo, `uses` y si trae material propio (qué fijado va abierto). */
  activityInfo?: Record<string, ActivityPanelInfo>
  /** Actividad del puntero al cargar (antes del primer sondeo de progreso). */
  initialActivityId: string | null
  /** Sesión de prueba vista como instructor: la pizarra avisa las imágenes sin validar. */
  isTest?: boolean
  initialProgress: {
    current: number
    total: number
    percentage: number
    /** La sesión ya estaba cerrada al cargar. */
    completedAt?: string | null
  }
  testMode?: {
    courseId: string
    /** «Probar como estudiante»: controles de prueba reducidos. */
    comoEstudiante?: boolean
    activities: { id: string; type: string; title: string }[]
  }
}

export function LearningLayout({ initialProgress, initialActivityId, ...rest }: LearningLayoutProps) {
  return (
    <ProgressProvider
      sessionId={rest.sessionId}
      initialProgress={{ ...initialProgress, currentActivityId: initialActivityId }}
    >
      <LearningLayoutInner initialActivityId={initialActivityId} {...rest} />
    </ProgressProvider>
  )
}

type InnerProps = Omit<LearningLayoutProps, 'initialProgress'>

function LearningLayoutInner(props: InnerProps) {
  const [pestana, setPestana] = useState<Pestana>('conversacion')
  // El alumno tocó «Ver en la pizarra» o «Ver material disponible»: en
  // pantallas angostas se pasa a la pestaña; en escritorio ya está a la vista.
  const abrirPizarra = useCallback(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setPestana('pizarra')
  }, [])

  return (
    <MaterialProvider blocks={props.allBlocks} onOpenRequest={abrirPizarra} storageKey={props.sessionId}>
      <LayoutBody {...props} pestana={pestana} onPestana={setPestana} />
    </MaterialProvider>
  )
}

function LayoutBody({
  children,
  sessionId,
  lessonTitle,
  objective,
  keyPoints,
  allBlocks,
  activityOrder,
  activityInfo,
  initialActivityId,
  isTest = false,
  testMode,
  pestana,
  onPestana,
}: InnerProps & { pestana: Pestana; onPestana: (p: Pestana) => void }) {
  const { progress } = useProgress()
  const { unseen, markSeen } = useMaterial()
  const currentActivityId = progress.currentActivityId ?? initialActivityId
  const { pinned, current } = useShownBlocks(allBlocks, activityOrder, currentActivityId)
  const enPizarra = pinned.length + current.length

  const pestanaClase = (activa: boolean) =>
    cn(
      'relative flex min-h-11 flex-1 items-center justify-center gap-2 text-sm font-semibold border-b-2',
      activa ? 'border-[#fbc50b] text-white' : 'border-transparent text-[#a9b8c2]',
    )

  return (
    // Ocupa la pantalla del alumno, sea cual sea (fixed inset-0): la página no se
    // desplaza; se desplazan la hoja y la pizarra (21 oct 2026).
    <div className="tema-noche fixed inset-0 flex flex-col overflow-hidden">
      <LessonBar
        lessonTitle={lessonTitle}
        objective={objective}
        keyPoints={keyPoints}
        current={progress.current}
        total={progress.total}
        completed={progress.completedAt !== null}
        comoEstudiante={testMode?.comoEstudiante}
      >
        {testMode && (
          <TestModeBanner
            sessionId={sessionId}
            courseId={testMode.courseId}
            activities={testMode.activities}
            comoEstudiante={testMode.comoEstudiante}
          />
        )}
      </LessonBar>

      {/* Pantallas angostas: Conversación | Pizarra */}
      <div className="flex shrink-0 border-b border-white/10 bg-[#0b1a2e] lg:hidden" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'conversacion'} className={pestanaClase(pestana === 'conversacion')} onClick={() => onPestana('conversacion')}>
          <MessageSquareText className="h-4 w-4" aria-hidden /> Conversación
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'pizarra'}
          className={pestanaClase(pestana === 'pizarra')}
          onClick={() => {
            onPestana('pizarra')
            markSeen()
          }}
        >
          <Layers className="h-4 w-4" aria-hidden /> Pizarra{enPizarra > 0 ? ` (${enPizarra})` : ''}
          {unseen && pestana !== 'pizarra' && (
            <span className="absolute right-4 top-2.5 h-2 w-2 rounded-full bg-[#fbc50b]" aria-label="Material nuevo" />
          )}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* min-h-0 + flex-1: la hoja ocupa solo el espacio restante y la caja
            de respuesta queda visible sin scroll de la página. */}
        {/* El riel de avance va DENTRO del Cuaderno: el tope suma riel (56 px en lg,
            256 en xl) + conversación (880 px). Sin eso, el texto quedaba en 620 px
            y el espacio sobrante se iba a la derecha de la pizarra. */}
        {/* Sin anchos máximos fijos (21 oct 2026, Walther): conversación y pizarra se
            reparten la pantalla 3 a 2 y crecen con ella. */}
        <div className={cn('min-w-0 flex-1 flex-col lg:flex-[3_1_0]', pestana === 'pizarra' ? 'hidden lg:flex' : 'flex')}>{children}</div>
        <Pizarra
          blocks={allBlocks}
          activityOrder={activityOrder}
          currentActivityId={currentActivityId}
          activityInfo={activityInfo}
          isTest={isTest}
          // Las dos columnas se reparten el ancho (3 a 2); la conversación no pasa de su
          // ancho de lectura y TODO lo que sobra lo toma la pizarra, hasta el borde.
          className={cn('lg:flex lg:min-w-[340px] lg:flex-[2_1_0]', pestana === 'pizarra' ? 'flex w-full' : 'hidden')}
        />
      </div>
    </div>
  )
}
