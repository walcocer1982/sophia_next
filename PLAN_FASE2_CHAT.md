# PLAN FASE 2: Sistema de Chat con IA

**Proyecto:** Sophia Next
**Fecha:** 2025-11-05
**Enfoque:** MVPs Incrementales Desplegables
**Estimación Total:** 16-22 horas (3-4 días full-time)

---

## 📋 Resumen Ejecutivo

### Enfoque: 3 MVPs Incrementales

En lugar de implementar todo de golpe, dividimos en **3 MVPs desplegables**:

| MVP | Objetivo | Tiempo | Desplegable | Valor |
|-----|----------|--------|-------------|-------|
| MVP-1 | Chat básico funcional | 6-8h | ✅ Sí | Usuario puede chatear |
| MVP-2 | Streaming + UX mejorada | 4-6h | ✅ Sí | Experiencia como ChatGPT |
| MVP-3 | Progresión + Robustez | 6-8h | ✅ Sí | Sistema educativo completo |

### Filosofía de Sacrificios Estratégicos

**Principio:** Deploy fast, iterate faster

- ✅ MVP-1: Sacrificar elegancia por velocidad (hardcoded prompts OK)
- ✅ MVP-2: Agregar UX crítica (streaming es must-have)
- ✅ MVP-3: Pagar deuda técnica (implementar robustez completa)

**Regla de oro:** Cada MVP debe ser:
1. Testeable end-to-end
2. Desplegable a producción
3. Agregar valor real
4. Tener rollback plan

---

## 🎯 MVP-1: Chat Básico Funcional

**Tiempo:** 6-8 horas
**Objetivo:** Usuario puede iniciar sesión de lección y chatear con IA
**Prioridad:** Funcionalidad > Elegancia

### Features

- ✅ POST /api/session/start - Crear sesión de lección
- ✅ POST /api/chat - Respuesta completa (NO streaming)
- ✅ GET /api/session/[id]/messages - Fetch historial
- ✅ UI simple: input + lista de mensajes
- ✅ Historial persiste en BD
- ✅ Prompt básico hardcoded

### Sacrificios Aceptables

❌ Sin streaming (usuario espera 5-10s, acceptable)
❌ Sin typing indicator
❌ Sin auto-scroll fancy (solo scrollIntoView básico)
❌ Sin verificación automática de respuestas
❌ Sin activity progression
❌ Sin rate limiting (lo agregamos en MVP-3)
❌ Sin analytics
❌ Prompt hardcoded simple

### Archivos a Crear (15 archivos)

#### 1. Setup y Config (30min)
```bash
npm install @anthropic-ai/sdk zod
```

- [ ] `.env` - Agregar `ANTHROPIC_API_KEY`
- [ ] `lib/anthropic.ts` - Cliente de Anthropic con mock mode
- [ ] `lib/env.ts` - Validación de environment variables

#### 2. Types (30min)
- [ ] `types/chat.ts` - Message, Session types

```typescript
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
```

#### 3. API Routes (3h)

**A. Session Start (1h)**
- [ ] `app/api/session/start/route.ts`

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  const { lessonId } = await request.json()

  // 3. Check if lesson exists and is published
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId, isPublished: true },
    select: { id: true, title: true, description: true, estimatedMinutes: true }
  })

  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  // 4. Check for active session
  let lessonSession = await prisma.lessonSession.findFirst({
    where: {
      userId: session.user.id,
      lessonId: lessonId,
      endedAt: null // Active session
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1 // Solo el welcome message
      }
    }
  })

  // 5. If no active session, create one
  if (!lessonSession) {
    lessonSession = await prisma.lessonSession.create({
      data: {
        userId: session.user.id,
        lessonId: lessonId,
        sessionAttempt: 1, // TODO: Calculate properly in MVP-3
        startedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: {
        messages: true
      }
    })

    // 6. Generate welcome message with Claude
    const welcomePrompt = `Eres un instructor especializado en ${lesson.title}.

Genera un mensaje de bienvenida breve y motivador para el estudiante. El mensaje debe:
- Ser breve (2-3 oraciones)
- Mencionar el título de la lección
- Invitar al estudiante a hacer preguntas
- Ser amigable y profesional

Responde solo con el mensaje de bienvenida, sin introducción adicional.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: welcomePrompt
      }]
    })

    const welcomeMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Hola, soy tu instructor. ¿En qué puedo ayudarte?'

    // 7. Save welcome message
    await prisma.message.create({
      data: {
        sessionId: lessonSession.id,
        role: 'assistant',
        content: welcomeMessage,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    })

    lessonSession.messages = [{
      id: 'temp',
      sessionId: lessonSession.id,
      role: 'assistant',
      content: welcomeMessage,
      createdAt: new Date(),
      classId: null,
      momentId: null,
      activityId: null,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    }]
  }

  // 8. Return session info
  return NextResponse.json({
    sessionId: lessonSession.id,
    welcomeMessage: lessonSession.messages[0]?.content || '',
    lesson: {
      title: lesson.title,
      estimatedMinutes: lesson.estimatedMinutes
    }
  })
}
```

**B. Fetch Messages (30min)**
- [ ] `app/api/session/[id]/messages/route.ts`

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: params.id,
      userId: session.user.id
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      },
      lesson: {
        select: {
          title: true,
          estimatedMinutes: true
        }
      }
    }
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  return NextResponse.json({
    messages: lessonSession.messages,
    lesson: lessonSession.lesson
  })
}
```

**C. Chat Endpoint (1.5h)**
- [ ] `app/api/chat/route.ts`

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // Vercel Pro: 60s, Hobby: 10s

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId, message } = await request.json()

  // 1. Validate session
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      endedAt: null // Active only
    },
    include: {
      lesson: {
        select: {
          title: true,
          description: true
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10 // Last 10 messages for context
      }
    }
  })

  if (!lessonSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // 2. Build system prompt (MVP-1: simple hardcoded)
  const systemPrompt = `Eres un instructor especializado en "${lessonSession.lesson.title}".

