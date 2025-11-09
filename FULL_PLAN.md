# FULL PLAN - Sophia Next
## Plan de Implementación Completo (Enfoque Simplificado)

**Fecha:** 2025-11-09
**Basado en:** Análisis SINCERIDAD BRUTAL del MASTER_PLAN.md
**Restricciones:** Solo usar `data/lesson01.ts` (hardcoded), descartar tabla Lesson de DB por ahora

---

## 🎯 Filosofía del Plan

**Descartamos el over-engineering:**
- ❌ Orquestador Híbrido (Fast Path + Slow Path)
- ❌ 8 mini-flujos separados
- ❌ Clasificadores con regex/keywords/LLM Haiku
- ❌ Metadata compleja (flowUsed, classificationMethod, confidence, etc)
- ❌ Tabla Lesson de DB (next-step futuro)

**Adoptamos simplicidad:**
- ✅ 1 endpoint: `/api/chat/stream`
- ✅ 1 prompt builder dinámico (`lib/prompt-builder.ts` - ya existe)
- ✅ Claude Sonnet 4.5 decide TODO (routing, verificación, hints, guardrails)
- ✅ Verificación automática con IA (`lib/activity-verification.ts` - ya existe)
- ✅ Lección hardcodeada `data/lesson01.ts` (7 activities completas)

**Principio clave:** "La mejor arquitectura es la que no necesitas escribir"

---

## 📊 Arquitectura Simplificada

### Flujo Completo (Un solo camino)

```
User message
    ↓
POST /api/chat/stream
    ↓
buildSystemPrompt(currentActivity, history, attempts)
    ├─ Incluye: teaching, verification criteria, hints, guardrails
    └─ Claude Sonnet 4.5 recibe CONTEXTO COMPLETO
    ↓
LLM decide qué hacer:
    ├─ Es pregunta? → Responde + redirige
    ├─ Es off-topic? → Aplica guardrail + redirige
    ├─ Es respuesta? → Evalúa criteria
    └─ ¿Necesita hint? → Ofrece según attempts
    ↓
Stream respuesta al frontend
    ↓
Guarda mensaje en DB
    ↓
verifyActivityCompletion(userMessage, activity)
    ├─ Claude evalúa si completó criteria
    └─ Retorna: { completed: true/false, feedback, criteriaMatched }
    ↓
SI completed == true:
    ├─ Marcar ActivityProgress.status = COMPLETED
    ├─ getNextActivity() → obtener siguiente
    ├─ Actualizar LessonSession.activityId
    └─ SI es última actividad → LessonSession.completedAt = NOW
```

**Ventajas:**
- Simple de entender y debuggear
- Un solo punto de decisión (Claude)
- No requiere clasificadores externos
- Latencia baja (1 LLM call en vez de 2)

---

## 🏗️ Hito 1: Completar Lección End-to-End (1 semana)

**Objetivo:** Usuario puede completar toda `lesson01.ts` (7 activities) con auto-progresión.

### Tareas

#### 1.1 Integrar verificación automática en streaming (2-3h)

**Archivos a modificar:**
- `app/api/chat/stream/route.ts`

**Cambios:**
```typescript
// DESPUÉS de guardar mensaje del assistant
const assistantMessage = await prisma.message.create({...})

// NUEVO: Verificar si completó actividad
const verification = await verifyActivityCompletion(
  userMessage,
  currentActivity,
  attempts
)

if (verification.completed) {
  // Marcar como completada
  await prisma.activityProgress.upsert({
    where: { sessionId_activityId },
    update: {
      status: 'COMPLETED',
      completedAt: new Date(),
      passedCriteria: true,
      aiFeedback: verification.feedback
    },
    create: {
      sessionId,
      activityId: currentActivity.id,
      status: 'COMPLETED',
      completedAt: new Date(),
      passedCriteria: true,
      aiFeedback: verification.feedback,
      attempts: attempts + 1
    }
  })
}
```

