'use client'

import { useRef, useEffect, useState } from 'react'
import { ChatMessages } from '@/components/learning/chat-messages'
import { ChatInput, type ChatInputRef } from '@/components/learning/chat-input'
import type { PlannerMessage } from '@/types/planner'
import type { OptimisticMessage } from '@/types/chat'

interface PlannerChatProps {
  messages: PlannerMessage[]
  isLoading: boolean
  step: string
  stepLabels?: Record<string, string>
  onSend: (message: string) => void
  onStop?: () => void
  title?: string
}

// Marcador que la IA usa para datos del panel — se stripea del chat
const PANEL_DATA_MARKER = '---PANEL_DATA---'

function toOptimisticMessages(messages: PlannerMessage[]): OptimisticMessage[] {
  return messages.map((m) => {
    // Limpiar el contenido de marcadores PANEL_DATA
    let content = m.content
    const panelIdx = content.indexOf(PANEL_DATA_MARKER)
    if (panelIdx !== -1) {
      content = content.substring(0, panelIdx).trim()
    }

    return {
      id: m.id,
      sessionId: 'planner',
      role: m.role,
      content,
      createdAt: m.timestamp,
      status: m.status === 'sending' ? 'streaming' : m.status,
      isOptimistic: m.isOptimistic ?? false,
    }
  })
}

export function PlannerChat({
  messages,
  isLoading,
  step,
  stepLabels = {},
  onSend,
  onStop,
  title = 'Planificador',
}: PlannerChatProps) {
  const inputRef = useRef<ChatInputRef>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const stepLabel = stepLabels[step] ?? step

  // Auto-focus input when loading ends
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  return (
    <div className="flex h-full flex-col">
      {/* Step indicator */}
      <div className="shrink-0 border-b bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            {title}
          </span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500">
            {mounted ? `Paso: ${stepLabel}` : '\u00A0'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages
          messages={toOptimisticMessages(messages)}
          isLoading={isLoading && messages.length === 0}
        />
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          ref={inputRef}
          onSend={onSend}
          onStop={onStop}
          disabled={isLoading}
          placeholder="Escribe tu respuesta..."
          isStreaming={isLoading}
        />
      </div>
    </div>
  )
}
