# CLAUDE.md – AI-Native Project Guide

**Proyecto:** Sophia Next
**Arquitectura:** AI-Native Education Platform
**Fecha:** 2025-11-05
**Puerto:** 3000

---

## 📋 Quick Reference

### 🔗 Navegación Rápida

- [🏗️ Architecture](#️-architecture) - Stack, estructura, rutas, modelos
- [📊 FLOWS.md](./FLOWS.md) - Diagramas Mermaid de procesos clave
- [🔌 API Endpoints](#-api-endpoints-reference) - Documentación completa de endpoints
- [🚦 MVPs & Technical Debt](#-mvps--technical-debt) - Filosofía de desarrollo incremental
- [🛠️ Workflow Modes](#️-workflow-modes) - Plan, Edit, Docs Update, FLOWS.md Protocol
- [🔐 Authentication & Auth Flow](#-authentication--auth-flow) - NextAuth v5 + OAuth
- [🤖 AI Prompts](#-ai-prompts) - AI Prompt Guides
- [🎨 Styling & UI](#-styling--ui-components) - TailwindCSS + shadcn/ui
- [🧭 Naming & Commits](#-naming--commit-conventions) - Convenciones de código y commits
- [🚀 Deployment](#-deployment--environment) - Vercel + Neon setup
- [📖 Learnings](#-learnings--architectural-decisions) - Decisiones clave y aprendizajes
- [🛑 Troubleshooting](#-troubleshooting--qa) - FAQ de errores comunes
- [📋 Task Templates](#-phase-1-foundation-completed) - Guías de implementación por fase

### ⚡ Comandos Más Usados

```bash
npm run dev              # Servidor de desarrollo (puerto 3000)
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
Dev Server:  Puerto 3000 + Turbopack
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
└── package.json                  # Puerto 3000 en scripts
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

**Total endpoints documentados:** 12 (11 producción + 1 dev-only)

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
| `/api/planner/course/[courseId]/images` | GET/POST | ✅ | Banco de imágenes del curso: listar con usos, registrar, adoptar (`{adopt:true}`) | image-bank.tsx, material/image-tools.tsx |
| `/api/planner/course/[courseId]/images/[imageId]` | PATCH/DELETE | ✅ | Editar o validar (se copia a las lecciones); borrar si ninguna la usa | image-bank.tsx, material/block-form.tsx |
| `/api/dashboard/[courseId]` | GET | ✅ | Monitor por curso: filas por sesión con estado derivado de la ventana, pendientes de llamar, embudo | dashboard/[courseId]/page.tsx |
| `/api/seguimiento/[userId]` | GET/POST | ✅ | Seguimiento manual del alumno (no responde / justificado / desertó / retomó) con historial | monitor/seguimiento-form.tsx |
| `/api/dashboard/[courseId]/bloque` | POST | ✅ | El instructor termina o reabre el bloque de Sophia de una sección y sesión (`closedAt` en el horario) | monitor/terminar-bloque.tsx |
| `/api/dashboard/[courseId]/clase/redaccion` | POST | ✅ | Redacción con IA de «cómo abordar» lo que el reporte de la sesión eligió reforzar | monitor/redaccion-ia.tsx |

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

#### 9. Banco de imágenes del curso
**Rutas:** `app/api/planner/course/[courseId]/images/route.ts` y `.../images/[imageId]/route.ts`
**Acceso:** rol INSTRUCTOR o más y `cursoEditable()` (`lib/planner/course-access.ts`): dueño, SUPERADMIN o ADMIN de la carrera.

- `GET` → `{ images: [{ ...CourseImage, usos: [{ lessonId, title }] }] }`
- `POST { url, description?, kind?, source?, license?, tags? }` → registra una imagen ya subida (`/api/upload/image`). Si la url ya está en el curso, devuelve la existente. `POST { adopt: true }` → `{ adopted }`: trae al banco las imágenes que las lecciones ya usan y enlaza sus bloques.
- `PATCH { description?, kind?, source?, license?, tags?, validated? }` → `{ image, leccionesActualizadas, aviso }`. Validar exige descripción, licencia real y fuente (400 con el motivo). El cambio se copia a los bloques con ese `bankId` en todas las lecciones del curso.
- `DELETE` → 409 si alguna lección la usa.

**Errores:** 401, 403, 404, 409. **Spec:** `investigacion/panel-de-apoyo-especificacion.md` §9.3.

---

#### 10. Monitor por curso
**Ruta:** `GET /api/dashboard/[courseId]?sectionId=`
**Archivo:** `app/api/dashboard/[courseId]/route.ts` · tipos en `types/monitor.ts` · reglas puras en `lib/monitor.ts`
**Acceso:** rol INSTRUCTOR o más; alcance por sección (`lib/alcance.ts`), igual que la matriz y la ficha. 403 si ninguna sección del curso está al alcance.

- `filas[]`: una por alumno y lección (la sesión representativa), con `estado` activa · en-pausa · sin-terminar · terminada, `avance` a-medias / sin-avanzar, intentos con aviso a uno del tope, `porLimite` y la marca de seguimiento.
- `pendientes[]`: alumnos con sesiones cerradas sin terminar o sin abrir («no entró») y sin marca de seguimiento posterior al evento.
- `funnels[]`: por lección; el cuello de botella se mide sobre los que llegaron a la actividad y «por límite» no cuenta como superada.
- `bloquesAbiertos[]`: cada ventana abierta, con `esperados` y `noEntraron` (matriculados de la sección sin sesión desde la apertura, sin «desertó»; `noEntraronAlBloque` en `lib/monitor.ts`). La pantalla en vivo los muestra en la franja «Aún no entran».
- La pantalla en vivo muestra solo las filas del bloque abierto, por sección y lección (`filasDelBloqueAbierto`, 27 oct 2026): al terminar el horario o cerrarlo el instructor, la tabla se vacía y lo de esa sesión queda en la matriz y el reporte. Antes seguían las filas «a medias» de la sesión de ayer.
- No escribe nada. La pantalla lo consulta solo con la pestaña a la vista (`hooks/use-sondeo.ts`).

---

#### 11. Seguimiento manual del alumno
**Ruta:** `GET | POST /api/seguimiento/[userId]`
**Archivo:** `app/api/seguimiento/[userId]/route.ts` · modelo `SeguimientoAlumno` · helpers en `lib/seguimiento.ts`

**Request (POST):** `{ estado: SIN_NOVEDAD|NO_RESPONDE|JUSTIFICADO|DESERTO|RETOMO, motivo?: HORARIO|CONEXION|NO_ENTENDIO|PERSONAL, courseId?: string, nota?: string }`. `JUSTIFICADO` exige motivo. **Response:** `{ marca }`. **GET:** `{ historial: Marca[] }`, la vigente primero.

**Reglas:** la marca es del alumno, no del curso. `DESERTO` lo saca de los conteos de todos sus cursos y lo manda al final de la matriz. La autoría es la cuenta real aunque el superadmin esté «viendo como» otra persona. **Errores:** 400, 401, 403 (alumno fuera del alcance), 404.

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

## 🤖 AI Prompts

**Reglas para escribir prompts**

- Siempre debes escribir prompts agnósticos de tema/clase/especialidad.
- NUNCA escribir en Prompt algo como "volvamos al tema de HTML"
- SI deben ser dinámicos con información de la lesson en curso.

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
http://localhost:3000/api/auth/callback/google

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

### Verificador desfasado de la conversación (5 oct 2026)

**Problema:** con un alumno simulado se vio que el verificador aprobaba actividades que nunca se plantearon. Tres causas en el código, no en las lecciones:
1. El verificador recibía los últimos 20 mensajes de la sesión entera y acumulaba respuestas de actividades anteriores. La actividad de rúbrica de EVA-NOTA «se cumplió» con el cálculo (mal hecho) de la actividad previa.
2. La bienvenida hacía una pregunta genérica («¿has visto algún caso…?») y la respuesta se verificaba contra los criterios de la actividad 1. Ese era el embudo de la primera actividad en todas las lecciones (S1 real: 246 de 422 respuestas de ≤5 palabras).
3. El puntero de actividad avanzaba aunque Sophia siguiera pidiendo algo de la anterior; el código forzaba el avance a los 5 intentos mientras el prompt le decía a Sophia que avanzara al 3.º.

**Solución:**
- El verificador solo ve los mensajes archivados bajo la actividad actual (`verifierHistory` en `app/api/chat/stream/route.ts`).
- La bienvenida plantea la actividad 1 (`app/api/chat/welcome/route.ts`); si una lección vieja tiene bienvenida genérica, la primera respuesta es «turno de conexión» y no se verifica. Si la bienvenida sí planteó la pregunta, la respuesta a la bienvenida entra al historial de la actividad (`bienvenidaPlanteaEsta`, 21 oct 2026): antes se excluía siempre, y un «listo» posterior se verificaba sin la respuesta original.
- Si el verificador aprueba pero Sophia no planteó la pregunta siguiente, el avance se retiene una vez (`advance_held_back`); el tope de intentos es el mismo en código y prompt (`max_attempts || 3`).
- Cada criterio cubierto exige una cita literal del alumno (`evidence` en `lib/activity-verification.ts`); sin cita, pasa a «falta».
- Un criterio eliminatorio sin cubrir frena el avance hasta agotar intentos. En explicación y práctica, un criterio que pide la razón (`RAZON_RE`) cuenta como eliminatorio.
- (12 oct 2026) Un eliminatorio se cumple también si el alumno APLICA la regla, aunque lo diga repartido en varios mensajes: la evidencia puede ser una lista de citas, una por parte, y cada una debe estar en lo que escribió. Sophia nunca agradece ni se despide antes de la última actividad: si la actividad sigue abierta y su mensaje no termina en pregunta, el código agrega la pendiente (`terminaEnPregunta` en la ruta); si el verificador aprobó y ella cerró sin preguntar, se avanza enseguida con la pregunta siguiente, sin retener.
- **Una actividad = un pedido (13 oct 2026).** La pregunta de una actividad pide UNA cosa que se responde en un mensaje: una decisión con su porqué, una predicción, un diagnóstico. Con dos tareas («¿qué criterio subirías? Y reescribe…»), el desglose se gasta en la primera, el tope avanza la actividad y la segunda se pierde o Sophia la pide junto con la actividad siguiente. Detector en `lib/planner/pedidos.ts` (avisa en la tarjeta de actividad del planner, no bloquea); auditoría de toda la base con `scripts/auditar-pedidos.ts`. El guion de una lección (como `scripts/eva-nota-v2.ts`) no se guarda si alguna pregunta pide dos cosas.
- **Pantalla de la lección (etapa 6, 13 oct 2026):** la lección terminada se reconoce por `progress.completedAt` (de la sesión, no de la actividad): tarjeta de cierre, caja cerrada, barra al 100 %. Lo fijado del panel va después del material de la actividad y plegado, salvo lo que la actividad declara en `teaching.uses` (`pinnedStaysOpen`); al dejar la actividad, el ecualizador vuelve a su caso inicial (`resetSimState`). El título que ve el alumno pasa por `tituloParaAlumno` (sin el código «EVA-NOTA ·»). Si agregas un control al chat, recuerda que la vista Tutor es la que abre por defecto: la encuesta estuvo meses solo en la vista Chat.
- **Probar como estudiante (13 oct 2026):** `/learn/<id>?vista=estudiante`, solo en sesiones de prueba (`lib/vista-estudiante.ts`). La barra se dibuja con rol de alumno, el material sin validar se oculta (página, bienvenida y chat reciben `comoEstudiante` y usan `verSinValidar` en vez de `isTest`), pegar texto sigue la regla del curso y no hay herramientas de desarrollo. Si agregas otro uso de `isTest` para decidir qué ve el alumno, usa `verSinValidar`. La barra lee el parámetro con `useSearchParams`, por eso va dentro de un `Suspense` en `app/(protected)/layout.tsx`.
- **Regla de nombres (14 oct 2026):** el título de la lección y el `title` de cada actividad nombran LO QUE SE APRENDE, en tono de sílabo: «Justificación de inasistencias», no «Mario con fiebre», ni «¿Cómo…?», ni «Gana el TC», ni «EVA-NOTA ·» (el código vive en el slug). El caso va en `subtitle` («Caso Mario»). Mayúscula solo al inicio y en nombres propios. Detector en `lib/planner/titulos.ts` (avisa en el planner, no bloquea), auditoría con `scripts/auditar-titulos.ts`; sin título, el alumno ve «Actividad N».
- **Vista Cuaderno + Pizarra (14 oct 2026):** /learn tiene una sola vista: el Cuaderno (`components/learning/cuaderno.tsx`, riel de avance + conversación por secciones + caja) y la Pizarra (`pizarra.tsx`, el material de apoyo: columna derecha en escritorio, pestaña «Conversación | Pizarra» en celular), con los colores del kiosko del WMC (`.tema-noche` en `app/globals.css`). Se probó el material DENTRO de la hoja y se descartó: aparecía después de la pregunta, se iba con el scroll y alejaba la pregunta de la caja. No hay vistas Tutor/Chat. Los mensajes se agrupan por `activityId` (`lib/cuaderno.ts`); en vivo, la respuesta que cierra una actividad pasa a la siguiente, como en el servidor. Cada mensaje que cita material lleva «Ver en la pizarra». Si agregas un componente a la lección, dale clases oscuras propias: `.tema-noche` solo traduce las utilidades que ya usaban el material y la caja. Las alternativas «A) …» pueden venir separadas por líneas en blanco (`splitChoiceOptions` lo tolera).
- **Sin OpenAI (14 oct 2026, decisión de Walther: no gastar más en OpenAI):** se retiró toda la voz de OpenAI (`/api/voice/*`, `use-voice-chat`, `voice-button`). Leer en voz alta usa `speechSynthesis` (`hooks/use-lectura.ts`, voz elegida en `lib/voz.ts`) y dictar usa el reconocimiento de voz del navegador (`hooks/use-dictado.ts`): gratis, en Chrome/Edge/Safari; en Firefox el micrófono no se muestra. El micrófono va DENTRO de la caja de respuesta y lo dictado queda en la caja para revisarlo: pasa por el mismo camino que un mensaje escrito. `Course.voiceEnabled` ahora solo decide si Sophia lee sola sus mensajes. No vuelvas a agregar llamadas a OpenAI sin preguntar.
- **En /learn no hay barra global:** la lección tiene una barra única navy (`lesson-bar.tsx`, con logo, segmentos de avance, controles de prueba en línea y `UserMenu`). El voseo que se le escapa al modelo se corrige en el código (`lib/voseo.ts`, en la bienvenida y el chat). Lo mismo con la calificación con que Sophia abre un mensaje en un paso sin nota («Exacto.», «Bien pensado.»): se quita en el código (`lib/calificacion.ts`, 21 oct 2026), porque el prompt no bastó, y los prompts dicen «la pizarra», nunca «el panel» ni «abajo» (el material está a la derecha o en una pestaña, no debajo del mensaje).
- **Dos trampas del paso cerrado (14 oct 2026):** el texto del botón de una alternativa no es «elección con razón» aunque sea largo (`esEleccionConRazon` en `lib/choice.ts`: cuenta solo las palabras que no están en la opción). Y «¿Sophia planteó la pregunta siguiente?» (`lib/planteo.ts`) exige al menos dos palabras clave en común: con una sola, un seguimiento de la actividad anterior pasaba por transición, el puntero avanzaba y en el Cuaderno el mensaje aparecía bajo el título de la actividad siguiente.
- **Prompt y código cuentan los intentos igual (19 oct 2026).** El avance forzado ocurre cuando `attempts + 1 >= max_attempts`, pero el prompt recibía `attempts` (los anteriores) y le pedía a Sophia seguir preguntando: en el cierre de S1 quedó una pregunta colgada con la lección ya terminada. Ahora la ruta calcula `cierraPorTope` ANTES del prompt con la misma condición del avance forzado, le pasa `ready_to_advance: true` para que cierre o haga la transición sin presentarlo como logro, y pega la pregunta siguiente si Sophia no la hace. Si cambias la condición del avance forzado, cambia también `cierraPorTope`. Los pasos sin nota de un solo turno (rutina, cierre) se aceptan sin verificador (`sinNotaDeUnTurno`).
- **Sophia no completa por el alumno ni califica sin nota (19 oct 2026, *Enseña como un maestro 2.0*: Lo correcto es lo correcto, Desglosar, Elogio preciso).** Ante respuesta parcial nombra lo que está y pide lo que falta; no dice la decisión ni mete en la repregunta el dato a buscar. Un criterio que empieza con «Decide / Concluye / Elige / Determina» (`DECISION_RE`) no se cubre recitando la regla. En actividades con `is_evaluative: false`, las guías de respuesta correcta, transición y cierre recogen la respuesta en una frase neutra en vez de «Correcto/Exacto»: la guía por tipo de respuesta pisaba la instrucción de la actividad. Plan completo en `investigacion/plan-sesion-interactiva-2026-10-19.md`.
- **Pizarra de trabajo: subrayar y clasificar (20 oct 2026).** Un texto con `subrayable: true` muestra cada línea como un toque (`lib/subrayado.ts`); un bloque `classify` tiene tarjetas que se arrastran a columnas (`lib/clasificar.ts`). Su estado viaja con cada mensaje dentro de `materialState`, como el ecualizador: Sophia lo lee y el verificador lo recibe junto al mensaje como evidencia del alumno (`mensajeParaVerificar`). Si la actividad tiene un texto propio para subrayar y el alumno responde sin subrayar, el código hace un **turno de subrayar**: no evalúa ni cuenta intento y pide la línea con un mensaje fijo, sin modelo (`mensajeTurnoDeSubrayar`, 21 oct 2026: escrito por Sophia, decía «Exacto», insinuaba la línea o cambiaba de tema), una vez por actividad (`subrayadoPedido` en la evidencia). Ese turno se excluye del cierre por tope, del avance forzado y de la pregunta pegada; si agregas otro mecanismo que avance o cuente intentos, exclúyelo también. Lo subrayado queda en `Message.material` y se ve bajo la respuesta. Tocar una línea la revisa enseguida si el alumno ya respondió (`pedirRevision` en material-context → el chat envía «listo»); si no la respalda y es el primer error, la ruta responde sin verificador ni modelo (`revisionRapida`), así la línea se pone roja y Sophia dice «inténtalo de nuevo» en menos de un segundo. **La línea que respalda (21 oct 2026):** el texto declara `lineasClave` (en la plantilla, `subrayar: { respalda: '<fragmento>' }`); el código compara. Si la respuesta escrita aprobó pero lo subrayado no la respalda, la primera vez no avanza ni cuenta intento (`revisarSubrayado`): el mensaje lo escribe el código (`mensajeRevisarSubrayado`, «inténtalo de nuevo», sin modelo, porque Sophia insinuaba la línea correcta) y en la pizarra la línea subrayada vibra y se pone roja (evento `subrayado` antes del texto); la segunda, Sophia muestra la línea y se sigue. La clave nunca llega al navegador (`ocultarClaves` en la página); el resultado viaja como evento `subrayado` y la pizarra pinta verde o gris solo después de revisar. `turnoSinEvaluar` agrupa los turnos que no evalúan: si agregas otro, súmalo ahí. Diseño y conflictos: `investigacion/turno-de-subrayar-2026-10-20.md`.
- **Transición y cierre (21 oct 2026, simulaciones):** en la transición, arriba del prompt siguen la instrucción y el material de la actividad que se cierra, y Sophia citaba la lámina anterior o volvía a enseñar el tema cerrado. El prompt de transición nombra la actividad cerrada, el material que ya no se cita y el tema nuevo; si la instrucción siguiente pide enseñar primero, la transición puede llegar a 130 palabras. En el cierre, Sophia no responde la duda del alumno (la ve el instructor) y el resumen sale de los puntos clave, sin cifras ni normas nuevas: respondiendo dudas enseñó al final que «en minería la protección es más estricta», que es al revés.
- **Prueba de Edwin (21 oct 2026), cada error con su prueba automática y el texto literal:** (1) pedir que le aclaren la pregunta («¿a qué te refieres con cada uno?») no es responderla: `lib/aclaracion.ts`, no verifica, no cuenta intento ni avanza, y Sophia reformula la misma pregunta; antes un paso sin nota de un turno lo aceptaba y desordenaba la actividad siguiente. (2) El dictado escribe «1 m 80»: `lib/cifras.ts` lo lee como 1,80 m (antes rechazaba la respuesta correcta). (3) El quitador de «Exacto» decide cuando ya llegó texto después de la puntuación (el trozo «Exacto:» llegaba solo). (4) Los títulos del material van entre «» cuando Sophia los nombra (`lib/titulos-material.ts`, solo tras «la fotografía/el texto/…»). (5) El pedido de subrayar dice que la respuesta quedó guardada y que no hace falta escribir de nuevo; si vuelve a escribir sin tocar, se le recuerda una vez sin evaluar (`subrayadoRecordado`); a la segunda se sigue y el Monitor muestra «Lectura sin comprobar» (`lecturaNoComprobada` en la evidencia). La pantalla reconoce el pedido por su frase fija (`textosPedidosEn`): ilumina el texto, lo trae a la vista y avisa sobre la caja. (6) En la pizarra la imagen ocupa el ancho de su tarjeta y se amplía al tocarla; si la actividad tiene un texto para subrayar, su alto no pasa de la mitad de la pizarra (`50cqh`: el panel es contenedor de tamaño, `data-con-subrayado`), para que la norma quede a la vista en laptop. La caja de la imagen va sin fondo: el tema noche vuelve amarillo `bg-[#09222d]`, y con la imagen angosta parecía un marco amarillo del esquema (no lo es: los PNG son blancos). (7) En pasos sin nota la calificación se quita al comienzo de CADA oración (`crearQuitadorDeCalificaciones`), no solo del mensaje: salía al final («…cercado. Bien observado.»). (8) El resumen del cierre lo escribe el código con los puntos clave literales (`lib/cierre.ts`) y Sophia no resume ni agradece: en las tres simulaciones mezclaba datos al resumir. (8b) **La línea se revela solo si la respuesta escrita aprobó** (`revelarSubrayado` exige `ready_to_advance`). Con una respuesta parcial, la línea revelada era justo la razón que faltaba: Sophia decía «tu respuesta va bien», la daba y después la preguntaba. Si no aprobó, Sophia trabaja la respuesta y el pedido sigue pendiente: `pendientesDeSubrayar` (lib/subrayado.ts) lo mantiene mientras la última revisión sea «no respalda» (aviso «Toca otra», texto iluminado, pizarra desplazada), y el marco se apaga al resolverse. Una línea equivocada en un «listo» (`lineaEquivocadaSola`) no cuenta como intento ni cierra por tope. (8c) **Las pruebas no se borran** (pruebas de Maritza y Christian, 21 oct 2026): «Probar», «Reiniciar» e «Ir a actividad» cierran la sesión de prueba (`endedAt`) y abren otra; antes `session/start` la borraba y `skip-to-activity` borraba mensajes y progreso, y así se perdió la prueba completa de Christian. Una prueba cerrada se puede releer en `/learn/<id>` (`pruebaCerrada`: tarjeta «Esta prueba quedó guardada», sin chat). Puede haber varias sesiones de prueba por alumno y lección: la abierta es la que no tiene `endedAt`. (8d) Tocar OTRA VEZ la misma línea equivocada se vuelve a revisar (`hayQueRevisarSubrayado`: rojo y «inténtalo de nuevo», sin contar intento ni falla); antes el servidor callaba y la línea quedaba en gris «en revisión» para siempre, y el gris ahora se apaga solo a los 6 s. (9) El detector de ruido del dictado (`lib/hallucination-detector.ts`) recibe la pregunta: sus palabras no cuentan como repetición, y una palabra suelta necesita 4 repeticiones. «Abajo del borde… la planta de abajo… y abajo de las tablas…» se tomaba por ruido y la actividad no avanzaba. (10) En /learn solo se desplazan la hoja y la pizarra (`lib/desplazar.ts`), nunca la página: `scrollIntoView` movía la ventana y abajo aparecía una franja blanca. Un mensaje nuevo de Sophia queda con su comienzo arriba. Cómo se diseña una sesión para que imagen, ejemplo y pregunta conversen: `scripts/cetemin/DISENO-DE-CLASE.md`.
- La latencia de cada turno queda en el log como `chat.stream.timing` (db, gate, primer_token, stream, guardado) y, desde el 29 oct 2026, en el mensaje de Sophia (`Message.tiempos`, con `total` y `fija`): Vercel Hobby guarda los registros una hora, y las quejas de «lento» de PM no se pudieron medir. `medir-clase.ts` imprime la espera por turno. El piso es el verificador (~4 s); la segunda opinión se pide solo si la primera deja un eliminatorio sin cubrir, en serie (27 oct 2026: en paralelo era el 18 % del gasto).
- **El mensaje en blanco hasta recargar (29 oct 2026)** no era el servidor (respondió en 3 s y guardó todo): el `onChunk` del chat leía el ref acumulado DENTRO del updater de `setMessages`, que React corre después; si el final del texto, `activity_completed` y `done` llegaban en el mismo paquete, `onDone` vaciaba el ref antes y todo el mensaje quedaba vacío. Pasaba con los mensajes fijos y al pasar de actividad, que llegan de golpe: muchos «se trabó» y «?» de las encuestas pueden ser esto. Copia el valor a una constante antes de `setMessages`; nunca leas un ref dentro de un updater.

**Actividades de dos pasos:** las de explicación y práctica abren con un paso cerrado (`Activity.choice`, alternativas corregidas en código en `lib/choice.ts`, opciones mezcladas por sesión) y siguen con la justificación abierta. La nota la manda la justificación; quien nunca acertó la alternativa no pasa de «en proceso» (`lib/grading.ts`). **Desde el 7 oct 2026 la alternativa es por actividad** (decisión 13 en `investigacion/panel-de-apoyo-especificacion.md` §16.1): se queda donde la actividad es una decisión entre errores reales y como comprobación corta al cierre; lo que tiene material manipulable o legible en el panel conversa sin alternativas, con la acción sobre el panel como ancla. La evidencia que sostiene esto está en §15 de esa especificación.

**Cómo probar una lección:** `scripts/alumno-simulado.mjs` abre la pantalla real en Chrome y recibe los turnos por HTTP; las sesiones son de prueba. Correr siempre con un alumno flojo y uno bueno antes de publicar.

**Decisiones, no cálculos (6 oct 2026):** la primera v2 de EVA-NOTA tenía seis cálculos y se sentía «una clase de matemáticas». La plantilla de tutoría es: un solo cálculo (la fórmula, con lámina y ejemplo resuelto), el resto decisiones en situaciones con los números ya dados, y cada alternativa incorrecta es un error real de los datos (ir enfermo, justificar tarde, «compensar» un TC no entregado, copiar). El chat renderiza tablas GFM y saltos de línea simples como saltos duros (`chat-message.tsx`): Sophia puede mostrar la fórmula o un semáforo en tabla y las opciones una por línea.

**Material de apoyo (panel derecho, 6 oct 2026):** las lecciones declaran bloques tipados en `activity.teaching.blocks` (imagen, comparación, fórmula, tabla, texto, caso, diagrama). Todo lo que muestra o cita material pasa por `lib/support-blocks.ts`: la página, el prompt de texto y el de voz. Las imágenes viejas (`teaching.images`) se leen como bloques sin migrar datos. Sophia recibe solo lo justo para citar (una tabla llega con 3 filas de muestra; un texto, con sus dos primeras líneas) y la regla de no copiar al chat. El video de Sophia y la barra izquierda se eliminaron. Especificación y estado por etapas: `investigacion/panel-de-apoyo-especificacion.md`.

**Mostrar material al citarlo:** un bloque `on_reference` aparece cuando Sophia escribe `[[block:ID]]` (un señalamiento, `[[marker:ID:n]]`). El marcador queda en el mensaje guardado y es la única fuente de verdad: el navegador y el servidor calculan lo mostrado leyendo los mensajes de Sophia (`lib/material-markers.ts`), sin eventos aparte. Todo texto de Sophia que se pinta o se lee en voz pasa por `stripMarkers`; si agregas un lugar nuevo que muestre su texto, también. Las alternativas «A) …» del último mensaje se dibujan como botones, así que no cambies el formato de `renderChoice` sin revisar `splitChoiceOptions`. Si una actividad tiene material en el panel, ningún prompt (bienvenida incluida) debe pedir «presentar el caso con sus datos»: Sophia los recita aunque el alumno ya los vea. Y en el prompt los ids de bloque nunca van entre corchetes al inicio de la línea, porque Sophia los copia al chat.

**Editor de material y banco (etapa 3):** el bloque `image` guarda una COPIA de la foto del banco (`CourseImage`) más su `bankId`; todo cambio en el banco pasa por `propagarALecciones` (`lib/course-images.ts`), si no, una foto validada en el banco seguiría oculta para el alumno. Para guardar parte de una lección, usar `PATCH /api/planner/session/update` (merge); el guardado completo ahora conserva `context`, pero antes lo borraba. Lo que el planner propone como material pasa por `sanitizeGeneratedBlocks`: el modelo se pasa de los límites del esquema (celdas de más de 60 caracteres, nombres largos) y, sin esa limpieza, un solo bloque malo descartaba todas las actividades propuestas.

**Citas del material y diagramas (etapa 4):** un criterio puede exigir con `success_criteria.quote_from` que las frases del alumno existan en un bloque del panel; lo comprueba el código (`lib/quote-check.ts`) después del modelo y solo puede bajar un criterio, nunca subirlo. El verificador recibe el material de la lección (`allLessonBlocks`) como quinto argumento de `verifyActivityCompletion`: si agregas otra llamada, pásaselo. Los diagramas se trazan en `lib/diagram-layout.ts` (funciones puras, probadas en 280 px); el ciclo va en columna con flecha de retorno, no en círculo.

**Ecualizador y comprobación de cierre (etapa 5):** el bloque `simulator` vive en el estado del panel (`material-context.tsx`) y su estado viaja con cada mensaje a `/api/chat/stream` (`materialState`); el servidor lo valida contra la lección (`lib/simulator.ts`) y Sophia lo lee como «ESTADO DEL PANEL». Las notas propias del alumno nunca se guardan. Una actividad que se abre con algo distinto de su pregunta de verificación declara `teaching.first_question`; sin eso, bienvenida y transición terminan con el porqué. La comprobación de cierre (`Activity.checks`) la responde el código con un stream fijo (`streamFijo` en la ruta), sin modelo ni verificador; suma una fila de peso 1 en `notaDeLaSesion`.

**Dos trampas más que salieron en esas pruebas:** el detector de ruido de voz (`lib/hallucination-detector.ts`) marcaba como alucinación un cálculo escrito con muchos dígitos (ahora los dígitos cuentan como contenido), y la bienvenida planteaba siempre la actividad 1 aunque la sesión de prueba empezara desde otra (ahora usa el puntero de la sesión). Las reglas que enseña una lección se verifican contra la fuente antes de probarla: EVA-NOTA enseñó dos reglas falsas hasta que se leyó el Reglamento Interno v03 (copia en `Claude/cetemin/diseño-ppt-cetemin/01_Insumos/Institucional`).

---

### Monitor del instructor: una sola definición de estado (15 oct 2026)

**Problema:** el Monitor tenía tres definiciones de «va mal» que no coincidían (portada, matriz, curso), la API por curso exigía ADMIN y el rol INSTRUCTOR veía la pantalla en blanco, la alerta de 24 h duplicaba la fila «abandonado» y nunca se apagaba, y ese mismo GET escribía `endedAt` cada 15 s desde cada pestaña abierta: un alumno «abandonaba» solo si alguien miraba el Monitor, y si volvía dentro de la ventana su sesión ya estaba muerta.

**Reglas (en `lib/monitor.ts`, con pruebas en `tests/monitor.test.ts`):**
- La **ventana de la sección** manda. Abierta: activa (menos de 2 h) o en pausa. Cerrada: sin terminar, a medias o sin avanzar (los nombres de la matriz). Sin horario, y solo ahí, 24 h de silencio la cierran.
- **Nadie escribe `endedAt` por inactividad.** El estado se deriva. `/learn/[sessionId]` muestra «Esta sesión ya se cerró» cuando la ventana pasó.
- **Alerta = pendiente de llamar:** sesión cerrada sin terminar o sin abrir, sin marca de seguimiento posterior al evento. «Desertó» atiende todo.
- **Seguimiento manual** (`SeguimientoAlumno`, diseño del 1 oct): por alumno, con autor, fecha e historial. Se anota desde la ficha; la matriz y el Monitor lo muestran.
- **Embudo:** respeta el filtro de sección y el alcance; cuello de botella = menos de la mitad de los que **llegaron** la superó (mínimo 3); «avanzó por límite» no cuenta como superada; el criterio más fallado cuenta alumnos, no intentos.
- **Señales de la fila:** aviso a uno del tope de intentos (al tope el código ya avanzó al alumno) y «avanzó por límite» visible después.
- **Fechas:** `lib/formatters.ts` fija `America/Lima`. Las páginas de servidor formateaban con la zona del proceso y en Vercel eso es UTC.
- `pesoDeFila` en `lib/asistencia.ts` es la única cuenta de «¿a quién llamo?»: solo celdas con la ventana cerrada; la usan la portada y el orden de la matriz.

---

### Reporte por alumno y por sesión (21 oct 2026)

**Qué es:** en la ficha del alumno (`/dashboard/[courseId]/[studentId]`), cada sesión muestra un reporte con vocabulario de evaluación, no de chat: **Avance de la sesión** (actividades hechas, con y sin nota), **Logro de aprendizaje** (puntos clave logrados sobre el total), **Nivel de logro** (En inicio · En proceso · Logrado · Destacado), **Desempeño** (la nota en /20), **Dominio de criterios** (cubiertos sobre evaluados) y **Lectura comprobada**; después, una tabla por punto clave con su evidencia, **Fortalezas**, **Oportunidades de mejora** y **Acciones** para el instructor. Lo arma `lib/reporte-sesion.ts` (función pura, pruebas en `tests/reporte-sesion.test.ts`) y lo pinta `components/monitor/reporte-sesion.tsx`. Lienzo del diseño: https://claude.ai/artifact/Egmc8jP5bM6aNhiD93d3aj.

**Reglas:**
- El nivel de cada actividad sale de `calculateRubricLevel(enriquecerConPlan(...))`, la misma función de la nota: tope por límite, eliminatorio nunca cubierto → En inicio, penalidad por intentos. La ficha antes mostraba el `understanding_level` crudo del último intento, que no coincidía con la nota.
- **Un punto clave toma el nivel más bajo de sus actividades con nota** (`keyPointIndex`); «logrado» exige además que todas estén completadas. Las actividades sin nota (`is_evaluative: false`: rutina y cierre) no entran en ningún conteo del logro.
- **El resultado de una sesión queda fijo** (decisión de Walther, 21 oct 2026): lo que el alumno haga en la S2 no cierra las brechas de la S1. Las acciones se derivan solo de esa sesión.
- Lo que no alcanzó se reclama solo si la sesión está **cerrada** (terminó o su ventana pasó, `ventanaCerrada` de `lib/monitor.ts`); con la ventana abierta no es brecha.
- La lectura comprobada se lee de `lecturaNoComprobada` en la evidencia, solo en actividades con una norma que declara `lineasClave`. Todavía no baja el nivel (pendiente de decidir: «sin lectura no hay Destacado»).
- La duda que dejó en el cierre (`closing`) es la respuesta literal del alumno y se vuelve una acción, salvo «ninguna / nada / todo claro».
- **Dónde está ahora y línea de tiempo (22 oct 2026, pedido de Walther: «¿cómo sé en qué actividad se detuvo, si participa o se fue?»):** arriba del reporte, mientras la sesión no terminó, una línea con el estado por minutos sin escribir con la ventana abierta: *escribiendo* (menos de 2), *en pausa* (hasta 10), *lo dejó* (más de 10; agrega la acción «Escribirle ahora»); con la ventana cerrada, *cerró sin terminar*. La actividad es el puntero de la sesión (`LessonSession.activityId`). Cada actividad lleva mensajes escritos, palabras y minutos (desde `ActivityProgress.startedAt` o su primer mensaje hasta completarla o su último mensaje, lo que sea después), y el avance muestra la participación (mensajes y palabras por mensaje). Falta todavía la presencia desde la pantalla (pestaña visible), que distinguiría «mira sin escribir» de «cerró la pestaña».
- **Reporte de la sesión por sección (22 oct 2026):** `/dashboard/[courseId]/clase?leccion=&seccion=`. Es la SUMA de los reportes por alumno (`lib/reporte-clase.ts`, pruebas en `tests/reporte-clase.test.ts`; los datos los carga `lib/reporte-clase-datos.ts`, compartido con la API): logro por punto clave de la clase, criterios no cubiertos con citas, dudas del cierre completas, a quién mirar y la tabla de alumnos. **Qué reforzar lo decide el código** (`UMBRAL_CLASE`: un criterio que falló en al menos 2 alumnos y en el 30 % de los que llegaron); lo que falló en uno solo va a «A quién mirar». **La IA solo redacta el abordaje** (`lib/reporte-clase-ia.ts`, modelo `DEFAULT_MODEL`, caché en memoria 30 min por huella de datos) y recibe como único insumo el material de la sesión (`materialDeLaSesion`): en la prueba del 22 oct, sin ese material, inventó «minería (variable)», «RNE» y «PETAR». Se llega desde la columna S1 de la matriz y desde el embudo del Monitor en vivo.
- **Terminar el bloque de Sophia (22 oct 2026):** `SectionLessonSchedule.closedAt` (y `closedById`). `cierreDeVentana` devuelve la más temprana entre `availableAt + closesAfterHours` y `closedAt`; `cierreDeHorario(h)` es el atajo y **todo cálculo de cierre pasa por ahí** (portada, matriz, ficha, API en vivo, lista de clases, asistencia). Para el alumno, `lib/ventana-alumno.ts`: la pantalla de la lección, la bienvenida y el chat usan `cierreParaAlumno`; después del cierre Sophia responde el mensaje fijo `mensajeBloqueCerrado` sin modelo y sin guardar. El botón vive en el reporte de la sesión (`components/monitor/terminar-bloque.tsx`), con «Reabrir» para el clic equivocado. Pendiente de decidir: que lo no alcanzado por cierre del instructor no cuente como brecha propia del alumno (hoy sale como «cerró sin terminar»).
- Alumnos ficticios para ver el Monitor con datos: `scripts/cetemin/simular-alumnos.ts` (sección «Práctica (simulados)», correos `@simulado.local`, sesiones reales reasignadas, `--limpiar` para borrarlos).
- **El Monitor del curso (`/dashboard/[courseId]`, componente de cliente) expulsaba al instructor que entraba por URL o recargaba:** `useSession` empieza en `loading` con `data` vacío, el rol caía al valor por defecto `STUDENT` y el efecto mandaba a `/lessons`. Ahora espera `status !== 'loading'`. Si una página de cliente decide por rol, espera el `status` antes de redirigir. Ahora se llega desde la franja «En vivo» de la portada y desde «Ver en vivo →» en la matriz.
- **La portada del Monitor se recorre como Programación (21 oct 2026, pedido de Walther):** árbol admisión ▸ sede ▸ carrera a la izquierda (`components/monitor/arbol-monitor.tsx`, reglas puras en `lib/monitor-arbol.ts` con pruebas: un curso sirve a una carrera por su lista m:n o por ser transversal, igual que `sirveA` en Programación) y, a la derecha, los cursos de esa rama con «necesitan atención». La selección va en la URL (`/dashboard?admision=&sede=&carrera=`, ids), no en segmentos de ruta, porque `/dashboard/[courseId]` ya ocupa el primer segmento y Next no admite dos nombres de slug al mismo nivel. Las matrices se calculan una vez por (curso, admisión, sede) y se reparten a los nodos del árbol. El instructor con una sola carrera entra directo (`unicaRama`). La matriz recibe la rama (`admision`, `sede`) y acepta `seccion` para mirar una sola; muestra fichas por sección cuando hay más de una.

---

### Sesiones de curso con Sophia: enseñar primero, sin alternativas, caso corto (15 oct 2026)

**Contexto:** en los cursos de CETEMIN (primero SI-ALTORIESGO), Sophia es el **primer bloque de 45 min de la clase virtual** de 3 horas pedagógicas. Después el instructor aclara unos 15 min con el Monitor delante y los equipos resuelven el caso de la sesión en sala. La plantilla de tutoría (alternativas + justificación) no sirve aquí: con un alumno simulado se vio que Sophia preguntaba el 85 % del tiempo a alumnos que recién estaban aprendiendo. Walther fijó estas reglas, que valen **cada vez que se diseñe una sesión de curso** (manual, cargador o planner):

1. **La rutina de entrada se corre tal cual.** Veo · Pienso · Me pregunto son tres actividades `reflection` sin nota (`is_evaluative: false`, `max_attempts: 1`), una pregunta por paso, con las preguntas **que trae la imagen** (el mural de S1 traía otras que el guion) en un bloque `consigna` más la foto, fijados y abiertos con `teaching.uses`.
2. **Enseñar primero, preguntar después.** Cada punto clave es una actividad `practice` (no `explanation`: ese modo abre con una pregunta exploratoria) cuya instrucción empieza con «Enseña primero…» y trae un **ejemplo resuelto propio** que Sophia resuelve antes de preguntar. En la pizarra va **primero el texto de la norma** (el que se toca), después la lámina y al final las láminas de apoyo `on_reference` (orden cambiado el 23 oct 2026, ver punto 11). Recién después, **una** pregunta abierta sobre una situación propia, con un reintento (`max_attempts: 2`) para que todo quepa en 45 min.
3. **Sin alternativas en el chat.** Ni `choice` ni `checks` en estas sesiones: la comprobación son los 15 min del instructor, que ve en el Monitor el criterio más fallado y las respuestas. El cargador falla si una actividad trae alternativas.
4. **Los casos de la sesión no entran en Sophia.** Son el producto del equipo; si Sophia los resuelve, le quita el trabajo al equipo, y si los pregunta, lo duplica. La aplicación individual es un **caso corto gemelo** (mismo rubro y estructura, otra situación, una sola decisión) con su solución en `must_include`. Los ejemplos resueltos tampoco salen de los casos de la sesión.
5. **El cierre alimenta al instructor.** Última actividad `closing` sin nota: «¿qué punto de hoy te quedó menos claro?». La reflexión «Antes pensaba… ahora pienso» queda al final de la clase, con el instructor.
6. **Sophia no ve imágenes.** La `description` de cada imagen lleva **el texto escrito en ella** (preguntas, valores de una tabla, rótulos): se mira la imagen antes de describirla. El cargador actualiza la ficha del banco aunque la imagen ya exista.
7. **Fuente de datos:** solo `05_Base-de-datos` del proyecto diseño-ppt-cetemin (solo lectura). Lo que falta se pide allá, no se saca de los guiones: casos cortos con solución, texto visible de las imágenes, rutinas con sus preguntas, recurso autónomo por sesión.

8. **Canal único de carga (decisión de Walther, 15 oct 2026: «todas las cargas van a ser por este medio»):** `scripts/cetemin/` (ver su `README.md`). Una sesión es un archivo de datos (`cursos/<curso>/s<n>.ts`); las actividades las arman las plantillas (`plantillas.ts`, la forma vive una sola vez), `validar.ts` bloquea lo que no cumple estas reglas, `cargar.ts` escribe sin publicar y `auditar-sesion.ts` revisa la transcripción de la prueba (no califica en pasos sin nota, ejemplo antes de la pregunta, sin casos del equipo, cabe en 16 turnos). Se publica cuando las pruebas con alumno flojo y bueno pasan la auditoría. Lo que la plantilla no pueda arreglar es código y lo decide Walther.

9. **Lectura comprobada (21 oct 2026):** cada punto clave declara en `subrayar.respalda` el fragmento (o los fragmentos) de la línea de su norma que respalda la respuesta. Tras responder, el alumno toca esa línea en la pizarra; si no es, se pone roja y Sophia dice «inténtalo de nuevo». El validador no carga una sesión con un punto clave sin esa línea, y el tope de turnos subió a 24 (un turno más por punto clave).

10. **Tres cursos en el canal (22 oct 2026).** Los cursos del Obj. 1 son SI-ALTORIESGO (Maritza Mercado), EOM-SOST (Walther) y PM-FMPLANTA (Christian Huamán), con S1–S3 cargadas sin publicar. Lo que se aprendió al armar ocho sesiones de una vez: (a) la plantilla de la rutina traía los criterios de «caídas» escritos a mano, y en una sesión de molienda o de pernos no servían: ahora cada sesión declara `criterios`, `tipoImagen` y `enlaceMePregunto` en su `RutinaSpec`. (b) El validador cuenta palabras con espacios: una fórmula con «=», «÷» o «×» gasta presupuesto; regla + ejemplo caben en ~55 palabras con un título de lámina de 4. (c) «¿Qué hay en la imagen? Solo lo que se ve.» se lee como dos pedidos; la pregunta termina en «?» y la aclaración va en `pistaVeo`. (d) El detector de pedidos toma «arma» (se arma un andamio) por un verbo de producir: «está sobre». (e) El nombre de un caso corto cabe en 40 caracteres y cada hecho en 140. (f) Los casos cortos son gemelos de los de la sesión con **otra** causa o equipo (contacto litológico donde el equipo tiene falla y agua; molino de bolas donde el equipo tiene la chancadora; silo donde el equipo tiene techo y plataforma). (g) `imagenes.csv` de SI describe las láminas solo por su nombre: no sirve para la `description`; se mira la imagen. (h) **En la transición Sophia se saltaba el ejemplo resuelto** en una de cada dos sesiones (el formato decía «Introduce el nuevo tema en 2-3 oraciones»): ahora, si la instrucción siguiente trae «Resuelve tú este ejemplo:», el paso 2 del formato de transición lo exige (`extraerEjemploResuelto` en `lib/prompt-builder.ts`, prueba en `tests/ejemplo-transicion.test.ts`). (i) Un criterio con cifras que no son la respuesta («8 pies (2,44 m)») hace que `lib/cifras.ts` rechace una respuesta correcta; reglas de redacción en `scripts/cetemin/DISENO-DE-CLASE.md` §5b. (j) La auditoría R2 busca el comienzo de la pregunta de verificación, no cualquier «¿» (una pregunta retórica dentro del ejemplo no es la pregunta). (k) **Sophia corregía respuestas correctas contra su propio ejemplo** («No exactamente… el vale dice cartuchos de resina»), 5 de 5 veces en una prueba por API. La causa era el historial comprimido (`lib/message-summarizer.ts`): de un mensaje largo de Sophia guardaba como «ESCENARIO» la frase del ejemplo y como «PREGUNTA» solo la última oración con «?», sin la situación que la plantea. Ahora la pregunta conserva su párrafo y un ejemplo fuera de ese párrafo se rotula «EJEMPLO YA RESUELTO POR EL INSTRUCTOR (no es lo que se pregunta)» (pruebas en `tests/message-summarizer.test.ts`). Afectaba a todas las lecciones con ejemplo resuelto, también a la S1 de SI que probaron Edwin, Maritza y Christian. Además, el prompt de la actividad marca el ejemplo como ya resuelto (`EL EJEMPLO YA LO RESOLVISTE TÚ`). Si cambias el resumen del historial, corre esa prueba con el texto literal.

11. **Primera clase con alumnos (23 oct 2026, EOM 2026-II, lección transversal «Aprender con una tutora de IA»).** 11 alumnos, 4 terminaron; una lección de 15 min tomó de 25 a 45. Cuatro arreglos: (a) **la línea se pide solo si la respuesta escrita aprobó** (`faltaTocarLaLinea` en `lib/subrayado.ts`): a quien respondió lo contrario de la lección se le pedía «la línea que respalda tu respuesta», que no existe, y tocaba al azar; Sophia tampoco la pide por su cuenta (`describeSubrayadoForPrompt`). (b) **Lo tocado no se pierde al recargar:** el servidor no vuelve a pedir la línea si ya hay un subrayado guardado en la actividad, y el navegador lo restaura de los mensajes (`subrayadosDesdeMensajes`). (c) **Un mensaje fuera de tema no responde un paso sin nota** (`desvioEnPasoSinNota` en la ruta, sumado a `turnoSinEvaluar`): «¿Eres mejor que Gemini?» cerraba el Veo y salían dos preguntas en un mensaje. El clasificador ya no da por pertinente una pregunta solo por terminar en «?» (`lib/services/intent-classification.ts`). (d) **Un solo recurso a la vista:** en cada punto clave el texto que se toca va PRIMERO y la lámina debajo; con `laminaCuando: 'on_reference'` la lámina aparece solo si Sophia la cita, y `casoCorto.usa` decide qué textos siguen abiertos en el caso (`[]`: solo el caso). Con lámina arriba, en laptop el texto quedaba fuera de vista: «¿cuál es la pizarra? no veo».

12. **Pruebas de Maritza y Christian (24 oct 2026).** (a) **Sin aprobación del verificador no hay «Correcto»:** el cierre por tope le pasa al prompt `ready_to_advance: true` y Sophia felicitaba respuestas equivocadas o vacías; ahora la calificación se quita en el código si el verificador no aprobó (`debeQuitarCalificacion` en `lib/calificacion.ts`, decidido con `aproboElVerificador` ANTES de que el tope o el desglose fuercen el avance). (b) **Cifras redondeadas:** `lib/cifras.ts` compara la cifra del alumno redondeada a los decimales del criterio («94,7 %» cubre «95 %»; «1,25 m» no cubre «1,20 m»). (c) **Pedir seguir no es responder (26 oct 2026, Maritza y Rosario):** «¿podemos continuar?», «continua», «¿por qué no respondes?», «no sale la actividad 3» (`lib/pide-seguir.ts`, mensajes cortos) no se verifican ni cuentan intento: el código responde con un mensaje fijo que repite lo último que Sophia pidió (`mensajePideSeguir`), sumado a `turnoSinEvaluar`. Antes gastaban intentos y desgloses y cerraban la actividad por tope. (d) **En un paso sin nota el desglose cuenta para el tope** (`intentosPrevios` = intentos + desgloses, el mismo en `cierraPorTope` y en el avance forzado): en la S0 de tutoría un paso de 2 intentos tomó 4 respuestas. (e) **Una respuesta fuera de tema no se desglosa ni cierra la actividad** por tope: con el desglose al límite, una respuesta a la pregunta anterior dio por hecha la actividad 3.

13. **Perfil de Sophia por rol y costos (27 oct 2026).** (a) **La conducta vive en el perfil, no en la instrucción.** Cada actividad declara `rol` (veo, pienso, me_pregunto, punto_clave, caso_corto, cierre) y `lib/perfil-curso.ts` reemplaza, en el prompt, las reglas de tutoría que contradecían a las sesiones de curso («No repitas exactamente la misma pregunta», pistas progresivas, cerrar con «Exacto.», la plantilla «Turno 1: presenta el escenario»). La instrucción trae solo contenido; sin `rol`, una lección sigue con el prompt de tutoría. (b) **En punto clave, caso corto y cierre la pregunta la pone el código**, en negrita al final (`preguntaDelTurno`), y las que escriba Sophia se quitan mientras llega el texto (`crearQuitadorDePreguntas`): en el 44 % de las transiciones tras un cierre por límite el mensaje traía dos preguntas. (c) El flujo para crear o revisar una sesión está en `scripts/cetemin/PROCEDIMIENTO.md` y el validador lo hace cumplir (rol, nada de conducta en la instrucción, la razón escrita en la línea que se toca). (d) **Costos:** la segunda opinión del verificador se pide solo si hace falta, en serie; tocar la línea correcta reusa la aprobación guardada al pedirla (`aprobadaSinLinea`) en vez de verificar otra vez; cuando corre el verificador, la intención sale de su `response_type` y no hay otra llamada de clasificación; se eliminó el reporte con IA por sesión (`summaryText`), que ninguna pantalla mostraba. (e) **La base dormía poco:** el Monitor y la pantalla del alumno (cada 4 s) sondeaban con la pestaña oculta y Neon agotó su cuota el 27 oct; ahora sondean solo a la vista (`hooks/use-sondeo.ts`) y el alumno cada 30 s, porque el avance ya llega con cada respuesta del chat.
14. **La línea se juzga solo cuando corresponde, y la prueba del perfil (28 oct 2026).** (a) **El toque se revisa solo si la línea está pedida** (`pendiente` en `TextoSubrayable`): de 249 toques no pedidos del 27-28 oct, 233 gastaron un turno o un intento y 56 cerraron la actividad por límite. Sin pedido, la línea queda marcada y viaja con la respuesta. (b) **El servidor juzga la línea (roja, verde, «Esa es la línea») solo si la respuesta aprobó o el toque fue pedido** (`juzgaLinea` en la ruta); si no, la guarda sin resultado y la juzga en el turno en que la respuesta apruebe (`subrayadoSinJuzgar`). Sin juzgar, el prompt no le dice a Sophia si respalda (`describeSubrayadoForPrompt(…, false)`): «pregúntale por qué eligió esa línea» le ganaba a la transición. (c) Prueba por API del perfil en PM S7 (usuario de prueba en el servidor local, sesión creada como «Probar»): al cerrar el Veo, Sophia seguía preguntando por la imagen; la situación de la pregunta salía dos veces; en el cierre por límite no enseñaba la actividad siguiente. Ahora, al pasar de una actividad a otra, la pregunta siempre la pone el código; el filtro quita también las oraciones que repiten la pregunta (`repiteLaPregunta`); dentro de la rutina solo queda la primera oración de Sophia (`crearRecortadorAPrimeraOracion`); y tras un cierre por límite la primera oración la escribe el código (`CIERRE_POR_TOPE`) y Sophia presenta la actividad nueva con un prompt hecho solo para ella, sin historial (`presentacionTrasTope`). Con eso, flojo y bueno pasaron `auditar-sesion.ts`. Detalle en `scripts/cetemin/APRENDIZAJES.md` §14.

Referencia: `scripts/cetemin/cursos/si-altoriesgo/s1.ts` (S1, 9 actividades: 3 de rutina, 4 de adquisición, 1 caso corto, 1 cierre); los otros ocho archivos siguen la misma forma.

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
**A:** Verifica callback URL en Google Cloud Console: `http://localhost:3000/api/auth/callback/google`

**Q:** Test User funciona en producción
**A:** Agregar validación `if (process.env.NODE_ENV !== 'development') return null` en `authorize()`

**Q:** El usuario termina en `/login` a mitad de una lección, con `JWTSessionError` y «Can't reach database server» en el log
**A:** Neon dejó de responder y una consulta dentro del callback `jwt` lanzó una excepción, lo que hace que NextAuth borre la cookie. Toda consulta a la base en `auth.ts` va en `try/catch` y, si falla, devuelve el token sin cambios (6 oct 2026).

**Q:** Un alumno del padrón aparece con un nombre raro («Elpinin 9», «nelson»)
**A:** El ingreso con Google pisaba el nombre oficial con el de su cuenta de Google. Desde el 23 oct 2026 `auth.ts` no cambia el nombre de una cuenta con DNI (del padrón). Los nombres oficiales por DNI están en el «Consolidado de Tutoría» (Tutoría - Cetemin 2026.xlsx).

**Q:** Un alumno ve en su inicio cursos que no lleva (otro curso transversal, uno borrado)
**A:** Desde el 27 oct 2026 el alumno ve solo las lecciones que su sección activa programó con fecha, abiertas o por venir (`lib/lecciones-alumno.ts`), y nadie ve cursos borrados. Antes veía todo lo publicado de su carrera y lo transversal: en tres semanas hubo 41 sesiones de no matriculados en AI 101, EPPs, Tutoría y Química.

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

---

## 📋 Phase 2: AI Chat System (IN PROGRESS)

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
- ✅ **Puerto 3000** - Configurado en `package.json`
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