**Test:**
- Responder correctamente actividad html_activity_001
- Verificar que ActivityProgress.status = COMPLETED
- Verificar que ActivityProgress.completedAt tiene timestamp

---

#### 1.2 Implementar auto-progresión de actividades (2-3h)

**Archivos a modificar:**
- `app/api/chat/stream/route.ts`
- `lib/lesson-parser.ts` (ya tiene `getNextActivity()`)

**Cambios:**
```typescript
if (verification.completed) {
  // ... marcar completada (código del paso 1.1)

  // NUEVO: Obtener siguiente actividad
  const nextActivity = getNextActivity(contentJson, currentActivity.id)

  if (nextActivity) {
    // Actualizar sesión a siguiente actividad
    await prisma.lessonSession.update({
      where: { id: sessionId },
      data: {
        activityId: nextActivity.id,
        momentId: nextActivity.momentId, // Extraer del parsing
        lastActivityAt: new Date()
      }
    })
  } else {
    // Era la última actividad → marcar lección completada
    await prisma.lessonSession.update({
      where: { id: sessionId },
      data: {
        completedAt: new Date(),
        passed: true,
        progress: 100
      }
    })
  }
}
```

**Test:**
- Completar actividad 1 → debe avanzar a actividad 2
- Completar actividad 7 (última) → debe marcar sesión como completada
- Verificar que `LessonSession.completedAt` tiene timestamp

---

#### 1.3 Agregar UI de progreso en tiempo real (2h)

**Archivos a crear:**
- `components/learning/activity-progress-header.tsx`

**Estructura:**
```typescript
export function ActivityProgressHeader({ sessionId }: { sessionId: string }) {
  const [progress, setProgress] = useState<ProgressData | null>(null)

  useEffect(() => {
    // Polling cada 5s
    const interval = setInterval(async () => {
      const res = await fetch(`/api/activity/progress?sessionId=${sessionId}`)
      const data = await res.json()
      setProgress(data)
    }, 5000)

    return () => clearInterval(interval)
  }, [sessionId])

  if (!progress) return null

  return (
    <div className="bg-white border-b p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {progress.currentActivity} • Actividad {progress.progress} de {progress.total}
          </span>
          <span className="text-sm font-medium text-slate-800">
            {progress.percentage}% completado
          </span>
        </div>

        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

**Archivos a modificar:**
- `components/learning/chat-interface.tsx` - Importar y mostrar header

**Test:**
- Completar actividad → barra debe avanzar de 14% → 28%
- Polling debe actualizar sin refrescar página

---

#### 1.4 Testing end-to-end (2h)

**Escenario completo:**
1. Login con test user
2. Click en lección "HTML Básico"
3. Completar las 7 actividades en orden:
   - html_activity_001: Explicar qué es HTML
   - html_activity_002: Estructura básica de documento
   - html_activity_003: Crear primera página HTML (código completo)
   - html_activity_004: Diferencias h1/h2/h6 y strong vs b
   - html_activity_005: Crear enlace a Google + imagen
   - html_activity_006: Lista de frutas (ul) + pasos sándwich (ol)
   - html_activity_007: Página personal completa con todos los elementos
4. Verificar que al completar actividad 7:
   - Mensaje de felicitación automático
   - `LessonSession.completedAt` tiene timestamp
   - `LessonSession.passed = true`
   - `LessonSession.progress = 100`

**Checklist:**
- [ ] Auto-progresión funciona entre activities
- [ ] Barra de progreso se actualiza en tiempo real
- [ ] Sesión se marca como completada al final
- [ ] No hay errores en consola
- [ ] Prisma Studio muestra datos correctos

---

### Entregables Hito 1

1. ✅ Sesión completa de 7 actividades funciona end-to-end
2. ✅ Auto-progresión automática entre activities
3. ✅ UI de progreso en tiempo real
4. ✅ Verificación automática con IA integrada
5. ✅ Código deployable (pasa build + type check)

**Duración estimada:** 8-12 horas de desarrollo

---

## 🧠 Hito 2: Tutor Inteligente (1 semana)

**Objetivo:** Sophia maneja preguntas, tangentes, hints y guardrails naturalmente.

### Tareas

#### 2.1 Implementar tracking de tangent count (1-2h)

**Schema migration:**
```prisma
model ActivityProgress {
  // ... campos existentes
  tangentCount Int @default(0)  // NUEVO
}
```

**Archivos a modificar:**
- `prisma/schema.prisma` - Agregar campo
- `app/api/chat/stream/route.ts` - Incrementar cuando LLM detecta tangent

**Lógica:**
```typescript
// En buildSystemPrompt, agregar:
const tangentCount = await prisma.activityProgress.findUnique({
  where: { sessionId_activityId },
  select: { tangentCount: true }
})

