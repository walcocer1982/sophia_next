# MASTER_PLAN.md

## Sistema de Clases Interactivas de 20 Minutos

> **Stack:** Next.js + Anthropic SDK + PostgreSQL (Neon/Prisma)
> **Última actualización:** 2025-11-08

***

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Orquestador Híbrido](#orquestador-híbrido)
3. [Gran Flujo de la Clase](#gran-flujo-de-la-clase)
4. [Mini-Flujos Detallados](#mini-flujos-detallados)
5. [Estructura de Datos](#estructura-de-datos)

***

## 🏗️ ARQUITECTURA DEL SISTEMA

### Principios de Diseño

- **Orquestación proactiva:** El tutor siempre propone siguiente acción, nunca espera pasivamente
- **Progreso constante:** Sistema basado en estados (Moments → Activities) con transiciones automáticas
- **Memoria contextual:** Ventana deslizante de N mensajes recientes + resumen de progreso
- **Simplicidad razonable:** 1 orquestador híbrido, sin frameworks complejos

### Stack Técnico

```
┌─────────────────────────────────────────┐
│         FRONTEND (Next.js)              │
│  - UI Chat + Stream Response            │
│  - Indicadores de progreso visual       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│   ORQUESTADOR HÍBRIDO (Backend)         │
│  ┌───────────────────────────────────┐  │
│  │  FAST PATH (Código JS/TS)        │  │
│  │  - Regex/keywords (90% casos)     │  │
│  │  - Latencia: < 10ms               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  SLOW PATH (LLM Clasificador)    │  │
│  │  - Claude Haiku (casos ambiguos)  │  │
│  │  - Latencia: ~300ms               │  │
│  └───────────┬───────────────────────┘  │
│              │                           │
│  ┌───────────▼───────────────────────┐  │
│  │  DECISIÓN DE FLUJO               │  │
│  │  - Selecciona mini-flujo          │  │
│  │  - Construye system prompt        │  │
│  └───────────┬───────────────────────┘  │
└──────────────┼───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│   LLM PRINCIPAL (Claude Sonnet)          │
│  - Generación de respuestas educativas   │
│  - Metodología socrática                 │
│  - Stream response                       │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│   DATABASE (PostgreSQL + Prisma)         │
│  - User, Account (auth)                  │
│  - Lesson (contentJson)                  │
│  - LessonSession (estado general)        │
│  - ActivityProgress (tracking granular)  │
│  - Message (conversación)                │
└──────────────────────────────────────────┘
```

***

## 🧠 ORQUESTADOR HÍBRIDO

### Arquitectura de 3 Capas

#### 1. FAST PATH - Clasificación con Código (90% casos)

**Responsabilidad:** Detectar casos obvios con heurísticas simples

```typescript
// Casos que maneja con código puro:
✅ Profanidad obvia (regex de palabras prohibidas)
✅ Mensajes muy cortos (< 30 chars = siempre NORMAL)
✅ Solicitudes de ayuda explícita (patterns conocidos)
✅ Presencia de keywords del tema actual

// Ventajas:
- Latencia: < 10ms
- Costo: $0
- Predecible y controlable
```

#### 2. SLOW PATH - Clasificación con LLM (10% casos)

**Responsabilidad:** Analizar casos ambiguos que requieren comprensión contextual

```typescript
// Casos que maneja con Claude Haiku:
✅ Mensajes largos sin keywords obvias
✅ Ironía o sarcasmo
✅ Desviaciones sutiles del tema
✅ Contexto cultural complejo

// Ventajas:
- Precisión alta en casos difíciles
- Adaptable sin cambiar código
- Multilingüe automático

// Modelo: Claude 3 Haiku
// Costo: ~$0.25 por 1M tokens (~$0.0001 por mensaje)
// Latencia: ~200-500ms
```

#### 3. DECISIÓN Y EJECUCIÓN

**Responsabilidad:** Tomar resultado de clasificación y construir contexto para LLM principal

```typescript
// Acciones del orquestador:
1. Recibe clasificación {flow, confidence, reason}
2. Selecciona mini-flujo correspondiente
3. Construye system prompt dinámico con:
   - [CACHED] Rol del tutor + Lesson.contentJson completo
   - [DYNAMIC] Estado actual (activityId) + instrucciones del flujo
4. Recupera últimos N mensajes de DB (tabla Message)
5. Llama a Claude Sonnet con contexto completo
6. Guarda respuesta en Message + actualiza LessonSession/ActivityProgress
7. Verifica si debe transicionar de actividad/momento
```

### Lógica de Decisión

```typescript
async analyzeMessage(userMessage: string, context: SessionContext) {
  
  // LAYER 1: Fast Path
  if (this.isProfanityObvious(userMessage)) {
    return { flow: 'MODERATION', confidence: 1.0, method: 'regex' }
  }
  
  if (userMessage.length < 30) {
    return { flow: 'NORMAL', confidence: 1.0, method: 'heuristic' }
  }
  
  if (this.isExplicitHelpRequest(userMessage)) {
    return { flow: 'REINFORCEMENT', confidence: 0.9, method: 'regex' }
  }
  
  const hasKeywords = this.checkTopicKeywords(userMessage, context)
  if (hasKeywords) {
    return { flow: 'NORMAL', confidence: 0.85, method: 'keywords' }
  }
  
  // LAYER 2: Slow Path (casos ambiguos)
  if (userMessage.length > 50 && !hasKeywords) {
    return await this.classifyWithLLM(userMessage, context)
  }
  
  // Default
  return { flow: 'NORMAL', confidence: 0.7, method: 'default' }
}
```

***

## 🌊 GRAN FLUJO DE LA CLASE

### Diagrama de Alto Nivel

```
[INICIO DE SESIÓN]
       ↓
┌──────────────────────────────────────────┐
│ 1. Inicialización de Clase               │
│    - Carga Lesson.contentJson            │
│    - Crea LessonSession                  │
│    - Presenta objetivos                  │
└──────────────────┬───────────────────────┘
                   ↓
         ┌─────────────────┐
         │  LOOP PRINCIPAL │
         └─────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│ USER INPUT                               │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│ ORQUESTADOR HÍBRIDO                      │
│ - Analiza mensaje (Fast/Slow Path)      │
│ - Clasifica flujo                        │
└──────────────────┬───────────────────────┘
                   ↓
        ┌──────────┴──────────┐
        ↓                     ↓
┌───────────────┐    ┌────────────────┐
│ FLUJOS        │    │ FLUJOS         │
│ NORMALES      │    │ EXCEPCIÓN      │
│ (2-6)         │    │ (7-8)          │
└───────┬───────┘    └────────┬───────┘
        │                     │
        └──────────┬──────────┘
                   ↓
┌──────────────────────────────────────────┐
│ 2. Despliegue y Tutoría por Momento      │
│    - Guía socrática                      │
│    - Ejecuta actividades                 │
│    - Propone siguiente acción            │
│    - Actualiza ActivityProgress          │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│ 3. Verificación de Comprensión           │
│    - Evalúa respuestas                   │
│    - Valida objetivos                    │
│    - Marca ActivityProgress.passed       │
└──────────────────┬───────────────────────┘
                   ↓
          ┌────────┴────────┐
          ↓                 ↓
     ┌─────────┐      ┌──────────┐
     │Objetivo │      │Objetivo  │
     │Cumplido?│      │NO cumplido│
     └────┬────┘      └────┬─────┘
          │ SI             │ NO
          ↓                ↓
┌─────────────────┐  ┌────────────────┐
│ 4. Transición   │  │ 5. Reforzamiento│
│    Actividad/   │  │    Dinámico     │
│    Momento      │  │                │
└────┬────────────┘  └────┬───────────┘
     │                    │
     │                    └──────┐
     ↓                           ↓
┌─────────────────────────────────┐
│ ¿Hay más actividades?           │
└────┬────────────────────────────┘
     │ SÍ: volver al LOOP PRINCIPAL
     │ NO: ↓
┌──────────────────────────────────────────┐
│ 6. Cierre de Clase y Evaluación Final    │
│    - Recapitulación                      │
│    - Marca LessonSession.completedAt     │
│    - Calcula LessonSession.finalScore    │
└──────────────────┬───────────────────────┘
                   ↓
              [FIN SESIÓN]
```

### Flujos de Excepción (Activos en todo momento)

```
Durante cualquier interacción:
  ↓
7. REDIRECCIÓN (Desviación/Repregunta)
   - Detecta off-topic
   - Redirige elegantemente
   - Mantiene foco en actividad
   
8. MODERACIÓN (Comportamiento Inapropiado)
   - Detecta lenguaje grosero
   - Incrementa LessonSession.behaviorFlags
   - Reestablece límites
```

***

## 🔄 MINI-FLUJOS DETALLADOS

### FLUJO 1: Inicialización de Clase y Contextualización

**Trigger:** Primera interacción de la sesión

**Objetivo:** Establecer contexto, expectativas y engagement inicial

**Proceso:**
1. Obtener Lesson desde DB (con `contentJson`)
2. Parsear estructura: moments → activities → objectives
3. Crear LessonSession en PostgreSQL:
   ```typescript
   await prisma.lessonSession.create({
     data: {
       userId: user.id,
       lessonId: lesson.id,
       status: 'active',
       activityId: lesson.contentJson.moments[0].activities[0].id, // primera actividad
       startedAt: new Date(),
       elapsedSeconds: 0,
       totalMessages: 0,
       behaviorFlags: 0
     }
   })
   ```
4. Crear primer ActivityProgress:
   ```typescript
   await prisma.activityProgress.create({
     data: {
       lessonSessionId: session.id,
       activityId: session.activityId,
       status: 'in_progress',
       attempts: 0,
       startedAt: new Date()
     }
   })
   ```
5. Generar mensaje inicial del tutor:
   - Saludo personalizado
   - Presentación breve del tema (< 3 líneas)
   - Objetivos clave de la clase
   - **Primera acción concreta**

**System Prompt Específico:**
```
You are starting a 20-minute class on {topic}.

LEARNING OBJECTIVES:
{objectives_list}

STRUCTURE:
- {N} learning moments
- Linear progression with validations

Your first interaction must:
1. Greet warmly but briefly (1 sentence)
2. Present the topic attractively (2-3 sentences)
3. Highlight 1-2 main objectives
4. END with a specific question or initial activity that activates the student

FORBIDDEN: Generic questions like "Ready to start?" or "Any questions?"
REQUIRED: Specific action like "Before diving in, what do you know about X?" or "Look at this example: [example]. What pattern do you notice?"
```

**Output Esperado:**
- Mensaje guardado en tabla `Message`
- `LessonSession` y primer `ActivityProgress` creados
- Usuario tiene clara primera acción

***

### FLUJO 2: Despliegue y Tutoría por Momento

**Trigger:** Usuario responde dentro de la actividad actual

**Objetivo:** Guiar aprendizaje socrático con progresión clara

**Proceso:**
1. Orquestador determina que el flujo es NORMAL
2. Recuperar últimos N mensajes (N=6-10):
   ```typescript
   const recentMessages = await prisma.message.findMany({
     where: { sessionId: session.id },
     orderBy: { createdAt: 'desc' },
     take: 6
   })
   ```
3. Obtener actividad actual desde `lesson.contentJson`:
   ```typescript
   const currentActivity = findActivityById(
     lesson.contentJson, 
     session.activityId
   )
   ```
4. Construir system prompt con contexto de actividad
5. LLM genera respuesta educativa
6. Guardar mensaje en DB:
   ```typescript
   await prisma.message.create({
     data: {
       sessionId: session.id,
       role: 'assistant',
       content: assistantResponse,
       momentId: getCurrentMomentId(lesson.contentJson, session.activityId),
       activityId: session.activityId,
       flowUsed: 'NORMAL',
       tokensInput: usage.input_tokens,
       tokensOutput: usage.output_tokens,
       tokensCached: usage.cache_read_input_tokens,
       modelUsed: 'claude-3-5-sonnet'
     }
   })
   ```
7. Actualizar progreso:
   ```typescript
   await prisma.lessonSession.update({
     where: { id: session.id },
     data: {
       totalMessages: { increment: 2 },
       elapsedSeconds: calculateElapsed(session.startedAt),
       lastActivityAt: new Date()
     }
   })
   
   await prisma.activityProgress.update({
     where: {
       lessonSessionId_activityId: {
         lessonSessionId: session.id,
         activityId: session.activityId
       }
     },
     data: {
       attempts: { increment: 1 },
       timeSpentSeconds: calculateTimeSpent()
     }
   })
   ```

**System Prompt Específico:**
```
CURRENT MOMENT: {moment_title} ({moment_num}/{total_moments})
ACTIVITY: {activity_title}
TYPE: {activity_type} // socratic_debate | practical_exercise | guided_reflection
OBJECTIVE: {learning_objective}

PROGRESS: {progress}% | TIME: {elapsed}/{total} min

SOCRATIC METHODOLOGY:
- DO NOT give direct answers
- Ask questions that guide discovery
- Validate efforts before correcting
- Break down complex concepts into simple steps
- If student is close, confirm and deepen
- If student veers off, redirect with more specific question

STRUCTURE OF YOUR RESPONSE:
1. Acknowledge/validate student's message (1 sentence)
2. Provide clarification or deepening as needed (2-3 sentences)
3. **ALWAYS end with:**
   - A specific question, OR
   - A clear instruction of what to do, OR
   - A concrete exercise to solve

EXAMPLES OF EFFECTIVE ENDINGS:
✅ "What would happen if we change X to Y?"
✅ "Try solving: [specific exercise]"
✅ "Reflect: how does this connect with [previous concept]?"

❌ FORBIDDEN to end with:
- "Does that make sense?"
- "Any questions?"
- "When you're ready, we'll continue"
```

**Output Esperado:**
- Respuesta socrática del tutor
- Usuario siempre sabe qué hacer después
- `Message` guardado con metadata completa
- `ActivityProgress` actualizado con intentos

***

### FLUJO 3: Verificación y Validación de Comprensión

**Trigger:** `activity.requires_validation === true` O tiempo en actividad > umbral

**Objetivo:** Confirmar que se alcanzó el objetivo antes de avanzar

**Proceso:**
1. Orquestador detecta condición de validación:
   ```typescript
   const activityProgress = await prisma.activityProgress.findUnique({
     where: {
       lessonSessionId_activityId: {
         lessonSessionId: session.id,
         activityId: session.activityId
       }
     }
   })
   
   const shouldValidate = (
     activityProgress.timeSpentSeconds > 120 && // > 2 min
     currentActivity.requires_validation === true
   )
   ```
2. Construir system prompt con criterios de validación
3. LLM hace pregunta(s) de verificación
4. Usuario responde
5. **EVALUAR COMPRENSIÓN** con segunda llamada LLM (rápida):
   ```typescript
   const evaluationPrompt = `
   Objective: ${currentActivity.objective}
   Criteria: ${currentActivity.completion_criteria.join(', ')}
   Student response: "${userResponse}"
   
   Did the student demonstrate understanding of the objective?
   Respond with JSON: {"passed": true/false, "score": 0-100, "gaps": []}
   `
   ```
6. Según evaluación:
   - `passed: true` → Actualizar ActivityProgress y activar FLUJO 4 (Transición)
   - `passed: false` → Activar FLUJO 5 (Reforzamiento)
7. Guardar evaluación:
   ```typescript
   await prisma.activityProgress.update({
     where: { id: activityProgress.id },
     data: {
       status: evaluation.passed ? 'completed' : 'in_progress',
       passed: evaluation.passed,
       completedAt: evaluation.passed ? new Date() : null,
       evidenceData: {
         validationScore: evaluation.score,
         keyResponses: extractKeyResponses(messages),
         gaps: evaluation.gaps
       }
     }
   })
   ```

**System Prompt Específico:**
```
[MODE: COMPREHENSION VERIFICATION]

You've been working with the student on:
OBJECTIVE: {learning_objective}
TIME INVESTED: {time_in_activity} min

COMPREHENSION CRITERIA:
{completion_criteria}

Your task now:
1. Ask ONE key question that reveals if they understand the central concept
2. The question must require application, not memory
3. It should NOT be obvious or give hints in the statement

EXAMPLES:
❌ "Do you understand what a function is?"
❌ "Do you remember what happens when you divide by zero?"
✅ "If f(x) = 1/x, what value must x have for f(x) = 0.5?"
✅ "Design an example where this rule does NOT apply"

FORMAT:
- Clear statement of the question/challenge
- If it's an exercise, provide specific data
- Wait for their response to evaluate
```

**Output Esperado:**
- Pregunta de validación clara
- Respuesta del estudiante
- `ActivityProgress.passed` actualizado
- Decisión: avanzar (FLUJO 4) o reforzar (FLUJO 5)

***

### FLUJO 4: Transición Proactiva entre Actividades/Momentos

**Trigger:** `ActivityProgress.passed === true` O tiempo máximo alcanzado

**Objetivo:** Cerrar actividad/momento actual e introducir siguiente sin perder momentum

**Proceso:**
1. Determinar siguiente actividad:
   ```typescript
   const nextActivity = getNextActivity(
     lesson.contentJson,
     session.activityId
   )
   ```
2. Verificar si cambia de momento:
   ```typescript
   const transitioningMoment = shouldTransitionMoment(
     lesson.contentJson,
     session.activityId,
     nextActivity?.id
   )
   ```
3. Si cambia de momento, generar resumen:
   ```typescript
   const momentMessages = await prisma.message.findMany({
     where: {
       sessionId: session.id,
       momentId: currentMomentId
     }
   })
   
   const summary = await generateMomentSummary({
     momentId: currentMomentId,
     messages: momentMessages,
     objective: currentMoment.objective
   })
   ```
4. Actualizar LessonSession:
   ```typescript
   await prisma.lessonSession.update({
     where: { id: session.id },
     data: {
       activityId: nextActivity.id,
       momentSummaries: transitioningMoment ? {
         push: {
           momentId: currentMomentId,
           summary: summary,
           completedAt: new Date()
         }
       } : undefined
     }
   })
   ```
5. Crear nuevo ActivityProgress:
   ```typescript
   await prisma.activityProgress.create({
     data: {
       lessonSessionId: session.id,
       activityId: nextActivity.id,
       status: 'in_progress',
       startedAt: new Date()
     }
   })
   ```
6. Construir mensaje de transición

**System Prompt Específico:**
```
[MODE: ACTIVITY/MOMENT TRANSITION]

COMPLETED ACTIVITY: {previous_activity}
COMPLETED MOMENT: {previous_moment} (if applicable)
KEY ACHIEVEMENTS SUMMARY:
{summary_key_points}

NEXT ACTIVITY: {next_activity}
NEXT MOMENT: {next_moment} (if changed)
NEW OBJECTIVE: {new_objective}

Your message must:
1. Celebrate progress (1 positive sentence)
2. Summarize 1-2 key learnings from previous activity/moment
3. Create connection: "Now that you master X, let's explore Y"
4. Present new activity/moment briefly (2 sentences max)
5. **Launch first action of new activity immediately**

STRUCTURE:
"Excellent! [specific validation]. 

Summarizing: [key point 1] and [key point 2].

Now that [connection with previous], let's move to [new activity/moment]: [brief description].

[Specific first action of new activity]"

FORBIDDEN:
- Pauses or questions like "Ready to continue?"
- Generic transitions without connection
- Forgetting to launch first action
```

**Output Esperado:**
- Sensación de progreso y logro
- `LessonSession.activityId` actualizado
- Nuevo `ActivityProgress` creado
- Si cambió momento: `momentSummaries` actualizado
- Usuario enganchado en nueva actividad

***

### FLUJO 5: Reforzamiento y Adaptación Dinámica

**Trigger:** 
- `ActivityProgress.passed === false` (validación fallida)
- Clasificación explícita como "REINFORCEMENT"
- Usuario pide ayuda directamente

**Objetivo:** Cerrar gaps de comprensión sin avanzar prematuramente

**Proceso:**
1. Identificar gap específico desde última evaluación:
   ```typescript
   const activityProgress = await prisma.activityProgress.findUnique({
     where: {
       lessonSessionId_activityId: {
         lessonSessionId: session.id,
         activityId: session.activityId
       }
     }
   })
   
   const gaps = activityProgress.evidenceData?.gaps || []
   ```
2. Seleccionar estrategia de reforzamiento basada en intentos:
   ```typescript
   const strategy = activityProgress.attempts < 3 
     ? 'different_analogy'
     : 'simplified_steps'
   ```
3. Construir system prompt con estrategia
4. Iterar hasta comprensión O límite de tiempo/intentos
5. Actualizar evidencia:
   ```typescript
   await prisma.activityProgress.update({
     where: { id: activityProgress.id },
     data: {
       evidenceData: {
         ...activityProgress.evidenceData,
         reinforcementStrategy: strategy,
         reinforcementAttempts: activityProgress.attempts
       }
     }
   })
   ```

**System Prompt Específico:**
```
[MODE: REINFORCEMENT - CLOSING GAPS]

OBJECTIVE NOT ACHIEVED: {learning_objective}
IDENTIFIED GAPS: {gap_description}

ATTEMPT HISTORY: {num_attempts}

REINFORCEMENT STRATEGY:
- DO NOT repeat the same explanation
- USE a different analogy or real-world example
- BREAK DOWN the concept into smaller components
- ASK simpler questions that guide step by step

PROCESS:
1. Validate effort: "I see you're working on this, let's approach it from another angle"
2. Present concept DIFFERENTLY (new analogy/example)
3. Break down into 2-3 very simple steps
4. Start with the most basic step
5. **Give clear instruction of what to do with that first step**

EXAMPLE:
"I understand that [concept] can be confusing. Let's think of it this way: [simple analogy].

Let's go step by step:
1. First, [very basic step]
2. Then, [next step]
3. Finally, [final step]

Let's start with the simplest: [question/exercise from step 1]"

DO NOT give the complete answer. Guide discovery with small steps.
```

**Output Esperado:**
- Enfoque renovado sin frustración
- Concepto presentado desde ángulo diferente
- `ActivityProgress.evidenceData` actualizado con estrategia
- Eventual comprensión o transición informada

***

### FLUJO 6: Cierre de Clase y Evaluación Final

**Trigger:** Última actividad completada O tiempo total alcanzado (20 min)

**Objetivo:** Consolidar aprendizajes y proporcionar cierre satisfactorio

**Proceso:**
1. Recopilar todos los summaries de momentos:
   ```typescript
   const session = await prisma.lessonSession.findUnique({
     where: { id: sessionId },
     include: { lesson: true }
   })
   const allSummaries = session.momentSummaries
   ```
2. Recopilar todas las ActivityProgress:
   ```typescript
   const allProgress = await prisma.activityProgress.findMany({
     where: { lessonSessionId: session.id },
     orderBy: { createdAt: 'asc' }
   })
   ```
3. Generar evaluación final del progreso:
   ```typescript
   const completedActivities = allProgress.filter(ap => ap.passed === true).length
   const totalActivities = lesson.contentJson.moments.reduce(
     (sum, m) => sum + m.activities.length, 0
   )
   const finalScore = Math.round((completedActivities / totalActivities) * 100)
   
   const objectivesAchieved = evaluateObjectives(
     lesson.contentJson.objectives,
     allProgress
   )
   ```
4. Construir mensaje de cierre completo
5. Actualizar estado final en DB:
   ```typescript
   await prisma.lessonSession.update({
     where: { id: session.id },
     data: {
       status: 'completed',
       completedAt: new Date(),
       passed: finalScore >= 70,
       finalScore: finalScore,
       objectivesAchieved: objectivesAchieved,
       nextSteps: generateNextSteps(allProgress)
     }
   })
   ```

**System Prompt Específico:**
```
[MODE: CLASS CLOSURE]

TOTAL TIME: {total_time} min
MOMENTS COMPLETED: {completed_moments}/{total_moments}

CLASS OBJECTIVES:
{initial_objectives}

MOMENT SUMMARIES:
{all_summaries}

ACTIVITIES COMPLETED: {completed_activities}/{total_activities}

Your closing message must:

1. ACKNOWLEDGMENT (1-2 sentences)
   - Validate student's work and effort
   - Highlight 1 specific observable achievement

2. RECAP (3-4 sentences)
   - Connect the 2-3 most important concepts covered
   - Show the logical progression of the class
   - Use concrete examples mentioned during class

3. PROGRESS EVALUATION (2 sentences)
   - Which objectives were achieved
   - If there are gaps, mention them constructively

4. NEXT STEPS (2-3 concrete actions)
   - Specific exercises to practice
   - Concepts to explore later
   - Connection with next topic/class

FORMAT:
"[Specific acknowledgment]. 

In this class we worked on: [concept 1, concept 2, concept 3], progressing from [starting point] to [end point].

You have achieved: [completed objectives]. [Note about gaps if applicable].

To consolidate your learning:
1. [Concrete action 1]
2. [Concrete action 2]
3. [Concrete action 3]

[Motivational final phrase connected to future learning]"

THE CLOSURE MUST feel complete but not final - inspire continued learning.
```

**Output Esperado:**
- Sensación de logro y cierre
- `LessonSession` marcado como `completed`
- `finalScore` y `objectivesAchieved` calculados
- Registro completo para analytics

***

### FLUJO 7: Redirección por Desviación o Repregunta

**Trigger:** 
- Mensaje largo (>50 chars) sin keywords del tema
- Clasificación LLM como "OFF_TOPIC"
- Repregunta sobre algo ya explicado

**Objetivo:** Reconocer brevemente y redirigir sin romper el flow

**Proceso:**
1. Orquestador detecta desviación
2. Determinar tipo:
   - `valid_curiosity`: Tema relacionado pero fuera de alcance
   - `completely_off_topic`: Completamente fuera del tema
   - `repetition`: Ya se explicó, necesita recordatorio
3. Construir respuesta que:
   - Valide brevemente (1 frase)
   - Reconecte con actividad actual
   - Proponga retomar foco
4. Guardar mensaje con metadata especial:
   ```typescript
   await prisma.message.create({
     data: {
       sessionId: session.id,
       role: 'assistant',
       content: redirectionResponse,
       activityId: session.activityId,
       flowUsed: 'REDIRECTION',
       metadata: {
         redirectionType: tipo,
         originalTopic: detectedOffTopic
       }
     }
   })
   ```

**System Prompt Específico:**
```
[MODE: ELEGANT REDIRECTION]

STUDENT MESSAGE: "{user_message}"
DEVIATION TYPE: {tipo}
CURRENT ACTIVITY: {activity_title}
OBJECTIVE: {objective}

REDIRECTION PROTOCOL:

If valid_curiosity:
"Interesting question about [topic]. That concept connects with [current topic], but we'll see it later. For now, let's focus on [current objective] because it's the foundation to understand that. [Specific action from current topic]"

If completely_off_topic:
"I understand your interest in [mentioned topic], but in this class we're focusing on [current topic]. Let's return to [last activity]: [specific action]"

If repetition:
"Good question - we already explored this when [brief reference]. Remember: [key point in 1 sentence]. Now that it's clear, [next step]"

RULES:
- Maximum 3 sentences before redirecting
- DO NOT make student feel bad for deviating
- ALWAYS end with concrete action from current topic
- Maintain positive and collaborative tone
```

**Output Esperado:**
- Estudiante no se siente ignorado
- Redirección clara pero amable
- `Message` con `flowUsed: 'REDIRECTION'`
- Momentum mantenido

***

### FLUJO 8: Moderación y Gestión de Comportamiento Inapropiado

**Trigger:**
- Profanidad detectada (regex o LLM)
- Lenguaje ofensivo, grosero o irrespetuoso
- Ataques al sistema o tutor

**Objetivo:** Reestablecer límites manteniendo ambiente educativo positivo

**Proceso:**
1. Orquestador detecta violación
2. Incrementar contador en LessonSession:
   ```typescript
   const session = await prisma.lessonSession.update({
     where: { id: sessionId },
     data: {
       behaviorFlags: { increment: 1 }
     }
   })
   ```
3. Guardar mensaje con flag especial:
   ```typescript
   await prisma.message.create({
     data: {
       sessionId: session.id,
       role: 'user',
       content: userMessage,
       activityId: session.activityId,
       flowUsed: 'MODERATION',
       metadata: {
         moderationType: 'profanity',
         flagsTotal: session.behaviorFlags
       }
     }
   })
   ```
4. Si `behaviorFlags > 3`: Considerar terminar sesión
5. Construir respuesta de moderación
6. Aplicar cooldown si es necesario

**System Prompt Específico:**
```
[MODE: MODERATION - INAPPROPRIATE BEHAVIOR]

INCIDENT: {incident_type}
MESSAGE: "{user_message}"
PREVIOUS FLAGS: {previous_flags}

MODERATION PROTOCOL:

1. VALIDATE EMOTION (1 sentence)
   "I understand that [topic] can generate frustration..."
   "I see this is challenging..."

2. REESTABLISH LIMITS (1-2 sentences)
   "However, we need to maintain a respectful environment to make the most of learning time."
   "I ask that we keep a constructive tone."

3. OFFER PATH FORWARD (1-2 sentences)
   "If you need a moment, we can pause. If you prefer to continue, I'm here to help you."
   "Let's try again: [reformulate last activity in simpler way]"

4. REDIRECT TO ACTIVITY (1 sentence with action)
   "[Simpler specific action from current topic]"

TONE:
- Firm but not punitive
- Empathetic but with clear limits
- Focused on continuing productively

IF FLAGS > 3:
"I've noticed you're having difficulties maintaining focus. Perhaps it's better to pause for today and resume when you're ready to make the most of the class. What do you prefer?"
```

**Output Esperado:**
- Límites claros sin hostilidad
- `LessonSession.behaviorFlags` incrementado
- `Message` con `flowUsed: 'MODERATION'`
- Oportunidad de continuar o sesión terminada

***

## 📊 ESTRUCTURA DE DATOS

### Modelos de Base de Datos (PostgreSQL + Prisma)

#### 1. User
Usuarios del sistema (estudiantes). Contiene datos básicos de autenticación y perfil.

**Campos clave:** `id`, `email`, `name`, `googleId`

**Uso:** Autenticación y identificación de estudiantes

***

#### 2. Account
OAuth providers (Google). Vincula usuario con su cuenta externa.

**Campos clave:** `userId`, `provider`, `providerAccountId`

**Uso:** Gestión de login con Google OAuth

***

#### 3. Lesson
Contenido educativo estructurado en JSON.

**Campos clave:** `id`, `title`, `contentJson` (moments→activities), `isPublished`

**Estructura de contentJson:**
```typescript
interface LessonContent {
  duration_minutes: number       // 20
  objectives: string[]
  moments: Moment[]
}

interface Moment {
  id: string                     // "moment_1_intro"
  title: string
  order: number
  suggested_time_minutes: number
  objective: string
  activities: Activity[]
}

interface Activity {
  id: string                     // "activity_1_1_debate"
  title: string
  type: 'socratic_debate' | 'practical_exercise' | 'guided_reflection' | 'interactive_explanation'
  objective: string
  keywords: string[]             // para clasificación de mensajes
  guiding_questions: string[]
  completion_criteria: string[]
  requires_validation: boolean
}
```

**Uso:** Define qué aprenderá el estudiante (estructura: Lesson→Moments→Activities)

***

#### 4. LessonSession
Instancia de aprendizaje de un usuario en una lección específica.

**Campos clave:** 
- `userId`, `lessonId` (relaciones)
- `status` ('active' | 'completed' | 'paused' | 'terminated')
- `activityId` (referencia string a Activity.id en contentJson)
- `startedAt`, `completedAt`, `lastActivityAt`
- `elapsedSeconds`
- `passed`, `finalScore`
- `momentSummaries` (JSON array: `[{momentId, summary, completedAt}]`)
- `totalMessages`, `behaviorFlags`

**Uso:** Enrollment y tracking general del progreso en una lección

***

#### 5. ActivityProgress
Tracking granular por cada actividad individual dentro de una lección.

**Campos clave:** 
- `lessonSessionId`, `activityId` (composite unique)
- `status` ('pending' | 'in_progress' | 'completed' | 'skipped')
- `attempts`, `passed`
- `evidenceData` (JSON: respuestas clave, validationScore, gaps, strategies)
- `startedAt`, `completedAt`, `timeSpentSeconds`

**Uso:** Registra si completó cada actividad, intentos, respuestas del estudiante

***

#### 6. Message
Historial de conversación entre estudiante e IA.

**Campos clave:** 
- `sessionId`, `role` ('user' | 'assistant' | 'system'), `content`
- `momentId`, `activityId` (referencias string a contentJson)
- `flowUsed` ('NORMAL' | 'MODERATION' | 'REDIRECTION' | 'REINFORCEMENT')
- `classificationMethod` ('regex' | 'heuristic' | 'llm' | 'keywords')
- `confidence`
- `tokensInput`, `tokensOutput`, `tokensCached`, `latencyMs`, `modelUsed`
- `metadata` (JSON flexible)

**Uso:** Chat persistente, contexto para IA, auditoría de interacciones

---

### Flujo de Datos

```
User → inicia → LessonSession (de una Lesson)
     → conversa → Messages
     → progresa → ActivityProgress (por cada activity en contentJson)
     → completa → LessonSession.completedAt

Relación Clave:
- Lesson.contentJson contiene la estructura completa (moments/activities)
- LessonSession.activityId apunta al activity actual (string ID)
- ActivityProgress trackea progreso detallado por actividad
- Message guarda toda la conversación con metadata rica
- La orquestación navega por contentJson usando los IDs de activities
```

***

### Funciones Helper para el Orquestador

```typescript
// lib/lesson-helpers.ts

/**
 * Encuentra una actividad por su ID en el contentJson
 */
export function findActivityById(
  content: LessonContent, 
  activityId: string
): Activity | null {
  for (const moment of content.moments) {
    const activity = moment.activities.find(a => a.id === activityId)
    if (activity) return activity
  }
  return null
}

/**
 * Encuentra el momento que contiene una actividad
 */
export function findMomentByActivityId(
  content: LessonContent,
  activityId: string
): Moment | null {
  for (const moment of content.moments) {
    if (moment.activities.some(a => a.id === activityId)) {
      return moment
    }
  }
  return null
}

/**
 * Obtiene la siguiente actividad en la secuencia
 */
export function getNextActivity(
  content: LessonContent,
  currentActivityId: string
): Activity | null {
  const allActivities = content.moments.flatMap(m => m.activities)
  const currentIndex = allActivities.findIndex(a => a.id === currentActivityId)
  
  if (currentIndex === -1 || currentIndex === allActivities.length - 1) {
    return null // última actividad
  }
  
  return allActivities[currentIndex + 1]
}

/**
 * Verifica si debe transicionar de momento
 */
export function shouldTransitionMoment(
  content: LessonContent,
  currentActivityId: string,
  nextActivityId: string | null
): boolean {
  if (!nextActivityId) return false
  
  const currentMoment = findMomentByActivityId(content, currentActivityId)
  const nextMoment = findMomentByActivityId(content, nextActivityId)
  
  return currentMoment?.id !== nextMoment?.id
}

/**
 * Calcula progreso basado en actividades completadas
 */
export async function calculateProgress(
  sessionId: string,
  content: LessonContent
): Promise<number> {
  const totalActivities = content.moments.reduce(
    (sum, m) => sum + m.activities.length,
    0
  )
  
  const completedCount = await prisma.activityProgress.count({
    where: {
      lessonSessionId: sessionId,
      status: 'completed'
    }
  })
  
  return Math.round((completedCount / totalActivities) * 100)
}
```

***

## 🎯 PRÓXIMOS PASOS DE IMPLEMENTACIÓN

### Fase 1: Core del Orquestador
- [ ] Implementar `HybridSmartOrchestrator` class
- [ ] Fast Path: Funciones de clasificación con código
- [ ] Slow Path: Integración con Claude Haiku
- [ ] System prompts para cada flujo

### Fase 2: Gestión de Estado
- [ ] Funciones helper de navegación (findActivityById, getNextActivity)
- [ ] CRUD para LessonSession y ActivityProgress
- [ ] Recuperación de últimos N mensajes
- [ ] Cálculo de progreso y tiempo transcurrido

### Fase 3: Integración con LLM Principal
- [ ] Construcción dinámica de system prompts
- [ ] Implementación de prompt caching
- [ ] Stream de respuestas con Next.js
- [ ] Guardado de mensajes + metadata

### Fase 4: Mini-Flujos
- [ ] Flujo 1: Inicialización
- [ ] Flujo 2: Tutoría por momento
- [ ] Flujo 3: Verificación
- [ ] Flujo 4: Transición
- [ ] Flujo 5: Reforzamiento
- [ ] Flujo 6: Cierre
- [ ] Flujo 7: Redirección
- [ ] Flujo 8: Moderación

### Fase 5: Testing y Refinamiento
- [ ] Tests unitarios de clasificación
- [ ] Tests de integración de flujos
- [ ] Testing con usuarios reales
- [ ] Ajuste de prompts según resultados
