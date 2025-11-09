# CLAUDE.md – AI-Native Project Guide

**Proyecto:** Sophia Next
**Arquitectura:** AI-Native Education Platform
**Fecha:** 2025-11-05
**Puerto:** 4000

---

## 📋 Quick Reference

### 🔗 Navegación Rápida

- [🏗️ Architecture](#️-architecture) - Stack, estructura, rutas, modelos
- [📊 FLOWS.md](./FLOWS.md) - Diagramas Mermaid de procesos clave
- [🔌 API Endpoints](#-api-endpoints-reference) - Documentación completa de endpoints
- [🚦 MVPs & Technical Debt](#-mvps--technical-debt) - Filosofía de desarrollo incremental
- [🛠️ Workflow Modes](#️-workflow-modes) - Plan, Edit, Docs Update, FLOWS.md Protocol
- [🔐 Authentication & Auth Flow](#-authentication--auth-flow) - NextAuth v5 + OAuth
- [🎨 Styling & UI](#-styling--ui-components) - TailwindCSS + shadcn/ui
- [🧭 Naming & Commits](#-naming--commit-conventions) - Convenciones de código y commits
- [🚀 Deployment](#-deployment--environment) - Vercel + Neon setup
- [📖 Learnings](#-learnings--architectural-decisions) - Decisiones clave y aprendizajes
- [🛑 Troubleshooting](#-troubleshooting--qa) - FAQ de errores comunes
- [📋 Task Templates](#-phase-1-foundation-completed) - Guías de implementación por fase

### ⚡ Comandos Más Usados

```bash
npm run dev              # Servidor de desarrollo (puerto 4000)
npm run build            # Build de producción (pre-push)
npx tsc --noEmit         # Verificar tipos (pre-push)
npx prisma generate      # Generar Prisma Client
npx prisma db push       # Sincronizar schema con DB
npx prisma studio        # GUI de base de datos
npm run db:seed          # Poblar base de datos
```

### 🚨 Checklist Pre-Push Obligatorio

```
[ ] npx tsc --noEmit (sin errores)
[ ] npm run build (sin errores)
[ ] npm run lint (sin errores)
[ ] Probado en navegador (funciona)
[ ] Console.log() de debugging eliminados
[ ] Git add + commit con mensaje descriptivo
```

---

## 🏗️ Architecture

### Stack Tecnológico

```
Frontend:    Next.js 16.0.1 (App Router) + React 19 + TypeScript + TailwindCSS 4
Backend:     Next.js API Routes
Database:    PostgreSQL (Neon) + Prisma ORM 6.18.0
Auth:        NextAuth v5 beta.30 (JWT strategy)
AI:          Anthropic Claude API
UI:          shadcn/ui + Framer Motion
Deployment:  Vercel
Dev Server:  Puerto 4000 + Turbopack
```

**Arquitectura AI-Native:**
- **Server Components** por defecto para performance
- **Streaming** de respuestas de IA
- **JSON estructurado** para contenido educativo flexible
- **Type-safe** con TypeScript + Zod

---

### Project Structure

```
sophia_next/
├── auth.ts                        # ⭐ NextAuth v5 config (RAÍZ)
├── proxy.ts                       # ⭐ Next.js 16 proxy para proteger rutas
├── prisma/
│   ├── schema.prisma             # Schema con 6 modelos
│   └── seed.ts                   # Seed con 2 usuarios + 1 lección
│
├── app/
│   ├── layout.tsx                # Root layout con AuthProvider
│   ├── page.tsx                  # Landing page
│   ├── (public)/login/page.tsx   # Login page
│   ├── (protected)/
│   │   ├── lessons/page.tsx      # Lessons list
│   │   └── learn/[id]/page.tsx   # Chat interface (Fase 2)
│   └── api/
│       ├── auth/[...nextauth]/route.ts  # NextAuth handlers
│       └── chat/stream/route.ts         # AI streaming (Fase 2)
│
├── components/
│   ├── auth/
│   │   └── auth-provider.tsx     # SessionProvider wrapper
│   ├── lessons/
│   │   └── lesson-card.tsx       # Card sin thumbnail
│   ├── learning/                 # Chat components (Fase 2)
│   ├── navbar.tsx                # Navbar para rutas protegidas
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   ├── prisma.ts                 # ⭐ Singleton de Prisma Client
│   └── chat-stream.ts            # Stream utilities (Fase 2)
│
├── .env                          # Variables de entorno (NO commitear)
├── .env.example                  # Template
└── package.json                  # Puerto 4000 en scripts
```

**✅ Limpieza:** El archivo duplicado `lib/auth.ts` fue eliminado. Solo existe `auth.ts` en la raíz.

---

### Routing & Protection

#### Árbol de Rutas `/app`:

```
app/
├── page.tsx                      # Landing page (pública)
├── layout.tsx                    # Root layout con AuthProvider
├── globals.css                   # Estilos globales
│
├── (public)/                     # 🌐 Rutas públicas (sin auth)
│   └── login/
│       └── page.tsx              # Login (Google OAuth + Test User)
│
├── (protected)/                  # 🔒 Rutas protegidas (requieren auth)
│   ├── layout.tsx                # Layout con Navbar
│   ├── lessons/
│   │   ├── page.tsx              # Lista de lecciones
│   │   └── loading.tsx           # Loading state
│   └── learn/
│       └── [id]/
│           └── page.tsx          # Chat con IA (Fase 2)
│
└── api/
    ├── auth/[...nextauth]/route.ts  # NextAuth v5 handlers
    └── chat/stream/route.ts         # AI streaming (Fase 2)
```

#### Clasificación de Rutas:

| Tipo | Ruta | Descripción | Auth Requerida |
|------|------|-------------|----------------|
| 🌐 Pública | `/` | Landing page | ❌ No |
| 🌐 Pública | `/login` | Página de login | ❌ No |
| 🔒 Protegida | `/lessons` | Lista de lecciones | ✅ Sí |
| 🔒 Protegida | `/learn/[id]` | Chat con IA | ✅ Sí |

**✅ Protección de Rutas:** El proyecto usa `proxy.ts` (Next.js 16) con estrategia de **protección por defecto**. Todas las rutas requieren autenticación EXCEPTO las definidas en `PUBLIC_PATHS` (`/` y `/login`). Nuevas rutas en `app/(protected)/` son protegidas automáticamente.

**Archivo: `proxy.ts`** (raíz del proyecto)

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lista de rutas públicas que NO requieren autenticación
const PUBLIC_PATHS = ['/', '/login']

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  // Si NO es ruta pública y NO hay sesión → Redirect a login
  if (!isPublicPath && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si intenta ir a /login pero ya está autenticado → Redirect a /lessons
  if (pathname === '/login' && session) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
    return NextResponse.redirect(
      new URL(callbackUrl || '/lessons', request.url)
    )
  }

  return NextResponse.next()
}
```

**Ventajas:**
- ✅ Escalable: Nuevas rutas quedan protegidas sin modificar código
- ✅ Seguro: Default es "protegido", no "público"
- ✅ Mantenible: Solo agregas a `PUBLIC_PATHS` lo que debe ser público

---

### Models & Database

**6 Modelos Prisma (sin thumbnail):**

1. **User** - Autenticación + estudiantes
2. **Account** - OAuth de Google
3. **Lesson** - Contenido educativo (sin campo thumbnail)
4. **LessonSession** - Sesión de aprendizaje + enrollment
5. **ActivityProgress** - Progreso por actividad
6. **Message** - Historial conversacional

**Puntos clave:**
- `binaryTargets = ["native", "debian-openssl-3.0.x"]` para Vercel
- Campos `Json` para `contentJson`, `images`, `evidenceData`
- Relaciones con `onDelete: Cascade`
- Índices `@@index` para queries comunes

**Ver schema completo:** `prisma/schema.prisma`

---

## 🔌 API Endpoints Reference

**Total endpoints activos:** 8 (7 producción + 1 dev-only)

### 📊 Quick Reference Table

| Endpoint | Método | Auth | Descripción | Usado por |
|----------|--------|------|-------------|-----------|
| `/api/auth/[...nextauth]` | GET/POST | - | NextAuth v5 handlers | SessionProvider |
| `/api/session/start` | POST | ✅ | Crear/obtener sesión de lección | lesson-card.tsx |
| `/api/chat/welcome` | POST | ✅ | Mensaje bienvenida (streaming) | chat-interface.tsx |
| `/api/chat/stream` | POST | ✅ | Chat con IA (streaming + auto-verification) | chat-interface.tsx |
| `/api/session/[id]/messages` | GET | ✅ | Historial de mensajes | chat-interface.tsx |
| `/api/activity/progress` | GET | ✅ | Progreso de actividad actual | activity-progress-header.tsx |
| `/api/activity/complete` | POST | ✅ | Marcar actividad completada (utility) | Fallback |
| `/api/dev/reset-lesson` | POST | ✅🔒 | Reiniciar sesión (DEV ONLY) | dev-tools-modal.tsx |

**Convenciones:**
- ✅ = Requiere autenticación
- 🔒 = Bloqueado en producción
- Streaming = Server-Sent Events (SSE)

---

### Endpoint Details

#### 1. NextAuth Handlers
**Ruta:** `/api/auth/[...nextauth]`
**Archivo:** `app/api/auth/[...nextauth]/route.ts`

- **Métodos:** GET, POST
- **Response:** JWT tokens y session data (manejo interno NextAuth)
- **Uso:** Maneja flujo completo de autenticación (Google OAuth + Test User)
- **Config:** Importa desde `/auth.ts` raíz

---

#### 2. Start Lesson Session
**Ruta:** `POST /api/session/start`
**Archivo:** `app/api/session/start/route.ts`

**Request:**
```json
{ "lessonId": "string" }
```

**Response:**
```json
{
  "sessionId": "uuid",
  "lesson": {
    "title": "string",
    "estimatedMinutes": number
  }
}
```

**Lógica:**
1. Valida usuario existe en DB
2. Verifica lección está publicada
3. Busca sesión activa existente (reutiliza si hay)
4. Crea nueva si no existe

**Errores:** 401 Unauthorized, 403 User not found, 404 Lesson not found

**Usado por:** `components/lessons/lesson-card.tsx:34` - Click en "Comenzar Lección"

---

#### 3. Chat Welcome Message
**Ruta:** `POST /api/chat/welcome`
**Archivo:** `app/api/chat/welcome/route.ts`

**Request:**
```json
{ "sessionId": "string" }
```

**Response:** **Streaming text/plain** - Mensaje de bienvenida generado por Claude

**Headers:**
```
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
```

**Modelo IA:** `claude-sonnet-4-5-20250929` (max 200 tokens)

**Lógica:**
1. Valida sesión activa
2. Obtiene datos de lección
3. Genera prompt de bienvenida personalizado
4. Streamea respuesta en tiempo real
5. Guarda a DB con idempotencia (no duplica)

**Usado por:** `components/learning/chat-interface.tsx:63` - Al cargar `/learn/[id]`

---

#### 4. Chat Streaming (Production)
**Ruta:** `POST /api/chat/stream`
**Archivo:** `app/api/chat/stream/route.ts`

**Request:**
```json
{
  "sessionId": "string",
  "message": "string"
}
```

**Response:** **Streaming SSE** con eventos:
```json
{ "type": "content", "text": "string" }
{ "type": "done" }
{ "type": "error", "message": "string" }
```

**Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Modelo IA:** `claude-3-5-haiku-20241022` (max 768 tokens)

**Features avanzadas (MVP-2+):**
- ✅ Rate limiting (10 mensajes/minuto por usuario)
- ✅ Prompt dinámico (lesson parser + activity context)
- ✅ Verificación automática de actividad completada
- ✅ Auto-progresión a siguiente actividad
- ✅ Hints condicionales según intentos
- ✅ Tracking granular en ActivityProgress

**Lógica completa:**
1. Rate limit check (429 si excede)
2. Validación de sesión
3. Parse `contentJson` de lección
4. Determina actividad actual del estudiante
5. Construye system prompt dinámico con contexto
6. Streamea respuesta de Claude
7. Guarda ambos mensajes en DB
8. Verifica si estudiante completó actividad
9. Auto-avanza a siguiente actividad si es necesario
10. Marca lección como completada si es última actividad

**Errores:** 401 Unauthorized, 404 Session not found, 429 Rate limit exceeded, 500 Internal error

**Usado por:** `components/learning/chat-interface.tsx` - Envío de mensajes del usuario

---

#### 5. Get Session Messages
**Ruta:** `GET /api/session/[id]/messages`
**Archivo:** `app/api/session/[id]/messages/route.ts`

**Params:** `[id]` - sessionId (dinámico)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "role": "user|assistant",
      "content": "string",
      "timestamp": "ISO-8601",
      "inputTokens": number,
      "outputTokens": number
    }
  ],
  "lesson": {
    "title": "string",
    "estimatedMinutes": number
  }
}
```

**Lógica:**
1. Valida sesión pertenece al usuario autenticado
2. Ordena mensajes por timestamp ascendente (más antiguos primero)

**Usado por:** `components/learning/chat-interface.tsx` - Carga historial al entrar a chat

---

#### 6. Activity Progress
**Ruta:** `GET /api/activity/progress?sessionId=xxx`
**Archivo:** `app/api/activity/progress/route.ts`

**Query params:** `sessionId` (requerido)

**Response:**
```json
{
  "sessionId": "uuid",
  "lessonTitle": "string",
  "currentActivity": "string",
  "currentActivityId": "string",
  "progress": number,
  "total": number,
  "percentage": number,
  "lastCompleted": ActivityProgress|null,
  "completedAt": "ISO-8601"|null,
  "passed": boolean|null
}
```

**Lógica:**
1. Valida sesión
2. Parse `contentJson` de lección
3. Calcula total de actividades
4. Cuenta completadas
5. Obtiene actividad actual
6. Calcula porcentaje
7. Retorna con detalles de última completada

**Usado por:** `components/learning/activity-progress-header.tsx` - Barra de progreso en tiempo real

---

#### 7. Complete Activity (Utility)
**Ruta:** `POST /api/activity/complete`
**Archivo:** `app/api/activity/complete/route.ts`

**Request:**
```json
{
  "sessionId": "string",
  "activityId": "string"
}
```

**Response:**
```json
{
  "success": boolean,
  "activityCompleted": "string",
  "nextActivity": {
    "id": "string",
    "title": "string",
    "type": "string",
    "isLast": boolean
  }|null,
  "progress": {
    "totalCompleted": number,
    "totalActivities": number,
    "percentage": number
  }
}
```

**Lógica:**
1. Valida sesión activa
2. Verifica actividad no está ya completada
3. Parse `contentJson` para obtener siguiente actividad
4. Crea registro en `ActivityProgress`
5. Calcula progreso general

**Nota:** Endpoint es **utility/fallback**. MVP-2+ usa verificación automática en `/api/chat/stream`.

---

#### 8. Dev Reset Lesson
**Ruta:** `POST /api/dev/reset-lesson`
**Archivo:** `app/api/dev/reset-lesson/route.ts`

**🔒 Solo disponible en `NODE_ENV === 'development'`** (403 en producción)

**Request:**
```json
{ "sessionId": "string" }
```

**Response:**
```json
{
  "success": true,
  "message": "Sesión reiniciada correctamente",
  "redirect": "/lessons"
}
```

**Lógica:**
1. Bloquea si no es development
2. Valida sesión pertenece al usuario
3. **Elimina completamente la sesión**
4. Cascade delete automático: mensajes + actividades

**Usado por:** `components/learning/dev-tools-modal.tsx:36` - Testing y debugging

---

### 🔄 Flujo Típico de Usuario

```
1. Login
   ↓
   /api/auth/[...nextauth]
   ↓
2. Ver lecciones (Server Component - sin API)
   ↓
3. Click en lección
   ↓
   POST /api/session/start → Crea sesión
   ↓
4. Entrar a /learn/[sessionId]
   ↓
   POST /api/chat/welcome → Streaming bienvenida
   ↓
5. Usuario envía mensaje
   ↓
   POST /api/chat/stream → Streaming + auto-verification
   ├─ Streamea respuesta
   ├─ Guarda mensajes
   ├─ Verifica completación
   ├─ Auto-avanza actividad
   └─ Marca lección completada (si última)
   ↓
6. Monitor progreso
   ↓
   GET /api/activity/progress → Estado actual
```

---

### 📋 Checklist para Crear Nuevo Endpoint

**Cuando agregues un nuevo endpoint, sigue estos pasos:**

1. **Crear archivo:** `app/api/[ruta]/route.ts`
2. **Agregar autenticación:**
   ```typescript
   const session = await auth()
   if (!session?.user?.id) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```
3. **Definir runtime y timeout:**
   ```typescript
   export const runtime = 'nodejs'
   export const maxDuration = 60 // 60s para operaciones largas, 10s por defecto
   ```
4. **Documentar en esta sección:**
   - Agregar fila a Quick Reference Table
   - Crear subsección con detalles completos
   - Incluir request/response JSON examples
   - Especificar lógica y errores posibles
   - Agregar referencia a componente que lo usa
5. **Actualizar flujo de usuario** si afecta experiencia principal

**Ejemplo de nueva entrada:**

```markdown
#### X. Nombre del Endpoint
**Ruta:** `METHOD /api/ruta`
**Archivo:** `app/api/ruta/route.ts`

**Request:**
\```json
{ "campo": "tipo" }
\```

**Response:**
\```json
{ "resultado": "tipo" }
\```

**Lógica:**
1. Paso 1
2. Paso 2

**Errores:** 401, 404, etc.

**Usado por:** `component.tsx:linea` - Descripción
```

---

## 🚦 MVPs & Technical Debt

### Principio: Deploy Early, Deploy Often

El proyecto Sophia sigue un enfoque de **MVPs incrementales desplegables**. Cada fase se divide en múltiples MVPs donde cada uno:

1. ✅ Es testeable end-to-end
2. ✅ Es desplegable a producción
3. ✅ Agrega valor real al usuario
4. ✅ Tiene rollback plan claro

### Sacrificios Estratégicos

**Concepto clave:** Es aceptable sacrificar elegancia por velocidad en MVPs tempranos, SIEMPRE que:

- ✅ El sacrificio esté documentado
- ✅ Haya un plan claro para pagarlo
- ✅ No comprometa seguridad
- ✅ No acumule más de 1 MVP de deuda técnica

**Ejemplos de sacrificios aceptables:**

```typescript
// ❌ MVP-1: Hardcoded pero funcional
const systemPrompt = `Eres un instructor de ${lesson.title}. Responde preguntas del estudiante.`

// ✅ MVP-3: Complejo pero correcto
const systemPrompt = buildSystemPrompt({
  lesson,
  activity: getCurrentActivity(contentJson),
  history: last10Messages,
  guardrails: activeGuardrails
})
```

```typescript
// ❌ MVP-1: Response completa (usuario espera 5s)
const response = await fetch('/api/chat', { method: 'POST', ... })
const { message } = await response.json()

// ✅ MVP-2: Streaming (usuario ve texto aparecer)
const stream = await fetch('/api/chat/stream', { method: 'POST', ... })
for await (const chunk of stream) { /* show chunk */ }
```

### Reglas de Deuda Técnica

1. **Documentar siempre:**
   ```typescript
   // TODO: MVP-3 - Replace with dynamic prompt builder
   // Current: Hardcoded simple prompt
   // Reason: Ship fast, iterate later
   const prompt = `Simple hardcoded prompt...`
   ```

2. **Pagar en siguiente MVP:**
   - MVP-1 genera deuda → MVP-2 paga
   - MVP-2 genera deuda → MVP-3 paga
   - NO acumular deuda más de 1 MVP

3. **Nunca sacrificar:**
   - ❌ Seguridad (auth, encryption, input validation)
   - ❌ Data integrity (transactions, constraints)
   - ❌ User data (privacy, GDPR compliance)

### Ciclo de MVP

```
┌─────────────────────────────────────────────────┐
│ MVP-N Planning (2h)                             │
│ - Definir features mínimas                     │
│ - Identificar sacrificios aceptables           │
│ - Escribir criterios de éxito                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-N Implementation (6-8h)                     │
│ - Build features core                          │
│ - Hardcode lo no-crítico                       │
│ - Test end-to-end                              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-N Deployment (30min)                        │
│ - Deploy to staging                            │
│ - Quick smoke tests                            │
│ - Deploy to production                         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-N Validation (2-4h)                         │
│ - Gather user feedback                         │
│ - Monitor errors/performance                   │
│ - Identify what to improve                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-(N+1) Planning                              │
│ - Pagar deuda técnica de MVP-N                 │
│ - Agregar features nuevas                      │
│ - Repetir ciclo                                │
└─────────────────────────────────────────────────┘
```

### Ejemplo Real: Fase 2 Chat

**MVP-1: Chat Básico (6-8h)**
- ✅ Crear sesión de lección
- ✅ Chat con respuesta completa (sin streaming)
- ✅ Historial persiste
- ❌ Prompt hardcoded (sacrificio: no personalización)
- **Desplegable:** ✅ Usuario puede chatear
- **Deuda:** Streaming + dynamic prompts

**MVP-2: Streaming + UX (4-6h)**
- ✅ SSE streaming
- ✅ Typing indicator
- ✅ Auto-scroll inteligente
- ✅ Pago de deuda: Streaming implementado
- ❌ Prompt aún hardcoded (acceptable short-term)
- **Desplegable:** ✅ UX como ChatGPT
- **Deuda:** Dynamic prompts + progression

**MVP-3: Production Ready (6-8h)**
- ✅ Dynamic prompt builder
- ✅ Activity progression automática
- ✅ Verificación de respuestas con IA
- ✅ Rate limiting (10 msg/min)
- ✅ Pago de TODA la deuda técnica
- **Desplegable:** ✅ Production-ready completo
- **Deuda:** Zero (listo para Fase 3)

### Criterios de MVP Exitoso

**Antes de marcar MVP como completo:**

1. ✅ **Funcionalidad core works 100%**
   - Todos los happy paths funcionan
   - No crashes en casos comunes
   - Datos se guardan correctamente

2. ✅ **Es desplegable sin breaking production**
   - Tiene feature flags si necesario
   - Rollback plan documentado
   - No depende de features no desplegadas

3. ✅ **Agrega valor real**
   - Usuario puede completar flujo específico
   - Mejora UX o agrega feature tangible
   - No es "work in progress" visible

4. ✅ **Deuda técnica documentada**
   - TODOs con contexto
   - Plan claro para pagar en siguiente MVP
   - No compromete seguridad/integridad

### Cuando NO usar MVPs

❌ **No usar enfoque MVP para:**
1. Security features (implement correctly first time)
2. Data migrations (must be bulletproof)
3. Payment processing (no room for "good enough")
4. Legal/compliance features (must be complete)

✅ **Usar enfoque MVP para:**
1. UI/UX improvements
2. New features
3. Performance optimizations
4. Developer experience

### Feature Flags para Control

```typescript
// lib/env.ts
export const featureFlags = {
  enableStreaming: process.env.ENABLE_STREAMING === 'true',
  enableActivityProgression: process.env.ENABLE_ACTIVITY_PROGRESSION === 'true',
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
}

// Uso en código:
if (featureFlags.enableStreaming) {
  return streamResponse(...)
} else {
  return fullResponse(...) // MVP-1 fallback
}
```

**Ventajas:**
- ✅ Toggle features sin redeploy
- ✅ Rollback inmediato si hay problemas
- ✅ A/B testing fácil
- ✅ Gradual rollout a usuarios

---

## 🛠️ Workflow Modes

### 📋 Plan Mode Protocol

**Cuándo usar:**
- Antes de implementar una nueva feature
- Al explorar el codebase
- Para investigar problemas complejos
- Cuando hay múltiples enfoques posibles

**Pasos:**

1. **Investigación con Task Tool:**
   - Usar Task tool con `subagent_type="Plan"`
   - Explorar archivos relevantes
   - Buscar patrones existentes
   - Identificar dependencias

2. **Leer archivos existentes:**
   - Usar Read tool para ver implementación actual
   - Buscar con Glob/Grep para encontrar referencias
   - No asumir estructura, verificar siempre

3. **Presentar plan completo:**
   - Usar ExitPlanMode con plan detallado
   - Incluir archivos a crear/modificar
   - Explicar decisiones de diseño
   - Mencionar trade-offs

4. **Esperar aprobación:**
   - NO hacer cambios hasta que usuario apruebe
   - Responder preguntas de clarificación
   - Ajustar plan según feedback

**Ejemplo:**
```
Usuario: "Implementa sistema de chat con IA"
Claude: [Usa Task tool Plan para explorar]
Claude: [Presenta plan con ExitPlanMode]
Usuario: [Aprueba o ajusta]
Claude: [Comienza implementación]
```

---

### ✏️ Edit Mode Protocol

**Cuándo usar:**
- Durante implementación activa
- Después de plan aprobado
- Para fixes rápidos
- Al completar tareas del TODOS.md

**Pasos:**

1. **Actualizar TODOS.md en tiempo real:**
   - Usar TodoWrite al iniciar tarea
   - Marcar como "in_progress" ANTES de empezar
   - Actualizar al completar (no batch)
   - Agregar nuevas tareas descubiertas

2. **⚠️ IMPORTANTE - Flujo de Commits:**
   ```
   ❌ NO hacer git add/commit automáticamente
   ❌ NO asumir que el usuario quiere commitear inmediatamente

   ✅ Implementar los cambios completos
   ✅ Informar al usuario qué se implementó
   ✅ ESPERAR confirmación del usuario antes de commit
   ✅ Usuario probará la implementación primero

   Solo cuando el usuario diga "haz el commit" o "commitea":
   - git add -A
   - git commit con mensaje descriptivo
   - Usar formato: "feat:", "fix:", "refactor:", etc.
   ```

3. **🚨 CRÍTICO - Prevenir Errores de TypeScript en Producción:**

   **PROBLEMA:** TypeScript en producción (Vercel build) es MÁS ESTRICTO que en desarrollo local.

   **SOLUCIÓN OBLIGATORIA antes de CADA push/deploy:**

   ```bash
   # 1. SIEMPRE verificar tipos antes de push
   npx tsc --noEmit

   # 2. SIEMPRE hacer build de producción antes de push
   npm run build

   # 3. Verificar linting
   npm run lint
   ```

   **Estrategia para componentes con Prisma:**

   ```typescript
   // ❌ MAL: TypeScript no puede inferir el tipo en .map()
   const lessons = await prisma.lesson.findMany({
     select: { id: true, title: true }
   })
   lessons.map((lesson) => <Card lesson={lesson} />)  // Error: implicit 'any'

   // ✅ BIEN: Tipo explícito con cast
   type LessonWithDetails = {
     id: string
     title: string
     // ... todos los campos del select
   }

   const lessons = await prisma.lesson.findMany({
     select: { id: true, title: true }
   }) as LessonWithDetails[]

   lessons.map((lesson) => <Card lesson={lesson} />)  // ✅ Tipo inferido correctamente
   ```

   **Reglas:**
   - ✅ SIEMPRE agregar type annotation explícito cuando uses Prisma select con .map()
   - ✅ SIEMPRE ejecutar `npm run build` antes de push/deploy
   - ✅ SIEMPRE ejecutar `npx tsc --noEmit` antes de push/deploy
   - ❌ NUNCA confiar solo en `npm run dev` (dev mode es más permisivo)
   - ❌ NUNCA pushear sin verificar build local primero

4. **Probar funcionalidad:**
   - Probar en navegador antes de marcar completo
   - Verificar en Prisma Studio (cambios de DB)
   - Revisar console para errores
   - Confirmar rutas funcionan

5. **Marcar como completado:**
   - Solo marcar "completed" cuando FUNCIONA
   - Si hay errores, mantener "in_progress"
   - Crear nueva tarea si se descubre bloqueador

---

### 📝 Docs Update Protocol

**Cuándo actualizar cada archivo:**

**TODOS.md** (actualizar en TIEMPO REAL):
- ✅ Progreso de tareas actuales
- ✅ Bugs descubiertos
- ✅ Decisiones temporales
- ✅ Estado del MVP actual

**CLAUDE.md** (actualizar AL COMPLETAR FASE/MVP):
- ✅ Nuevos aprendizajes arquitecturales
- ✅ Errores comunes + soluciones permanentes
- ✅ Cambios en stack o estructura
- ✅ Decisiones que afectan futuros MVPs

**Regla de oro:** Si es temporal → TODOS.md | Si es permanente → CLAUDE.md

---

### 📊 FLOWS.md Protocol

**Archivo:** `/FLOWS.md` contiene diagramas Mermaid de procesos clave del sistema.

**Cuándo Actualizar FLOWS.md:**

**OBLIGATORIO actualizar cuando:**
- ✅ Cambios en flujo de navegación de actividades
- ✅ Modificaciones en proceso de verificación
- ✅ Cambios en inicialización de sesiones
- ✅ Alteraciones en estructura de datos (schema de Lesson o contentJson)
- ✅ Nuevos procesos core agregados al sistema
- ✅ Cambios en APIs que afecten flujos existentes

**NO es necesario actualizar por:**
- ❌ Cambios solo en UI/styling
- ❌ Refactors que no cambian lógica de flujo
- ❌ Agregado de logs o comentarios
- ❌ Fixes de bugs menores sin cambio de flujo
- ❌ Optimizaciones de performance que no cambien secuencia

**Cómo Actualizar FLOWS.md:**

1. **Identificar proceso afectado** (ej: Activity Progression Flow)
2. **Actualizar diagrama Mermaid** con los cambios específicos
3. **Agregar entrada al Changelog** del flujo con fecha y descripción
4. **Commitear junto con código** en el mismo commit

**Formato de Changelog por Flujo:**

Cada diagrama en FLOWS.md debe tener un changelog al final:

```markdown
**Changelog:**
- 2025-11-07: Fixed bug - usar getNextActivity en lugar de getCurrentActivity
- 2025-11-05: Initial version
```

**5 Flujos Actuales en FLOWS.md:**
1. **Lesson Structure** - Jerarquía de datos (Lesson → Classes → Moments → Activities)
2. **Session Initialization** - Inicio de lección y welcome message
3. **Activity Progression Flow** - Navegación entre actividades y verificación
4. **Message Flow** - Chat + streaming + guardado
5. **Progress Tracking** - Polling y actualización de UI

**Responsabilidades:**
- **Claude:** Detectar cuando un cambio afecta un flujo y proponer actualización
- **Developer:** Revisar diagrama actualizado y aprobar antes de commit
- **Ambos:** Mantener FLOWS.md sincronizado con implementación real

**Ejemplo de actualización:**
```
Cambio: Fix bug en activity progression (getCurrentActivity → getNextActivity)
Flujo afectado: #3 Activity Progression Flow
Acción: Actualizar nodo "GetNext" en el diagrama + agregar a changelog
Commit: "fix: corregir navegación de actividades + actualizar FLOWS.md"
```

---

### 🚨 Error Handling Protocol

**Cuando encuentres errores:**

1. **Identificar categoría:**
   - Error de tipos (TypeScript)
   - Error de build (Next.js)
   - Error de runtime (console/logs)
   - Error de DB (Prisma)
   - Error de auth (NextAuth)

2. **Buscar en aprendizajes:**
   - Revisar sección "🛑 Troubleshooting / Q&A" abajo
   - Verificar variables de entorno
   - Confirmar estructura de archivos

3. **Debuggear sistemáticamente:**
   ```bash
   npm run dev          # Ver logs completos
   npx prisma studio    # Ver estado de DB
   npx tsc --noEmit     # Verificar tipos
   echo $AUTH_SECRET    # Ver variables de entorno
   ```

4. **Documentar solución:**
   - Si encuentras nuevo error, agregarlo a TODOS.md
   - Anotar en comentarios la solución
   - Actualizar sección Troubleshooting si es recurrente

---

### 🚀 Release Protocol (Pre-Commit)

**Objetivo:** Garantizar calidad del código antes de commitear. Este protocolo es OBLIGATORIO antes de cada commit.

**Cuándo ejecutar:**
- Usuario solicita "haz el commit" o "commitea"
- Antes de cualquier push a repositorio
- Después de completar una feature/fix

**Pasos obligatorios:**

**1. Análisis exhaustivo de cambios:**
```bash
git status            # Ver todos los archivos modificados
git diff              # Ver diff de todos los cambios
git diff --cached     # Revisar archivos staged
```

**2. Limpieza de código:**
```
✅ Verificar y eliminar:
- console.log() de debugging
- console.warn() temporales
- console.error() redundantes
- Comentarios //TODO temporales
- Comentarios de debugging
- Código comentado no usado
- Imports no utilizados

⚠️ MANTENER (no eliminar):
- Logs de seguridad (⚠️  warnings importantes)
- Logs de auditoría (❌ errores críticos)
- Comments de documentación
- Comments de tipo // @ts-ignore con justificación
- TODOs con contexto de MVP futuro
```

**3. Verificación de calidad:**
```bash
npx tsc --noEmit   # Paso 1: Verificar tipos TypeScript
npm run build      # Paso 2: Build de producción
npm run lint       # Paso 3: Linting

# Todos deben pasar sin errores ✅
```

**4. Análisis de archivos modificados:**
```
Para cada archivo en git status:

✅ Verificar:
- Cambios intencionales y relevantes
- Sin cambios accidentales (whitespace, formatting)
- Sin credenciales hardcodeadas
- Sin variables de entorno expuestas
- Sin datos sensibles

❌ Excluir de commit:
- Archivos de configuración local (.env)
- Archivos temporales (*.log, *.tmp)
- Archivos de IDE (.vscode/settings.json personal)
- node_modules o archivos de build
```

**5. Generar mensaje de commit:**
```
Formato: <type>: <description>

Types:
- feat: Nueva funcionalidad
- fix: Corrección de bug
- refactor: Refactorización sin cambio funcional
- perf: Mejora de performance
- style: Cambios de formato (no afectan código)
- docs: Solo documentación
- test: Agregar o modificar tests
- chore: Mantenimiento (deps, config, etc)

Reglas del mensaje:
- Presente imperativo: "add" no "added"
- Primera letra minúscula
- Sin punto final
- Máximo 72 caracteres en primera línea
- Describir QUÉ y POR QUÉ, no CÓMO
```

**6. Crear commit:**
```bash
git add <files>                    # Stage cambios relevantes
git commit -m "type: description"  # Commit con mensaje
git log -1 --stat                  # Verificar commit
```

**Checklist pre-commit:**
```
[ ] git status ejecutado y analizado
[ ] git diff revisado línea por línea
[ ] console.log() de debugging eliminados
[ ] Comentarios temporales limpiados
[ ] npx tsc --noEmit pasa sin errores
[ ] npm run build pasa sin errores
[ ] npm run lint pasa sin errores
[ ] Funcionalidad probada en navegador
[ ] Mensaje de commit descriptivo y claro
[ ] Solo archivos relevantes en stage
```

---

## 🔐 Authentication & Auth Flow

### Flow Diagram

```
┌─────────────┐
│   /login    │
└──────┬──────┘
       │
       ├─── Google OAuth ────────┐
       │    - auth.ts jwt()      │
       │    - Crea User + Account│
       │                         │
       └─── Test User ──────────┐│
            - ID: "1000"        ││
            - Dev only          ││
                                ││
       ┌────────────────────────┘│
       │ NextAuth Session        │
       └──────┬──────────────────┘
              │
       ┌──────▼──────┐
       │  /lessons   │
       │  (protected)│
       └─────────────┘
```

### ⚠️ NextAuth v5 - Cambios Clave

**NextAuth v5 (beta) tiene una arquitectura diferente a v4:**

1. **Archivo de configuración en RAÍZ:** `auth.ts` (no en `lib/auth.ts`)
2. **Variable de entorno:** `AUTH_SECRET` (no `NEXTAUTH_SECRET`)
3. **NEXTAUTH_URL es OPCIONAL:** NextAuth v5 detecta la URL automáticamente
4. **NO usar PrismaAdapter con CredentialsProvider** en JWT strategy

### Configuración

**Archivo: `auth.ts` (RAÍZ)**

```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    }),
    CredentialsProvider({
      id: 'test-user',
      name: 'Test User',
      credentials: {},
      async authorize() {
        // 🔒 Bloquear en producción
        if (process.env.NODE_ENV !== 'development') {
          console.warn('⚠️  Test user login attempt blocked in production')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { id: '1000' },
        })
        if (user) {
          return {
            id: user.id,
            email: user.email!,
            name: user.name,
            image: user.image,
          }
        }
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Al hacer login con Google, guardar usuario manualmente
      if (user && account?.provider === 'google') {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
          },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
            emailVerified: new Date(),
          },
        })

        // Guardar Account
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
          },
          create: {
            userId: dbUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            // ... otros campos
          },
        })

        token.sub = dbUser.id
        return token  // ⭐ Early return previene sobrescritura
      }

      // Solo se ejecuta para CredentialsProvider
      if (user) {
        token.sub = user.id
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
```

**⚠️ Por qué NO usar PrismaAdapter:**
- `PrismaAdapter` NO es compatible con `CredentialsProvider` en JWT strategy
- Solución: Manejo manual de usuarios en el callback `jwt` para Google OAuth
- CredentialsProvider funciona sin adapter

### Variables de Entorno

**Archivo: `.env`** (NO commitear)

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech/sophia?sslmode=require"

# NextAuth v5
# Generate with: openssl rand -base64 32
AUTH_SECRET="tu-secret-generado-con-openssl"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnop"
```

**Generar AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Quick Troubleshooting

| Error | Solución |
|-------|----------|
| `no matching decryption secret` | Falta `AUTH_SECRET` en `.env` |
| `ClientFetchError` | Google credentials incorrectos |
| `redirect_uri_mismatch` | URL callback mal configurada en Google Cloud Console |
| Test User funciona en prod | Falta validación `process.env.NODE_ENV !== 'development'` |

---

## 🎨 Styling & UI Components

**Framework:** TailwindCSS 4 + shadcn/ui

**Theme:** Default shadcn (extends in `globals.css`)

**Components:**
```bash
npx shadcn@latest add <component>
```

**Custom:** Framer Motion para animaciones (login page, chat UI)

### Reglas

- ❌ NO instalar librerías adicionales (ej: Material-UI, Chakra)
- ✅ Usar shadcn/ui components como base
- ✅ Extender con Tailwind utilities si necesario
- ✅ Usar `className` para estilos inline cuando sea simple
- ✅ Crear archivos CSS module solo para componentes complejos

### Convenciones

```typescript
// ✅ BIEN: Usar shadcn components
import { Button } from '@/components/ui/button'
<Button variant="outline">Click me</Button>

// ✅ BIEN: Extender con Tailwind
<Button className="bg-purple-600 hover:bg-purple-700">Custom</Button>

// ❌ MAL: Instalar biblioteca nueva sin justificación
import { Button } from '@mui/material'  // ❌ No hacer esto
```

---

## 🧭 Naming & Commit Conventions

### Commits

**Formato:** `<type>: <description>`

**Types:**
- `feat:` Nueva funcionalidad
- `fix:` Bug fix
- `refactor:` Sin cambio funcional
- `perf:` Performance improvement
- `docs:` Solo documentación
- `test:` Tests
- `chore:` Dependencias, config

**Reglas del mensaje:**
- Presente imperativo: "add" no "added"
- Primera letra minúscula
- Sin punto final
- Máximo 72 caracteres en primera línea

**Ejemplos:**
```
✅ feat: add chat interface with AI streaming
✅ fix: resolve hydration error in chat timestamps
✅ refactor: extract auth logic to separate module
❌ feat: Added new chat (mal: pasado, capitalizado)
❌ fix: fixed bug (mal: no descriptivo)
```

### Files & Folders

**Convenciones:**
- `components/` - React components (kebab-case)
- `app/` - Next.js routes (kebab-case)
- `lib/` - Utilities (kebab-case)
- Types: PascalCase (`UserProfile.ts`)
- Components: PascalCase filename, export default (`ChatInterface.tsx`)

**Ejemplos:**
```
components/
├── chat-interface.tsx       # ✅ kebab-case
├── lesson-card.tsx          # ✅ kebab-case
└── ui/
    ├── button.tsx           # ✅ kebab-case (shadcn convention)
    └── card.tsx

lib/
├── prisma.ts                # ✅ kebab-case
├── chat-stream.ts           # ✅ kebab-case
└── types/
    └── UserProfile.ts       # ✅ PascalCase para types
```

---

## 🚀 Deployment & Environment

### Vercel Setup

1. **Conectar repo a Vercel:**
   - Ir a [vercel.com](https://vercel.com)
   - Import Git Repository
   - Seleccionar `sophia_next`

2. **Settings → Environment Variables:**
   ```env
   DATABASE_URL=postgresql://...
   AUTH_SECRET=<generate-new-with-openssl>
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

3. **Deploy settings:**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Install Command: `npm install && npx prisma generate`
   - Output Directory: (default)

4. **Redeploy después de agregar env vars**

### Neon Database Setup

1. **Crear proyecto:**
   - Ir a [neon.tech](https://neon.tech)
   - Create New Project
   - Nombre: `sophia-db`

2. **Copiar connection string:**
   - Dashboard → Connection Details
   - Copiar "Connection string"
   - Agregar a `.env` local y Vercel env vars

3. **Aplicar schema:**
   ```bash
   npx prisma db push
   ```

4. **Seed data (opcional en prod):**
   ```bash
   npm run db:seed
   ```

### Post-Deploy Checklist

```
[ ] Verificar: https://[tu-app].vercel.app
[ ] Login con Google OAuth funciona
[ ] Test User NO funciona en producción (seguridad)
[ ] /lessons muestra lecciones correctamente
[ ] Prisma Studio conecta a DB de Neon
[ ] No hay errores en Vercel logs
[ ] Variables de entorno configuradas
```

### Google OAuth - Authorized Redirect URIs

Agregar en [Google Cloud Console](https://console.cloud.google.com):

```
# Development
http://localhost:4000/api/auth/callback/google

# Production
https://[tu-dominio].vercel.app/api/auth/callback/google
```

---

## 📖 Learnings & Architectural Decisions

### NextAuth v5 - Bug Crítico JWT token.sub

**Problema:**
En NextAuth v5 con JWT strategy + Google OAuth, el callback `jwt` sobrescribe `token.sub` con el ID de Google en lugar del ID de la base de datos.

**Causa raíz:**
```typescript
// ❌ BUG: Dos if statements consecutivos
async jwt({ token, user, account }) {
  if (user && account?.provider === 'google') {
    const dbUser = await prisma.user.upsert({ ... })
    token.sub = dbUser.id  // ✅ Correcto: DB ID
  }

  if (user) {
    token.sub = user.id  // ❌ SOBRESCRIBE con Google ID
  }

  return token
}
```

**Solución:**
```typescript
// ✅ FIX: Early return después de Google OAuth
async jwt({ token, user, account }) {
  if (user && account?.provider === 'google') {
    const dbUser = await prisma.user.upsert({ ... })
    token.sub = dbUser.id
    return token  // ⭐ Early return previene sobrescritura
  }

  // Solo se ejecuta para CredentialsProvider
  if (user) {
    token.sub = user.id
  }

  return token
}
```

**Aprendizaje clave:**
- El objeto `user` en el callback `jwt` proviene del **provider** (Google), no de tu base de datos
- Cuando usas OAuth + JWT strategy, DEBES hacer early return después de guardar en DB
- El segundo `if (user)` solo debe ejecutarse para CredentialsProvider

**Referencias:** [auth.ts:92-93](auth.ts#L92-L93)

---

### React 19 - Errores de Hidratación SSR

**Problema:**
```
Hydration failed because the server rendered text didn't match the client
```

**Causa:**
`Date.prototype.toLocaleTimeString()` sin locale explícito genera diferentes formatos en servidor vs cliente:

```typescript
// ❌ PROBLEMA
{timestamp.toLocaleTimeString()}
// Servidor (OS): "3:18:10 PM"
// Cliente (Browser): "3:18:10 p.m."
// → Mismatch → Hydration error
```

**Solución:**
```typescript
// ✅ FIX: Locale explícito y consistente
const formattedTime = timestamp
  ? new Date(timestamp).toLocaleTimeString('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  : ''

{formattedTime}
// Servidor: "3:18 p. m."
// Cliente: "3:18 p. m."
// → Match perfecto ✅
```

**Aprendizaje clave:**
- SIEMPRE especificar locale en funciones de formato de fecha/hora para SSR
- Pre-computar valores antes del render para evitar diferencias server/client
- Usar locale del proyecto (`es-PE` para Peru según proyecto)

**Referencias:** [chat-message.tsx:14-20](components/learning/chat-message.tsx#L14-L20)

---

### Seguridad - Test User en Producción

**Problema:**
CredentialsProvider con user de testing (`test-user`) disponible en producción es un riesgo de seguridad.

**Solución: Doble validación (Backend + Frontend)**

**1. Backend - Bloqueo en `authorize()`:**
```typescript
CredentialsProvider({
  id: 'test-user',
  async authorize() {
    // 🔒 Bloquear en producción
    if (process.env.NODE_ENV !== 'development') {
      console.warn('⚠️  Test user login attempt blocked in production')
      return null
    }
    // ... resto del código solo en development
  }
})
```

**2. Frontend - Ocultar UI:**
```typescript
export default function LoginPage() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <>
      <Button onClick={handleGoogleSignIn}>Google</Button>

      {/* Solo mostrar en development */}
      {isDevelopment && (
        <Button onClick={handleTestUserSignIn}>
          🧪 Test User
        </Button>
      )}
    </>
  )
}
```

**Aprendizaje clave:**
- Doble validación (backend + frontend) para máxima seguridad
- Backend previene requests directos a API
- Frontend mejora UX ocultando opciones no disponibles
- El provider puede existir en ambos ambientes, solo cambia su comportamiento

**Ventajas de este enfoque:**
- ✅ No rompe NextAuth (providers no se pueden agregar dinámicamente)
- ✅ No requiere archivos de configuración duplicados
- ✅ Más simple de mantener
- ✅ Auditable con logs

**Referencias:**
- [auth.ts:17-21](auth.ts#L17-L21) - Validación backend
- [login/page.tsx:74-102](app/(public)/login/page.tsx#L74-L102) - Conditional rendering

---

### Decisión Arquitectural: /learn/ vs /lesson/

**Pregunta:** ¿`/learn/{sessionId}` o `/lesson/{sessionId}`?

**Respuesta: `/learn/` es mejor** ✅

**Razones:**

1. **Semántica del verbo:**
   - `/learn/` = **acción en progreso** → "estoy aprendiendo"
   - `/lesson/` = **sustantivo estático** → "ver información"

2. **Mapeo mental:**
   - Usuario hace click → "voy a aprender" (activo)
   - `/learn/` transmite experiencia interactiva
   - `/lesson/` suena read-only

3. **Consistencia industria:**
   - Duolingo: `/learn`
   - Khan Academy: `/learn/`
   - Coursera: `/learn/course-name`

4. **Estructura REST:**
   ```
   /lessons              → Lista (sustantivo plural)
   /lessons/{id}         → Detalles (sustantivo singular)
   /learn/{sessionId}    → Experiencia activa (verbo)
   ```

**Aprendizaje clave:**
- Usar **verbos** para experiencias interactivas (`/learn`, `/practice`, `/play`)
- Usar **sustantivos** para recursos estáticos (`/lessons`, `/courses`, `/users`)
- Consultar convenciones de plataformas similares

---

## 🛑 Troubleshooting / Q&A

### Auth Errors

**Q:** `"no matching decryption secret"`
**A:** Genera `AUTH_SECRET` con `openssl rand -base64 32` y agrégalo a `.env`

**Q:** Google OAuth redirect error
**A:** Verifica callback URL en Google Cloud Console: `http://localhost:4000/api/auth/callback/google`

**Q:** Test User funciona en producción
**A:** Agregar validación `if (process.env.NODE_ENV !== 'development') return null` en `authorize()`

**Q:** `ClientFetchError` en login
**A:** Verifica que `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` estén en `.env`

---

### Prisma Errors

**Q:** `Cannot find module '@prisma/client'`
**A:** Ejecuta `npx prisma generate`

**Q:** Schema out of sync con DB
**A:** Ejecuta `npx prisma db push`

**Q:** `PrismaClient is unable to run in this browser environment`
**A:** Estás importando Prisma en un Client Component. Mueve la query a Server Component o API Route.

**Q:** `Invalid prisma.X.Y() invocation`
**A:** Verifica que el schema esté sincronizado con DB con `npx prisma db push`

---

### Build Errors

**Q:** Hydration mismatch con `Date.toLocaleTimeString()`
**A:** Especificar locale: `.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true })`

**Q:** TypeScript error `implicit 'any'` en `.map()` con Prisma
**A:** Agregar type annotation explícito: `const lessons = await prisma.lesson.findMany(...) as LessonWithDetails[]`

**Q:** Build falla en Vercel pero funciona localmente
**A:** Ejecutar `npm run build` localmente antes de push. Vercel build es más estricto.

**Q:** `Module not found: Can't resolve '@/...'`
**A:** Verifica que `tsconfig.json` tenga `"paths": { "@/*": ["./*"] }` y reinicia TypeScript server.

---

### Runtime Errors

**Q:** Session es `null` después de login exitoso
**A:** Verifica callback `session` en `auth.ts` que agregue `user.id` de `token.sub`

**Q:** Chat no funciona, `sessionId` es undefined
**A:** Verifica que estés pasando `params.id` correctamente en `/learn/[id]/page.tsx`

**Q:** Streaming no muestra texto gradualmente
**A:** Verifica que estés usando `ReadableStream` y `TextEncoder` correctamente en API route

---

### Development Workflow

**Q:** ¿Cuándo usar Plan Mode vs Edit Mode?
**A:** Plan Mode para investigar antes de implementar. Edit Mode una vez que el plan está aprobado.

**Q:** ¿Cuándo commitear?
**A:** Solo cuando el usuario lo solicita explícitamente. Nunca asumir que quiere commitear inmediatamente.

**Q:** ¿Actualizar CLAUDE.md o TODOS.md?
**A:** TODOS.md en tiempo real (progreso). CLAUDE.md al completar MVP/fase (aprendizajes permanentes).

---

## 📋 Phase 1: Foundation (COMPLETED)

Esta fase establece la fundación del proyecto. Al completarla tendrás:

1. ✅ **Modelo de datos completo** implementado en Prisma (6 tablas, sin thumbnail)
2. ✅ **2 usuarios de prueba** poblados (test@instructoria.dev + user-test)
3. ✅ **Autenticación** con Google OAuth + Test User funcionando
4. ✅ **Vista pública `/lessons`** mostrando lecciones disponibles
5. ✅ **Build exitoso** sin errores

**Duración real:** 2-3 horas
**Estado:** ✅ 100% completa y desplegada

**Ver detalles completos:** `CLAUDE.md.backup` (secciones TAREA 1-4)

---

## 📋 Phase 2: AI Chat System (IN PROGRESS)

**Ver documento completo:** [`PLAN_FASE2_CHAT.md`](./PLAN_FASE2_CHAT.md)

**Enfoque:** 3 MVPs incrementales desplegables

**MVP-1: Chat Básico (6-8h)** ✅ COMPLETADO
- Crear sesión de lección
- Chat con respuesta completa (sin streaming)
- Historial persiste
- Prompt simple hardcoded

**MVP-2: Streaming + UX (4-6h)** 🚧 EN PROGRESO
- SSE streaming
- Typing indicator
- Auto-scroll inteligente
- Optimistic updates

**MVP-3: Production Ready (6-8h)** ⏳ PENDIENTE
- Lesson content parser
- Activity progression automática
- Verificación de respuestas con IA
- Rate limiting (10 msg/min)
- Monitoring y logging

**Tiempo total:** 16-22 horas (realista)

---

## 📋 Phase 3-4: Future Phases

### 🔮 Fase 3: Verificación y Progreso (FUTURO)

- Dashboard de progreso del estudiante
- Tracking granular por actividad
- Analytics avanzados
- Métricas de aprendizaje

### 🔮 Fase 4: Features Avanzadas (FUTURO)

- Reintentos de lecciones (sessionAttempt)
- Sistema de imágenes educativas
- Resúmenes automáticos de sesiones
- Gamification y achievements

---

## 📚 Technical Notes

### NextAuth v5

- ✅ **Configuración en raíz** - `auth.ts` en root del proyecto
- ✅ **JWT Strategy por defecto** - No necesita tabla Session
- ✅ **Manejo manual** en lugar de PrismaAdapter para compatibilidad con CredentialsProvider
- ✅ **Session callback** agrega `user.id` al objeto session
- ⚠️ **Beta** - Usa `next-auth@beta` en npm

### Prisma

- ✅ **Singleton pattern** en `lib/prisma.ts` evita múltiples instancias
- ✅ **JSON fields** para `contentJson` permiten estructura flexible
- ✅ **Cascade deletes** limpian datos relacionados automáticamente
- ⚠️ **db push vs migrate** - Usa `db push` en desarrollo, `migrate` en producción

### Next.js 16 + Turbopack

- ✅ **Server Components** por defecto - Fetch directo de Prisma sin API route
- ✅ **Client Components** solo cuando necesitas interactividad (mark con `'use client'`)
- ✅ **Puerto 4000** - Configurado en `package.json`
- ✅ **Turbopack** - Builds más rápidos en desarrollo
- ✅ **proxy.ts** - Reemplaza middleware.ts en Next.js 16, runtime nodejs
- ⚠️ **No usar `useEffect` para fetch** - Usa server components

### TypeScript

- ✅ **Prisma genera tipos** automáticamente con `npx prisma generate`
- ✅ **Select específico** en queries para mejor performance y type safety
- ✅ **Type annotations explícitos** cuando uses Prisma select con `.map()`

### Performance

- ✅ **Index en campos frecuentes** (`userId`, `lessonId`, etc.)
- ✅ **Select solo campos necesarios** en queries de Prisma
- ✅ **Suspense boundaries** para loading states
- ✅ **Streaming responses** para AI (Fase 2)

---

**Última actualización:** 2025-11-05
**Estado:** Fase 1 completada | Fase 2 MVP-1 completado, MVP-2 en progreso