const systemPrompt = `
...
POLÍTICAS DE COMPORTAMIENTO:

Si el estudiante hace una pregunta relacionada:
- Responde brevemente (2-3 oraciones)
- Redirige a la pregunta de verificación
- Max tangent responses: ${activity.student_questions.max_tangent_responses}
- Tangent count actual: ${tangentCount?.tangentCount || 0}
- ${tangentCount >= activity.student_questions.max_tangent_responses
    ? '⚠️ LÍMITE ALCANZADO: Redirige firmemente sin responder más tangentes'
    : 'Aún puedes responder tangentes'}
...
`
```

**Después del streaming:**
```typescript
// Detectar si LLM respondió a un tangent
// (Esto lo hace el propio Claude en su respuesta)
// Simplificación: Incrementar si contenido NO incluye criterios de verificación

const isTangent = !assistantMessage.content.includes('verificación')
if (isTangent) {
  await prisma.activityProgress.update({
    where: { sessionId_activityId },
    data: { tangentCount: { increment: 1 } }
  })
}
```

**Test:**
- Hacer 3 preguntas off-topic seguidas
- Verificar que `tangentCount` incrementa: 1 → 2 → 3
- En la 4ta pregunta, Claude debe redirigir firmemente sin responder

---

#### 2.2 Hints condicionales según intentos (1-2h)

**Archivos a modificar:**
- `lib/prompt-builder.ts` - Ya tiene lógica, solo ajustar threshold

**Cambios:**
```typescript
// En buildSystemPrompt()
const shouldShowHint = attempts > 2  // CAMBIAR threshold según diseño pedagógico

