'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import { ChatMessageSkeleton } from './chat-message-skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { OptimisticMessage } from '@/types/chat'

interface ChatMessagesProps {
  messages: OptimisticMessage[]
  isLoading?: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageCountRef = useRef(0)
  const hasInitiallyScrolledRef = useRef(false)

  // Initial scroll to bottom on mount (when loading existing chat history)
  useEffect(() => {
    if (!hasInitiallyScrolledRef.current && messages.length > 0) {
      hasInitiallyScrolledRef.current = true
      messageCountRef.current = messages.length
      // Use 'instant' for initial load to avoid jarring smooth scroll
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages.length])

  // Auto-scroll when a new message is added (not on content updates during streaming)
  useEffect(() => {
    if (
      hasInitiallyScrolledRef.current &&
      messages.length !== messageCountRef.current
    ) {
      messageCountRef.current = messages.length
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  return (
    <ScrollArea className="h-full bg-linear-to-b from-white to-slate-300">
      <div className="p-4 space-y-2 w-full sm:w-[80%] mx-auto">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center min-h-[200px] text-gray-500">
            <p>No hay mensajes aún. ¡Comienza la conversación!</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1

          // ⭐ Detectar si es skeleton (mensaje optimistic vacío)
          if (
            message.isOptimistic &&
            message.status === 'streaming' &&
            message.content === ''
          ) {
            return <ChatMessageSkeleton key={message.id} isWelcome={message.isWelcome} />
          }

          // Renderizar mensaje normal (user o assistant con contenido)
          return (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.createdAt}
              isLastMessage={isLastMessage}
              isStreaming={message.status === 'streaming' && message.content.length > 0}
            />
          )
        })}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
