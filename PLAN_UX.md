# PLAN_UX.md - Optimistic UI con Skeleton Placeholder

**Proyecto:** Sophia Next
**Feature:** Chat Interface UX Improvements
**Objetivo:** Mejorar perceived performance de "aceptable" a "ESPECTACULAR estilo ChatGPT"
**Fecha:** 2025-11-09
**Estado:** 📋 Planificación completa - Listo para implementar

---

## 📊 Problema Actual (Análisis Preciso)

### Lo que SÍ funciona correctamente ✅

1. **Streaming implementado:** La respuesta del instructor aparece vía Server-Sent Events (SSE)
2. **Texto gradual:** El contenido va apareciendo palabra por palabra (no todo de golpe)
3. **Scroll automático:** El chat se va desplazando gradualmente conforme llega contenido
4. **Estados diferenciados:** Placeholders en input indican "pensando..." y "escribiendo..."

### El Gap de UX que queremos cerrar 🎯

**Timeline del flujo actual:**

```
t=0ms:    Usuario presiona Enter
          ↓
          [Mensaje user aparece] ✅
          ↓
t=0-1500ms: [SILENCIO VISUAL] ❌ ← Problema principal
          • No hay representación del mensaje assistant
          • Avatar instructor no aparece
          • Usuario no sabe si el sistema está procesando
          ↓
t=1500ms: [Primer chunk llega del backend]
          ↓
          [Avatar aparece + texto empieza a streamear] ✅
          ↓
t=1500-4000ms: [Texto va apareciendo gradualmente] ✅
          [Scroll va bajando suavemente] ✅
          ↓
t=4000ms: [Streaming completa]
```

**El problema:** Durante `t=0-1500ms` hay un **vacío visual** donde el usuario no tiene feedback de que su mensaje fue procesado y que viene una respuesta.

### Comparación con ChatGPT

| Aspecto | Sophia Actual | ChatGPT | Gap |
|---------|---------------|---------|-----|
| Mensaje user aparece | ✅ Inmediato | ✅ Inmediato | Ninguno |
| Placeholder assistant | ❌ No existe | ✅ Skeleton inmediato | **Crítico** |
| Primer chunk visible | ~1500ms | ~1500ms | Ninguno |
| Streaming gradual | ✅ Funciona | ✅ Funciona | Ninguno |
| Cursor parpadeante | ❌ No existe | ✅ Durante streaming | Menor |

**Conclusión:** La arquitectura de streaming es sólida. Solo falta el **feedback visual inmediato** antes del primer chunk.

---

## ✨ Solución Propuesta: Optimistic UI con Skeleton

### Concepto

**Optimistic UI:** Asumir que la operación será exitosa y mostrar el resultado esperado inmediatamente, actualizándolo cuando llegue la respuesta real.

### Flujo Mejorado

**Timeline del flujo nuevo:**

```
t=0ms:    Usuario presiona Enter
          ↓
          [Mensaje user aparece] ✅
          [Avatar instructor + skeleton aparecen] ✅ ← NUEVO
          ↓
t=0-1500ms: [Skeleton animado (pulse)] ✅ ← NUEVO
          • 3 líneas grises pulsantes
          • Avatar en estado "thinking"
          • Espacio reservado para respuesta
          ↓
t=1500ms: [Primer chunk llega del backend]
          ↓
          [Skeleton desaparece gradualmente] ✅ ← NUEVO
          [Texto real empieza a aparecer] ✅
          [Cursor parpadeante al final] ✅ ← NUEVO
          ↓
t=1500-4000ms: [Texto va apareciendo con cursor]
          [Scroll suave (sin saltos)] ✅
          ↓
t=4000ms: [Streaming completa]
          [Cursor desaparece] ✅ ← NUEVO
```

### Beneficios Clave

