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
}

export function ChatMessages({
  messages,
  streamingMessage,
  isLoading,
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

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-4 space-y-2">
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
          />
        ))}

        {/* Show streaming message */}
        {streamingMessage && (
          <ChatMessage role="assistant" content={streamingMessage} />
        )}

        {/* Typing indicator when loading but not streaming yet */}
        {isLoading && !streamingMessage && (
          <div className="flex gap-3 p-4">
            <AvatarInstructor name="Sophia" state="thinking" />
            <div className="bg-transparent rounded-lg px-4 py-3 min-w-[200px]">
              <AITextLoading
                texts={[
                  'Pensando...',
                  'Analizando tu pregunta...',
                  'Preparando respuesta...',
                  'Casi listo...',
                ]}
                interval={1500}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
