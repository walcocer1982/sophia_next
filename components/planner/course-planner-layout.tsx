'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useCoursePlannerState } from '@/hooks/use-course-planner-state'
import { streamPlannerResponse } from '@/lib/planner-stream'
import { PlannerChat } from './planner-chat'
import { CoursePlannerPanel } from './course-planner-panel'
import type { CoursePlannerData, CoursePlannerStep } from '@/types/planner'
import { COURSE_STEP_LABELS } from '@/types/planner'

interface CareerOption {
  id: string
  name: string
}

interface CoursePlannerLayoutProps {
  careers?: CareerOption[]
}

export function CoursePlannerLayout({ careers = [] }: CoursePlannerLayoutProps) {
  const planner = useCoursePlannerState()
  const router = useRouter()
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [editingSection, setEditingSection] = useState<CoursePlannerStep | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedCareerId, setSelectedCareerId] = useState<string>('all')
  const hasInitialized = useRef(false)
  // Track step change during stream to trigger auto-follow-up
  const pendingStepRef = useRef<CoursePlannerStep | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  const rafRef = useRef<number | null>(null)

  const sendStream = useCallback(async (
    message: string,
    step: CoursePlannerStep,
    data: CoursePlannerData,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => {
    const assistantId = planner.addAssistantPlaceholder()
    planner.setIsLoading(true)
    planner.streamingContentRef.current = ''
    pendingStepRef.current = null

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
        planner.updateField(field as keyof CoursePlannerData, value as CoursePlannerData[keyof CoursePlannerData])
      },
      (newStep) => {
        const typedStep = newStep as CoursePlannerStep
        planner.setStep(typedStep)
        pendingStepRef.current = typedStep
      },
      () => {
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
      '/api/planner/course/chat',
      'courseData',
      undefined,
      controller.signal
    )

    // Return whether a step change occurred
    return pendingStepRef.current
  }, [planner])

  // Auto-follow-up: when a step change occurs, send a follow-up to get the AI's next question
  const sendFollowUp = useCallback(async (newStep: CoursePlannerStep) => {
    // Small delay to let state settle
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

  // Welcome message
  const generateWelcome = useCallback(async () => {
    if (hasInitialized.current) return
    hasInitialized.current = true

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

  const handleSendMessage = async (content: string) => {
    planner.addUserMessage(content)

    const history = planner.messages
      .filter((m) => m.status === 'completed')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    const nextStep = await sendStream(
      content,
      planner.step,
      planner.data,
      history
    )

    // If step changed, auto-follow-up to ask next question
    if (nextStep) {
      await sendFollowUp(nextStep)
    }
  }

  const handlePanelEdit = (field: keyof CoursePlannerData, value: unknown) => {
    planner.updateField(field, value as CoursePlannerData[keyof CoursePlannerData])
  }

  const handleSaveCourse = async () => {
    if (!planner.isComplete) {
      toast.error('Completa todos los pasos antes de guardar')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/planner/course/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: planner.data.titulo,
          capacidad: planner.data.capacidad,
          careerId: selectedCareerId === 'all' ? null : selectedCareerId,
          aprendizajes: planner.data.aprendizajes,
          temas: planner.data.temas,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Error al guardar')
      }

      const result = await response.json() as { courseId: string }
      planner.clearSavedState()
      toast.success('Curso creado exitosamente')
      router.push(`/planner/${result.courseId}`)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <PlannerChat
          messages={planner.messages}
          isLoading={planner.isLoading}
          step={planner.step}
          stepLabels={COURSE_STEP_LABELS}
          onSend={handleSendMessage}
          onStop={handleStop}
          title="Planificador de Curso"
        />

        {/* Save button when complete */}
        {planner.isComplete && (
          <div className="shrink-0 border-t bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-emerald-700">
                Curso definido: <strong>{planner.data.titulo}</strong> — {planner.data.temas.length} sesiones
              </p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">Carrera:</label>
                <select
                  value={selectedCareerId}
                  onChange={(e) => setSelectedCareerId(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="all">Todas las carreras</option>
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button
                  onClick={handleSaveCourse}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Curso'}
                </Button>
              </div>
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
      <CoursePlannerPanel
        data={planner.data}
        step={planner.step}
        sectionStatuses={planner.sectionStatuses}
        editingSection={editingSection}
        onEdit={handlePanelEdit}
        onEditSection={setEditingSection}
        isCollapsed={panelCollapsed}
        onToggle={() => setPanelCollapsed(true)}
        disabled={planner.isLoading}
      />
    </div>
  )
}
