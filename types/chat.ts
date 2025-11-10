// types/chat.ts
import { Message } from '@prisma/client'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  createdAt: Date
  inputTokens?: number | null
  outputTokens?: number | null
}

// ⭐ Optimistic UI: Extender con propiedades para estado en tiempo real
export interface OptimisticMessage extends ChatMessage {
  status?: 'sending' | 'streaming' | 'completed' | 'error'
  isOptimistic?: boolean
  isWelcome?: boolean
}

// Helper para convertir Prisma Message a OptimisticMessage
export function toOptimisticMessage(message: Message): OptimisticMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role as MessageRole,
    content: message.content,
    createdAt: message.timestamp,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    status: 'completed',
    isOptimistic: false,
  }
}

export interface SessionStartRequest {
  lessonId: string
}

export interface SessionStartResponse {
  sessionId: string
  welcomeMessage: string
  lesson: {
    title: string
    estimatedMinutes: number | null
  }
}

export interface ChatRequest {
  sessionId: string
  message: string
}

export interface ChatResponse {
  message: string
  messageId: string
}
