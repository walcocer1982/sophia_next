import { z } from 'zod'
import { normalizeLevel } from '@/lib/levels'

// ─── Input: formulario del instructor ───

export const PlannerInputSchema = z.object({
  tema: z.string().min(3, 'El tema debe tener al menos 3 caracteres').max(200),
  objetivo: z
    .string()
    .min(10, 'El objetivo debe tener al menos 10 caracteres')
    .max(500),
  contenidoTecnico: z
    .string()
    .min(20, 'El contenido técnico debe tener al menos 20 caracteres')
    .max(5000),
  keyPoints: z
    .array(z.string().min(3))
    .min(2, 'Agrega al menos 2 puntos clave')
    .max(8),
})

export type PlannerInput = z.infer<typeof PlannerInputSchema>

// ─── Output: estructura generada por la IA ───
// Replica exacta de Activity de types/lesson.ts

const VerificationHintsSchema = z.object({
  accept_examples: z.boolean().optional(),
  accept_paraphrase: z.boolean().optional(),
  key_concepts: z.array(z.string()).optional(),
  common_mistakes: z.array(z.string()).optional(),
})

const SuccessCriteriaSchema = z.object({
  must_include: z.array(z.string()).min(1).max(7),
  // Índices 1-based de must_include que son eliminatorios (ver types/lesson.ts).
  critical: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  // Criterios cuyas frases deben existir en un bloque del panel (lib/quote-check.ts).
  quote_from: z.array(z.object({
    criterion: z.number().int().min(1).max(7),
    block: z.string().regex(/^[a-z0-9][a-z0-9-]{1,59}$/),
    min: z.number().int().min(1).max(10).optional(),
  })).max(7).optional(),
  min_completeness: z.number().min(0).max(100).optional(),
  understanding_level: z
    // Acepta la escala nueva (logro) y la vieja (cognitiva) para que las
    // lecciones históricas sigan validando; el transform las unifica al enum
    // nuevo, así el tipo de salida es UnderstandingLevel.
    .enum([
      'beginning', 'developing', 'achieved', 'outstanding',
      'memorized', 'understood', 'applied', 'analyzed',
    ])
    .optional()
    .transform((v) => (v ? normalizeLevel(v) : undefined)),
  hints: VerificationHintsSchema.optional(),
})

const VerificationSchema = z.object({
  question: z.string().min(10),
  success_criteria: SuccessCriteriaSchema,
  max_attempts: z.number().min(1).max(5).optional(),
  open_ended: z.boolean().optional(),
  // Zod descarta las claves que no declara: estas tres se perdían cada vez que
  // Verificación guardaba, y la rúbrica generada al publicar volvía a cero.
  is_evaluative: z.boolean().optional(),
  rubric: z
    .object({
      beginning: z.string(),
      developing: z.string(),
      achieved: z.string(),
      outstanding: z.string(),
    })
    .optional(),
  scaffold_hints: z.array(z.object({ criterion: z.number(), hint: z.string() })).optional(),
})

// Paso cerrado (alternativas) que se corrige en el código. Ver types/lesson.ts.
const ChoiceStepSchema = z
  .object({
    prompt: z.string().min(10),
    options: z.array(z.string().min(1)).min(2).max(5),
    answer: z.number().int().min(0),
    max_attempts: z.number().int().min(1).max(3).optional(),
  })
  .refine((c) => c.answer < c.options.length, { message: 'answer debe ser un índice de options' })

const TeachingImageSchema = z.object({
  url: z.string().url(),
  description: z.string().min(10),
  showWhen: z.enum(['on_start', 'on_reference', 'on_demand']).default('on_reference'),
})

// ─── Material de apoyo (panel derecho) ───
// Límites pensados para que el panel siga legible en 280-420 px y en celular.
// Especificación: investigacion/panel-de-apoyo-especificacion.md §5.5

const ShowWhenSchema = z.enum(['on_start', 'on_reference', 'on_demand'])
const contarPalabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

const BlockBase = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,59}$/, 'id en minúsculas, números y guiones'),
  title: z.string().min(3).max(60),
  showWhen: ShowWhenSchema.optional(),
  pinned: z.boolean().optional(),
  forVerifier: z.boolean().optional(),
  source: z.string().max(160).optional(),
}

/** Licencias que no son procedencia: lo físico sale del fabricante o de planta, nunca se genera. */
export const LICENCIA_INVALIDA = /^\s*$|gener(ada|ado)\s+(con|por)\s+ia|\bia\b\s*generativa|midjourney|dall[- ]?e|stable diffusion/i

const ImageMarkerSchema = z.object({
  n: z.number().int().min(1).max(9),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().min(2).max(120),
  showWhen: ShowWhenSchema.optional(),
})

const ImageBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('image'),
  url: z.string().url(),
  description: z.string().min(10),
  kind: z.enum(['scene', 'term', 'equipment', 'diagram']),
  license: z.string().refine((l) => !LICENCIA_INVALIDA.test(l), 'licencia vacía o de imagen generada: no es fuente'),
  validated: z.boolean(),
  markers: z.array(ImageMarkerSchema).max(8).optional(),
  bankId: z.string().optional(),
}).refine((b) => !!b.source, { message: 'una imagen necesita su fuente', path: ['source'] })

const CompareBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('compare'),
  items: z.array(z.object({
    url: z.string().url(),
    description: z.string().min(10),
    caption: z.string().min(1).max(30),
    license: z.string().refine((l) => !LICENCIA_INVALIDA.test(l), 'licencia vacía o de imagen generada'),
  })).min(2).max(3),
})

const FormulaBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('formula'),
  expression: z.string().min(3).max(200),
  terms: z.array(z.object({ symbol: z.string().min(1).max(12), meaning: z.string().min(1).max(60), value: z.string().max(20).optional() })).max(8).optional(),
  example: z.object({
    label: z.string().min(1).max(40),
    rows: z.array(z.object({ term: z.string().max(20), value: z.string().max(20), weight: z.string().max(20), result: z.string().max(20) })).min(1).max(8),
    total: z.string().min(1).max(30),
  }).optional(),
})

const CeldaSchema = z.string().max(60)
const TableBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('table'),
  columns: z.array(CeldaSchema).min(1).max(6),
  rows: z.array(z.array(CeldaSchema)).min(1).max(20),
  highlight: z.object({ rows: z.array(z.number().int().min(0)).optional(), cols: z.array(z.number().int().min(0)).optional() }).optional(),
  legend: z.string().max(200).optional(),
}).refine((t) => t.rows.every((r) => r.length === t.columns.length), { message: 'cada fila debe tener tantas celdas como columnas', path: ['rows'] })

const TextBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('text'),
  body: z.string().min(1).refine((b) => contarPalabras(b) <= 400, 'máximo 400 palabras'),
  kind: z.enum(['fragment', 'consigna', 'norma', 'rubrica']).optional(),
})

const CaseBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('case'),
  name: z.string().min(1).max(40),
  facts: z.array(z.string().min(1).max(140)).min(1).max(8),
  question: z.string().max(200).optional(),
})

/** Palabras de equipo o cosa física: eso no se dibuja, sale de una foto con fuente (diseño-ppt-cetemin §10). */
// Solo el TÍTULO: un paso de proceso («apagar la bomba») es válido dentro de un
// flujo; lo que no vale es un diagrama que pretende ser el dibujo del equipo.
const PALABRAS_FISICAS = /\b(jumbo|scoop|scooptram|faja transportadora|perforadora|cargador frontal|volquete|chancadora|molino|celda de flotaci[oó]n|cuerpo mineralizado|tajeo)\b/i

const DiagramBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('diagram'),
  kind: z.enum(['flow', 'cycle', 'hierarchy', 'timeline']),
  nodes: z.array(z.object({ id: z.string().min(1).max(30), label: z.string().min(1).max(40), note: z.string().max(80).optional() })).min(2).max(12),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().max(30).optional() })).max(16).optional(),
  parent: z.record(z.string(), z.string()).optional(),
}).refine(
  (d) => !PALABRAS_FISICAS.test(d.title),
  { message: 'un diagrama no dibuja equipos ni cosas físicas: usa una imagen con fuente', path: ['title'] },
)

// Ecualizador (spec del panel §16.2): pesos que suman 100, casos dentro del rango.
const SimulatorBlockSchema = z.object({
  ...BlockBase,
  type: z.literal('simulator'),
  kind: z.literal('weighted_sum'),
  variables: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,19}$/, 'id en minúsculas, números y guiones'),
    label: z.string().min(1).max(20),
    weight: z.number().gt(0).max(100),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
  })).min(2).max(8),
  scale: z.object({
    min: z.number(),
    max: z.number(),
    pass: z.number(),
    round: z.enum(['half_up', 'none']).optional(),
  }),
  presets: z.array(z.object({ label: z.string().min(1).max(20), values: z.record(z.string(), z.number()) })).max(4),
  allowOwnValues: z.boolean().optional(),
  labels: z.object({ pass: z.string().min(1).max(20), fail: z.string().min(1).max(20) }).optional(),
}).superRefine((b, ctx) => {
  const suma = b.variables.reduce((s, v) => s + v.weight, 0)
  if (Math.abs(suma - 100) > 0.5) ctx.addIssue({ code: 'custom', message: `los pesos deben sumar 100 (suman ${suma})`, path: ['variables'] })
  if (b.scale.min >= b.scale.max) ctx.addIssue({ code: 'custom', message: 'la escala necesita mínimo menor que máximo', path: ['scale'] })
  if (b.scale.pass < b.scale.min || b.scale.pass > b.scale.max) ctx.addIssue({ code: 'custom', message: 'la nota para aprobar debe estar dentro de la escala', path: ['scale', 'pass'] })
  const ids = new Set<string>()
  b.variables.forEach((v, i) => {
    if (ids.has(v.id)) ctx.addIssue({ code: 'custom', message: `variable repetida: ${v.id}`, path: ['variables', i, 'id'] })
    ids.add(v.id)
  })
  b.presets.forEach((p, i) => {
    for (const v of b.variables) {
      const n = p.values[v.id]
      const min = v.min ?? b.scale.min
      const max = v.max ?? b.scale.max
      if (typeof n !== 'number' || n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: `el caso «${p.label}» necesita ${v.label} entre ${min} y ${max}`, path: ['presets', i, 'values'] })
      }
    }
  })
})

