# Plan: Planificador de Clases Automatizado de Sophia

**Objetivo:** Desarrollar e implementar un planificador de clases automatizado para Sophia, validándolo mediante un piloto en el curso de Procesos Metalúrgicos, al 31 de marzo de 2026.

**Principio:** La IA estructura y redacta. El instructor aporta el contenido técnico y valida.

---

## Flujo Completo

```
PASO 1                    PASO 2                    PASO 3                    PASO 4
Instructor               AI + Instructor            AI genera                 Preview
da inputs                dialogan                   detalle                   + Publicar
───────────────────────────────────────────────────────────────────────────────────────

 Objetivo               AI pregunta para            Por cada actividad:       Instructor
 Contenido técnico      completar:                  - agent_instruction       simula clase
 Normativa              "¿Nivel? ¿Contexto?"        - verification.question   como estudiante
 Imágenes +                                         - success_criteria
 descripciones          Propone estructura           - imagen asignada         Ajusta si
                        de actividades                                        algo no fluye
                                                    Instructor revisa
                        Instructor aprueba          cada una                  Publica
                        o ajusta
```

---

## Paso 1: Input del Instructor

```
┌─────────────────────────────────────────────────────┐
│  NUEVA CLASE                                        │
│                                                     │
│  Curso:      [Procesos Metalúrgicos          ▼]     │
│  Tema:       [Fundición de metales             ]    │
│  Público:    [Estudiantes ingeniería           ]    │
│  Duración:   [45 min ▼]                             │
│  Normativa:  [ISO 9001, NTP relevante          ]    │
│                                                     │
│  Objetivos de aprendizaje:                          │
│  1. [Identificar tipos de fundición            ]    │
│  2. [Evaluar parámetros de temperatura         ]    │
│  3. [                                          ]    │
│                                                     │
│  Contenido técnico (OBLIGATORIO):                   │
│  [📎 Subir PDF/PPT con el material]                 │
│  ó                                                  │
│  [Escribir temas clave:                             │
│   - Matriz 5x5 según DS 024-2016-EM                │
│   - Jerarquía de controles                          │
│   - Formato Anexo 7 de mi empresa              ]    │
│                                                     │
│  Imágenes (con descripción obligatoria):            │
│  [📎 matriz_5x5.png]                                │
│  Descripción: [Matriz 5x5 según DS 024. Filas:     │
│  probabilidad A-E. Columnas: severidad 1-5.    ]    │
│                                                     │
│  [📎 jerarquia.png]                                 │
│  Descripción: [Pirámide de controles: eliminar,     │
│  sustituir, ingeniería, administrativo, EPP     ]    │
│                                                     │
│  [Generar Bosquejo →]                               │
└─────────────────────────────────────────────────────┘
```

**Campos obligatorios:**
- Tema
- Al menos 1 objetivo de aprendizaje
- Contenido técnico (PDF/texto)

**Campos opcionales:**
- Normativa
- Imágenes
- Duración (default: 30 min)

---

## Paso 2: AI Clarifica + Propone Estructura

La AI NO reescribe el objetivo. Pregunta para completar:

```
┌─────────────────────────────────────────────────────┐
│  AI: "Tengo algunas preguntas antes de generar      │
│  la estructura:"                                    │
│                                                     │
│  1. "Tu objetivo dice 'identificar tipos de         │
│     fundición'. ¿Quieres que solo los CONOZCAN      │
│     o que puedan ELEGIR cuál usar para cada caso?"  │
│                                                     │
│  2. "Mencionas parámetros de temperatura. ¿Hay      │
│     valores específicos que deben memorizar o solo   │
│     entender el concepto general?"                  │
│                                                     │
│  Instructor: "Que elijan cuál usar. Solo concepto   │
│  general de temperatura, no valores exactos."       │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  AI propone estructura:                             │
│                                                     │
│  Act 1: Introducción a fundición (explanation)      │
│  Act 2: Tipos de fundición (explanation)            │
│  Act 3: Parámetros de proceso (explanation)         │
│  Act 4: Caso práctico - elegir proceso (practice)   │
│  Act 5: Cierre y resumen (closing)                  │
│                                                     │
│  [✓ Aprobar estructura] [✏️ Ajustar]                │
└─────────────────────────────────────────────────────┘
```