Tu rol es:
- Responder preguntas del estudiante de forma clara y didáctica
- Usar ejemplos prácticos cuando sea posible
- Ser paciente y motivador
- Si el estudiante está confundido, replantear de otra forma

Descripción de la lección: ${lessonSession.lesson.description}

Responde de forma conversacional y amigable.`

  // 3. Build conversation history
  const conversationHistory = lessonSession.messages
    .reverse() // Oldest first
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  // 4. Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      {
        role: 'user',
        content: message
      }
    ]
  })

  const assistantMessage = response.content[0].type === 'text'
    ? response.content[0].text
    : 'Lo siento, no pude procesar tu mensaje.'

  // 5. Save both messages in transaction
  const [userMsg, assistantMsg] = await prisma.$transaction([
    prisma.message.create({
      data: {
        sessionId: lessonSession.id,
        role: 'user',
        content: message,
      }
    }),
    prisma.message.create({
      data: {
        sessionId: lessonSession.id,
        role: 'assistant',
        content: assistantMessage,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    }),
  ])

  // 6. Update lastActivityAt
  await prisma.lessonSession.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() }
  })

  return NextResponse.json({
    message: assistantMessage,
    messageId: assistantMsg.id
  })
}
```

#### 4. Frontend Components (2.5h)

**A. Chat Message Component (30min)**
- [ ] `components/learning/chat-message.tsx`

```typescript
import { cn } from '@/lib/utils'
import type { MessageRole } from '@/types/chat'

interface ChatMessageProps {
  role: MessageRole
  content: string
  timestamp?: Date
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
        isUser ? 'bg-blue-500' : 'bg-purple-500'
      )}>
        <span className="text-white font-semibold">
          {isUser ? 'U' : 'IA'}
        </span>
      </div>

      {/* Message bubble */}
      <div className={cn(
        'rounded-lg px-4 py-3 max-w-[70%]',
        isUser
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-900'
      )}>
        <p className="whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <span className={cn(
            'text-xs mt-1 block',
            isUser ? 'text-blue-100' : 'text-gray-500'
          )}>
            {timestamp.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}
```

**B. Chat Input Component (30min)**
- [ ] `components/learning/chat-input.tsx`

```typescript
'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2 p-4 border-t bg-white">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)'}
        disabled={disabled}
        className="min-h-[60px] max-h-[200px]"
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim() || disabled}
        size="icon"
        className="h-[60px] w-[60px]"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  )
}
```

**C. Chat Messages List (30min)**
- [ ] `components/learning/chat-messages.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessagesProps {
  messages: ChatMessageType[]
  isLoading?: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Simple auto-scroll (MVP-1: basic implementation)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-gray-500">
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

      {isLoading && (
        <div className="flex gap-3 p-4">
          <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
            <span className="text-white font-semibold">IA</span>
          </div>
          <div className="bg-gray-100 rounded-lg px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
```

**D. Chat Interface (1h)**
- [ ] `components/learning/chat-interface.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import type { ChatMessage } from '@/types/chat'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  sessionId: string
  initialMessages: ChatMessage[]
  lessonTitle: string
}

export function ChatInterface({
  sessionId,
  initialMessages,
  lessonTitle
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)

    // Optimistic update: add user message immediately
    const tempUserMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      sessionId,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: content })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: data.messageId,
        sessionId,
        role: 'assistant',
        content: data.message,
        createdAt: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Error al enviar mensaje. Intenta de nuevo.')
      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">{lessonTitle}</h1>
        <p className="text-sm text-gray-500">Sesión activa</p>
      </div>

      {/* Messages */}
      <ChatMessages messages={messages} isLoading={isLoading} />

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
}
```

#### 5. Pages (1h)

**A. Chat Page**
- [ ] `app/(protected)/learn/[sessionId]/page.tsx`

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatInterface } from '@/components/learning/chat-interface'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