1. ✅ **Feedback inmediato (0ms):** Usuario ve respuesta del sistema instantáneamente
2. ✅ **Scroll sin saltos:** Espacio del mensaje ya está reservado desde t=0ms
3. ✅ **UX profesional:** Igual a ChatGPT, Claude.ai, Perplexity
4. ✅ **Perceived performance:** Sensación de velocidad aunque el backend tarde igual
5. ✅ **Estado claro:** Skeleton diferencia "esperando" vs "recibiendo" contenido

---

## 🏗️ Arquitectura de Implementación

### Cambios en la Estructura de Datos

#### Estado Actual

```typescript
// chat-interface.tsx
const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
const [streamingMessage, setStreamingMessage] = useState<string>('')
```

**Problema:** El mensaje en streaming está **separado** del array de mensajes hasta que completa.

#### Estado Nuevo (Optimistic)

```typescript
// types/chat.ts
export interface OptimisticMessage extends ChatMessage {
  status?: 'sending' | 'streaming' | 'completed' | 'error'
  isOptimistic?: boolean
}

// chat-interface.tsx
const [messages, setMessages] = useState<OptimisticMessage[]>(initialMessages)
// ❌ Eliminar: const [streamingMessage, setStreamingMessage] = useState<string>('')
```

**Ventaja:** Todo está en un solo array. Mensajes optimistic tienen flag `isOptimistic` y `status`.

### Estados de un Mensaje Optimistic

```
┌─────────────┐
│   SENDING   │ ← Mensaje user (transición instantánea a completed)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  STREAMING  │ ← Mensaje assistant optimistic (content va acumulándose)
│ content: '' │ ← Mientras content === '', mostrar skeleton
└──────┬──────┘
       │
       ├─── onChunk() ────→ content += chunk
       │
       ├─── onDone() ─────→ status = 'completed', isOptimistic = false
       │
       └─── onError() ────→ status = 'error'
```

---

## 🛠️ Implementación Técnica Detallada

### Fase 1: Extender Tipos (5 minutos)

**Archivo:** `types/chat.ts` (CREAR si no existe, o agregar a archivo existente)

```typescript
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

// ⭐ NUEVO: Extender con propiedades optimistic
export interface OptimisticMessage extends ChatMessage {
  status?: 'sending' | 'streaming' | 'completed' | 'error'
  isOptimistic?: boolean
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
```

**Testing:**
```bash
npx tsc --noEmit  # Verificar que los tipos compilan
```

---

### Fase 2: Crear Componente Skeleton (15 minutos)

**Archivo:** `components/learning/chat-message-skeleton.tsx` (CREAR)

```typescript
'use client'

import { AvatarInstructor } from '@/components/learning/avatar-instructor'

export function ChatMessageSkeleton() {
  return (
    <div className="flex flex-col gap-2 group animate-in fade-in duration-300">
      {/* Avatar + Skeleton Lines */}
      <div className="flex gap-3 items-start">
        {/* Avatar en estado "thinking" */}
        <AvatarInstructor name="Sophia" state="thinking" />

        {/* Skeleton Lines Container */}
        <div className="flex-1 max-w-[70%] space-y-2.5 mt-1">
          {/* Línea 1: Full width */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

          {/* Línea 2: 75% width */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-3/4" />

          {/* Línea 3: 50% width */}
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  )
}
```

**Diseño Visual:**

```
┌────────────────────────────────────────────┐
│ [👤]  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │ ← Línea 1 (100%)
│       ━━━━━━━━━━━━━━━━━━━━━━━━           │ ← Línea 2 (75%)
│       ━━━━━━━━━━━━━━━                     │ ← Línea 3 (50%)
└────────────────────────────────────────────┘
  ↑
  Avatar "thinking"
  Animación: pulse (opacidad 40% → 100% → 40%)
```

**Testing:**
1. Importar en Storybook (opcional)
2. Probar dark mode (clases dark:bg-gray-700)
3. Verificar animación pulse funciona

---

### Fase 3: Refactor chat-interface.tsx (30 minutos)

**Archivo:** `components/learning/chat-interface.tsx`

#### Cambio 1: Actualizar imports y tipos