**Reglas de la AI en este paso:**
- NO inventa contenido técnico
- Solo organiza lo que el instructor proporcionó
- Pregunta cuando hay ambigüedad
- Propone progresión pedagógica (concepto → aplicación → cierre)

---

## Paso 3: AI Genera Detalle por Actividad

Una vez aprobada la estructura, la AI genera el detalle:

```
┌─────────────────────────────────────────────────────┐
│  ACTIVIDAD 2 DE 5: Tipos de fundición               │
│  Tipo: explanation | Complejidad: moderate           │
│                                                     │
│  ┌─ agent_instruction ──────────────────────────┐   │
│  │ Presenta los 4 tipos principales de          │   │
│  │ fundición: arena, coquilla, presión e        │   │
│  │ investimento. Usa ejemplos del sector         │   │
│  │ automotriz y aeronáutico. Explica ventajas   │   │
│  │ y limitaciones de cada uno.                  │   │
│  │ [✏️ Editar]                                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ verification.question ──────────────────────┐   │
│  │ "Te describo una planta que necesita          │   │
│  │ producir 10,000 carcasas de aluminio al mes  │   │
│  │ con tolerancias ajustadas. ¿Qué tipo de      │   │
│  │ fundición recomendarías y por qué?"          │   │
│  │ [✏️ Editar]                                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ success_criteria ──────────────────────────┐    │
│  │ must_include:                                │   │
│  │ - Menciona fundición a presión o inyección   │   │
│  │ - Justifica por volumen alto                 │   │
│  │ - Menciona tolerancias ajustadas             │   │
│  │ min_completeness: 60%                        │   │
│  │ [✏️ Editar]                                  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌─ Imagen ────────────────────────────────────┐    │
│  │ [📎 Sin imagen]  [Asignar de las subidas ▼] │   │
│  │ ¿Cuándo mostrar?                             │   │
│  │ ○ Al inicio  ● Cuando se referencie  ○ Nunca│   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [← Anterior]  [Siguiente →]                        │
└─────────────────────────────────────────────────────┘
```

**Lo que la AI genera (basado en input del instructor):**
- `agent_instruction`: Basado en el contenido técnico proporcionado
- `verification.question`: Escenario contextualizado al sector
- `success_criteria`: Criterios de evaluación
- `complexity`: simple/moderate/complex
- `target_length`: Según complejidad
- `max_attempts`: Default 3

**Lo que el instructor controla:**
- Puede editar TODO lo generado
- Asigna imágenes de las que subió
- Aprueba o regenera cada actividad

---

## Paso 4: Preview + Publicar

```
┌─────────────────────────────────────────────────────┐
│  PREVIEW DE CLASE                                    │
│                                                     │
│  [💬 Simular como estudiante]                       │
│  - Interactuar con el AI instructor                 │
│  - Probar flujo de actividades                      │
│  - Verificar que las preguntas funcionen            │
│                                                     │
│  [📊 Resumen]                                       │
│  - 5 actividades                                    │
│  - 2 imágenes asignadas                             │
│  - Duración estimada: 40 min                        │
│  - Complejidad promedio: moderate                   │
│                                                     │
│  [← Volver a editar]        [✓ Publicar Clase]      │
└─────────────────────────────────────────────────────┘
```

---

## Módulo de Imágenes

**Regla:** El instructor describe, la AI referencia.

Por cada imagen subida:

| Campo | Obligatorio | Ejemplo |
|-------|-------------|---------|
| Archivo | Sí | `matriz_5x5.png` |
| Descripción | Sí | "Matriz de evaluación de riesgos 5x5 según DS 024-2016-EM..." |
| Momento de mostrar | No | Al inicio / Cuando se referencie / Solo si pregunta |

