// Tipos compartidos de la pantalla de Programación.

export interface Lesson {
  /** Actividades del plan. Sirve para dimensionar la ventana horaria. */
  activityCount?: number
  id: string
  title: string
  order: number
  isPublished: boolean
}
export interface Schedule {
  lessonId: string
  availableAt: string
  closesAfterHours: number
}
export interface CareerMini { id: string; code: string | null; name: string; slug?: string }
export interface UserMini { id: string; name: string | null; email: string }
export interface InstructorOption { id: string; name: string | null; email: string; role: string }
export interface Section {
  id: string
  name: string
  sedeId: string | null
  periodId: string
  isArchived: boolean
  archivedAt: string | null
  startDate: string | null
  endDate: string | null
  course: {
    id: string
    title: string
    scope: 'TRANSVERSAL' | 'SPECIALIZATION'
    career: CareerMini | null
    // m:n: a qué carreras sirve. Con scope TRANSVERSAL se ignora (sirve a todas).
    careers: CareerMini[]
    lessons: Lesson[]
  }
  enrolledCount: number
  enrolledStudents: UserMini[]
  instructors: UserMini[]
  schedules: Schedule[]
}
export interface Period { id: string; name: string; isActive: boolean }
export interface Sede {
  id: string
  code: string
  name: string
  // Carreras que se dictan en esta sede. Alimenta el nivel de carreras.
  careers?: CareerMini[]
}
export interface RegularCourse {
  id: string
  title: string
  scope: 'TRANSVERSAL' | 'SPECIALIZATION'
  /** A qué carreras sirve. Con scope TRANSVERSAL se ignora: sirve a todas. */
  careers: { id: string }[]
}
export interface ProgramacionData {
  currentUserRole: 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR'
  canCreate: boolean
  periods: Period[]
  sedes: Sede[]
  regularCourses: RegularCourse[]
  sections: Section[]
  availableStudents: UserMini[]
  availableInstructors: InstructorOption[]
}