export default async function ChatPage({
  params
}: {
  params: { sessionId: string }
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: params.sessionId,
      userId: session.user.id
    },
    include: {
      lesson: {
        select: {
          title: true
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!lessonSession) {
    notFound()
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ChatInterface
        sessionId={lessonSession.id}
        initialMessages={lessonSession.messages}
        lessonTitle={lessonSession.lesson.title}
      />
    </div>
  )
}
```

#### 6. Modificaciones (30min)

**A. Lesson Card**
- [ ] `components/lessons/lesson-card.tsx` - Modificar onClick

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface LessonCardProps {
  lesson: {
    id: string
    title: string
    description: string | null
    slug: string
    category: string | null
    estimatedMinutes: number | null
    difficulty: string | null
  }
}

export function LessonCard({ lesson }: LessonCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartLesson = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id })
      })

      if (!response.ok) {
        throw new Error('Failed to start session')
      }

      const data = await response.json()
      router.push(`/learn/${data.sessionId}`)
    } catch (error) {
      console.error('Error starting lesson:', error)
      toast.error('Error al iniciar la lección. Intenta de nuevo.')
      setIsLoading(false)
    }
  }

  return (
    <Card
      className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
      onClick={handleStartLesson}
    >
      <CardContent className="p-6">
        <div className="mb-3 flex items-center gap-2">
          {lesson.category && (
            <Badge variant="secondary">{lesson.category}</Badge>
          )}
          {lesson.difficulty && (
            <Badge variant="outline">{lesson.difficulty}</Badge>
          )}
        </div>
        <CardTitle className="mb-2">{lesson.title}</CardTitle>
        <CardDescription className="mb-4 line-clamp-2">
          {lesson.description}
        </CardDescription>
        <div className="flex items-center justify-between">
          {lesson.estimatedMinutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{lesson.estimatedMinutes} minutos</span>
            </div>
          )}
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**B. Install Sonner for toasts**
```bash
npm install sonner
```

### Criterios de Éxito MVP-1

**Testing Checklist:**

1. **Session Creation**
   - [ ] Usuario puede hacer click en lesson card
   - [ ] POST /api/session/start crea LessonSession
   - [ ] Welcome message se genera y guarda
   - [ ] Redirige a /learn/[sessionId]

2. **Chat Functionality**
   - [ ] Usuario puede escribir mensaje y enviarlo
   - [ ] Mensaje se muestra optimistically
   - [ ] IA responde (espera 5-10s)
   - [ ] Respuesta se muestra en UI
   - [ ] Ambos mensajes se guardan en BD

3. **Message History**
   - [ ] Mensajes previos se cargan al refrescar página
   - [ ] Orden correcto (cronológico)
   - [ ] Welcome message aparece primero

4. **Error Handling**
   - [ ] Si falla envío, mensaje optimistic se elimina
   - [ ] Toast de error se muestra
   - [ ] Input queda habilitado

5. **UI/UX**
   - [ ] Input se disable mientras carga
   - [ ] Loading indicator se muestra
   - [ ] Auto-scroll a último mensaje funciona
   - [ ] Enter envía, Shift+Enter nueva línea

**Queries de Verificación:**

```sql
-- Debe haber 1+ LessonSession
SELECT * FROM "LessonSession" WHERE "endedAt" IS NULL;

-- Debe haber 2+ mensajes (welcome + user + assistant)
SELECT * FROM "Message" WHERE "sessionId" = 'xxx' ORDER BY "createdAt";

-- Verificar tokens usage
SELECT SUM("inputTokens"), SUM("outputTokens") FROM "Message";
```

### Deployment MVP-1

```bash
# 1. Push to Git
git add .
git commit -m "feat: MVP-1 - Chat básico funcional"
git push origin main

# 2. Deploy to Vercel (auto if connected)
# O manual:
vercel --prod

# 3. Verificar environment variables en Vercel:
# - DATABASE_URL
# - AUTH_SECRET
# - ANTHROPIC_API_KEY
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
```

### Rollback Plan MVP-1

Si MVP-1 tiene problemas críticos en producción:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# O rollback en Vercel dashboard:
# Deployments → Previous deployment → Promote to Production
```

---

## 🚀 MVP-2: Streaming + UX Mejorada

**Tiempo:** 4-6 horas
**Objetivo:** Experiencia de chat comparable a ChatGPT
**Prioridad:** UX > Features nuevas

### Features Nuevas

- ✅ Server-Sent Events streaming
- ✅ Typing indicator animado
- ✅ Auto-scroll inteligente (no scroll si usuario lee historial)
- ✅ Skeleton loading states
- ✅ Optimistic updates mejorados
- ✅ Error boundaries

### Mejoras sobre MVP-1

- ✅ Respuesta instantánea (streaming word-by-word)
- ✅ Mejor feedback visual (typing indicator)
- ✅ UX más responsive
- ✅ Menor wait time percibido

### Sacrificios Aceptables (to be fixed in MVP-3)

❌ Sin rate limiting todavía
❌ Sin activity progression
❌ Sin analytics
❌ Prompt aún simple (pero OK porque funciona)

### Archivos a Modificar/Crear (8 archivos)

#### 1. Backend Streaming (2h)

**A. Convertir /api/chat a streaming**
- [ ] `app/api/chat/stream/route.ts` (replace /api/chat)

```typescript
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { sessionId, message } = await request.json()

  // 1. Validate session (same as MVP-1)
  const lessonSession = await prisma.lessonSession.findFirst({
    where: {
      id: sessionId,
      userId: session.user.id,
      endedAt: null
    },
    include: {
      lesson: {
        select: {
          title: true,
          description: true
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })

  if (!lessonSession) {
    return new Response('Session not found', { status: 404 })
  }

  // 2. Build prompt (same as MVP-1)
  const systemPrompt = `Eres un instructor especializado en "${lessonSession.lesson.title}".

Tu rol es:
- Responder preguntas del estudiante de forma clara y didáctica
- Usar ejemplos prácticos cuando sea posible
- Ser paciente y motivador
- Si el estudiante está confundido, replantear de otra forma

Descripción de la lección: ${lessonSession.lesson.description}

Responde de forma conversacional y amigable.`

  const conversationHistory = lessonSession.messages
    .reverse()
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  // 3. Stream response
  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: message
            }
          ]
        })

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullResponse += text

              // Send chunk to client
              const data = JSON.stringify({
                type: 'content',
                text: text
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          } else if (event.type === 'message_start') {
            inputTokens = event.message.usage.input_tokens
          } else if (event.type === 'message_delta') {
            outputTokens = event.usage.output_tokens
          }
        }

        // 4. Save messages in transaction
        await prisma.$transaction([
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'user',
              content: message,
            }
          }),
          prisma.message.create({
            data: {
              sessionId: lessonSession.id,
              role: 'assistant',
              content: fullResponse,
              inputTokens,
              outputTokens,
            }
          }),
          prisma.lessonSession.update({
            where: { id: sessionId },
            data: { lastActivityAt: new Date() }
          })
        ])

        // 5. Send done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()

      } catch (error) {
        console.error('Streaming error:', error)
        const errorData = JSON.stringify({
          type: 'error',
          message: 'Error al procesar respuesta'
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

#### 2. Frontend Streaming Client (2h)

**A. Stream helper**
- [ ] `lib/chat-stream.ts`

```typescript
export interface StreamEvent {
  type: 'content' | 'done' | 'error'
  text?: string
  message?: string
}

export async function streamChatResponse(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data: StreamEvent = JSON.parse(line.slice(6))

            if (data.type === 'content' && data.text) {
              onChunk(data.text)
            } else if (data.type === 'done') {
              onDone()
            } else if (data.type === 'error') {
              onError(new Error(data.message || 'Unknown error'))
            }
          } catch (e) {
            // Skip invalid JSON
            continue
          }
        }
      }
    }
  } catch (error) {
    onError(error as Error)
  }
}
```

**B. Update ChatInterface**
- [ ] `components/learning/chat-interface.tsx` - Modificar para usar streaming

```typescript
'use client'