const hintsSection = shouldShowHint && activity.verification.hints?.length
  ? `
**Si la respuesta NO cumple criterios:**
- Ofrece este hint: "${activity.verification.hints[0]}"
- Explica brevemente qué falta en su respuesta
`
  : `
**Si la respuesta NO cumple criterios:**
- Da feedback específico sobre qué criterios faltan
- NO des la respuesta completa, guíalo con preguntas
`
```

**Test:**
- Responder mal 3 veces → en 4to intento debe mostrar hint
- Verificar que `ActivityProgress.attempts = 4`
- Hint debe ser el primero del array `verification.hints`

---

#### 2.3 Guardrails dinámicos (1h)

**Ya implementado en `prompt-builder.ts`:**
```typescript
// Guardrails ya se incluyen en system prompt
if (activity.guardrails?.length) {
  const guardrailsSection = activity.guardrails.map(g =>
    `- Si ${g.trigger}: "${g.response}"`
  ).join('\n')

  prompt += `\n**GUARDRAILS:**\n${guardrailsSection}\n`
}
```

**Test:**
- En actividad html_activity_002, preguntar sobre CSS o JavaScript
- Verificar que Claude responde exactamente con el guardrail:
  > "CSS y JavaScript son importantes, pero primero enfoquémonos en entender bien HTML. Los veremos en lecciones futuras."

---

#### 2.4 Testing de edge cases (2-3h)

**Casos a probar:**

1. **Tangent limit:**
   - Hacer 4 preguntas off-topic en actividad con `max_tangent_responses: 2`
   - Esperado: Primeras 2 se responden, 3ra y 4ta se redirigen firmemente

2. **Hints progresivos:**
   - Responder mal 4 veces seguidas
   - Esperado:
     - Intento 1-3: Feedback genérico
     - Intento 4+: Muestra hint específico

3. **Guardrails:**
   - En html_activity_002, preguntar: "¿Cómo cambio el color con CSS?"
   - Esperado: Guardrail activado + redirección

4. **Completitud mixta:**
   - Responder solo 2 de 3 criteria
   - Esperado: Feedback específico sobre el criterio faltante

5. **Lección completa:**
   - Completar las 7 activities con combinación de:
     - Respuestas correctas al primer intento
     - Respuestas incorrectas que requieren hints
     - Preguntas tangenciales
   - Verificar que todo funciona sin crashes

---

### Entregables Hito 2

1. ✅ Tracking de tangent count funcional
2. ✅ Hints condicionales según intentos
3. ✅ Guardrails aplicados automáticamente
4. ✅ Edge cases manejados correctamente
5. ✅ Testing exhaustivo completado

**Duración estimada:** 6-9 horas de desarrollo

---

## 🚀 Hito 3: Production-Ready (1 semana)

**Objetivo:** Código robusto, monitoreado, optimizado, desplegable.

### Tareas

#### 3.1 Mejorar rate limiting (1-2h)

**Archivos a modificar:**
- `lib/rate-limit.ts` - Agregar rate limit por sesión

**Cambios:**
```typescript
// Actual: 10 msg/min por userId (en memoria)
// NUEVO: 30 msg/sesión total

const SESSION_MESSAGE_LIMIT = 30

async function checkSessionLimit(sessionId: string): Promise<boolean> {
  const messageCount = await prisma.message.count({
    where: { sessionId }
  })

  if (messageCount >= SESSION_MESSAGE_LIMIT) {
    return false // Límite excedido
  }

  return true
}

// En /api/chat/stream
const canSend = await checkSessionLimit(sessionId)
if (!canSend) {
  return NextResponse.json(
    { error: 'Has alcanzado el límite de mensajes para esta sesión' },
    { status: 429 }
  )
}
```

**Test:**
- Enviar 31 mensajes en una sesión
- Mensaje 31 debe retornar 429 Too Many Requests

---

#### 3.2 Logging y monitoring (2h)

**Archivos a crear:**
- `lib/monitoring.ts`

**Estructura:**
```typescript
export const monitor = {
  activityCompleted: (sessionId: string, activityId: string, attempts: number) => {
    console.log('[MONITOR] Activity completed', { sessionId, activityId, attempts })
    // TODO: Integrar Sentry/Datadog
  },

  verificationFailed: (sessionId: string, activityId: string, reason: string) => {
    console.log('[MONITOR] Verification failed', { sessionId, activityId, reason })
  },

  guardrailTriggered: (sessionId: string, trigger: string) => {
    console.log('[MONITOR] Guardrail triggered', { sessionId, trigger })
  },

  lessonCompleted: (sessionId: string, duration: number) => {
    console.log('[MONITOR] Lesson completed', { sessionId, duration })
  }
}
```

**Archivos a modificar:**
- `app/api/chat/stream/route.ts` - Agregar monitor calls en puntos clave

**Test:**
- Completar lección y verificar logs en consola
- Cada evento debe tener timestamp y metadata

---

#### 3.3 Optimizaciones (2-3h)

**A. Prompt Caching (reduce costos 90%)**

```typescript
// En /api/chat/stream
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 768,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }  // Cache this prompt
    }
  ],
  messages: conversationHistory,
  stream: true
})
```

**B. Reducir tokens en historial**

```typescript
// Cambiar de últimos 10 mensajes → últimos 5
const recentMessages = await prisma.message.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'desc' },
  take: 5,  // Antes: 10
  select: { role: true, content: true }
})
```

**C. Comprimir mensajes antiguos**

```typescript
// Mensajes > 7 días → comprimir contenido largo
const oldMessages = await prisma.message.findMany({
  where: {
    sessionId,
    timestamp: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    content: { length: { gt: 500 } }
  }
})

