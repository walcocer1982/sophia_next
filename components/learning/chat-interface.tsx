'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput, type ChatInputRef } from './chat-input'
import { VoiceButton } from './voice-button'
import { DevToolsModal } from './dev-tools-modal'
import { useProgress } from './progress-context'
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
  const { progress, updateProgress } = useProgress()
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
        // onActivityCompleted: update shared progress immediately
        (progressData) => {
          updateProgress({
            current: progressData.currentPosition,
            total: progressData.total,
            currentActivity: progressData.nextActivityTitle || progressData.activityTitle,
            percentage: progressData.percentage,
            lastCompletedId: progressData.activityId,
            completedAt: progressData.completedAt || null,
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
      // Remover ambos mensajes en caso de error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantId))
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header compacto */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <div className="h-14 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{lessonTitle}</h1>
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
      </div>

      {/* Messages - ocupa espacio restante con scroll interno */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages messages={messages} isLoading={isLoading || isGeneratingWelcome} />
      </div>

      {/* Input - altura fija, siempre visible */}
      <div className="shrink-0 border-t border-gray-200">
        <div className="flex items-end gap-2 px-3 pt-2">
          <VoiceButton
            sessionId={sessionId}
            onMessage={(msg) => setMessages(prev => [...prev, msg])}
            disabled={isLoading || isGeneratingWelcome}
          />
        </div>
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