import { useState, useRef } from 'react'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { streamChatResponse } from '@/lib/chat-stream'
import type { ChatMessage } from '@/types/chat'
import { toast } from 'sonner'

interface ChatInterfaceProps {
  sessionId: string
  initialMessages: ChatMessage[]
  lessonTitle: string
}

export function ChatInterface({
  sessionId,
  initialMessages,
  lessonTitle
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const streamingMessageRef = useRef<ChatMessage | null>(null)

  const handleSendMessage = async (content: string) => {
    setIsLoading(true)

    // Add user message
    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      sessionId,
      role: 'user',
      content,
      createdAt: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    // Prepare streaming assistant message
    streamingMessageRef.current = {
      id: 'assistant-' + Date.now(),
      sessionId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }
    setMessages(prev => [...prev, streamingMessageRef.current!])

    await streamChatResponse(
      sessionId,
      content,
      // On chunk
      (text) => {
        if (streamingMessageRef.current) {
          streamingMessageRef.current.content += text
          setMessages(prev => [...prev])
        }
      },
      // On done
      () => {
        setIsLoading(false)
        streamingMessageRef.current = null
      },
      // On error
      (error) => {
        console.error('Stream error:', error)
        toast.error('Error en la respuesta. Intenta de nuevo.')
        // Remove both messages on error
        setMessages(prev => prev.slice(0, -2))
        setIsLoading(false)
        streamingMessageRef.current = null
      }
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-semibold">{lessonTitle}</h1>
        <p className="text-sm text-gray-500">Sesión activa</p>
      </div>

      <ChatMessages messages={messages} isLoading={isLoading} />

      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
}
```

**C. Intelligent auto-scroll**
- [ ] `hooks/use-auto-scroll.ts`

```typescript
import { useEffect, useRef, useState } from 'react'

export function useAutoScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setIsAutoScrollEnabled(isAtBottom)
    }

    element.addEventListener('scroll', handleScroll)
    return () => element.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = () => {
    if (isAutoScrollEnabled && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }

  return { ref, scrollToBottom, isAutoScrollEnabled }
}
```

**D. Update ChatMessages with smart scroll**
- [ ] `components/learning/chat-messages.tsx` - Usar hook

```typescript
'use client'

import { useEffect } from 'react'
import { ChatMessage } from './chat-message'
import { useAutoScroll } from '@/hooks/use-auto-scroll'
import type { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessagesProps {
  messages: ChatMessageType[]
  isLoading?: boolean
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const { ref, scrollToBottom } = useAutoScroll<HTMLDivElement>()

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <div ref={ref} className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-gray-500">
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

      {isLoading && (
        <div className="flex gap-3 p-4">
          <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
            <span className="text-white font-semibold">IA</span>
          </div>
          <div className="bg-gray-100 rounded-lg px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Criterios de Éxito MVP-2

**Testing Checklist:**

1. **Streaming Functionality**
   - [ ] Respuesta aparece word-by-word
   - [ ] No hay lag perceptible entre chunks
   - [ ] Stream completo se guarda en BD

2. **Typing Indicator**
   - [ ] Se muestra cuando isLoading=true
   - [ ] Desaparece cuando stream termina
   - [ ] Animación fluida

3. **Smart Auto-scroll**
   - [ ] Scroll automático cuando usuario está al fondo
   - [ ] NO scroll si usuario está leyendo historial arriba
   - [ ] Vuelve a auto-scroll si usuario scrollea al fondo

4. **Error Handling**
   - [ ] Si stream falla, muestra error
   - [ ] Mensajes optimistic se eliminan
   - [ ] Input queda habilitado

5. **Performance**
   - [ ] No re-renders innecesarios
   - [ ] Smooth scrolling
   - [ ] No memory leaks

**Performance Benchmark:**

```
Time to First Token: < 500ms
Chunk Render Time: < 16ms (60fps)
Total Response Time: 2-5s typical
```

### Deployment MVP-2

```bash
git add .
git commit -m "feat: MVP-2 - Streaming + UX mejorada"
git push origin main
```

### Rollback Plan MVP-2

Si streaming causa problemas:

```bash
# Revert to MVP-1
git revert HEAD
git push origin main

# O feature flag:
# En env: ENABLE_STREAMING=false
# Código: if (env.ENABLE_STREAMING) { stream } else { regular }
```

---

## 🎓 MVP-3: Activity Progression + Production Ready

**Tiempo:** 6-8 horas
**Objetivo:** Sistema educativo completo con verificación automática
**Prioridad:** Robustez + Features educativas

### Features Nuevas

- ✅ Lesson content parser (navegar JSON anidado)
- ✅ Activity progression service
- ✅ Verificación automática de respuestas
- ✅ Progress tracking granular
- ✅ Rate limiting (10 msg/min, 100 msg/hour)
- ✅ Error handling robusto
- ✅ Analytics básicos
- ✅ Monitoring de costos

### Pago de Deuda Técnica

- ✅ Replace hardcoded prompts con dynamic prompt builder
- ✅ Implementar proper error boundaries
- ✅ Add comprehensive logging
- ✅ Implement proper TypeScript types para contentJson
- ✅ Add tests unitarios críticos

### Sin Sacrificios

✅ Production-ready
✅ Secure
✅ Scalable
✅ Maintainable

### Archivos a Crear/Modificar (12 archivos)

#### 1. Types y Schemas (1h)

**A. Lesson content types**
- [ ] `types/lesson.ts`

```typescript
import { z } from 'zod'

export const TeachingSchema = z.object({
  main_topic: z.string(),
  key_points: z.array(z.string()),
  approach: z.enum(['conversational', 'practical', 'theoretical'])
})

export const VerificationSchema = z.object({
  question: z.string(),
  criteria: z.array(z.string()),
  target_length: z.enum(['short', 'medium', 'long']),
  hints: z.array(z.string()).optional()
})

export const StudentQuestionsSchema = z.object({
  approach: z.enum(['answer_then_redirect', 'defer_to_later', 'incorporate_into_teaching']),
  max_tangent_responses: z.number()
})

export const GuardrailSchema = z.object({
  trigger: z.string(),
  response: z.string()
})

export const ActivitySchema = z.object({
  id: z.string(),
  type: z.enum(['explanation', 'question', 'practice']),
  teaching: TeachingSchema,
  verification: VerificationSchema,
  student_questions: StudentQuestionsSchema,
  guardrails: z.array(GuardrailSchema)
})

export const MomentSchema = z.object({
  id: z.string(),
  title: z.string(),
  activities: z.array(ActivitySchema)
})

export const ClassSchema = z.object({
  id: z.string(),
  title: z.string(),
  moments: z.array(MomentSchema)
})

export const LessonContentSchema = z.object({
  lesson: z.object({
    title: z.string(),
    description: z.string(),
    duration_minutes: z.number()
  }),
  classes: z.array(ClassSchema)
})

export type Teaching = z.infer<typeof TeachingSchema>
export type Verification = z.infer<typeof VerificationSchema>
export type StudentQuestions = z.infer<typeof StudentQuestionsSchema>
export type Guardrail = z.infer<typeof GuardrailSchema>
export type Activity = z.infer<typeof ActivitySchema>
export type Moment = z.infer<typeof MomentSchema>
export type Class = z.infer<typeof ClassSchema>
export type LessonContent = z.infer<typeof LessonContentSchema>
```

#### 2. Utilities y Services (3h)

**A. Lesson parser**
- [ ] `lib/lesson-parser.ts`

```typescript
import type { LessonContent, Activity, Class, Moment } from '@/types/lesson'
import { LessonContentSchema } from '@/types/lesson'

export function parseAndValidateLessonContent(json: unknown): LessonContent {
  return LessonContentSchema.parse(json)
}

export function getFirstActivity(content: LessonContent): {
  classId: string
  momentId: string
  activityId: string
  activity: Activity
} | null {
  const firstClass = content.classes[0]
  if (!firstClass) return null

  const firstMoment = firstClass.moments[0]
  if (!firstMoment) return null

  const firstActivity = firstMoment.activities[0]
  if (!firstActivity) return null

  return {
    classId: firstClass.id,
    momentId: firstMoment.id,
    activityId: firstActivity.id,
    activity: firstActivity
  }
}

export function getCurrentActivity(
  content: LessonContent,
  classId: string | null,
  momentId: string | null,
  activityId: string | null
): Activity | null {
  if (!classId || !momentId || !activityId) {
    return getFirstActivity(content)?.activity || null
  }

  const currentClass = content.classes.find(c => c.id === classId)
  if (!currentClass) return null

  const currentMoment = currentClass.moments.find(m => m.id === momentId)
  if (!currentMoment) return null

  const currentActivity = currentMoment.activities.find(a => a.id === activityId)
  return currentActivity || null
}

export function getNextActivity(
  content: LessonContent,
  currentClassId: string,
  currentMomentId: string,
  currentActivityId: string
): {
  classId: string
  momentId: string
  activityId: string
  activity: Activity
} | null {
  const currentClass = content.classes.find(c => c.id === currentClassId)
  if (!currentClass) return null

  const currentMoment = currentClass.moments.find(m => m.id === currentMomentId)
  if (!currentMoment) return null

  const currentActivityIndex = currentMoment.activities.findIndex(a => a.id === currentActivityId)
  if (currentActivityIndex === -1) return null

  // Next activity in same moment
  if (currentActivityIndex < currentMoment.activities.length - 1) {
    const nextActivity = currentMoment.activities[currentActivityIndex + 1]
    return {
      classId: currentClassId,
      momentId: currentMomentId,
      activityId: nextActivity.id,
      activity: nextActivity
    }
  }

  // Next moment in same class
  const currentMomentIndex = currentClass.moments.findIndex(m => m.id === currentMomentId)
  if (currentMomentIndex < currentClass.moments.length - 1) {
    const nextMoment = currentClass.moments[currentMomentIndex + 1]
    const firstActivity = nextMoment.activities[0]
    if (firstActivity) {
      return {
        classId: currentClassId,
        momentId: nextMoment.id,
        activityId: firstActivity.id,
        activity: firstActivity
      }
    }
  }

  // Next class
  const currentClassIndex = content.classes.findIndex(c => c.id === currentClassId)
  if (currentClassIndex < content.classes.length - 1) {
    const nextClass = content.classes[currentClassIndex + 1]
    const firstMoment = nextClass.moments[0]
    const firstActivity = firstMoment?.activities[0]
    if (firstActivity) {
      return {
        classId: nextClass.id,
        momentId: firstMoment.id,
        activityId: firstActivity.id,
        activity: firstActivity
      }
    }
  }

  // No more activities
  return null
}

export function calculateProgress(
  content: LessonContent,
  completedActivityIds: string[]
): number {
  const totalActivities = content.classes.reduce((total, cls) => {
    return total + cls.moments.reduce((momentTotal, moment) => {
      return momentTotal + moment.activities.length
    }, 0)
  }, 0)

  if (totalActivities === 0) return 0

  const completed = completedActivityIds.length
  return Math.round((completed / totalActivities) * 100)
}
```

**B. Prompt builder**
- [ ] `services/prompt-builder.ts`

```typescript
import type { Activity, LessonContent } from '@/types/lesson'
import type { Message } from '@prisma/client'

export function buildSystemPrompt(params: {
  lessonTitle: string
  lessonDescription: string | null
  activity: Activity
  history: Pick<Message, 'role' | 'content'>[]
}): string {
  const { lessonTitle, lessonDescription, activity, history } = params

  const historyText = history
    .slice(-5) // Last 5 messages for context
    .map(m => `${m.role === 'user' ? 'Estudiante' : 'Tú'}: ${m.content}`)
    .join('\n')

  return `Eres un instructor especializado en "${lessonTitle}".

CONTEXTO DE LA LECCIÓN:
${lessonDescription || 'Sin descripción disponible'}

ACTIVIDAD ACTUAL:
- Tipo: ${activity.type}
- Tema principal: ${activity.teaching.main_topic}
- Puntos clave a cubrir:
${activity.teaching.key_points.map(p => `  • ${p}`).join('\n')}
- Enfoque pedagógico: ${activity.teaching.approach}

OBJETIVO DE VERIFICACIÓN:
Pregunta: ${activity.verification.question}
Criterios de éxito:
${activity.verification.criteria.map(c => `  • ${c}`).join('\n')}
Longitud esperada de respuesta: ${activity.verification.target_length}

${activity.verification.hints && activity.verification.hints.length > 0 ? `
Hints disponibles (usar solo si estudiante está confundido):
${activity.verification.hints.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}
` : ''}

MANEJO DE PREGUNTAS DEL ESTUDIANTE:
- Estrategia: ${activity.student_questions.approach}
- Máximo de respuestas tangenciales: ${activity.student_questions.max_tangent_responses}

${activity.guardrails.length > 0 ? `
GUARDRAILS ACTIVOS:
${activity.guardrails.map(g => `  - Si detectas "${g.trigger}": ${g.response}`).join('\n')}
` : ''}

INSTRUCCIONES:
1. Primero, enseña el concepto principal de forma ${activity.teaching.approach}
2. Asegúrate de cubrir todos los puntos clave
3. Al finalizar tu explicación, haz la pregunta de verificación naturalmente
4. Evalúa la respuesta del estudiante según los criterios
5. Si la respuesta es correcta, confirma y procede (no necesitas decir "siguiente actividad", yo me encargaré)
6. Si es incorrecta o incompleta, usa hints progresivamente

HISTORIAL RECIENTE:
${historyText || 'Esta es la primera interacción en esta actividad'}

Responde de forma conversacional, clara y motivadora.`
}

export function buildWelcomePrompt(lessonTitle: string): string {
  return `Eres un instructor especializado en ${lessonTitle}.

Genera un mensaje de bienvenida breve y motivador para el estudiante. El mensaje debe:
- Ser breve (2-3 oraciones)
- Mencionar el título de la lección
- Invitar al estudiante a hacer preguntas
- Ser amigable y profesional

Responde solo con el mensaje de bienvenida, sin introducción adicional.`
}
```

**C. Activity progression service**
- [ ] `services/activity-progression.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import type { Activity } from '@/types/lesson'

export async function evaluateResponse(
  studentResponse: string,
  activity: Activity
): Promise<{
  passed: boolean
  score: number
  feedback: string
}> {
  const evaluationPrompt = `Eres un evaluador educativo. Evalúa si la respuesta del estudiante cumple los criterios especificados.

PREGUNTA:
${activity.verification.question}

CRITERIOS DE ÉXITO:
${activity.verification.criteria.map(c => `- ${c}`).join('\n')}

RESPUESTA DEL ESTUDIANTE:
${studentResponse}

Evalúa la respuesta y proporciona:
1. ¿Cumple los criterios? (Sí/No)
2. Puntuación de 0-100
3. Feedback breve (1-2 oraciones)

Responde en formato JSON:
{
  "passed": true/false,
  "score": 0-100,
  "feedback": "..."
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: evaluationPrompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Extract JSON from response (Claude might add markdown code blocks)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const result = JSON.parse(jsonMatch[0])
    return {
      passed: result.passed || false,
      score: result.score || 0,
      feedback: result.feedback || ''
    }
  } catch (error) {
    console.error('Error evaluating response:', error)
    // Fallback: If evaluation fails, assume it passed (better UX than blocking)
    return {
      passed: true,
      score: 75,
      feedback: 'Evaluación completada'
    }
  }
}

export async function markActivityCompleted(
  sessionId: string,
  activityId: string,
  score: number
) {
  await prisma.activityProgress.upsert({
    where: {
      sessionId_activityId: {
        sessionId,
        activityId
      }
    },
    update: {
      completed: true,
      score,
      lastAttemptAt: new Date()
    },
    create: {
      sessionId,
      activityId,
      completed: true,
      score,
      lastAttemptAt: new Date()
    }
  })
}

export async function moveToNextActivity(
  sessionId: string,
  nextClassId: string,
  nextMomentId: string,
  nextActivityId: string
) {
  await prisma.lessonSession.update({
    where: { id: sessionId },
    data: {
      classId: nextClassId,
      momentId: nextMomentId,
      activityId: nextActivityId,
      lastActivityAt: new Date()
    }
  })
}
```

#### 3. Rate Limiting (1h)

**A. Setup Upstash Redis (or in-memory fallback)**
```bash
npm install @upstash/ratelimit @upstash/redis
```

- [ ] `lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Use Upstash Redis if available, otherwise in-memory (dev only)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : undefined

class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map()

  async limit(identifier: string, config: { requests: number, window: string }) {
    const now = Date.now()
    const windowMs = this.parseWindow(config.window)

    const userRequests = this.requests.get(identifier) || []
    const recentRequests = userRequests.filter(time => now - time < windowMs)

    if (recentRequests.length >= config.requests) {
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset: new Date(Math.min(...recentRequests) + windowMs)
      }
    }

    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)

    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - recentRequests.length,
      reset: new Date(now + windowMs)
    }
  }

  private parseWindow(window: string): number {
    const value = parseInt(window)
    if (window.endsWith('s')) return value * 1000
    if (window.endsWith('m')) return value * 60 * 1000
    if (window.endsWith('h')) return value * 60 * 60 * 1000
    return value
  }
}

const inMemoryLimiter = new InMemoryRateLimiter()

export const chatRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
      analytics: true,
    })
  : {
      limit: (id: string) => inMemoryLimiter.limit(id, { requests: 10, window: '1m' })
    }