for (const msg of oldMessages) {
  await prisma.message.update({
    where: { id: msg.id },
    data: { content: msg.content.substring(0, 200) + '...' }
  })
}
```

**Test:**
- Verificar que prompt caching funciona (logs de Anthropic muestran cache hits)
- Medir reducción en costos (antes vs después)

---

#### 3.4 Polish UI/UX (2-3h)

**A. Animaciones de transición entre actividades**

```typescript
// En chat-interface.tsx
const [isTransitioning, setIsTransitioning] = useState(false)

useEffect(() => {
  // Detectar cambio de actividad
  if (prevActivityId !== currentActivityId) {
    setIsTransitioning(true)
    setTimeout(() => setIsTransitioning(false), 1000)
  }
}, [currentActivityId])

// CSS
<div className={`transition-all ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
  {/* Chat messages */}
</div>
```

**B. Celebración al completar lección**

```typescript
// Cuando progress.percentage === 100
<Confetti
  width={window.innerWidth}
  height={window.innerHeight}
  recycle={false}
  numberOfPieces={200}
/>
```

**C. Feedback visual cuando se activa guardrail**

```typescript
// Mensaje del assistant con guardrail tiene badge especial
{message.role === 'assistant' && message.isGuardrail && (
  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
    ⚠️ Guardrail
  </span>
)}
```

**Test:**
- Completar lección y ver confetti
- Activar guardrail y ver badge amarillo
- Transición entre activities debe ser smooth

---

#### 3.5 Testing en staging (1-2h)

**Pasos:**
1. Deploy a Vercel staging
2. Smoke tests:
   - Login funciona
   - Chat funciona
   - Auto-progresión funciona
   - Completar lección funciona
3. Load testing:
   - 10 usuarios concurrentes
   - Todos completan lección sin errores
4. Monitoring:
   - Verificar logs en Vercel
   - No hay errores en Sentry
   - Métricas de performance OK

**Checklist:**
- [ ] Deploy exitoso
- [ ] Smoke tests pasan
- [ ] Load test pasa
- [ ] Logs muestran actividad correcta
- [ ] No memory leaks
- [ ] Rate limiting funciona

---

### Entregables Hito 3

1. ✅ Rate limiting robusto (por usuario + por sesión)
2. ✅ Logging y monitoring completo
3. ✅ Optimizaciones aplicadas (prompt caching, historial reducido)
4. ✅ UI/UX pulido con animaciones
5. ✅ Aplicación desplegada a staging y testeada
6. ✅ Production-ready para deploy final

**Duración estimada:** 8-12 horas de desarrollo

---

## 📋 Next Steps (Fase 4+)

### 1. Considerar tabla Lesson en DB

**Solo si el enfoque hardcoded funciona 100%**

**Migración:**
```typescript
// 1. Agregar Lesson.contentJson en schema
model Lesson {
  id String @id @default(uuid())
  title String
  description String
  contentJson Json  // Migrar data/lesson01.ts aquí
  published Boolean @default(false)
  createdAt DateTime @default(now())
}

// 2. Seed inicial
const lesson01Content = require('../data/lesson01.ts')
await prisma.lesson.create({
  data: {
    id: 'lesson-html-01',
    title: lesson01Content.lesson.title,
    description: lesson01Content.lesson.description,
    contentJson: lesson01Content,
    published: true
  }
})

// 3. Sistema de carga híbrido
export async function loadLesson(lessonId: string) {
  if (process.env.ALLOW_HARDCODE_LESSON === '1') {
    return hardcodedLesson  // Dev: hardcoded
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId }
  })
  return lesson?.contentJson as LessonContent  // Prod: DB
}
```

---

### 2. Dashboard de progreso

**Vista de todas las sesiones del usuario:**
```typescript
// /lessons/[userId]/dashboard
- Lecciones completadas: 3/10
- Tiempo total de estudio: 12h 45min
- Actividades completadas: 21/70
- Promedio de intentos por actividad: 1.8
- Racha actual: 5 días
```

**Estadísticas de aprendizaje:**
- Gráfico de progreso semanal
- Actividades más difíciles (más intentos)
- Tiempo promedio por actividad
- Comparación con otros estudiantes (percentil)

---

### 3. Sistema de reintentos

**Permitir reiniciar lección desde cero:**
```typescript
model LessonSession {
  // ... campos existentes
  sessionAttempt Int @default(1)  // Ya existe en schema
}

// Endpoint: POST /api/session/retry
async function retryLesson(oldSessionId: string) {
  const oldSession = await prisma.lessonSession.findUnique({
    where: { id: oldSessionId }
  })

  // Crear nueva sesión con attempt++
  const newSession = await prisma.lessonSession.create({
    data: {
      userId: oldSession.userId,
      lessonId: oldSession.lessonId,
      sessionAttempt: oldSession.sessionAttempt + 1,
      startedAt: new Date()
    }
  })

  return newSession
}
```

---

### 4. Lecciones adicionales

**Expandir catálogo:**
- `data/lesson02.ts` - CSS Básico (selectores, box model, flexbox)
- `data/lesson03.ts` - JavaScript Básico (variables, funciones, DOM)
- `data/lesson04.ts` - HTML Avanzado (formularios, semantic HTML, accesibilidad)
- `data/lesson05.ts` - Proyecto Final (página web completa con HTML+CSS+JS)

**Consideraciones:**
- Reutilizar misma estructura de `lesson01.ts`
- Mantener 3-4 moments por lección
- 2-3 activities por moment
- Balance entre `explanation` y `practice` types

---

## 📊 Métricas de Éxito

### Hito 1:
- ✅ 100% de sesiones pueden completarse end-to-end
- ✅ Auto-progresión funciona sin intervención manual
- ✅ 0 errores en completar las 7 activities

### Hito 2:
- ✅ Tangent limit respetado en 100% de casos
- ✅ Hints aparecen correctamente después de 3+ intentos
- ✅ Guardrails activan en 100% de casos relevantes

### Hito 3:
- ✅ Rate limit previene abuso (0 casos de spam)
- ✅ Costos reducidos 90% con prompt caching
- ✅ Load test pasa con 10 usuarios concurrentes
- ✅ 0 errores en producción en primera semana

---

## 🎯 Timeline Completo

| Fase | Duración | Entregable |
|------|----------|-----------|
| **Hito 1** | 8-12h (1-2 días) | Lección completa end-to-end |
| **Hito 2** | 6-9h (1 día) | Tutor inteligente con hints/guardrails |
| **Hito 3** | 8-12h (1-2 días) | Production-ready deployado |
| **Total** | 22-33h (3-5 días) | Aplicación completa funcionando |

**Fase 4+ (Next Steps):** 2-4 semanas adicionales

---

## ✅ Checklist Pre-Inicio

Antes de empezar Hito 1, verificar:

- [x] `data/lesson01.ts` existe y está completo (7 activities)
- [x] `lib/prompt-builder.ts` existe y funciona
- [x] `lib/activity-verification.ts` existe y funciona
- [x] `lib/lesson-parser.ts` tiene `getNextActivity()`
- [x] Schema actual tiene LessonSession, ActivityProgress, Message
- [x] `/api/chat/stream` funciona con streaming básico
- [x] Environment variables configuradas (ANTHROPIC_API_KEY, etc)
- [x] NextAuth funciona (login con test user)
- [x] Prisma Studio conecta correctamente

**Estado:** ✅ TODO LISTO - Iniciar Hito 1

---

**Última actualización:** 2025-11-09
**Versión:** 1.0 - Plan Simplificado Aprobado
