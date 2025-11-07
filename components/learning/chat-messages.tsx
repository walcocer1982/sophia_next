'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import { AvatarInstructor } from './avatar-instructor'
import { ScrollArea } from '@/components/ui/scroll-area'
import AITextLoading from '@/components/ui/text-loading'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessagesProps {
  messages: ChatMessageType[]
  streamingMessage?: string
  isLoading?: boolean
  isWelcome?: boolean
}

export function ChatMessages({
  messages,
  streamingMessage,
  isLoading,
  isWelcome,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingMessage])

  // Determinar estado del avatar
  const getAvatarState = () => {
    if (streamingMessage) return 'speaking' // IA está generando respuesta
    if (isLoading) return 'thinking' // IA está pensando
    return 'idle' // Sin actividad
  }

  // Textos específicos para welcome vs chat normal
  const loadingTexts = isWelcome
    ? [
        'Iniciando la lección...',
        'Cargando contenido...',
        'Preparando la bienvenida...',
        'Casi listo...',
      ]
    : [
        'Pensando...',
        'Analizando tu pregunta...',
        'Preparando respuesta...',
        'Casi listo...',
      ]

  return (
    <ScrollArea className="h-full bg-slate-100">
      <div className="p-4 space-y-2 w-full sm:w-[80%] mx-auto">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center min-h-[200px] text-gray-500">
            <p>No hay mensajes aún. ¡Comienza la conversación!</p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.createdAt}
            isLastMessage={message.id === messages[messages.length - 1].id}
          />
        ))}

        {/* Typing indicator when loading but not streaming yet */}
        {isLoading && !streamingMessage && (
          <div className="flex gap-3 items-center">
            <AvatarInstructor name="Sophia" state={getAvatarState()} />
            <div className="bg-transparent">
              <AITextLoading
                texts={loadingTexts}
                interval={1500}
                color="orange"
              />
            </div>
          </div>
        )}

        {/* Show streaming message with avatar and indicator */}
        {streamingMessage && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3 items-center">
              {/* Avatar */}
              <AvatarInstructor name="Sophia" state={getAvatarState()} />
              <div className="bg-transparent">
                <AITextLoading
                  texts={['Escribiendo...', 'Generando...', 'Redactando...']}
                  interval={1200}
                  color="green"
                />
              </div>
            </div>

            {/* Message content */}
            <ChatMessage role="assistant" content={streamingMessage} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