export const sessionRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 sessions per hour
      analytics: true,
    })
  : {
      limit: (id: string) => inMemoryLimiter.limit(id, { requests: 5, window: '1h' })
    }
```

#### 4. Update API Routes with full features (2h)

**A. Update session/start with activity initialization**
- [ ] `app/api/session/start/route.ts` - Modificar

```typescript
// Add after creating session:
if (!lessonSession) {
  // Parse lesson content
  const content = parseAndValidateLessonContent(lesson.contentJson)
  const firstActivity = getFirstActivity(content)

  lessonSession = await prisma.lessonSession.create({
    data: {
      userId: session.user.id,
      lessonId: lessonId,
      sessionAttempt: 1,
      classId: firstActivity?.classId,
      momentId: firstActivity?.momentId,
      activityId: firstActivity?.activityId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    },
    include: {
      messages: true
    }
  })

  // Generate welcome with proper prompt
  const welcomePrompt = buildWelcomePrompt(lesson.title)
  // ... rest of welcome message generation
}
```

**B. Update chat/stream with progression logic**
- [ ] `app/api/chat/stream/route.ts` - Modificar

```typescript
// Add at start of POST:
const rateLimitResult = await chatRateLimiter.limit(`chat:${session.user.id}`)
if (!rateLimitResult.success) {
  return new Response('Rate limit exceeded', {
    status: 429,
    headers: {
      'X-RateLimit-Limit': rateLimitResult.limit.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.reset.toISOString()
    }
  })
}

