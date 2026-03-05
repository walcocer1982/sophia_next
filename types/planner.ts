import type { Activity } from './lesson'

// Los 6 pasos del flujo conversacional
export type PlannerStep =
  | 'TEMA'
  | 'OBJETIVO'
  | 'INSTRUCCIONES'
  | 'KEY_POINTS'
  | 'CONTENIDO'
  | 'ESTRUCTURA'

export const PLANNER_STEPS: PlannerStep[] = [
  'TEMA',
  'OBJETIVO',
  'INSTRUCCIONES',
  'KEY_POINTS',
  'CONTENIDO',
  'ESTRUCTURA',
]

export const STEP_LABELS: Record<PlannerStep, string> = {
  TEMA: 'Tema',
  OBJETIVO: 'Objetivo',
  INSTRUCCIONES: 'Instrucciones',
  KEY_POINTS: 'Actividades',
  CONTENIDO: 'Contenido',
  ESTRUCTURA: 'Estructura',
}

// Status de cada sección en el panel
export type SectionStatus = 'not_started' | 'in_progress' | 'completed'

// Contenido técnico por actividad/punto clave
export interface KeyPointContenido {
  keyPoint: string
  contenido: string
}

// Datos acumulados del planificador
export interface PlannerData {
  tema: string
  objetivo: string
  instrucciones: string[]
  keyPoints: string[]
  contenidoTecnico: KeyPointContenido[]
  activities: Activity[]
}

// Estado completo del planificador
export interface PlannerState {
  step: PlannerStep
  data: PlannerData
  sectionStatuses: Record<PlannerStep, SectionStatus>
}

// Eventos SSE del endpoint del planner
export interface PlannerStreamEvent {
  type: 'content' | 'panel_update' | 'step_change' | 'done' | 'error'
  text?: string
  message?: string
  field?: keyof PlannerData
  value?: unknown
  newStep?: PlannerStep
}

// Mensaje del chat del planner (sin persistencia en DB en Fase 1)
export interface PlannerMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status: 'sending' | 'streaming' | 'completed' | 'error'
  isOptimistic?: boolean
}

// Estado inicial vacío
export const EMPTY_PLANNER_DATA: PlannerData = {
  tema: '',
  objetivo: '',
  instrucciones: [],
  keyPoints: [],
  contenidoTecnico: [],
  activities: [],
}

// ============================================
// COURSE PLANNER (Planificador de Curso)
// ============================================

// Los 4 pasos del planificador de curso
export type CoursePlannerStep = 'CURSO' | 'CAPACIDAD' | 'APRENDIZAJES' | 'TEMAS'

export const COURSE_PLANNER_STEPS: CoursePlannerStep[] = [
  'CURSO',
  'CAPACIDAD',
  'APRENDIZAJES',
  'TEMAS',
]

export const COURSE_STEP_LABELS: Record<CoursePlannerStep, string> = {
  CURSO: 'Curso',
  CAPACIDAD: 'Capacidad',
  APRENDIZAJES: 'Aprendizajes',
  TEMAS: 'Temas',
}

// Tema/sesión propuesta por la IA
export interface CourseTema {
  titulo: string
  objetivo: string // = aprendizaje esperado
}

// Datos acumulados del planificador de curso
export interface CoursePlannerData {
  titulo: string
  capacidad: string
  aprendizajes: string[] // Aprendizajes esperados
  temas: CourseTema[]    // Derivados de los aprendizajes
}

export const EMPTY_COURSE_PLANNER_DATA: CoursePlannerData = {
  titulo: '',
  capacidad: '',
  aprendizajes: [],
  temas: [],
}

// Eventos SSE del course planner (misma estructura, distinto field type)
export interface CoursePlannerStreamEvent {
  type: 'content' | 'panel_update' | 'step_change' | 'done' | 'error'
  text?: string
  message?: string
  field?: keyof CoursePlannerData
  value?: unknown
  newStep?: CoursePlannerStep
}

// Contexto del curso para inyectar en el session planner
export interface CourseContext {
  courseId: string
  courseTitle: string
  capacidad: string
  instructor: string
  lessonId: string
  lessonTitle: string
  lessonObjective: string
  existingLessons: Array<{ title: string; order: number }>
  // Datos guardados previamente (para re-edición)
  savedData?: {
    keyPoints: string[]
    instrucciones: string[]
    contenidoTecnico: KeyPointContenido[]
    activities: Activity[]
  }
}
