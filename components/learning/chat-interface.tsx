'use client'

import { useState, useRef, useEffect } from 'react'
import { AI_CONFIG } from '@/lib/ai-config'
import { ChatMessages } from './chat-messages'
import { ChatInput, type ChatInputRef } from './chat-input'
import { DevToolsModal } from './dev-tools-modal'
import { ActivityProgressHeader } from './activity-progress-header'
import type { ChatMessage, OptimisticMessage } from '@/types/chat'
import { streamChatResponse } from '@/lib/chat-stream'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInterfaceProps {
  sessionId: string
  initialMessages: ChatMessage[]
  lessonTitle: string
}

export function ChatInterface({
  sessionId,
  initialMessages,
  lessonTitle,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<OptimisticMessage[]>(
    initialMessages.map((msg) => ({
      ...msg,
      status: 'completed',
      isOptimistic: false,
    }))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [showDevTools, setShowDevTools] = useState(false)
  const [isGeneratingWelcome, setIsGeneratingWelcome] = useState(
    initialMessages.length === 0
  )
  const [activityProgress, setActivityProgress] = useState({
    current: 1,
    total: 3,
    activityTitle: '',
    percentage: 0,
    lastCompletedId: null as string | null,
    lastCompletedAt: null as string | null,
  })
  const [debugPrompt, setDebugPrompt] = useState<{
    systemPrompt: string
    verificationPrompt?: {
      prompt: string
      result: {
        completed: boolean
        criteriaMatched: string[]
        criteriaMissing: string[]
        feedback: string
        confidence: 'high' | 'medium' | 'low'
      }
      model: string
      maxTokens: number
    }
    metadata: {
      activityId: string
      activityTitle: string
      activityType: string
      attempts: number
      tangentCount: number
      maxTangents: number
      verification: {
        completed: boolean
        confidence: string
        criteriaMatched: number
        totalCriteria: number
      }
      completedActivitiesCount: number
    }
    messageId: string
  } | null>(null)
  const streamingContentRef = useRef<string>('')
  const assistantIdRef = useRef<string>('')
  const hasGeneratedWelcome = useRef(false)
  const chatInputRef = useRef<ChatInputRef>(null)

  const isDevelopment = process.env.NODE_ENV === 'development'

  // Generate welcome message if chat is empty
  useEffect(() => {
    if (
      initialMessages.length === 0 &&
      messages.length === 0 &&
      !hasGeneratedWelcome.current
    ) {
      hasGeneratedWelcome.current = true
      generateWelcomeMessage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo ejecutar una vez al montar

  const generateWelcomeMessage = async () => {
    setIsGeneratingWelcome(true)
    streamingContentRef.current = ''

    // Crear placeholder optimistic para welcome message
    const welcomeId = 'welcome-' + Date.now()
    assistantIdRef.current = welcomeId

    const welcomePlaceholder: OptimisticMessage = {
      id: welcomeId,
      sessionId,
      role: 'assistant',
      content: '', // ⭐ Vacío inicialmente (mostrar skeleton)
      createdAt: new Date(),
      status: 'streaming',
      isOptimistic: true,
      isWelcome: true,
    }

    // Agregar placeholder inmediatamente
    setMessages([welcomePlaceholder])

    try {
      const response = await fetch('/api/chat/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate welcome message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      // Read stream chunks y actualizar mensaje existente
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        streamingContentRef.current += text

        // Actualizar mensaje por ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id === welcomeId ? { ...m, content: streamingContentRef.current } : m
          )
        )
      }

      // Marcar como completado
      setMessages((prev) =>
        prev.map((m) =>
          m.id === welcomeId
            ? { ...m, status: 'completed', isOptimistic: false }
            : m
        )
      )
      streamingContentRef.current = ''
    } catch (error) {
      console.error('Error generating welcome message:', error)
      toast.error('Error al generar mensaje de bienvenida')

      // Marcar como error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === welcomeId
            ? {
                ...m,
                status: 'error',
                content: 'Error al generar mensaje de bienvenida.',
                isOptimistic: false,
              }
            : m
        )
      )
    } finally {
      setIsGeneratingWelcome(false)
      // Auto-focus on input after welcome message
      setTimeout(() => {
        chatInputRef.current?.focus()
      }, 100)
    }
  }

  // Poll for activity progress
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/activity/progress?sessionId=${sessionId}`)
        if (!res.ok) return

        const data = await res.json()

        // Detectar nueva actividad completada
        if (
          data.lastCompleted?.activityId &&
          data.lastCompleted.activityId !== activityProgress.lastCompletedId
        ) {
          toast.success('¡Completaste una actividad!', {
            description: data.lastCompleted.passedCriteria
              ? 'Avanzando a la siguiente...'
              : 'Continúa practicando',
          })
        }

        // Detectar lección completada (solo mostrar toast una vez)
        if (data.completedAt && data.completedAt !== activityProgress.lastCompletedAt) {
          toast.success('¡Felicitaciones!', {
            description: '¡Completaste toda la lección!',
          })
        }

        setActivityProgress({
          current: data.currentPosition, // Fix: usar currentPosition directamente del backend
          total: data.total,
          activityTitle: data.currentActivity || lessonTitle,
          percentage: data.percentage,
          lastCompletedId: data.lastCompleted?.activityId || null,
          lastCompletedAt: data.completedAt,
        })
      } catch (error) {
        console.error('Error fetching progress:', error)
      }
    }

    fetchProgress() // Initial fetch
    const interval = setInterval(fetchProgress, AI_CONFIG.polling.progressIntervalMs)

    return () => clearInterval(interval)
  }, [sessionId, activityProgress.lastCompletedId, lessonTitle])

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    setIsLoading(true)

    // 1. Crear mensaje del usuario
    const userMessage: OptimisticMessage = {
      id: 'user-' + Date.now(),
      sessionId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date(),
      status: 'completed',
      isOptimistic: false,
    }

    // 2. Crear placeholder optimistic para respuesta del instructor
    const assistantId = 'assistant-' + Date.now()
    assistantIdRef.current = assistantId

    const assistantPlaceholder: OptimisticMessage = {
      id: assistantId,
      sessionId,
      role: 'assistant',
      content: '', // ⭐ Vacío inicialmente (mostrar skeleton)
      createdAt: new Date(),
      status: 'streaming',
      isOptimistic: true,
    }

    // 3. Agregar AMBOS mensajes inmediatamente
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder])

    // 4. Resetear ref de contenido
    streamingContentRef.current = ''

    try {
      await streamChatResponse(
        sessionId,
        content.trim(),
        // onChunk: Acumular texto en el mensaje optimistic
        (text) => {
          streamingContentRef.current += text

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: streamingContentRef.current } : m
            )
          )
        },
        // onDone: Marcar como completado
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, status: 'completed', isOptimistic: false }
                : m
            )
          )
          streamingContentRef.current = ''
          setIsLoading(false)
          // Auto-focus on input after AI finishes
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        },
        // onError: Marcar como error
        (error) => {
          console.error('Streaming error:', error)
          toast.error('Error al recibir respuesta. Intenta de nuevo.')

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    status: 'error',
                    content: 'Error al recibir respuesta. Por favor, intenta de nuevo.',
                    isOptimistic: false,
                  }
                : m
            )
          )
          setIsLoading(false)
        },
        // onActivityCompleted: update progress immediately
        (progressData) => {
          // Actualizar progreso inmediatamente (no esperar polling)
          setActivityProgress({
            current: progressData.currentPosition,
            total: progressData.total,
            activityTitle: progressData.nextActivityTitle || progressData.activityTitle,
            percentage: progressData.percentage,
            lastCompletedId: progressData.activityId,
            lastCompletedAt: progressData.completedAt || null,
          })

          // Toast inmediato
          if (progressData.isLastActivity) {
            toast.success('¡Felicitaciones!', {
              description: '¡Completaste toda la lección!',
            })
          } else {
            toast.success('¡Completaste una actividad!', {
              description: 'Avanzando a la siguiente...',
            })
          }
        },
        // onPromptDebug: Guardar prompts para debug (solo desarrollo)
        (systemPrompt, metadata, verificationPrompt) => {
          if (isDevelopment && metadata) {
            setDebugPrompt({
              systemPrompt,
              verificationPrompt,
              metadata,
              messageId: assistantId,
            })
          }
        }
      )
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje. Intenta de nuevo.')
      // Remover ambos mensajes en caso de error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantId))
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header - altura fija */}
      <div className="shrink-0 border-b bg-white">
        <div className="h-16 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{lessonTitle}</h1>
            <p className="text-sm text-gray-500">Sesión activa</p>
          </div>

          {/* Dev Tools Button - Solo en desarrollo */}
          {isDevelopment && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDevTools(true)}
              className="text-gray-500 hover:text-gray-700"
              title="Dev Tools"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Activity Progress Header */}
        <ActivityProgressHeader sessionId={sessionId} />
      </div>

      {/* Messages - ocupa espacio restante con scroll interno */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages messages={messages} isLoading={isLoading || isGeneratingWelcome} />
      </div>

      {/* Debug Prompt Viewer - Solo en desarrollo */}
      {isDevelopment && debugPrompt && (
        <div className="shrink-0 border-t bg-gray-50">
          <details className="px-6 py-4" open>
            <summary className="cursor-pointer font-bold text-base text-gray-900 hover:text-gray-700 mb-4">
              🔍 Debug: Prompts del Sistema
            </summary>

            <div className="space-y-6">
              {/* 1. Verification Prompt */}
              {debugPrompt.verificationPrompt && (
                <div className="border-b pb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                      1. Verification Prompt
                    </span>
                    <span className="text-xs text-gray-600">
                      (ejecutado PRIMERO para evaluar)
                    </span>
                  </div>

                  {/* Model info */}
                  <div className="bg-white p-2 rounded border border-gray-200 mb-3 text-xs font-mono flex gap-4 text-gray-600">
                    <span>Modelo: {debugPrompt.verificationPrompt.model}</span>
                    <span>Max Tokens: {debugPrompt.verificationPrompt.maxTokens}</span>
                  </div>

                  {/* Verification Result */}
                  <div className={`p-3 rounded mb-3 ${
                    debugPrompt.verificationPrompt.result.completed
                      ? 'bg-green-50 border border-green-300'
                      : 'bg-yellow-50 border border-yellow-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-bold text-sm ${
                        debugPrompt.verificationPrompt.result.completed
                          ? 'text-green-800'
                          : 'text-yellow-800'
                      }`}>
                        {debugPrompt.verificationPrompt.result.completed ? '✅ COMPLETADA' : '⏳ EN PROGRESO'}
                      </span>
                      <span className="text-xs text-gray-600">
                        Confianza: {debugPrompt.verificationPrompt.result.confidence}
                      </span>
                    </div>

                    {debugPrompt.verificationPrompt.result.criteriaMatched.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-green-700 mb-1">
                          Criterios cumplidos ({debugPrompt.verificationPrompt.result.criteriaMatched.length}):
                        </p>
                        <ul className="text-xs text-green-700 list-disc list-inside">
                          {debugPrompt.verificationPrompt.result.criteriaMatched.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {debugPrompt.verificationPrompt.result.criteriaMissing.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-yellow-700 mb-1">
                          Criterios faltantes ({debugPrompt.verificationPrompt.result.criteriaMissing.length}):
                        </p>
                        <ul className="text-xs text-yellow-700 list-disc list-inside">
                          {debugPrompt.verificationPrompt.result.criteriaMissing.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2 p-2 bg-white rounded border">
                      <p className="text-xs font-semibold mb-1 text-gray-700">Feedback generado:</p>
                      <p className="text-xs italic text-gray-800">"{debugPrompt.verificationPrompt.result.feedback}"</p>
                    </div>
                  </div>

                  {/* Verification Prompt */}
                  <details className="bg-gray-900 rounded overflow-hidden">
                    <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800">
                      Ver Verification Prompt Completo
                    </summary>
                    <pre className="whitespace-pre-wrap text-xs text-gray-100 p-4 max-h-96 overflow-y-auto">
                      {debugPrompt.verificationPrompt.prompt}
                    </pre>
                  </details>
                </div>
              )}

              {/* 2. System Prompt */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm font-semibold">
                    2. System Prompt
                  </span>
                  <span className="text-xs text-gray-600">
                    (usa resultado de verificación para dar feedback)
                  </span>
                </div>

                {/* Metadata */}
                <details className="bg-white p-3 rounded border border-gray-200 mb-3">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900">
                    Metadata de Actividad
                  </summary>
                  <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono mt-2 max-h-32 overflow-y-auto">
                    {JSON.stringify(debugPrompt.metadata, null, 2)}
                  </pre>
                </details>

                {/* System Prompt */}
                <div className="bg-gray-900 text-gray-100 p-4 rounded">
                  <pre className="whitespace-pre-wrap text-xs font-mono max-h-96 overflow-y-auto">
                    {debugPrompt.systemPrompt}
                  </pre>
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* Input - altura fija, siempre visible */}
      <div className="shrink-0">
        <ChatInput
          ref={chatInputRef}
          onSend={handleSendMessage}
          disabled={isLoading || isGeneratingWelcome}
          isGeneratingWelcome={isGeneratingWelcome}
          isThinking={isLoading}
          isStreaming={false}
        />
      </div>

      {/* Dev Tools Modal - Solo en desarrollo */}
      {isDevelopment && (
        <DevToolsModal
          open={showDevTools}
          onOpenChange={setShowDevTools}
          sessionId={sessionId}
        />
      )}
    </div>
  )
}