export const SupportBlockSchema = z.union([
  ImageBlockSchema,
  CompareBlockSchema,
  FormulaBlockSchema,
  TableBlockSchema,
  TextBlockSchema,
  CaseBlockSchema,
  DiagramBlockSchema,
  SimulatorBlockSchema,
])

/** El esquema de cada tipo: la unión solo dice «Invalid input»; este dice qué campo falla. */
export const SupportBlockSchemaByType = {
  image: ImageBlockSchema,
  compare: CompareBlockSchema,
  formula: FormulaBlockSchema,
  table: TableBlockSchema,
  text: TextBlockSchema,
  case: CaseBlockSchema,
  diagram: DiagramBlockSchema,
  simulator: SimulatorBlockSchema,
} as const

const TeachingSchema = z.object({
  agent_instruction: z.string().min(20),
  target_length: z.string().optional(),
  context: z.string().optional(),
  image_suggestions: z.array(z.string()).optional(),
  first_question: z.string().min(10).max(300).optional(),
  image: TeachingImageSchema.optional(),
  images: z.array(TeachingImageSchema).optional(),
  blocks: z.array(SupportBlockSchema).max(6).optional(),
})

const ActivitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['explanation', 'practice', 'reflection', 'closing']),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  keyPointIndex: z.number().min(0).nullable(),
  // Peso relativo en el cálculo de la nota final. Default por tipo
  // (explanation=1, reflection=2, practice=3, closing=4) si no se setea.
  // Mínimo 1: con weight 0 en todas las actividades (S0 de tutoría, ago 2026)
  // la nota salía 0. Para que una actividad no cuente: is_evaluative=false.
  weight: z.number().min(1).max(10).optional(),
  teaching: TeachingSchema,
  choice: ChoiceStepSchema.optional(),
  // Comprobación de cierre (spec del panel §16.1): solo en closing y sin choice.
  checks: z.array(ChoiceStepSchema).min(2).max(4).optional(),
  verification: VerificationSchema,
  commonMistakes: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
})

export const GeneratedStructureSchema = z.object({
  // Permitir 2-10 actividades (las de dos pasos de tutoría llegan a 9): "clase corta" usa 3, las
  // lecciones completas usan 4-8. Antes el mínimo era 4 y eso rechazaba
  // las lecciones rediseñadas para convenciones (ej: "ciclo de minado").
  activities: z.array(ActivitySchema).min(2).max(10),
}).superRefine((s, ctx) => {
  // Sophia cita los bloques por id: dos bloques con el mismo id en la lección
  // harían que la cita muestre el equivocado.
  const vistos = new Set<string>()
  s.activities.forEach((a, i) => {
    a.teaching.blocks?.forEach((b, j) => {
      if (vistos.has(b.id)) {
        ctx.addIssue({ code: 'custom', message: `id de bloque repetido en la lección: ${b.id}`, path: ['activities', i, 'teaching', 'blocks', j, 'id'] })
      }
      vistos.add(b.id)
    })
  })
  // La comprobación de cierre va solo en el cierre y reemplaza al paso cerrado.
  s.activities.forEach((a, i) => {
    if (!a.checks) return
    if (a.type !== 'closing') ctx.addIssue({ code: 'custom', message: 'la comprobación (checks) va solo en la actividad de cierre', path: ['activities', i, 'checks'] })
    if (a.choice) ctx.addIssue({ code: 'custom', message: 'una actividad con comprobación (checks) no lleva paso cerrado (choice)', path: ['activities', i, 'choice'] })
  })
  // Una regla de citas apunta a un bloque que existe en la lección y a un criterio que existe.
  s.activities.forEach((a, i) => {
    const sc = a.verification.success_criteria
    sc.quote_from?.forEach((q, j) => {
      if (!vistos.has(q.block)) {
        ctx.addIssue({ code: 'custom', message: `quote_from apunta a un bloque que no existe en la lección: ${q.block}`, path: ['activities', i, 'verification', 'success_criteria', 'quote_from', j, 'block'] })
      }
      if (q.criterion > sc.must_include.length) {
        ctx.addIssue({ code: 'custom', message: `quote_from apunta al criterio ${q.criterion}, pero hay ${sc.must_include.length}`, path: ['activities', i, 'verification', 'success_criteria', 'quote_from', j, 'criterion'] })
      }
    })
  })
})

