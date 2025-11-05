// types/chat.ts
export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  createdAt: Date
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