```typescript
// ANTES
import { ChatMessage } from '@/types/chat'  // o donde esté definido

// DESPUÉS
import { OptimisticMessage, toOptimisticMessage } from '@/types/chat'
```

#### Cambio 2: Actualizar estado

```typescript
// ANTES
const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
const [streamingMessage, setStreamingMessage] = useState<string>('')

// DESPUÉS
const [messages, setMessages] = useState<OptimisticMessage[]>(
  initialMessages.map(toOptimisticMessage)
)
// ❌ Eliminar streamingMessage state completamente
```

#### Cambio 3: Agregar ref para contenido en streaming

```typescript
// NUEVO: Ref para acumular contenido durante streaming
const streamingContentRef = useRef<string>('')
const assistantIdRef = useRef<string>('')
```

#### Cambio 4: Modificar handleSendMessage()

```typescript
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

  // 5. Iniciar streaming
  try {
    await streamChatResponse(
      sessionId,
      content.trim(),
      // onChunk: Acumular texto en el mensaje optimistic
      (chunk: string) => {
        streamingContentRef.current += chunk

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: streamingContentRef.current }
              : m
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
        fetchProgress() // Actualizar progreso
      },
      // onError: Marcar como error
      (error: Error) => {
        console.error('❌ Error en streaming:', error)
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
      }
    )
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error)
    setIsLoading(false)
  }
}
```

**Puntos clave:**
1. ✅ Mensaje user y placeholder assistant se agregan juntos (UI instantánea)
2. ✅ Placeholder tiene `content: ''` inicialmente (trigger para skeleton)
3. ✅ onChunk actualiza el mensaje existente (no crea uno nuevo)
4. ✅ onDone marca como `completed` y quita flag `isOptimistic`
5. ✅ onError muestra mensaje de error y mantiene UX graceful

---

### Fase 4: Modificar chat-messages.tsx (15 minutos)

**Archivo:** `components/learning/chat-messages.tsx`

#### Cambio 1: Importar skeleton

```typescript
import { ChatMessageSkeleton } from './chat-message-skeleton'
import { OptimisticMessage } from '@/types/chat'
```

#### Cambio 2: Actualizar tipo de props

```typescript
// ANTES
interface ChatMessagesProps {
  messages: ChatMessage[]
  streamingMessage?: string
  isLoading?: boolean
}

// DESPUÉS
interface ChatMessagesProps {
  messages: OptimisticMessage[]  // ⭐ Cambio de tipo
  isLoading?: boolean
}
```

#### Cambio 3: Eliminar renderizado de streamingMessage separado

```typescript
// ❌ ELIMINAR TODO ESTE BLOQUE (líneas ~86-103 aproximadamente):
{streamingMessage && (
  <div className="flex flex-col gap-2">
    <div className="flex gap-3 items-center">
      <AvatarInstructor name="Sophia" state="speaking" />
      <AITextLoading texts={['Escribiendo...', 'Generando...', 'Redactando...']} />
    </div>

    <ChatMessage role="assistant" content={streamingMessage} />
  </div>
)}
```

#### Cambio 4: Renderizar mensajes con lógica optimistic

```typescript
{messages.map((message, index) => {
  const isLastMessage = index === messages.length - 1

  // ⭐ NUEVO: Detectar si es skeleton
  if (
    message.isOptimistic &&
    message.status === 'streaming' &&
    message.content === ''
  ) {
    return <ChatMessageSkeleton key={message.id} />
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
```

**Lógica:**
1. Si `isOptimistic === true` y `content === ''` → Mostrar **skeleton**
2. Si `status === 'streaming'` y `content.length > 0` → Mostrar **mensaje con cursor**
3. Si `status === 'completed'` → Mostrar **mensaje normal sin cursor**
4. Si `status === 'error'` → Mostrar **mensaje de error** (estilo diferente posible)

#### Cambio 5: Verificar auto-scroll (no cambiar, solo confirmar)

```typescript
// ✅ MANTENER SIN CAMBIOS (ya funciona correctamente)
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages]) // Solo depende de messages ahora (streamingMessage eliminado)
```