export type GeneratedStructure = z.infer<typeof GeneratedStructureSchema>

// ─── Chat conversacional del planner ───

export const PlannerStepSchema = z.enum([
  'TEMA',
  'OBJETIVO',
  'INSTRUCCIONES',
  'KEY_POINTS',
  'CONTENIDO',
  'ESTRUCTURA',
])

const KeyPointContenidoSchema = z.object({
  keyPoint: z.string(),
  contenido: z.string(),
})

export const PlannerDataSchema = z.object({
  tema: z.string(),
  objetivo: z.string(),
  instrucciones: z.array(z.string()),
  keyPoints: z.array(z.string()),
  contenidoTecnico: z.array(KeyPointContenidoSchema),
  activities: z.array(ActivitySchema).default([]),
})

// Adjunto del planificador: base64 (~12MB de límite base64 ≈ 9MB de archivo).
export const PlannerAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  dataBase64: z.string().min(1).max(12_000_000),
})

export const PlannerChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  step: PlannerStepSchema,
  plannerData: PlannerDataSchema,
  attachments: z.array(PlannerAttachmentSchema).max(3).optional(),
  courseContext: z
    .object({
      courseId: z.string(),
      courseTitle: z.string(),
      capacidad: z.string(),
      instructor: z.string(),
      methodology: z.enum(['REFLECTIVE', 'CODE']).optional(),
      lessonId: z.string(),
      lessonTitle: z.string(),
      lessonObjective: z.string(),
      existingLessons: z.array(z.object({
        title: z.string(),
        order: z.number(),
      })).default([]),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
})

// ─── Course Planner ───

export const CoursePlannerStepSchema = z.enum(['CURSO', 'CAPACIDAD', 'APRENDIZAJES', 'TEMAS'])

const CourseTemaSchema = z.object({
  titulo: z.string(),
  objetivo: z.string(),
})

export const CoursePlannerDataSchema = z.object({
  titulo: z.string(),
  capacidad: z.string(),
  aprendizajes: z.array(z.string()).default([]),
  temas: z.array(CourseTemaSchema).default([]),
})

export const CoursePlannerChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  step: CoursePlannerStepSchema,
  courseData: CoursePlannerDataSchema,
  attachments: z.array(PlannerAttachmentSchema).max(3).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
})

export const CourseSaveSchema = z.object({
  titulo: z.string().min(3).max(200),
  capacidad: z.string().min(10).max(2000),
  careerId: z.string().nullable().optional(),
  aprendizajes: z.array(z.string().min(5)).min(1).max(12),
  temas: z
    .array(
      z.object({
        titulo: z.string().min(3).max(200),
        objetivo: z.string().min(10).max(500),
      })
    )
    .min(1)
    .max(12),
})

export const SessionSaveSchema = z.object({
  lessonId: z.string().min(1),
  keyPoints: z.array(z.string()).min(2).max(8),
  contentJson: z.object({
    // Mismo rango que GeneratedStructureSchema (2-8): permite clases cortas.
    activities: z.array(ActivitySchema).min(2).max(10),
    // Opcionales: VerificationManager solo manda activities; el planner manda
    // las 3. Antes se descartaban (Zod strip) y nunca llegaban a la DB.
    instrucciones: z.array(z.string()).optional(),
    contenidoTecnico: z.array(KeyPointContenidoSchema).optional(),
  }),
})

// Actualización PARCIAL de una sesión ya diseñada (modo edición). Todos los
// campos de contenido son opcionales: el endpoint hace merge sobre lo existente
// (no pisa subkeys de contentJson). Mapea tema→title, objetivo→objective.
export const SessionUpdateSchema = z.object({
  lessonId: z.string().min(1),
  tema: z.string().min(3).max(200).optional(),
  objetivo: z.string().min(10).max(500).optional(),
  instrucciones: z.array(z.string()).optional(),
  keyPoints: z.array(z.string().min(1)).min(2).max(8).optional(),
  contenidoTecnico: z.array(KeyPointContenidoSchema).optional(),
  activities: z.array(ActivitySchema).min(2).max(10).optional(),
})
