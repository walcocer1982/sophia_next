'use client'

import { useCallback, useState } from 'react'
import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SupportPanel, useShownBlocks } from './support-panel'
import { MaterialProvider, useMaterial } from './material-context'
import { LessonBar } from './lesson-bar'
import { TestModeBanner } from './test-mode-banner'
import { ProgressProvider, useProgress } from './progress-context'
import type { BlockWithActivity } from '@/lib/support-blocks'

interface LearningLayoutProps {
  children: React.ReactNode
  sessionId: string
  lessonTitle: string
  objective: string
  keyPoints: string[]
  /** Material de apoyo de toda la lección; el panel filtra por actividad. */
  allBlocks: BlockWithActivity[]
  /** Ids de las actividades en orden. */
  activityOrder: string[]
  /** Actividad del puntero al cargar (antes del primer sondeo de progreso). */
  initialActivityId: string | null
  isTest?: boolean
  initialProgress: {
    current: number
    total: number
    percentage: number
  }
  testMode?: {
    courseId: string
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
  // Escritorio (≥ lg): el panel arranca abierto y se puede plegar.
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  // Pantallas angostas: el panel arranca oculto (por CSS, sin salto al cargar)
  // y sube como cajón inferior con el botón «Material» o al tocar una tarjeta
  // «Ver en el panel» del chat.
  const [mobileOpen, setMobileOpen] = useState(false)
  const abrirPanel = useCallback(() => {
    setPanelCollapsed(false)
    // El cajón solo existe por debajo de lg: abrirlo en escritorio lo dejaba
    // marcado y aparecía abierto al achicar la ventana.
    if (window.matchMedia('(max-width: 1023px)').matches) setMobileOpen(true)
  }, [])

  return (
    <MaterialProvider blocks={props.allBlocks} onOpenRequest={abrirPanel} storageKey={props.sessionId}>
      <LayoutBody
        {...props}
        panelCollapsed={panelCollapsed}
        mobileOpen={mobileOpen}
        onTogglePanel={() => setPanelCollapsed((v) => !v)}
        onOpenPanel={abrirPanel}
        onCloseMobile={() => setMobileOpen(false)}
      />
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
  initialActivityId,
  isTest = false,
  testMode,
  panelCollapsed,
  mobileOpen,
  onTogglePanel,
  onOpenPanel,
  onCloseMobile,
}: InnerProps & {
  panelCollapsed: boolean
  mobileOpen: boolean
  onTogglePanel: () => void
  onOpenPanel: () => void
  onCloseMobile: () => void
}) {
  const { progress } = useProgress()
  const { unseen, markSeen } = useMaterial()

  const currentActivityId = progress.currentActivityId ?? initialActivityId
  const { pinned, current, onDemand } = useShownBlocks(allBlocks, activityOrder, currentActivityId)
  const materialCount = pinned.length + current.length
  const hayMaterial = materialCount + onDemand.length > 0

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col bg-gray-50">
      <LessonBar
        lessonTitle={lessonTitle}
        objective={objective}
        keyPoints={keyPoints}
        current={progress.current}
        total={progress.total}
        percentage={progress.percentage}
      >
        {/* Va en la barra y no flotando: flotante tapaba las alternativas del chat en celular. */}
        {hayMaterial && (
          <button
            type="button"
            onClick={() => {
              onOpenPanel()
              markSeen()
            }}
            className={cn(
              'min-h-11 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 text-sm font-semibold text-[#09222d] hover:bg-gray-50',
              !panelCollapsed && 'lg:hidden',
            )}
          >
            <Layers className="h-4 w-4" aria-hidden />
            Material ({materialCount})
            {unseen && (
              <span className="rounded-full bg-[#fbc50b] px-1.5 py-0.5 text-[11px] font-bold text-[#09222d]">nuevo</span>
            )}
          </button>
        )}
      </LessonBar>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {testMode && (
            <TestModeBanner sessionId={sessionId} courseId={testMode.courseId} activities={testMode.activities} />
          )}
          {/* min-h-0 + flex-1: el chat ocupa solo el espacio restante y sus
              controles quedan visibles sin scroll de la página. */}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </main>

        <SupportPanel
          blocks={allBlocks}
          activityOrder={activityOrder}
          currentActivityId={currentActivityId}
          isCollapsed={panelCollapsed}
          mobileOpen={mobileOpen}
          onToggle={onTogglePanel}
          onCloseMobile={onCloseMobile}
          isTest={isTest}
        />
      </div>
    </div>
  )
}
