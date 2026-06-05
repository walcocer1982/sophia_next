'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  CalendarDays, Users, GraduationCap, Calendar, Lock, Unlock,
  ChevronDown, ChevronRight, Loader2, Building2, Plus, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Lesson {
  id: string
  title: string
  order: number
  isPublished: boolean
}

interface Schedule {
  lessonId: string
  availableAt: string
  closesAfterHours: number
}

interface Section {
  id: string
  name: string
  sedeId: string | null
  periodId: string
  course: { id: string; title: string; lessons: Lesson[] }
  enrolledCount: number
  instructors: { id: string; name: string | null }[]
  schedules: Schedule[]
}

interface Period {
  id: string
  name: string
  isActive: boolean
}

interface Sede {
  id: string
  code: string
  name: string
}

interface RegularCourse {
  id: string
  title: string
}

interface ProgramacionData {
  currentUserRole: 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR'
  canCreate: boolean
  periods: Period[]
  sedes: Sede[]
  regularCourses: RegularCourse[]
  sections: Section[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ProgramacionPage() {
  const [data, setData] = useState<ProgramacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)

  const refetch = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/programacion')
      if (!res.ok) throw new Error('fetch failed')
      const json = (await res.json()) as ProgramacionData
      setData(json)
      // Auto-seleccionar el período activo o el más reciente
      if (!activePeriodId) {
        const active = json.periods.find((p) => p.isActive) ?? json.periods[0]
        if (active) setActivePeriodId(active.id)
      }
    } catch {
      toast.error('No se pudo cargar la programación')
    }
  }, [activePeriodId])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  const toggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // Filtrar secciones por período seleccionado + agrupar por sede
  const sectionsBySede = useMemo(() => {
    if (!data || !activePeriodId) return new Map<string | null, Section[]>()
    const filtered = data.sections.filter((s) => s.periodId === activePeriodId)
    const grouped = new Map<string | null, Section[]>()
    for (const s of filtered) {
      const arr = grouped.get(s.sedeId) ?? []
      arr.push(s)
      grouped.set(s.sedeId, arr)
    }
    return grouped
  }, [data, activePeriodId])

  const handleDeleteSection = async (sectionId: string, name: string) => {
    if (!confirm(`¿Eliminar la sección "${name}"? Solo funciona si no tiene estudiantes inscriptos.`)) return
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Sección eliminada')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleUpdateSectionSede = async (sectionId: string, sedeId: string | null) => {
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sedeId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Sede actualizada')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleToggleLesson = async (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string) => {
    try {
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          publish: isOpen,
          sectionId,
          availableAt: availableAt || todayISO(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success(isOpen ? 'Lección abierta' : 'Lección cerrada')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-sm text-gray-500">Cargando programación...</p>
      </div>
    )
  }
  if (!data) return null

  const totalSections = data.sections.filter((s) => s.periodId === activePeriodId).length

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Programación</h1>
        </div>
        <p className="text-sm text-gray-600">
          Cuándo y a quién se entregan los cursos REGULAR. Por sede y sección.
        </p>
      </div>

      {/* Selector de período + acciones de creación */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Período:</label>
            <select
              value={activePeriodId ?? ''}
              onChange={(e) => setActivePeriodId(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white font-medium"
            >
              {data.periods.length === 0 && <option value="">— sin períodos —</option>}
              {data.periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isActive ? '· activo' : ''}
                </option>
              ))}
            </select>
            {data.canCreate && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowNewPeriod(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nuevo período
                </Button>
                {activePeriodId && (
                  <Button size="sm" onClick={() => setShowNewSection(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Nueva sección
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {totalSections} sección{totalSections !== 1 ? 'es' : ''} en este período
          </div>
        </div>
      </Card>

      <NewPeriodModal open={showNewPeriod} onOpenChange={setShowNewPeriod} onCreated={refetch} />
      <NewSectionModal
        open={showNewSection}
        onOpenChange={setShowNewSection}
        periodId={activePeriodId}
        sedes={data.sedes}
        courses={data.regularCourses}
        onCreated={refetch}
      />

      {/* Si no hay secciones en este período */}
      {totalSections === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            No hay secciones creadas en este período todavía.
          </p>
          <Link href="/admin" className="text-sm text-indigo-600 hover:underline">
            Crear secciones en Config →
          </Link>
        </Card>
      ) : (
        // Grupos por sede
        <div className="space-y-4">
          {Array.from(sectionsBySede.entries()).map(([sedeId, sections]) => {
            const sede = data.sedes.find((s) => s.id === sedeId)
            return (
              <section key={sedeId ?? 'sin-sede'}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  {sede ? (
                    <>
                      <code className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs">
                        {sede.code}
                      </code>
                      <span>{sede.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Sin sede asignada</span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {sections.length} sección{sections.length !== 1 ? 'es' : ''}
                  </span>
                </h2>

                <div className="space-y-3">
                  {sections.map((sec) => (
                    <SectionCard
                      key={sec.id}
                      section={sec}
                      sedes={data.sedes}
                      canEdit={data.canCreate}
                      isExpanded={expandedSections.has(sec.id)}
                      onToggleExpand={() => toggleExpand(sec.id)}
                      onToggleLesson={handleToggleLesson}
                      onUpdateSede={handleUpdateSectionSede}
                      onDelete={handleDeleteSection}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Hint sobre Config */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-xs text-gray-600">
          💡 Períodos, secciones, inscripciones e instructores se gestionan en{' '}
          <Link href="/admin" className="text-indigo-600 hover:underline font-medium">
            Config
          </Link>
          . Acá controlás la <strong>apertura de lecciones</strong> por sección.
        </p>
      </Card>
    </div>
  )
}

function SectionCard({
  section, sedes, canEdit, isExpanded, onToggleExpand, onToggleLesson, onUpdateSede, onDelete,
}: {
  section: Section
  sedes: Sede[]
  canEdit: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleLesson: (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string) => void
  onUpdateSede: (sectionId: string, sedeId: string | null) => void
  onDelete: (sectionId: string, name: string) => void
}) {
  const totalLessons = section.course.lessons.length
  const openLessons = section.schedules.length

  return (
    <Card className="overflow-hidden">
      {/* Header de sección */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
            : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm">{section.name}</h3>
              <Badge variant="outline" className="text-[10px]">{section.course.title}</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600 shrink-0">
          <span className="flex items-center gap-1" title="Estudiantes inscriptos">
            <Users className="h-3.5 w-3.5" />
            {section.enrolledCount}
          </span>
          <span className="flex items-center gap-1" title="Instructores asignados">
            <GraduationCap className="h-3.5 w-3.5" />
            {section.instructors.length}
          </span>
          <span className="flex items-center gap-1" title="Lecciones abiertas / totales">
            <Unlock className="h-3.5 w-3.5 text-green-600" />
            <span className="font-semibold">{openLessons}/{totalLessons}</span>
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t bg-gray-50/30 p-4 space-y-2">
          {/* Acciones de admin */}
          {canEdit && (
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
              <label className="text-xs font-medium text-gray-700">Sede:</label>
              <select
                value={section.sedeId ?? ''}
                onChange={(e) => onUpdateSede(section.id, e.target.value || null)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="">— sin sede —</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(section.id, section.name)}
                className="ml-auto h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Eliminar sección (solo si no tiene estudiantes)"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Eliminar
              </Button>
            </div>
          )}

          {/* Instructores */}
          {section.instructors.length > 0 && (
            <div className="mb-3 text-xs text-gray-600">
              <span className="font-medium">Instructores:</span>{' '}
              {section.instructors.map((i) => i.name || '(sin nombre)').join(', ')}
            </div>
          )}

          {/* Calendario de lecciones */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              📅 Calendario de lecciones
            </h4>
            {section.course.lessons.length === 0 ? (
              <p className="text-xs text-gray-400">El curso no tiene lecciones diseñadas todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {section.course.lessons.map((lesson, idx) => {
                  const schedule = section.schedules.find((s) => s.lessonId === lesson.id)
                  const isOpen = !!schedule
                  return (
                    <LessonScheduleRow
                      key={lesson.id}
                      index={idx + 1}
                      lesson={lesson}
                      isOpen={isOpen}
                      schedule={schedule}
                      onToggle={(open, availableAt) =>
                        onToggleLesson(section.id, lesson.id, open, availableAt)
                      }
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function LessonScheduleRow({
  index, lesson, isOpen, schedule, onToggle,
}: {
  index: number
  lesson: Lesson
  isOpen: boolean
  schedule?: Schedule
  onToggle: (open: boolean, availableAt?: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [dateInput, setDateInput] = useState(
    schedule ? new Date(schedule.availableAt).toISOString().slice(0, 10) : todayISO()
  )
  const [submitting, setSubmitting] = useState(false)

  const handleOpen = async () => {
    setSubmitting(true)
    await onToggle(true, dateInput)
    setSubmitting(false)
    setEditing(false)
  }

  const handleClose = async () => {
    if (!confirm(`¿Cerrar "${lesson.title}" para esta sección?`)) return
    setSubmitting(true)
    await onToggle(false)
    setSubmitting(false)
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded-md ${
      isOpen ? 'bg-green-50/50 border border-green-100' : 'bg-white border border-gray-100'
    }`}>
      <span className="text-[10px] text-gray-400 w-5 shrink-0 font-mono">{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
        {isOpen && schedule && (
          <p className="text-[11px] text-green-700">
            Abierta desde {formatDate(schedule.availableAt)} · cierre en {schedule.closesAfterHours}h
          </p>
        )}
        {!isOpen && !editing && (
          <p className="text-[11px] text-gray-400">No abierta para esta sección</p>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="text-xs h-8 w-36"
          />
          <Button size="sm" onClick={handleOpen} disabled={submitting} className="h-8">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Abrir'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-8">
            Cancelar
          </Button>
        </div>
      ) : isOpen ? (
        <Button
          size="sm"
          variant="outline"
          onClick={handleClose}
          disabled={submitting}
          className="h-8 gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
          Cerrar
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          className="h-8 gap-1 text-green-700 hover:text-green-800 hover:bg-green-50"
        >
          <Calendar className="h-3.5 w-3.5" />
          Abrir
        </Button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Modales: crear período / crear sección
// ═══════════════════════════════════════════════════════════════

function NewPeriodModal({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Ingresá el nombre del período')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success(`Período "${name.trim()}" creado`)
      setName('')
      onOpenChange(false)
      await onCreated()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo período académico</DialogTitle>
          <DialogDescription>
            Ej: 2026-1, 2026-2, Verano 2026. Sirve para agrupar todas las
            secciones del mismo cuatrimestre.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <label className="text-xs font-medium text-gray-700 block mb-1">Nombre *</label>
          <Input
            placeholder="2026-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crear período'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewSectionModal({
  open, onOpenChange, periodId, sedes, courses, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  periodId: string | null
  sedes: Sede[]
  courses: RegularCourse[]
  onCreated: () => void | Promise<void>
}) {
  const [courseId, setCourseId] = useState('')
  const [name, setName] = useState('')
  const [sedeId, setSedeId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => { setCourseId(''); setName(''); setSedeId('') }

  const handleSubmit = async () => {
    if (!periodId || !courseId || !name.trim()) {
      toast.error('Curso, período y nombre son requeridos')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          periodId,
          name: name.trim(),
          sedeId: sedeId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Sección creada')
      reset()
      onOpenChange(false)
      await onCreated()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva sección</DialogTitle>
          <DialogDescription>
            Una sección es un grupo de estudiantes que cursa un mismo curso
            en una sede durante un período.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Curso (REGULAR) *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 bg-white"
            >
              <option value="">— Elegir curso —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {courses.length === 0 && (
              <p className="text-[10px] text-amber-600 mt-1">
                No hay cursos REGULAR. Cambiá el track de algún curso en Diseño.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre de la sección *</label>
            <Input
              placeholder="Salón Mañana A"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Sede</label>
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 bg-white"
            >
              <option value="">— sin sede asignada —</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !courseId || !name.trim()}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crear sección'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

