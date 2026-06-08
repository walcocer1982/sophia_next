'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { usePlannerState } from '@/hooks/use-planner-state'
import { streamPlannerResponse } from '@/lib/planner-stream'
import { PlannerChat } from './planner-chat'
import { PlannerPanel } from './planner-panel'
import type { PlannerData, PlannerStep, CourseContext, PlannerAttachment } from '@/types/planner'
import { STEP_LABELS } from '@/types/planner'

interface PlannerLayoutProps {
  courseContext?: CourseContext
}

export function PlannerLayout({ courseContext }: PlannerLayoutProps) {
  const storageKey = courseContext
    ? `planner-${courseContext.courseId}-${courseContext.lessonId}`
    : 'planner-new'
  // Modo edición: la lección ya tiene diseño guardado. La DB es la fuente de
  // verdad, cada sección se autosalva, y NO se corre el welcome ni se regenera.
  const isEditMode = !!courseContext?.savedData && courseContext.savedData.activities.length > 0
  const planner = usePlannerState(courseContext, storageKey, { disablePersistence: isEditMode })
  const router = useRouter()
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const hasInitialized = useRef(false)
  const pendingStepRef = useRef<PlannerStep | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const extra = courseContext ? { courseContext } : undefined

  // En modo edición, persiste un campo directo a la DB (autosave). Los nombres
  // de campo de PlannerData coinciden con SessionUpdateSchema (tema, objetivo,
  // instrucciones, keyPoints, contenidoTecnico, activities). Definido aquí
  // arriba para poder reusarlo tanto en el panel como en el callback del chat.
  const persistField = useCallback(
    async (field: keyof PlannerData, value: unknown) => {
      if (!courseContext) return
      try {
        const res = await fetch('/api/planner/session/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: courseContext.lessonId, [field]: value }),
          credentials: 'include',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error((err as { error?: string }).error || 'Error al guardar')
        }
        toast.success('Cambio guardado')
      } catch (error) {
        toast.error((error as Error).message)
      }
    },
    [courseContext]
  )

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const rafRef = useRef<number | null>(null)

  const sendStream = useCallback(async (
    message: string,
    step: PlannerStep,
    data: PlannerData,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    attachments?: PlannerAttachment[]
  ) => {
    const assistantId = planner.addAssistantPlaceholder()
    planner.setIsLoading(true)
    planner.streamingContentRef.current = ''
    pendingStepRef.current = null

    // Create new AbortController for this stream
    const controller = new AbortController()
    abortControllerRef.current = controller

    await streamPlannerResponse(
      message,
      step,
      data as unknown as Record<string, unknown>,
      history,
      (text) => {
        planner.streamingContentRef.current += text
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            planner.updateAssistantMessage(
              assistantId,
              planner.streamingContentRef.current
            )
          })
        }
      },
      (field, value) => {
        planner.updateField(field as keyof PlannerData, value as PlannerData[keyof PlannerData])
        // En modo edición, persistir también lo que aplica el chat: la IA
        // regenera y el instructor aprueba ("si") → debe guardarse a la DB.
        if (isEditMode) {
          void persistField(field as keyof PlannerData, value)
        }
      },
      (newStep) => {
        const typedStep = newStep as PlannerStep
        planner.setStep(typedStep)
        pendingStepRef.current = typedStep
      },
      () => {
        // Flush any pending RAF update
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
          planner.updateAssistantMessage(assistantId, planner.streamingContentRef.current)
        }
        planner.completeAssistantMessage(assistantId)
        planner.setIsLoading(false)
        abortControllerRef.current = null
      },
      (error) => {
        planner.errorAssistantMessage(assistantId)
        planner.setIsLoading(false)
        abortControllerRef.current = null
        toast.error(error.message)
      },
      '/api/planner/chat',
      'plannerData',
      attachments && attachments.length > 0
        ? { ...(extra ?? {}), attachments }
        : extra,
      controller.signal
    )

    return pendingStepRef.current
  }, [planner, extra, isEditMode, persistField])

  const sendFollowUp = useCallback(async (newStep: PlannerStep) => {
    await new Promise(r => setTimeout(r, 100))

    const history = planner.messages
      .filter((m) => m.status === 'completed')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    await sendStream(
      '__STEP_TRANSITION__',
      newStep,
      planner.data,
      history
    )
  }, [planner, sendStream])

  const generateWelcome = useCallback(async () => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Modo edición: sin auto-stream ni regeneración (la DB ya tiene el diseño).
    if (isEditMode) return

    // Skip welcome if we restored from localStorage
    if (planner.hasRestoredState) return

    const nextStep = await sendStream(
      '__INIT__',
      planner.step,
      planner.data,
      []
    )

    if (nextStep) {
      await sendFollowUp(nextStep)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    generateWelcome()
  }, [generateWelcome])

  const handleSendMessage = async (content: string, attachments?: PlannerAttachment[]) => {
    planner.addUserMessage(content)

    const history = planner.messages
      .filter((m) => m.status === 'completed')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const nextStep = await sendStream(
      content,
      planner.step,
      planner.data,
      history,
      attachments
    )

    if (nextStep) {
      await sendFollowUp(nextStep)
    }
  }

  const handlePanelEdit = (field: keyof PlannerData, value: unknown) => {
    planner.updateField(field, value as PlannerData[keyof PlannerData])
    if (isEditMode) {
      void persistField(field, value)
    }
  }

  const isSessionComplete = planner.data.activities.length > 0

  const handleSaveSession = async () => {
    if (!courseContext || !isSessionComplete) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/planner/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: courseContext.lessonId,
          keyPoints: planner.data.keyPoints,
          contentJson: {
            activities: planner.data.activities,
            instrucciones: planner.data.instrucciones,
            contenidoTecnico: planner.data.contenidoTecnico,
          },
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Error al guardar')
      }

      planner.clearSavedState()
      toast.success('Sesión guardada exitosamente')
      router.push(`/planner/${courseContext.courseId}`)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const title = courseContext
    ? `Sesión: ${courseContext.lessonTitle}`
    : 'Planificador'

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <PlannerChat
          messages={planner.messages}
          isLoading={planner.isLoading}
          step={planner.step}
          stepLabels={STEP_LABELS}
          onSend={handleSendMessage}
          onStop={handleStop}
          title={title}
        />

        {/* Save button when session design is complete (solo en modo creación;
            en edición cada sección se autosalva). */}
        {courseContext && !isEditMode && isSessionComplete && (
          <div className="shrink-0 border-t bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-emerald-700">
                Sesión diseñada: <strong>{courseContext.lessonTitle}</strong> — {planner.data.activities.length} actividades
              </p>
              <Button
                onClick={handleSaveSession}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? 'Guardando...' : 'Guardar Sesión'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Panel toggle */}
      {panelCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-16 z-10 h-8 w-8 rounded-full border bg-white shadow"
          onClick={() => setPanelCollapsed(false)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Panel */}
      <PlannerPanel
        data={planner.data}
        step={planner.step}
        sectionStatuses={planner.sectionStatuses}
        editingSection={planner.editingSection}
        onEdit={handlePanelEdit}
        onEditSection={planner.setEditingSection}
        isCollapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed(true)}
        disabled={planner.isLoading}
      />
    </div>
  )
}
