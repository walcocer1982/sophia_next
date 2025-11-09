'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput, type ChatInputRef } from './chat-input'
import { DevToolsModal } from './dev-tools-modal'
import { ActivityProgressHeader } from './activity-progress-header'
import type { ChatMessage } from '@/types/chat'
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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
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
  const streamingContentRef = useRef<string>('')
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
    setStreamingMessage('')

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

      // Read stream chunks
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        streamingContentRef.current += text
        setStreamingMessage(streamingContentRef.current)
      }

      // Finalize welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome-' + Date.now(),
        sessionId,
        role: 'assistant',
        content: streamingContentRef.current,
        createdAt: new Date(),
      }

      // Solo agregar si no hay mensajes (prevenir duplicados)
      setMessages((prev) => {
        if (prev.length === 0) {
          return [welcomeMessage]
        }
        console.warn('Welcome message already exists, skipping')
        return prev
      })
      setStreamingMessage('')
      streamingContentRef.current = ''
    } catch (error) {
      console.error('Error generating welcome message:', error)
      toast.error('Error al generar mensaje de bienvenida')
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
    const interval = setInterval(fetchProgress, 5000) // Poll cada 5s

    return () => clearInterval(interval)
  }, [sessionId, activityProgress.lastCompletedId, lessonTitle])

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      sessionId,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Reset streaming state
    streamingContentRef.current = ''
    setStreamingMessage('')

    const assistantId = 'assistant-' + Date.now()

    try {
      await streamChatResponse(
        sessionId,
        content,
        // onChunk: accumulate text
        (text) => {
          streamingContentRef.current += text
          setStreamingMessage(streamingContentRef.current)
        },
        // onDone: finalize message
        () => {
          const finalMessage: ChatMessage = {
            id: assistantId,
            sessionId,
            role: 'assistant',
            content: streamingContentRef.current,
            createdAt: new Date(),
          }
          setMessages((prev) => [...prev, finalMessage])
          setStreamingMessage('')
          streamingContentRef.current = ''
          setIsLoading(false)
          // Auto-focus on input after AI finishes
          setTimeout(() => {
            chatInputRef.current?.focus()
          }, 100)
        },
        // onError: handle errors
        (error) => {
          console.error('Streaming error:', error)
          toast.error('Error al recibir respuesta. Intenta de nuevo.')
          setStreamingMessage('')
          streamingContentRef.current = ''
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
        }
      )
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje. Intenta de nuevo.')
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
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
        <ChatMessages
          messages={messages}
          streamingMessage={streamingMessage}
          isLoading={isLoading || isGeneratingWelcome}
          isWelcome={isGeneratingWelcome}
        />
      </div>

      {/* Input - altura fija, siempre visible */}
      <div className="shrink-0">
        <ChatInput
          ref={chatInputRef}
          onSend={handleSendMessage}
          disabled={isLoading || isGeneratingWelcome}
          isGeneratingWelcome={isGeneratingWelcome}
          isThinking={isLoading && streamingMessage.length === 0}
          isStreaming={streamingMessage.length > 0}
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