// Replace simple prompt with:
const content = parseAndValidateLessonContent(lessonSession.lesson.contentJson)
const currentActivity = getCurrentActivity(
  content,
  lessonSession.classId,
  lessonSession.momentId,
  lessonSession.activityId
)

if (!currentActivity) {
  return new Response('Invalid activity state', { status: 500 })
}

const systemPrompt = buildSystemPrompt({
  lessonTitle: lessonSession.lesson.title,
  lessonDescription: lessonSession.lesson.description,
  activity: currentActivity,
  history: lessonSession.messages
})

// After streaming completes and saving messages:
// Evaluate if response passes verification
const evaluation = await evaluateResponse(message, currentActivity)

if (evaluation.passed) {
  // Mark activity as completed
  await markActivityCompleted(
    lessonSession.id,
    currentActivity.id,
    evaluation.score
  )

  // Move to next activity
  const nextActivity = getNextActivity(
    content,
    lessonSession.classId!,
    lessonSession.momentId!,
    lessonSession.activityId!
  )

  if (nextActivity) {
    await moveToNextActivity(
      lessonSession.id,
      nextActivity.classId,
      nextActivity.momentId,
      nextActivity.activityId
    )
  } else {
    // Lesson completed!
    const progress = 100
    await prisma.lessonSession.update({
      where: { id: lessonSession.id },
      data: {
        completedAt: new Date(),
        endedAt: new Date(),
        passed: true,
        progress,
        grade: evaluation.score
      }
    })
  }

  // Update progress
  const completedActivities = await prisma.activityProgress.findMany({
    where: { sessionId: lessonSession.id, completed: true },
    select: { activityId: true }
  })
  const progress = calculateProgress(content, completedActivities.map(a => a.activityId))

  await prisma.lessonSession.update({
    where: { id: lessonSession.id },
    data: { progress }
  })
}
```

#### 5. Monitoring y Logging (1h)

**A. Logger setup**
- [ ] `lib/logger.ts`

```typescript
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    : undefined
})
```

**B. Analytics helper**
- [ ] `lib/analytics.ts`

```typescript
export function track(event: string, properties?: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics service (Vercel Analytics, PostHog, etc.)
    console.log('Analytics:', event, properties)
  }
}
```

### Criterios de Éxito MVP-3

**Testing Checklist:**

1. **Activity Progression**
   - [ ] First activity loads correctly
   - [ ] Response evaluation works
   - [ ] Activity marked completed when passed
   - [ ] Moves to next activity automatically
   - [ ] Progress % updates correctly
   - [ ] Lesson completion detected

2. **Rate Limiting**
   - [ ] 10 messages/min enforced
   - [ ] 5 sessions/hour enforced
   - [ ] 429 response with proper headers
   - [ ] Rate limit resets correctly

3. **Robustness**
   - [ ] Invalid contentJson handled gracefully
   - [ ] API timeouts handled
   - [ ] Concurrent requests don't cause race conditions
   - [ ] Error boundaries catch React errors

4. **Performance**
   - [ ] No N+1 queries
   - [ ] Proper database indexes
   - [ ] Response time < 500ms (excluding AI)

5. **Monitoring**
   - [ ] Logs are structured and searchable
   - [ ] Token usage tracked
   - [ ] Errors logged with context
   - [ ] Analytics events sent

**Production Checklist:**

- [ ] All environment variables documented
- [ ] Error messages don't leak sensitive data
- [ ] Rate limiting configured
- [ ] CORS configured correctly
- [ ] Database connections pooled
- [ ] Prisma Client optimized
- [ ] Next.js cache configured
- [ ] Vercel timeout set correctly

### Deployment MVP-3

```bash
git add .
git commit -m "feat: MVP-3 - Activity progression + Production ready"
git push origin main
```

### Post-Deployment Verification

```bash
# 1. Check API health
curl https://your-domain.com/api/session/start -X POST \
  -H "Content-Type: application/json" \
  -d '{"lessonId": "xxx"}'