---

### Fase 5: Mejorar chat-message.tsx (10 minutos)

**Archivo:** `components/learning/chat-message.tsx`

#### Cambio 1: Agregar prop isStreaming

```typescript
interface ChatMessageProps {
  role: MessageRole
  content: string
  timestamp?: Date
  isLastMessage?: boolean
  isStreaming?: boolean  // ⭐ NUEVO
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isLastMessage,
  isStreaming = false,  // ⭐ Default false
}: ChatMessageProps) {
  // ... resto del código
}
```

#### Cambio 2: Agregar cursor parpadeante

```typescript
// Al final del contenido del mensaje (después del ReactMarkdown)
return (
  <div className={/* ... clases existentes ... */}>
    {role === 'assistant' && (
      <div className="flex gap-3 items-start">
        <AvatarInstructor name="Sophia" state={isStreaming ? 'speaking' : 'idle'} />
        <div className="flex-1">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>

            {/* ⭐ NUEVO: Cursor parpadeante durante streaming */}
            {isStreaming && (
              <span className="inline-block ml-1 w-2 h-4 bg-gray-600 dark:bg-gray-400 animate-pulse">
                ▋
              </span>
            )}
          </div>

          {timestamp && (
            <p className="text-xs text-gray-400 mt-1">{formattedTime}</p>
          )}
        </div>
      </div>
    )}

    {role === 'user' && (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-2xl px-4 py-2 max-w-[70%]">
          {content}
          {timestamp && (
            <p className="text-xs text-blue-100 mt-1">{formattedTime}</p>
          )}
        </div>
      </div>
    )}
  </div>
)
```

**Cursor parpadeante:**
- Carácter: `▋` (bloque vertical)
- Color: `bg-gray-600` (dark mode: `bg-gray-400`)
- Animación: `animate-pulse` (Tailwind built-in)
- Solo visible cuando `isStreaming === true`

---

### Fase 6: Actualizar Componente Padre (5 minutos)

**Archivo:** Donde se use `<ChatMessages />` (probablemente `chat-interface.tsx`)

#### Cambio: Remover prop streamingMessage

```typescript
// ANTES
<ChatMessages
  messages={messages}
  streamingMessage={streamingMessage}  // ❌ Eliminar
  isLoading={isLoading}
/>

// DESPUÉS
<ChatMessages
  messages={messages}
  isLoading={isLoading}
/>
```

---

## 📊 Comparación Visual Completa

### Timeline Detallada: Antes vs Después

#### ANTES (Implementación actual - streaming funcional)

```
Usuario presiona Enter
       │
       ├─ t=0ms ──────────────────────────────────────┐
       │                                               │
       │  [Mensaje user aparece]                      │ ✅
       │                                               │
       ├─ t=0-1500ms ─────────────────────────────────┤
       │                                               │
       │  [SILENCIO VISUAL]                           │ ❌
       │  • Solo placeholder en input: "pensando..."  │
       │  • No hay avatar instructor visible          │
       │  • No hay espacio reservado para respuesta   │
       │                                               │
       ├─ t=1500ms ───────────────────────────────────┤
       │                                               │
       │  [Primer chunk llega]                        │
       │  • Avatar aparece                            │ ✅
       │  • Texto empieza a aparecer                  │ ✅
       │  • Scroll empieza a bajar                    │ ✅
       │                                               │
       ├─ t=1500-4000ms ──────────────────────────────┤
       │                                               │
       │  [Streaming continúa]                        │
       │  • Texto va acumulándose                     │ ✅
       │  • Scroll gradual                            │ ✅
       │                                               │
       ├─ t=4000ms ───────────────────────────────────┤
       │                                               │
       │  [Streaming completa]                        │ ✅
       │                                               │
       └───────────────────────────────────────────────┘
```

**UX Score: 7/10** - Funcional pero con gap visual notable

---

#### DESPUÉS (Con Optimistic UI + Skeleton)

