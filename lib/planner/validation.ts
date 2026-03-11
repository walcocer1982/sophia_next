import { z } from 'zod'

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
  min_completeness: z.number().min(0).max(100).optional(),
  understanding_level: z
    .enum(['memorized', 'understood', 'applied', 'analyzed'])
    .optional(),
  hints: VerificationHintsSchema.optional(),
})

const VerificationSchema = z.object({
  question: z.string().min(10),
  success_criteria: SuccessCriteriaSchema,
  max_attempts: z.number().min(1).max(5).optional(),
  open_ended: z.boolean().optional(),
})

const TeachingImageSchema = z.object({
  url: z.string().url(),
  description: z.string().min(10),
  showWhen: z.enum(['on_start', 'on_reference', 'on_demand']).default('on_reference'),
})

const TeachingSchema = z.object({
  agent_instruction: z.string().min(20),
  target_length: z.string().optional(),
  context: z.string().optional(),
  image_suggestions: z.array(z.string()).optional(),
  image: TeachingImageSchema.optional(),
  images: z.array(TeachingImageSchema).optional(),
})

const ActivitySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['explanation', 'practice', 'reflection', 'closing']),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  keyPointIndex: z.number().min(0).nullable(),
  teaching: TeachingSchema,
  verification: VerificationSchema,
  commonMistakes: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
})

export const GeneratedStructureSchema = z.object({
  activities: z.array(ActivitySchema).min(4).max(8),
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

export const PlannerChatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  step: PlannerStepSchema,
  plannerData: PlannerDataSchema,
  courseContext: z
    .object({
      courseId: z.string(),
      courseTitle: z.string(),
      capacidad: z.string(),
      instructor: z.string(),
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
  aprendizajes: z.array(z.string().min(5)).min(2).max(12),
  temas: z
    .array(
      z.object({
        titulo: z.string().min(3).max(200),
        objetivo: z.string().min(10).max(500),
      })
    )
    .min(2)
    .max(12),
})

export const SessionSaveSchema = z.object({
  lessonId: z.string().min(1),
  keyPoints: z.array(z.string()).min(2).max(8),
  contentJson: z.object({
    activities: z.array(ActivitySchema).min(4).max(8),
  }),
})
