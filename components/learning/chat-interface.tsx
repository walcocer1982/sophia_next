'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput, type ChatInputRef } from './chat-input'
import { VoiceButton } from './voice-button'
import { TutorMode } from './tutor-mode'
import { DevToolsModal } from './dev-tools-modal'
import { useProgress } from './progress-context'
import type { ChatMessage, OptimisticMessage } from '@/types/chat'
import type { PlannerAttachment } from '@/types/planner'
import { streamChatResponse } from '@/lib/chat-stream'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInterfaceProps {
  sessionId: string
  initialMessages: ChatMessage[]
  lessonTitle: string
  voiceEnabled?: boolean
  allowPaste?: boolean
  allowAttachments?: boolean
}

export function ChatInterface({
  sessionId,
  initialMessages,
  lessonTitle,
  voiceEnabled = true,
  allowPaste = false,
  allowAttachments = false,
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
  const welcomeAudioPlayedRef = useRef(false)
  const chatInputRef = useRef<ChatInputRef>(null)

  const isDevelopment = process.env.NODE_ENV === 'development'
  const [viewMode, setViewMode] = useState<'tutor' | 'chat'>('tutor')

  const updateMessageById = (id: string, updater: (m: OptimisticMessage) => OptimisticMessage) => {
    setMessages(prev => prev.map(m => m.id === id ? updater(m) : m))
  }

  const addMessage = (msg: OptimisticMessage) => {
    setMessages(prev => [...prev, msg])
  }

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

      // Acumular el welcome SILENCIOSAMENTE. Si el curso tiene voz, queremos
      // que texto y audio aparezcan al mismo tiempo (no texto primero y voz
      // 1-2s después). Si no hay voz, mostramos el texto en streaming como antes.
      const shouldDeferReveal = voiceEnabled && !welcomeAudioPlayedRef.current
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        streamingContentRef.current += text

        if (!shouldDeferReveal) {
          // Sin voz: actualizar bubble en vivo como antes.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === welcomeId ? { ...m, content: streamingContentRef.current } : m
            )
          )
        }
        // Con voz: dejamos el bubble vacío (TutorMode mostrará "Sophia se está
        // preparando…") hasta que el audio esté listo.
      }

      const fullWelcome = streamingContentRef.current
      streamingContentRef.current = ''

      // Helper: revelar el texto del welcome (markear el mensaje como completed).
      const revealWelcomeText = () => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === welcomeId
              ? { ...m, content: fullWelcome, status: 'completed', isOptimistic: false }
              : m
          )
        )
      }

      if (shouldDeferReveal && fullWelcome.trim()) {
        welcomeAudioPlayedRef.current = true
        const cleanText = fullWelcome
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/__([^_]+)__/g, '$1')
          .replace(/_([^_]+)_/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/#{1,6}\s+/g, '')
          .replace(/^\s*\d+[.)]\s*/gm, '')
          .replace(/^\s*[-*•]\s+/gm, '')
          .replace(/\n{2,}/g, '. ')
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\s+\./g, '.')
          .replace(/\.+/g, '.')
          .trim()
        try {
          const ttsRes = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText }),
          })
          if (ttsRes.ok) {
            const blob = await ttsRes.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio()
            audio.preload = 'auto'
            audio.src = url
            audio.onended = () => URL.revokeObjectURL(url)
            // Esperar a que el audio pueda reproducirse de corrido o hasta 1.5s
            // como tope, para no bloquear si la red está lenta.
            await new Promise<void>((resolve) => {
              audio.oncanplaythrough = () => resolve()
              audio.onerror = () => resolve()
              audio.load()
              setTimeout(() => resolve(), 1500)
            })
            // Revelar texto y arrancar audio al mismo tiempo.
            revealWelcomeText()
            audio.play().catch((e) => {
              console.warn('Welcome TTS autoplay blocked:', e)
              URL.revokeObjectURL(url)
            })
          } else {
            // TTS falló — mostrar texto igual.
            revealWelcomeText()
          }
        } catch (e) {
          console.warn('TTS welcome failed:', e)
          revealWelcomeText()
        }
      } else {
        // Sin voz — el texto ya estaba apareciendo en streaming. Solo marcar
        // como completed.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === welcomeId
              ? { ...m, status: 'completed', isOptimistic: false }
              : m
          )
        )
      }
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

  const handleSendMessage = async (content: string, attachments?: PlannerAttachment[]) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || isLoading) return

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
        },
        attachments
      )
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje. Intenta de nuevo.')
      // Remover ambos mensajes en caso de error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantId))
      setIsLoading(false)
    }
  }

  // Render Tutor Mode (avatar-first) or Chat Mode (full conversation)
  if (viewMode === 'tutor') {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Mode toggle button */}
        <div className="absolute top-3 right-3 z-10 flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('chat')}
            className="bg-white/90 backdrop-blur"
          >
            Modo Chat
          </Button>
          {isDevelopment && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDevTools(true)}
              className="bg-white/90 backdrop-blur h-8 w-8"
              title="Dev Tools"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        <TutorMode
          sessionId={sessionId}
          lessonTitle={lessonTitle}
          messages={messages}
          onAddMessage={addMessage}
          onUpdateMessage={updateMessageById}
          onSendText={handleSendMessage}
          isLoading={isLoading}
          isGeneratingWelcome={isGeneratingWelcome}
          voiceEnabled={voiceEnabled}
          autoStartVoice={voiceEnabled}
          allowPaste={allowPaste}
        />

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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header compacto */}
      <div className="shrink-0 border-b border-gray-200 bg-white">
        <div className="h-14 px-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{lessonTitle}</h1>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('tutor')}
            >
              Modo Tutor
            </Button>
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
      </div>

      {/* Messages - ocupa espacio restante con scroll interno */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages messages={messages} isLoading={isLoading || isGeneratingWelcome} />
      </div>

      {/* Input - altura fija, siempre visible */}
      <div className="shrink-0 border-t border-gray-200">
        {voiceEnabled && (
          <div className="flex items-end gap-2 px-3 pt-2">
            <VoiceButton
              sessionId={sessionId}
              onMessage={(msg) => setMessages(prev => [...prev, msg])}
              onStreamStart={(id) => {
                setMessages(prev => [...prev, {
                  id,
                  sessionId,
                  role: 'assistant',
                  content: '',
                  createdAt: new Date(),
                  status: 'streaming',
                  isOptimistic: true,
                }])
              }}
              onStreamDelta={(id, delta) => {
                setMessages(prev => prev.map(m =>
                  m.id === id ? { ...m, content: m.content + delta } : m
                ))
              }}
              onStreamDone={(id) => {
                setMessages(prev => prev.map(m =>
                  m.id === id ? { ...m, status: 'completed', isOptimistic: false } : m
                ))
              }}
              disabled={isLoading || isGeneratingWelcome}
            />
          </div>
        )}
        <ChatInput
          ref={chatInputRef}
          onSend={handleSendMessage}
          disabled={isLoading || isGeneratingWelcome}
          isGeneratingWelcome={isGeneratingWelcome}
          isThinking={isLoading}
          isStreaming={false}
          allowPaste={allowPaste}
          allowAttachments={allowAttachments}
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