# 2. Monitor logs in Vercel Dashboard
# 3. Check Upstash Redis dashboard for rate limit stats
# 4. Monitor Anthropic API usage dashboard
```

---

## 🚨 Problemas Conocidos y Soluciones

### De MVP-1

| Problema | Impacto | Solución en MVP-3 |
|----------|---------|-------------------|
| No streaming | Wait time 5-10s | ✅ Resuelto en MVP-2 |
| Hardcoded prompts | No educational features | ✅ Dynamic prompts MVP-3 |
| No rate limiting | Costos descontrolados | ✅ Upstash rate limit MVP-3 |

### De MVP-2

| Problema | Impacto | Solución en MVP-3 |
|----------|---------|-------------------|
| No progression | No avance automático | ✅ Activity service MVP-3 |
| No verification | No feedback educativo | ✅ Evaluation service MVP-3 |
| Simple prompts | Experiencia genérica | ✅ Prompt builder MVP-3 |

### Nuevos en MVP-3

| Problema | Riesgo | Mitigación |
|----------|--------|------------|
| Evaluation API calls | Costos × 2 | Cache evaluations, use Haiku |
| Complex contentJson | Parsing errors | Zod validation, graceful fallback |
| Rate limit too strict | Bad UX | Configurable limits, clear messaging |

---

## 💰 Estimación de Costos

### Claude API Pricing (Enero 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Sonnet 4.5 | $3 | $15 |
| Haiku 3.5 | $0.25 | $1.25 |

### Costos por Conversación (Estimado)

**MVP-1/2 (sin evaluation):**
- System prompt: ~1000 tokens
- User message: ~100 tokens
- Assistant response: ~300 tokens
- **Por mensaje:** ~$0.007
- **Por conversación (20 mensajes):** ~$0.14

**MVP-3 (con evaluation):**
- Chat message: ~$0.007
- Evaluation call: ~$0.004
- **Por mensaje:** ~$0.011
- **Por conversación (20 mensajes):** ~$0.22

### Proyección Mensual

| Usuarios | Conversaciones/mes | Costo estimado |
|----------|-------------------|----------------|
| 10 | 100 | $22 |
| 100 | 1,000 | $220 |
| 1,000 | 10,000 | $2,200 |

**Optimizaciones:**
- Usar Haiku para evaluations: -80% costo
- Cache system prompts: -30% input tokens
- Limit conversation history: -20% tokens

---

## 🔄 Rollback Strategy

### Feature Flags

Agregar a `.env`:
```env
ENABLE_STREAMING=true
ENABLE_ACTIVITY_PROGRESSION=true
ENABLE_RATE_LIMITING=true
ENABLE_AUTO_EVALUATION=true
```

En código:
```typescript
import { env } from '@/lib/env'