**Lo que la AI hace:**
- Usa la descripción del instructor en el `agent_instruction`
- Genera: *"Observa la matriz 5x5 que se muestra en la imagen..."*
- Guarda en `activity.teaching.image.description`

**Lo que la AI NO hace:**
- No lee/interpreta la imagen
- No decide si es 3x3 o 5x5
- No inventa contenido basado en lo que "ve"

---

## Arquitectura Backend

### Endpoints

```
POST /api/planner/clarify
  Input:  { tema, objetivos, contenidoTecnico }
  Output: { preguntas: string[] }
  → AI genera preguntas de clarificación

POST /api/planner/generate-structure
  Input:  { tema, objetivos, contenido, normativa, respuestasClarificacion }
  Output: { activities: ActivitySummary[] }
  → AI propone estructura de actividades

POST /api/planner/generate-activity
  Input:  { activitySummary, contenidoTecnico, imagenes }
  Output: { activity: Activity }
  → AI genera detalle completo de 1 actividad

POST /api/planner/regenerate-activity
  Input:  { activityId, feedback }
  Output: { activity: Activity }
  → Regenera 1 actividad con feedback

POST /api/planner/preview
  Input:  { activities }
  Output: Streaming chat simulado

POST /api/planner/publish
  Input:  { lessonId, activities, images }
  Output: { lesson: Lesson }
  → Genera contentJson y guarda en BD
```

### Modelo de datos (nuevo)

```prisma
model LessonDraft {
  id              String   @id @default(cuid())
  courseId        String
  instructorId    String
  title           String
  objectives      String[]
  technicalContent String  @db.Text
  normativa       String?
  status          DraftStatus @default(DRAFT)
  activitiesJson  Json?    // Estructura en progreso
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  course     Course @relation(fields: [courseId], references: [id])
  instructor User   @relation(fields: [instructorId], references: [id])
  images     DraftImage[]
}

model DraftImage {
  id            String @id @default(cuid())
  draftId       String
  url           String
  description   String @db.Text  // OBLIGATORIO
  showWhen      String @default("on_reference") // on_start, on_reference, on_demand
  activityId    String? // A qué actividad está asignada

  draft LessonDraft @relation(fields: [draftId], references: [id], onDelete: Cascade)
}

enum DraftStatus {
  DRAFT
  STRUCTURE_APPROVED
  ACTIVITIES_GENERATED
  PREVIEW_READY
  PUBLISHED
}
```

---

## Output: contentJson generado

El planificador genera exactamente la misma estructura que ya usa Sophia:

```json
{
  "lesson": {
    "title": "Fundición de metales",
    "objective": "Identificar tipos de fundición y elegir el adecuado",
    "key_points": ["Tipos de fundición", "Parámetros", "Selección"],
    "context": {
      "pais": "Perú",
      "normativa": "ISO 9001",
      "referencias": ["NTP 350.043"]
    },
    "instructor": {
      "name": "Sophia",
      "role": "Instructora de Procesos Metalúrgicos",
      "personality": "Conversacional, paciente, exigente con precisión"
    },
    "activities": [
      {
        "id": "act-001",
        "type": "explanation",
        "complexity": "simple",
        "teaching": {
          "agent_instruction": "Introduce qué es la fundición...",
          "target_length": "200-300 palabras",
          "context": "Sector metalúrgico peruano",
          "image": {
            "url": "/images/draft-xxx/horno.png",
            "description": "Horno de arco eléctrico típico"
          }
        },
        "verification": {
          "question": "¿Cuál es la diferencia entre...",
          "success_criteria": {
            "must_include": ["diferencia clave"],
            "min_completeness": 60
          },
          "max_attempts": 3
        }
      }
    ]
  }
}
```

Esto es 100% compatible con el sistema actual de Sophia (prompt-builder, chat/stream, verification).
