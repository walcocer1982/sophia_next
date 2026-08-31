'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Archive, Check, ChevronDown, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Lesson, Section, Sede } from './types'
import {
  closeTime, formatDateShort, getSectionDateStatus, hoursBetween,
  isoToInputDate, localTime, toLocalISO, todayISO,
} from './helpers'
import { LessonScheduleRow } from './lesson-schedule-row'

// ═══════════════════════════════════════════════════════════════
// TransversalCard: agrupa todas las secciones de UN curso transversal,
// permite "Abrir todas" a la vez por lección.
// ═══════════════════════════════════════════════════════════════
export function TransversalCard({
  sections, sedes, canEdit, isExpanded, onToggleExpand,
  onBulkToggle, onToggleLesson, onArchive, onDelete, onRename, onUpdateDates,
}: {
  sections: Section[]
  sedes: Sede[]
  canEdit: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onBulkToggle: (lessonId: string, sectionIds: string[], publish: boolean, availableAt?: string, closesAfterHours?: number) => void
  onToggleLesson: (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string, closesAfterHours?: number) => void
  onArchive: (sectionId: string, name: string, archive: boolean) => void
  onDelete: (sectionId: string, name: string) => void
  onRename: (sectionId: string, currentName: string) => void
  onUpdateDates: (sectionId: string, startDate: string | null, endDate: string | null) => void
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
                const canRename = canEdit && !sec.isArchived
                return (
                  <button
                    key={sec.id}
                    type="button"
                    disabled={!canRename}
                    onClick={() => canRename && onRename(sec.id, sec.name)}
                    title={canRename ? 'Click para renombrar' : undefined}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] ${
                      canRename ? 'hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {sede && <code className="font-mono font-semibold text-emerald-700">{sede.code}</code>}
                    <span>{sec.name}</span>
                    <span className="text-gray-400">({sec.enrolledCount})</span>
                  </button>
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
                  onBulkToggle={(sectionIds, publish, availableAt, closesAfterHours) =>
                    onBulkToggle(lesson.id, sectionIds, publish, availableAt, closesAfterHours)
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
              {sections.map((sec) => {
                const secStatus = getSectionDateStatus(sec.startDate, sec.endDate)
                return (
                <div key={sec.id} className={`bg-white border border-gray-200 rounded p-2 ${sec.isArchived ? 'opacity-70 bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[11px] font-semibold text-gray-700 flex items-center gap-1.5 flex-wrap">
                      {sec.name}
                      {sec.sedeId && <code className="font-mono text-emerald-700 text-[10px]">[{sedes.find((s) => s.id === sec.sedeId)?.code}]</code>}
                      <span className="text-gray-400 font-normal">· {sec.enrolledCount} estudiantes</span>
                      {(sec.startDate || sec.endDate) && (
                        <span className="text-gray-500 font-normal">
                          · {sec.startDate ? formatDateShort(sec.startDate) : '—'} → {sec.endDate ? formatDateShort(sec.endDate) : '—'}
                        </span>
                      )}
                      {secStatus && !sec.isArchived && (
                        <Badge variant="outline" className={`text-[9px] uppercase ${secStatus.className}`}>
                          {secStatus.label}
                        </Badge>
                      )}
                      {sec.isArchived && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] uppercase">
                          <Archive className="h-2 w-2 mr-0.5" />
                          Archivada
                        </Badge>
                      )}
                    </p>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!sec.isArchived && (
                          <button
                            type="button"
                            onClick={() => onRename(sec.id, sec.name)}
                            className="text-[10px] px-1.5 py-0.5 rounded text-indigo-700 hover:bg-indigo-50"
                            title="Cambiar el nombre de la sección"
                          >
                            Renombrar
                          </button>
                        )}
                        {!sec.isArchived && (
                          <SubSectionDateEditor section={sec} onUpdateDates={onUpdateDates} />
                        )}
                        <button
                          type="button"
                          onClick={() => onArchive(sec.id, sec.name, !sec.isArchived)}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${sec.isArchived ? 'text-emerald-700 hover:bg-emerald-50' : 'text-amber-700 hover:bg-amber-50'}`}
                          title={sec.isArchived ? 'Reactivar' : 'Archivar (queda read-only)'}
                        >
                          {sec.isArchived ? 'Reactivar' : 'Archivar'}
                        </button>
                        {sec.enrolledCount === 0 && !sec.isArchived && (
                          <button
                            type="button"
                            onClick={() => onDelete(sec.id, sec.name)}
                            className="text-[10px] px-1.5 py-0.5 rounded text-red-600 hover:bg-red-50"
                            title="Eliminar definitivamente (sin estudiantes)"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
                          readOnly={sec.isArchived}
                          onToggle={(open, availableAt, closesAfterHours) => onToggleLesson(sec.id, lesson.id, open, availableAt, closesAfterHours)}
                        />
                      )
                    })}
                  </div>
                </div>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SubSectionDateEditor: mini-popover para editar fechas de una sección
// dentro del TransversalCard sin abrir un modal completo.
// ═══════════════════════════════════════════════════════════════
function SubSectionDateEditor({
  section, onUpdateDates,
}: {
  section: Section
  onUpdateDates: (sectionId: string, startDate: string | null, endDate: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [startInput, setStartInput] = useState(isoToInputDate(section.startDate))
  const [endInput, setEndInput] = useState(isoToInputDate(section.endDate))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setStartInput(isoToInputDate(section.startDate))
          setEndInput(isoToInputDate(section.endDate))
          setOpen(true)
        }}
        className="text-[10px] px-1.5 py-0.5 rounded text-indigo-700 hover:bg-indigo-50"
        title="Editar fechas de inicio/fin"
      >
        Fechas
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 bg-white border border-indigo-200 rounded px-1 py-0.5">
      <Input
        type="date"
        value={startInput}
        onChange={(e) => setStartInput(e.target.value)}
        className="h-6 w-28 text-[10px] px-1"
      />
      <span className="text-gray-400 text-[10px]">→</span>
      <Input
        type="date"
        value={endInput}
        onChange={(e) => setEndInput(e.target.value)}
        className="h-6 w-28 text-[10px] px-1"
      />
      <button
        type="button"
        onClick={() => {
          onUpdateDates(section.id, startInput || null, endInput || null)
          setOpen(false)
        }}
        className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[10px] px-1 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
    </div>
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
  defaultStart: string // HH:mm local
  defaultEnd: string   // HH:mm local
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
    // Fecha/horas por defecto: las de la 1ra sección abierta, o hoy 08:00-10:00.
    const firstOpen = openSecs[0]?.schedules.find((sch) => sch.lessonId === lessonId)
    const defaultDate = firstOpen
      ? new Date(firstOpen.availableAt).toISOString().slice(0, 10)
      : todayISO()
    const defaultStart = firstOpen ? localTime(firstOpen.availableAt) : '08:00'
    const defaultEnd = firstOpen
      ? closeTime(firstOpen.availableAt, firstOpen.closesAfterHours)
      : '10:00'
    return {
      key: sedeId ?? 'no-sede',
      sedeId,
      code: sede?.code ?? '—',
      name: sede?.name ?? 'Sin sede',
      sectionIds: secs.map((s) => s.id),
      openSectionIds: openSecs.map((s) => s.id),
      defaultDate,
      defaultStart,
      defaultEnd,
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
  onBulkToggle: (sectionIds: string[], publish: boolean, availableAt?: string, closesAfterHours?: number) => void
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
            onToggle={(publish, availableAt, closesAfterHours) =>
              onBulkToggle(g.sectionIds, publish, availableAt, closesAfterHours)
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
  onToggle: (publish: boolean, availableAt?: string, closesAfterHours?: number) => void
}) {
  const [date, setDate] = useState(group.defaultDate)
  const [startTime, setStartTime] = useState(group.defaultStart)
  const [endTime, setEndTime] = useState(group.defaultEnd)
  const [submitting, setSubmitting] = useState(false)

  const total = group.sectionIds.length
  const open = group.openSectionIds.length
  const allOpen = total > 0 && open === total
  const noneOpen = open === 0
  const partial = open > 0 && open < total

  // Hay cambios pendientes en fecha/hora respecto a lo guardado en el servidor.
  // Usado para mostrar el botón "Aplicar" SOLO cuando hace falta (no contamina
  // la UI mientras no haya nada que guardar). Si la sede no está abierta no
  // tiene sentido — el checkbox ya guarda al abrir.
  const dirty =
    allOpen &&
    (date !== group.defaultDate ||
      startTime !== group.defaultStart ||
      endTime !== group.defaultEnd)

  const handleClick = async () => {
    if (allOpen) {
      if (!confirm(`¿Cerrar "${lessonTitle}" en ${group.code} (${total} secc${total !== 1 ? 'iones' : 'ión'})?`)) return
      setSubmitting(true)
      await onToggle(false)
      setSubmitting(false)
    } else {
      // open all (partial → completar)
      const hours = hoursBetween(startTime, endTime)
      if (hours === 0) {
        toast.error('La hora de cierre debe ser posterior a la de inicio')
        return
      }
      setSubmitting(true)
      await onToggle(true, toLocalISO(date, startTime), hours)
      setSubmitting(false)
    }
  }

  const handleApply = async () => {
    const hours = hoursBetween(startTime, endTime)
    if (hours === 0) {
      toast.error('La hora de cierre debe ser posterior a la de inicio')
      return
    }
    setSubmitting(true)
    // Re-enviar publish=true con los nuevos valores → upsert en el endpoint.
    await onToggle(true, toLocalISO(date, startTime), hours)
    setSubmitting(false)
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

      {/* Fecha + hora inicio + hora cierre */}
      <div className="flex items-center gap-1 ml-auto">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={submitting}
          className="h-7 text-xs w-32"
          title={allOpen ? 'Cambiar fecha — click en "Aplicar" para guardar' : 'Fecha al abrir'}
        />
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          disabled={submitting}
          className="h-7 text-xs w-22"
          title="Hora de inicio"
        />
        <span className="text-[10px] text-gray-400">a</span>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          disabled={submitting}
          className="h-7 text-xs w-22"
          title="Hora de cierre"
        />
        {dirty && (
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={submitting}
            className="h-7 px-2 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
            title="Guardar los cambios de fecha/hora en esta sede"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aplicar'}
          </Button>
        )}
      </div>
    </div>
  )
}