if (env.ENABLE_ACTIVITY_PROGRESSION) {
  // Progression logic
} else {
  // Simple mode
}
```

### Rollback Steps

1. **Immediate rollback (< 5 min):**
   ```bash
   # Vercel Dashboard → Deployments → Previous → Promote
   ```

2. **Partial rollback (disable features):**
   ```bash
   # Update env vars in Vercel:
   ENABLE_ACTIVITY_PROGRESSION=false
   ```

3. **Git revert (permanent):**
   ```bash
   git revert HEAD~3..HEAD  # Revert last 3 commits
   git push origin main
   ```

---

## 📊 Success Metrics

### MVP-1 Success

- [ ] 10+ test users can chat successfully
- [ ] 0 critical bugs
- [ ] < 2% error rate
- [ ] Messages saved correctly 100% of time

### MVP-2 Success

- [ ] Streaming works on 95%+ browsers
- [ ] Time to first token < 500ms
- [ ] 0 memory leaks after 1h session
- [ ] Users report "feels fast"

### MVP-3 Success

- [ ] Activity progression works 100%
- [ ] Verification accuracy > 80%
- [ ] Rate limiting prevents abuse
- [ ] Cost per conversation < $0.25
- [ ] 0 data corruption issues

---

## 🎯 Conclusión

Este plan de 3 MVPs te permite:

1. **Deploy rápido** (MVP-1 en 6-8h)
2. **Feedback temprano** (usuarios reales desde MVP-1)
3. **Riesgo controlado** (rollback fácil en cada etapa)
4. **Deuda técnica intencional** (documentada y pagada en MVP-3)

**Tiempo total realista:** 16-22 horas (3-4 días full-time para senior dev)

**Priorización:**
- MVP-1: Must-have (funcionalidad básica)
- MVP-2: Should-have (UX crítica)
- MVP-3: Must-have para producción (robustez)

¿Listo para empezar? Comienza con MVP-1 y despliega cada incremento. 🚀
