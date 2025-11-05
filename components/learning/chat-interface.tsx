'use client'

import { useState, useRef } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import type { ChatMessage } from '@/types/chat'
import { streamChatResponse } from '@/lib/chat-stream'
import { toast } from 'sonner'

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
  const streamingContentRef = useRef<string>('')

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
        },
        // onError: handle errors
        (error) => {
          console.error('Streaming error:', error)
          toast.error('Error al recibir respuesta. Intenta de nuevo.')
          setStreamingMessage('')
          streamingContentRef.current = ''
          setIsLoading(false)
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
      <div className="h-20 border-b bg-white px-6 py-4 flex-shrink-0">
        <h1 className="text-xl font-semibold">{lessonTitle}</h1>
        <p className="text-sm text-gray-500">Sesión activa</p>
      </div>

      {/* Messages - ocupa espacio restante con scroll interno */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages
          messages={messages}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
        />
      </div>

      {/* Input - altura fija, siempre visible */}
      <div className="flex-shrink-0">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  )
}
