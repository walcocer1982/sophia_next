'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type {
  PlannerStep,
  PlannerData,
  PlannerMessage,
  SectionStatus,
  CourseContext,
} from '@/types/planner'
import { PLANNER_STEPS, EMPTY_PLANNER_DATA } from '@/types/planner'

// ── localStorage helpers ──

interface PlannerSavedState {
  step: PlannerStep
  data: PlannerData
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    status: 'completed' | 'error'
  }>
}

function loadSavedState(key: string | undefined): PlannerSavedState | null {
  if (!key) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as PlannerSavedState
  } catch {
    return null
  }
}

function savePlannerState(
  key: string | undefined,
  step: PlannerStep,
  data: PlannerData,
  messages: PlannerMessage[]
) {
  if (!key) return
  try {
    // Only save completed messages (not streaming/sending)
    const serializableMessages = messages
      .filter((m) => m.status === 'completed' && m.content.trim())
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
        status: 'completed' as const,
      }))

    const state: PlannerSavedState = { step, data, messages: serializableMessages }
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable, ignore
  }
}

// ── computeStatuses ──

function computeStatuses(
  step: PlannerStep,
  data: PlannerData,
  hasCourseContext: boolean
): Record<PlannerStep, SectionStatus> {
  const stepIndex = PLANNER_STEPS.indexOf(step)

  return {
    TEMA: hasCourseContext || data.tema ? 'completed' : stepIndex === 0 ? 'in_progress' : 'not_started',
    OBJETIVO: hasCourseContext || data.objetivo ? 'completed' : stepIndex === 1 ? 'in_progress' : 'not_started',
    INSTRUCCIONES: data.instrucciones.length > 0 ? 'completed' : stepIndex === 2 ? 'in_progress' : 'not_started',
    KEY_POINTS: data.keyPoints.length > 0 ? 'completed' : stepIndex === 3 ? 'in_progress' : 'not_started',
    CONTENIDO: data.contenidoTecnico.length > 0 ? 'completed' : stepIndex === 4 ? 'in_progress' : 'not_started',
    ESTRUCTURA: data.activities.length > 0 ? 'completed' : stepIndex === 5 ? 'in_progress' : 'not_started',
  }
}

// ── Hook ──

export function usePlannerState(courseContext?: CourseContext, storageKey?: string) {
  const hasCourseContext = !!courseContext

  // Try to restore from localStorage
  const savedState = useRef(loadSavedState(storageKey))
  const hasRestoredState = !!savedState.current && savedState.current.messages.length > 0

  // Check if lesson has previously saved data in DB
  const hasSavedDbData = !!courseContext?.savedData && courseContext.savedData.activities.length > 0

  // Initial values priority: localStorage > DB savedData > defaults
  let initialData: PlannerData
  let initialStep: PlannerStep
  let initialMessages: PlannerMessage[]

  if (savedState.current?.data && hasRestoredState) {
    // Restore from localStorage (mid-session refresh)
    initialData = savedState.current.data
    initialStep = savedState.current.step
    initialMessages = savedState.current.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
      isOptimistic: false,
    }))
  } else if (hasSavedDbData && courseContext?.savedData) {
    // Restore from DB (returning to previously designed session)
    initialData = {
      ...EMPTY_PLANNER_DATA,
      tema: courseContext.lessonTitle,
      objetivo: courseContext.lessonObjective,
      instrucciones: courseContext.savedData.instrucciones,
      keyPoints: courseContext.savedData.keyPoints,
      contenidoTecnico: courseContext.savedData.contenidoTecnico,
      activities: courseContext.savedData.activities,
    }
    initialStep = 'ESTRUCTURA'
    initialMessages = []
  } else {
    // Fresh start
    initialData = courseContext
      ? { ...EMPTY_PLANNER_DATA, tema: courseContext.lessonTitle, objetivo: courseContext.lessonObjective }
      : EMPTY_PLANNER_DATA
    initialStep = courseContext ? 'INSTRUCCIONES' : 'TEMA'
    initialMessages = []
  }

  const [step, setStep] = useState<PlannerStep>(initialStep)
  const [data, setData] = useState<PlannerData>(initialData)
  const [messages, setMessages] = useState<PlannerMessage[]>(initialMessages)
  const [editingSection, setEditingSection] = useState<PlannerStep | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const streamingContentRef = useRef<string>('')

  // Persist to localStorage on changes (debounced to avoid blocking main thread)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isLoading) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        savePlannerState(storageKey, step, data, messages)
      }, 500)
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [storageKey, step, data, messages, isLoading])

  const sectionStatuses = useMemo(
    () => computeStatuses(step, data, hasCourseContext),
    [step, data, hasCourseContext]
  )

  const updateField = useCallback(
    <K extends keyof PlannerData>(field: K, value: PlannerData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const advanceStep = useCallback(() => {
    const currentIndex = PLANNER_STEPS.indexOf(step)
    if (currentIndex < PLANNER_STEPS.length - 1) {
      let nextIndex = currentIndex + 1
      while (
        hasCourseContext &&
        nextIndex < PLANNER_STEPS.length &&
        (PLANNER_STEPS[nextIndex] === 'TEMA' || PLANNER_STEPS[nextIndex] === 'OBJETIVO')
      ) {
        nextIndex++
      }
      if (nextIndex < PLANNER_STEPS.length) {
        setStep(PLANNER_STEPS[nextIndex])
      }
    }
  }, [step, hasCourseContext])

  const goToStep = useCallback((targetStep: PlannerStep) => {
    setStep(targetStep)
  }, [])

  // ── Manejo de mensajes ──

  const addUserMessage = useCallback((content: string): string => {
    const id = `user-${Date.now()}`
    const msg: PlannerMessage = {
      id,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'completed',
      isOptimistic: false,
    }
    setMessages((prev) => [...prev, msg])
    return id
  }, [])

  const addAssistantPlaceholder = useCallback((): string => {
    const id = `assistant-${Date.now()}`
    const msg: PlannerMessage = {
      id,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
      isOptimistic: true,
    }
    setMessages((prev) => [...prev, msg])
    streamingContentRef.current = ''
    return id
  }, [])

  const updateAssistantMessage = useCallback(
    (id: string, content: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content } : m))
      )
    },
    []
  )

  const completeAssistantMessage = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'completed', isOptimistic: false } : m
      )
    )
  }, [])

  const errorAssistantMessage = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'error' } : m))
    )
  }, [])

  const clearSavedState = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    }
  }, [storageKey])

  return {
    // State
    step,
    data,
    messages,
    editingSection,
    isLoading,
    sectionStatuses,
    streamingContentRef,
    hasRestoredState,
    // Setters
    setStep,
    setIsLoading,
    setEditingSection,
    // Actions
    updateField,
    advanceStep,
    goToStep,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    completeAssistantMessage,
    errorAssistantMessage,
    clearSavedState,
  }
}

export type UsePlannerState = ReturnType<typeof usePlannerState>