```
Usuario presiona Enter
       │
       ├─ t=0ms ──────────────────────────────────────┐
       │                                               │
       │  [Mensaje user aparece]                      │ ✅
       │  [Avatar + Skeleton aparecen]                │ ✅ ← NUEVO
       │  • 3 líneas grises pulsantes                 │
       │  • Avatar "thinking"                         │
       │  • Espacio reservado                         │
       │                                               │
       ├─ t=0-1500ms ─────────────────────────────────┤
       │                                               │
       │  [Skeleton animándose (pulse)]               │ ✅ ← NUEVO
       │  • Feedback visual constante                 │
       │  • Usuario sabe que viene respuesta          │
       │  • Scroll ya en posición correcta            │
       │                                               │
       ├─ t=1500ms ───────────────────────────────────┤
       │                                               │
       │  [Primer chunk llega]                        │
       │  • Skeleton desaparece gradualmente          │ ✅ ← NUEVO
       │  • Texto real reemplaza línea 1              │ ✅
       │  • Cursor parpadeante al final               │ ✅ ← NUEVO
       │                                               │
       ├─ t=1500-4000ms ──────────────────────────────┤
       │                                               │
       │  [Streaming continúa]                        │
       │  • Texto va acumulándose                     │ ✅
       │  • Cursor sigue al final del texto           │ ✅ ← NUEVO
       │  • Scroll suave (sin saltos)                 │ ✅
       │                                               │
       ├─ t=4000ms ───────────────────────────────────┤
       │                                               │
       │  [Streaming completa]                        │
       │  • Cursor desaparece                         │ ✅ ← NUEVO
       │  • Mensaje en estado final                   │ ✅
       │                                               │
       └───────────────────────────────────────────────┘
```

**UX Score: 10/10** - ChatGPT-level, feedback inmediato, sin gaps visuales

---

### Diferencias Clave Resaltadas

| Aspecto | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **t=0ms → t=1500ms** | Silencio visual | Skeleton animado | ⭐⭐⭐ Crítico |
| **Feedback inmediato** | Solo placeholder en input | Avatar + skeleton + espacio reservado | ⭐⭐⭐ Crítico |
| **Scroll jumping** | Posible (espacio aparece tarde) | Imposible (espacio reservado desde t=0) | ⭐⭐ Importante |
| **Perceived performance** | "Algo lento" | "Instantáneo" | ⭐⭐⭐ Crítico |
| **Estado de streaming** | Solo texto acumulado | Texto + cursor parpadeante | ⭐ Nice-to-have |
| **Profesionalidad** | "Aceptable" | "ESPECTACULAR" | ⭐⭐⭐ Objetivo principal |

---

## ✅ Checklist de Implementación

### Fase 1: Tipos ⏱️ 5 minutos

```
[ ] Crear o actualizar types/chat.ts
[ ] Definir interface OptimisticMessage extends ChatMessage
[ ] Agregar campos: status?, isOptimistic?
[ ] Crear helper toOptimisticMessage()
[ ] Ejecutar npx tsc --noEmit (sin errores)
```

---

### Fase 2: Skeleton Component ⏱️ 15 minutos

```
[ ] Crear components/learning/chat-message-skeleton.tsx
[ ] Importar AvatarInstructor
[ ] Implementar 3 líneas con animate-pulse
[ ] Configurar anchos: 100%, 75%, 50%
[ ] Agregar clases dark mode (dark:bg-gray-700)
[ ] Probar skeleton en aislamiento
[ ] Verificar animación pulse funciona
```

---

### Fase 3: Refactor chat-interface.tsx ⏱️ 30 minutos

