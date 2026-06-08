'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  CalendarDays, Users, GraduationCap, Calendar, Lock,
  ChevronDown, ChevronRight, Loader2, Building2, Plus, Trash2, Sparkles, Check,
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
interface CareerMini { id: string; code: string | null; name: string }
interface Section {
  id: string
  name: string
  sedeId: string | null
  periodId: string
  course: {
    id: string
    title: string
    scope: 'TRANSVERSAL' | 'SPECIALIZATION'
    career: CareerMini | null
    lessons: Lesson[]
  }
  enrolledCount: number
  instructors: { id: string; name: string | null }[]
  schedules: Schedule[]
}
interface Period { id: string; name: string; isActive: boolean }
interface Sede { id: string; code: string; name: string }
interface RegularCourse { id: string; title: string }
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
function todayISO() { return new Date().toISOString().slice(0, 10) }

export default function ProgramacionPage() {
  const [data, setData] = useState<ProgramacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedTransversales, setExpandedTransversales] = useState<Set<string>>(new Set())
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)

  const refetch = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/programacion')
      if (!res.ok) throw new Error('fetch failed')
      const json = (await res.json()) as ProgramacionData
      setData(json)
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

  const toggleExpand = (id: string, setFn: typeof setExpandedSections) => {
    setFn((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filtrado por período + separación TRANSVERSAL vs SPECIALIZATION
  const { transversalGroups, sedeGroups } = useMemo(() => {
    const empty = { transversalGroups: new Map<string, Section[]>(), sedeGroups: new Map<string | null, Map<string, Section[]>>() }
    if (!data || !activePeriodId) return empty

    const filtered = data.sections.filter((s) => s.periodId === activePeriodId)

    // Transversales: agrupados por COURSE (todas sus secciones juntas)
    const transversales = filtered.filter((s) => s.course.scope === 'TRANSVERSAL')
    const tGroups = new Map<string, Section[]>()
    for (const s of transversales) {
      const arr = tGroups.get(s.course.id) ?? []
      arr.push(s)
      tGroups.set(s.course.id, arr)
    }

    // Especialización: agrupados por SEDE → CAREER
    const specs = filtered.filter((s) => s.course.scope === 'SPECIALIZATION')
    const sGroups = new Map<string | null, Map<string, Section[]>>()
    for (const s of specs) {
      const careerKey = s.course.career?.id ?? 'sin-carrera'
      let careerMap = sGroups.get(s.sedeId)
      if (!careerMap) {
        careerMap = new Map()
        sGroups.set(s.sedeId, careerMap)
      }
      const arr = careerMap.get(careerKey) ?? []
      arr.push(s)
      careerMap.set(careerKey, arr)
    }

    return { transversalGroups: tGroups, sedeGroups: sGroups }
  }, [data, activePeriodId])

  const handleToggleLesson = async (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string) => {
    try {
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, publish: isOpen, sectionId, availableAt: availableAt || todayISO() }),
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

  const handleBulkToggle = async (lessonId: string, sectionIds: string[], publish: boolean, availableAt?: string) => {
    try {
      const res = await fetch('/api/programacion/bulk-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, sectionIds, publish, availableAt: availableAt || todayISO() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      const data = await res.json()
      toast.success(`${data.action === 'opened' ? 'Abierta' : 'Cerrada'} en ${data.affected} secciones`)
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDeleteSection = async (sectionId: string, name: string) => {
    if (!confirm(`¿Eliminar la sección "${name}"? Solo funciona si no tiene estudiantes.`)) return
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

  if (loading) {
    return <div className="max-w-6xl mx-auto p-6"><p className="text-sm text-gray-500">Cargando programación...</p></div>
  }
  if (!data) return null

  const totalSections = data.sections.filter((s) => s.periodId === activePeriodId).length
  const totalTransversales = Array.from(transversalGroups.values()).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Programación</h1>
        </div>
        <p className="text-sm text-gray-600">
          Cuándo y a quién se entregan los cursos REGULAR. Organizado por sede y carrera.
        </p>
      </div>

      {/* Selector + acciones */}
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
                <option key={p.id} value={p.id}>{p.name} {p.isActive ? '· activo' : ''}</option>
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
            {totalSections} sección{totalSections !== 1 ? 'es' : ''} ·{' '}
            {transversalGroups.size} curso{transversalGroups.size !== 1 ? 's' : ''} transversal{transversalGroups.size !== 1 ? 'es' : ''}
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

      {totalSections === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            No hay secciones creadas en este período todavía.
          </p>
          {data.canCreate && (
            <Button size="sm" onClick={() => setShowNewSection(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Crear primera sección
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
          {/* === TRANSVERSALES === */}
          {transversalGroups.size > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-700 mb-3">
                <Sparkles className="h-4 w-4" />
                Cursos transversales ({transversalGroups.size})
                <span className="ml-2 text-xs font-normal text-gray-500 normal-case tracking-normal">
                  · {totalTransversales} secciones · "Abrir todas" actúa sobre TODAS las secciones del mismo curso
                </span>
              </h2>
              <div className="space-y-3">
                {Array.from(transversalGroups.entries()).map(([courseId, sections]) => (
                  <TransversalCard
                    key={courseId}
                    sections={sections}
                    sedes={data.sedes}
                    isExpanded={expandedTransversales.has(courseId)}
                    onToggleExpand={() => toggleExpand(courseId, setExpandedTransversales)}
                    onBulkToggle={handleBulkToggle}
                    onToggleLesson={handleToggleLesson}
                  />
                ))}
              </div>
            </section>
          )}

          {/* === ESPECIALIZACIÓN POR SEDE → CARRERA === */}
          {Array.from(sedeGroups.entries()).map(([sedeId, careerMap]) => {
            const sede = data.sedes.find((s) => s.id === sedeId)
            return (
              <section key={sedeId ?? 'sin-sede'}>
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  {sede ? (
                    <>
                      <code className="font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs">{sede.code}</code>
                      <span>{sede.name}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Sin sede asignada</span>
                  )}
                </h2>

                <div className="space-y-4 ml-2 pl-3 border-l-2 border-emerald-100">
                  {Array.from(careerMap.entries()).map(([careerKey, sections]) => {
                    const career = sections[0].course.career
                    return (
                      <div key={careerKey}>
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {career ? (
                            <>
                              {career.code && (
                                <code className="font-mono bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded text-[10px]">
                                  {career.code}
                                </code>
                              )}
                              <span className="normal-case tracking-normal">{career.name}</span>
                            </>
                          ) : (
                            <span className="text-gray-400 normal-case tracking-normal">Sin carrera</span>
                          )}
                          <span className="text-gray-400">· {sections.length} secc{sections.length !== 1 ? 'iones' : 'ión'}</span>
                        </h3>
                        <div className="space-y-2">
                          {sections.map((sec) => (
                            <SectionCard
                              key={sec.id}
                              section={sec}
                              sedes={data.sedes}
                              canEdit={data.canCreate}
                              isExpanded={expandedSections.has(sec.id)}
                              onToggleExpand={() => toggleExpand(sec.id, setExpandedSections)}
                              onToggleLesson={handleToggleLesson}
                              onUpdateSede={handleUpdateSectionSede}
                              onDelete={handleDeleteSection}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Card className="p-4 bg-gray-50 border-gray-200">
        <p className="text-xs text-gray-600">
          💡 Carreras y sus sedes se gestionan en{' '}
          <Link href="/admin" className="text-indigo-600 hover:underline font-medium">Config → Carreras</Link>.
        </p>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TransversalCard: agrupa todas las secciones de UN curso transversal,
// permite "Abrir todas" a la vez por lección.
// ═══════════════════════════════════════════════════════════════
function TransversalCard({
  sections, sedes, isExpanded, onToggleExpand, onBulkToggle, onToggleLesson,
}: {
  sections: Section[]
  sedes: Sede[]
  isExpanded: boolean
  onToggleExpand: () => void
  onBulkToggle: (lessonId: string, sectionIds: string[], publish: boolean, availableAt?: string) => void
  onToggleLesson: (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string) => void
}) {
  const course = sections[0].course
  const totalEnrolled = sections.reduce((s, sec) => s + sec.enrolledCount, 0)
  const lessons = course.lessons

  return (
    <Card className="overflow-hidden border-purple-200">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-purple-50/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">{course.title}</h3>
            <p className="text-xs text-gray-500">
              {sections.length} secciones · {totalEnrolled} estudiantes · {lessons.length} lecciones
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] uppercase">
          Transversal
        </Badge>
      </button>

      {isExpanded && (
        <div className="border-t bg-purple-50/20 p-4 space-y-3">
          {/* Lista de secciones (resumen) */}
          <div className="text-xs text-gray-600">
            <span className="font-medium">Secciones:</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sections.map((sec) => {
                const sede = sedes.find((s) => s.id === sec.sedeId)
                return (
                  <span key={sec.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px]">
                    {sede && <code className="font-mono font-semibold text-emerald-700">{sede.code}</code>}
                    <span>{sec.name}</span>
                    <span className="text-gray-400">({sec.enrolledCount})</span>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Calendario consolidado: por lección, una fila por SEDE con check + fecha propia */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-2">
              📅 Calendario por sede
            </h4>
            <div className="space-y-3">
              {lessons.map((lesson, idx) => (
                <BulkLessonRow
                  key={lesson.id}
                  index={idx + 1}
                  lesson={lesson}
                  sections={sections}
                  sedes={sedes}
                  onBulkToggle={(sectionIds, publish, availableAt) =>
                    onBulkToggle(lesson.id, sectionIds, publish, availableAt)
                  }
                />
              ))}
            </div>
          </div>

          {/* Detalle por sección — opcional, fold de fold */}
          <details className="text-xs">
            <summary className="cursor-pointer text-purple-700 hover:text-purple-800 font-medium">
              Ver detalle por sección individual
            </summary>
            <div className="mt-2 space-y-2">
              {sections.map((sec) => (
                <div key={sec.id} className="bg-white border border-gray-200 rounded p-2">
                  <p className="text-[11px] font-semibold text-gray-700 mb-1">
                    {sec.name} {sec.sedeId && <code className="font-mono text-emerald-700 text-[10px]">[{sedes.find((s) => s.id === sec.sedeId)?.code}]</code>}
                  </p>
                  <div className="space-y-1">
                    {lessons.map((lesson, idx) => {
                      const schedule = sec.schedules.find((s) => s.lessonId === lesson.id)
                      return (
                        <LessonScheduleRow
                          key={lesson.id}
                          index={idx + 1}
                          lesson={lesson}
                          isOpen={!!schedule}
                          schedule={schedule}
                          onToggle={(open, availableAt) => onToggleLesson(sec.id, lesson.id, open, availableAt)}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// BulkLessonRow: una lección con UNA FILA POR SEDE. Cada sede tiene su
// propia fecha de apertura. Click en el toggle aplica para esa sede
// (todas sus secciones a la vez).
// ═══════════════════════════════════════════════════════════════
interface SedeGroup {
  key: string
  sedeId: string | null
  code: string
  name: string
  sectionIds: string[]
  openSectionIds: string[]
  defaultDate: string
}

function groupSectionsBySede(
  sections: Section[],
  sedes: Sede[],
  lessonId: string,
): SedeGroup[] {
  const map = new Map<string | null, Section[]>()
  for (const s of sections) {
    const arr = map.get(s.sedeId) ?? []
    arr.push(s)
    map.set(s.sedeId, arr)
  }
  return Array.from(map.entries()).map(([sedeId, secs]) => {
    const sede = sedes.find((x) => x.id === sedeId)
    const openSecs = secs.filter((s) =>
      s.schedules.some((sch) => sch.lessonId === lessonId)
    )
    // Fecha por defecto: la de la 1ra sección abierta, o hoy.
    const firstOpen = openSecs[0]?.schedules.find((sch) => sch.lessonId === lessonId)
    const defaultDate = firstOpen
      ? new Date(firstOpen.availableAt).toISOString().slice(0, 10)
      : todayISO()
    return {
      key: sedeId ?? 'no-sede',
      sedeId,
      code: sede?.code ?? '—',
      name: sede?.name ?? 'Sin sede',
      sectionIds: secs.map((s) => s.id),
      openSectionIds: openSecs.map((s) => s.id),
      defaultDate,
    }
  })
}

function BulkLessonRow({
  index, lesson, sections, sedes, onBulkToggle,
}: {
  index: number
  lesson: Lesson
  sections: Section[]
  sedes: Sede[]
  onBulkToggle: (sectionIds: string[], publish: boolean, availableAt?: string) => void
}) {
  const sedeGroups = groupSectionsBySede(sections, sedes, lesson.id)
  const totalOpen = sedeGroups.reduce((sum, g) => sum + g.openSectionIds.length, 0)
  const totalSections = sedeGroups.reduce((sum, g) => sum + g.sectionIds.length, 0)
  const isCompact = sedeGroups.length === 1

  return (
    <div className="border border-gray-200 rounded-md p-3 bg-white">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[11px] text-gray-400 w-5 shrink-0 font-mono">{index}</span>
        <p className="text-sm font-medium text-gray-900 flex-1">{lesson.title}</p>
        <span className="text-[10px] text-gray-500 shrink-0">
          {totalOpen}/{totalSections} secc. abiertas
        </span>
      </div>
      <div className={isCompact ? 'ml-7' : 'ml-7 space-y-1.5'}>
        {sedeGroups.map((g) => (
          <SedeToggleRow
            key={g.key}
            group={g}
            lessonTitle={lesson.title}
            onToggle={(publish, availableAt) =>
              onBulkToggle(g.sectionIds, publish, availableAt)
            }
          />
        ))}
      </div>
    </div>
  )
}

function SedeToggleRow({
  group, lessonTitle, onToggle,
}: {
  group: SedeGroup
  lessonTitle: string
  onToggle: (publish: boolean, availableAt?: string) => void
}) {
  const [date, setDate] = useState(group.defaultDate)
  const [submitting, setSubmitting] = useState(false)

  const total = group.sectionIds.length
  const open = group.openSectionIds.length
  const allOpen = total > 0 && open === total
  const noneOpen = open === 0
  const partial = open > 0 && open < total

  const handleClick = async () => {
    if (allOpen) {
      if (!confirm(`¿Cerrar "${lessonTitle}" en ${group.code} (${total} secc${total !== 1 ? 'iones' : 'ión'})?`)) return
      setSubmitting(true)
      await onToggle(false)
      setSubmitting(false)
    } else {
      // open all (partial → completar)
      setSubmitting(true)
      await onToggle(true, date)
      setSubmitting(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-sm ${
      allOpen ? 'bg-green-50 border border-green-200' :
      partial ? 'bg-amber-50 border border-amber-200' :
      'bg-gray-50 border border-gray-200'
    }`}>
      {/* Checkbox visual */}
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="shrink-0"
        title={allOpen ? 'Cerrar en esta sede' : 'Abrir en esta sede'}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : allOpen ? (
          <div className="h-4 w-4 rounded bg-green-600 flex items-center justify-center">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </div>
        ) : partial ? (
          <div className="h-4 w-4 rounded bg-amber-500 flex items-center justify-center">
            <div className="h-1.5 w-1.5 bg-white rounded-sm" />
          </div>
        ) : (
          <div className="h-4 w-4 rounded border-2 border-gray-300 bg-white" />
        )}
      </button>

      {/* Sede code + name */}
      <code className="font-mono font-bold text-xs text-emerald-700 w-12 shrink-0">{group.code}</code>

      {/* Status count */}
      <span className={`text-[11px] tabular-nums w-16 shrink-0 ${
        allOpen ? 'text-green-700 font-semibold' :
        partial ? 'text-amber-700 font-semibold' :
        'text-gray-500'
      }`}>
        {open}/{total} secc
      </span>

      {/* Date picker — ancho consistente */}
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={submitting}
        className="h-7 text-xs w-36 ml-auto"
        title={allOpen ? 'Fecha actual (cambiar requiere cerrar + reabrir)' : 'Fecha al abrir'}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SectionCard: sección REGULAR (SPECIALIZATION) con su calendario individual
// ═══════════════════════════════════════════════════════════════
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
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 text-sm">{section.name}</h4>
              <span className="text-xs text-gray-500">· {section.course.title}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600 shrink-0">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{section.enrolledCount}</span>
          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{section.instructors.length}</span>
          <span className="flex items-center gap-1 font-semibold">
            {openLessons}/{totalLessons}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t bg-gray-50/30 p-3 space-y-2">
          {canEdit && (
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-200">
              <label className="text-xs font-medium text-gray-700">Sede:</label>
              <select
                value={section.sedeId ?? ''}
                onChange={(e) => onUpdateSede(section.id, e.target.value || null)}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="">— sin sede —</option>
                {sedes.map((s) => (<option key={s.id} value={s.id}>{s.code} · {s.name}</option>))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => onDelete(section.id, section.name)} className="ml-auto h-7 px-2 text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Eliminar
              </Button>
            </div>
          )}

          {section.instructors.length > 0 && (
            <div className="mb-2 text-[11px] text-gray-600">
              <span className="font-medium">Instructores:</span>{' '}
              {section.instructors.map((i) => i.name || '(sin nombre)').join(', ')}
            </div>
          )}

          {section.course.lessons.length === 0 ? (
            <p className="text-xs text-gray-400">El curso no tiene lecciones diseñadas.</p>
          ) : (
            <div className="space-y-1">
              {section.course.lessons.map((lesson, idx) => {
                const schedule = section.schedules.find((s) => s.lessonId === lesson.id)
                return (
                  <LessonScheduleRow
                    key={lesson.id}
                    index={idx + 1}
                    lesson={lesson}
                    isOpen={!!schedule}
                    schedule={schedule}
                    onToggle={(open, availableAt) => onToggleLesson(section.id, lesson.id, open, availableAt)}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// LessonScheduleRow: toggle individual de una lección × sección
// ═══════════════════════════════════════════════════════════════
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
  const [dateInput, setDateInput] = useState(schedule ? new Date(schedule.availableAt).toISOString().slice(0, 10) : todayISO())
  const [submitting, setSubmitting] = useState(false)

  const handleOpen = async () => {
    setSubmitting(true)
    await onToggle(true, dateInput)
    setSubmitting(false)
    setEditing(false)
  }
  const handleClose = async () => {
    if (!confirm(`¿Cerrar "${lesson.title}"?`)) return
    setSubmitting(true)
    await onToggle(false)
    setSubmitting(false)
  }

  return (
    <div className={`flex items-center gap-2 p-2 rounded ${isOpen ? 'bg-green-50/60 border border-green-100' : 'bg-white border border-gray-100'}`}>
      <span className="text-[10px] text-gray-400 w-4 shrink-0 font-mono">{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-900 truncate">{lesson.title}</p>
        {isOpen && schedule && (
          <p className="text-[10px] text-green-700">{formatDate(schedule.availableAt)} · cierre {schedule.closesAfterHours}h</p>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className="text-[11px] h-7 w-32" />
          <Button size="sm" onClick={handleOpen} disabled={submitting} className="h-7">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7">✕</Button>
        </div>
      ) : isOpen ? (
        <Button size="sm" variant="outline" onClick={handleClose} disabled={submitting} className="h-7 gap-1 text-amber-700 hover:bg-amber-50 text-[11px]">
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
          Cerrar
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 gap-1 text-green-700 hover:bg-green-50 text-[11px]">
          <Calendar className="h-3 w-3" />
          Abrir
        </Button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Modales
// ═══════════════════════════════════════════════════════════════

function NewPeriodModal({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Nombre requerido'); return }
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
          <DialogDescription>Ej: 2026-1, 2026-2.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input placeholder="2026-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crear'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewSectionModal({ open, onOpenChange, periodId, sedes, courses, onCreated }: {
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
        body: JSON.stringify({ courseId, periodId, name: name.trim(), sedeId: sedeId || null }),
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
          <DialogDescription>Grupo de estudiantes que cursa un mismo curso en una sede.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Curso (REGULAR) *</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 bg-white">
              <option value="">— Elegir curso —</option>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Nombre de la sección *</label>
            <Input placeholder="Salón Mañana A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Sede</label>
            <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 bg-white">
              <option value="">— sin sede —</option>
              {sedes.map((s) => (<option key={s.id} value={s.id}>{s.code} · {s.name}</option>))}
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
