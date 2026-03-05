'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import type {
  CoursePlannerStep,
  CoursePlannerData,
  PlannerMessage,
  SectionStatus,
} from '@/types/planner'
import { COURSE_PLANNER_STEPS, EMPTY_COURSE_PLANNER_DATA } from '@/types/planner'

// ── localStorage helpers ──

const STORAGE_KEY = 'planner-course-new'

interface CoursePlannerSavedState {
  step: CoursePlannerStep
  data: CoursePlannerData
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    status: 'completed' | 'error'
  }>
}

function loadSavedState(): CoursePlannerSavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CoursePlannerSavedState
  } catch {
    return null
  }
}

function saveState(
  step: CoursePlannerStep,
  data: CoursePlannerData,
  messages: PlannerMessage[]
) {
  try {
    const serializableMessages = messages
      .filter((m) => m.status === 'completed' && m.content.trim())
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
        status: 'completed' as const,
      }))

    const state: CoursePlannerSavedState = { step, data, messages: serializableMessages }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or unavailable
  }
}

// ── computeStatuses ──

function computeStatuses(
  step: CoursePlannerStep,
  data: CoursePlannerData
): Record<CoursePlannerStep, SectionStatus> {
  const stepIndex = COURSE_PLANNER_STEPS.indexOf(step)

  return {
    CURSO: data.titulo ? 'completed' : stepIndex === 0 ? 'in_progress' : 'not_started',
    CAPACIDAD: data.capacidad ? 'completed' : stepIndex === 1 ? 'in_progress' : 'not_started',
    APRENDIZAJES: data.aprendizajes.length > 0 ? 'completed' : stepIndex === 2 ? 'in_progress' : 'not_started',
    TEMAS: data.temas.length > 0 ? 'completed' : stepIndex === 3 ? 'in_progress' : 'not_started',
  }
}

// ── Hook ──

export function useCoursePlannerState() {
  const savedState = useRef(loadSavedState())
  const hasRestoredState = !!savedState.current && savedState.current.messages.length > 0

  const initialStep: CoursePlannerStep = savedState.current?.step ?? 'CURSO'
  const initialData: CoursePlannerData = savedState.current?.data ?? EMPTY_COURSE_PLANNER_DATA
  const initialMessages: PlannerMessage[] = savedState.current?.messages.map((m) => ({
    ...m,
    timestamp: new Date(m.timestamp),
    isOptimistic: false,
  })) ?? []

  const [step, setStep] = useState<CoursePlannerStep>(initialStep)
  const [data, setData] = useState<CoursePlannerData>(initialData)
  const [messages, setMessages] = useState<PlannerMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const streamingContentRef = useRef<string>('')

  // Persist to localStorage on changes
  useEffect(() => {
    if (!isLoading) {
      saveState(step, data, messages)
    }
  }, [step, data, messages, isLoading])

  const sectionStatuses = useMemo(
    () => computeStatuses(step, data),
    [step, data]
  )

  const isComplete = useMemo(
    () => data.titulo !== '' && data.capacidad !== '' && data.aprendizajes.length > 0 && data.temas.length > 0,
    [data]
  )

  const updateField = useCallback(
    <K extends keyof CoursePlannerData>(field: K, value: CoursePlannerData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // Message handlers
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
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  return {
    step,
    data,
    messages,
    isLoading,
    sectionStatuses,
    isComplete,
    streamingContentRef,
    hasRestoredState,
    setStep,
    setIsLoading,
    updateField,
    addUserMessage,
    addAssistantPlaceholder,
    updateAssistantMessage,
    completeAssistantMessage,
    errorAssistantMessage,
    clearSavedState,
  }
}

export type UseCoursePlannerState = ReturnType<typeof useCoursePlannerState>