```
[ ] Actualizar import: ChatMessage → OptimisticMessage
[ ] Cambiar tipo de estado messages
[ ] Convertir initialMessages con toOptimisticMessage()
[ ] Eliminar estado streamingMessage
[ ] Agregar refs: streamingContentRef, assistantIdRef
[ ] Modificar handleSendMessage():
    [ ] Crear userMessage con status 'completed'
    [ ] Crear assistantPlaceholder con content '' y status 'streaming'
    [ ] Agregar ambos al array messages en un solo setMessages()
    [ ] Resetear streamingContentRef
[ ] Modificar callback onChunk():
    [ ] Acumular en streamingContentRef
    [ ] Actualizar mensaje por ID con .map()
[ ] Modificar callback onDone():
    [ ] Marcar status: 'completed', isOptimistic: false
    [ ] Resetear refs
    [ ] setIsLoading(false)
[ ] Modificar callback onError():
    [ ] Marcar status: 'error'
    [ ] Agregar mensaje de error en content
    [ ] setIsLoading(false)
[ ] Ejecutar npx tsc --noEmit (sin errores)
```

---

### Fase 4: Modificar chat-messages.tsx ⏱️ 15 minutos

```
[ ] Importar ChatMessageSkeleton
[ ] Importar tipo OptimisticMessage
[ ] Actualizar interface ChatMessagesProps:
    [ ] Cambiar messages: OptimisticMessage[]
    [ ] Eliminar prop streamingMessage?
[ ] Eliminar bloque de renderizado de streamingMessage separado
[ ] Modificar .map() de messages:
    [ ] Agregar condición para skeleton:
        if (message.isOptimistic && status === 'streaming' && content === '')
    [ ] Return <ChatMessageSkeleton key={message.id} />
    [ ] Para mensajes normales, pasar isStreaming prop:
        isStreaming={message.status === 'streaming' && message.content.length > 0}
[ ] Verificar useEffect de auto-scroll solo depende de [messages]
[ ] Ejecutar npx tsc --noEmit (sin errores)
```

---

### Fase 5: Mejorar chat-message.tsx ⏱️ 10 minutos

```
[ ] Agregar prop isStreaming?: boolean a interface ChatMessageProps
[ ] Agregar default isStreaming = false en parámetros
[ ] Modificar AvatarInstructor:
    [ ] Pasar state={isStreaming ? 'speaking' : 'idle'}
[ ] Agregar cursor parpadeante después de ReactMarkdown:
    [ ] Condición: {isStreaming && <span>▋</span>}
    [ ] Clases: inline-block ml-1 w-2 h-4 bg-gray-600 animate-pulse
    [ ] Agregar dark mode: dark:bg-gray-400
[ ] Ejecutar npx tsc --noEmit (sin errores)
```

---

### Fase 6: Actualizar Referencias ⏱️ 5 minutos

```
[ ] Buscar usos de <ChatMessages /> en el proyecto
[ ] Eliminar prop streamingMessage de todas las llamadas
[ ] Verificar que solo se pase messages e isLoading
[ ] Ejecutar npx tsc --noEmit (sin errores)
[ ] Ejecutar npm run build (sin errores)
```

---

### Fase 7: Testing Completo ⏱️ 20 minutos

```
[ ] Iniciar dev server: npm run dev
[ ] Abrir chat en navegador
[ ] Probar flujo completo:
    [ ] Enviar mensaje
    [ ] Verificar mensaje user aparece inmediatamente
    [ ] Verificar skeleton aparece inmediatamente después
    [ ] Verificar skeleton tiene 3 líneas grises pulsantes
    [ ] Verificar avatar está en estado "thinking"
    [ ] Esperar primer chunk (~1-2s)
    [ ] Verificar skeleton desaparece gradualmente
    [ ] Verificar texto real aparece
    [ ] Verificar cursor parpadeante está al final
    [ ] Verificar scroll es suave (sin saltos)
    [ ] Verificar cursor desaparece cuando streaming completa
[ ] Probar casos edge:
    [ ] Enviar múltiples mensajes rápidos (rate limit)
    [ ] Simular error de red (desconectar WiFi)
    [ ] Verificar mensaje de error aparece correctamente
    [ ] Probar en dark mode
    [ ] Probar welcome message inicial
[ ] Verificar en console no hay errores
[ ] Verificar en Prisma Studio mensajes se guardan correctamente
```

---

## 📈 Métricas de Éxito

### KPIs Medibles

| Métrica | Antes | Después | Target |
|---------|-------|---------|--------|
| **Tiempo hasta primer feedback visual** | ~1500ms | **0ms** | ✅ 0ms |
| **Scroll jumping events** | 1-2 por mensaje | **0** | ✅ 0 |
| **Perceived performance (subjetivo)** | 6/10 | **10/10** | ✅ 10/10 |
| **Paridad con ChatGPT** | 70% | **95%+** | ✅ 95%+ |

### Criterios de Aceptación

**La implementación está completa cuando:**

1. ✅ Al enviar mensaje, skeleton aparece **instantáneamente** (< 50ms)
2. ✅ Skeleton tiene animación pulse visible
3. ✅ Primer chunk reemplaza skeleton sin saltos visuales
4. ✅ Cursor parpadeante está presente durante todo el streaming
5. ✅ Cursor desaparece al completar streaming
6. ✅ Scroll es 100% suave (ningún salto brusco)
7. ✅ Funciona correctamente en dark mode
8. ✅ Manejo de errores es graceful
9. ✅ No hay console errors
10. ✅ npx tsc --noEmit y npm run build pasan sin errores

---

## 🚀 Post-Implementación

### Testing en Dispositivos

**Probar en:**
- [ ] Desktop Chrome (principal)
- [ ] Desktop Safari
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Verificar:**
- Animación pulse funciona correctamente
- Scroll suave en todos los dispositivos
- Cursor parpadeante visible

---

### Optimizaciones Futuras (Opcional)

**Si hay tiempo extra, considerar:**

1. **Memoización de mensajes:**
   ```typescript
   const MemoizedChatMessage = React.memo(ChatMessage, (prev, next) => {
     return prev.content === next.content && prev.isStreaming === next.isStreaming
   })
   ```

2. **Skeleton más inteligente:**
   - Ajustar número de líneas según promedio de respuestas previas
   - Animar width de líneas para simular "escritura"

3. **Transición más smooth:**
   - Fade-in del texto real mientras fade-out del skeleton
   - Uso de Framer Motion para transiciones

4. **Typing indicator adicional:**
   - Agregar dots animados "●●●" debajo del skeleton
   - Similar a WhatsApp/Telegram

**Nota:** Estas optimizaciones NO son parte del MVP. Solo implementar si el equipo considera que agrega valor significativo.

---

## 📚 Referencias Técnicas

### Documentación Relevante

- [Next.js Server-Sent Events](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming)
- [Tailwind CSS Animation](https://tailwindcss.com/docs/animation)
- [React useRef Hook](https://react.dev/reference/react/useRef)
- [Optimistic UI Pattern](https://www.patterns.dev/posts/optimistic-ui)

### Archivos del Proyecto Relacionados

- `app/api/chat/stream/route.ts` - Backend streaming (no modificar)
- `components/learning/avatar-instructor.tsx` - Estados del avatar
- `lib/chat-stream.ts` - Utilidades de streaming
- `CLAUDE.md` - Arquitectura del proyecto
- `FLOWS.md` - Diagramas de flujos

---

## 🎯 Resumen Ejecutivo

**Objetivo:** Transformar la UX del chat de "aceptable" a "ESPECTACULAR estilo ChatGPT"

**Solución:** Implementar Optimistic UI con skeleton placeholder para eliminar el gap visual de 1-2s antes del primer chunk de streaming.

**Impacto:**
- ⏱️ Feedback visual: de ~1500ms a **0ms**
- 📊 UX Score: de 7/10 a **10/10**
- 🎨 Profesionalidad: paridad con ChatGPT/Claude.ai

**Esfuerzo:** ~90 minutos | 6 archivos modificados | Riesgo bajo

**Estado:** ✅ Listo para implementar

---

**Última actualización:** 2025-11-09
**Autor:** Claude (Planning Mode)
**Aprobado por:** [Pendiente]
