'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Archive, ArchiveRestore, ChevronDown, ChevronRight, GraduationCap, Trash2, Users,
} from 'lucide-react'
import type { InstructorOption, Section, Sede, UserMini } from './types'
import { formatDate, formatDateShort, getSectionDateStatus, isoToInputDate } from './helpers'
import { LessonScheduleRow } from './lesson-schedule-row'
import { PeopleSection } from './people-section'

// ═══════════════════════════════════════════════════════════════
// SectionCard: sección REGULAR (SPECIALIZATION) con su calendario individual
// ═══════════════════════════════════════════════════════════════
export function SectionCard({
  section, sedes, canEdit,
  availableStudents, availableInstructors,
  isExpanded, onToggleExpand,
  onToggleLesson, onUpdateSede, onUpdateDates, onDelete, onArchive, onRename,
  onEnrollStudent, onUnenrollStudent, onAssignInstructor, onUnassignInstructor,
}: {
  section: Section
  sedes: Sede[]
  canEdit: boolean
  availableStudents: UserMini[]
  availableInstructors: InstructorOption[]
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleLesson: (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string, closesAfterHours?: number) => void
  onUpdateSede: (sectionId: string, sedeId: string | null) => void
  onUpdateDates: (sectionId: string, startDate: string | null, endDate: string | null) => void
  onDelete: (sectionId: string, name: string) => void
  onArchive: (sectionId: string, name: string, archive: boolean) => void
  onRename: (sectionId: string, currentName: string) => void
  onEnrollStudent: (sectionId: string, userId: string) => void
  onUnenrollStudent: (sectionId: string, userId: string, name: string) => void
  onAssignInstructor: (sectionId: string, userId: string) => void
  onUnassignInstructor: (sectionId: string, userId: string, name: string) => void
}) {
  const totalLessons = section.course.lessons.length
  const openLessons = section.schedules.length
  const hasEnrollments = section.enrolledCount > 0
  const dateStatus = getSectionDateStatus(section.startDate, section.endDate)
  const [editingDates, setEditingDates] = useState(false)
  const [startInput, setStartInput] = useState(isoToInputDate(section.startDate))
  const [endInput, setEndInput] = useState(isoToInputDate(section.endDate))
  // Sección archivada → read-only en TODA la UI (no editar sede, no inscribir,
  // no asignar instructores, no abrir/cerrar lecciones).
  const writable = canEdit && !section.isArchived

  return (
    <Card className={`overflow-hidden ${section.isArchived ? 'bg-gray-50/60 border-gray-300 opacity-90' : ''}`}>
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold text-sm ${section.isArchived ? 'text-gray-500' : 'text-gray-900'}`}>
                {section.name}
              </h4>
              <span className="text-xs text-gray-500">· {section.course.title}</span>
              {dateStatus && !section.isArchived && (
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${dateStatus.className}`}>
                  {dateStatus.label}
                </Badge>
              )}
              {section.isArchived && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase tracking-wider">
                  <Archive className="h-2.5 w-2.5 mr-1" />
                  Archivada
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
              {(section.startDate || section.endDate) && (
                <span>
                  {section.startDate ? formatDateShort(section.startDate) : '—'}
                  {' → '}
                  {section.endDate ? formatDateShort(section.endDate) : '—'}
                </span>
              )}
              {section.isArchived && section.archivedAt && (
                <span>· archivada el {formatDate(section.archivedAt)}</span>
              )}
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
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-200 flex-wrap">
              <label className="text-xs font-medium text-gray-700">Sede:</label>
              <select
                value={section.sedeId ?? ''}
                onChange={(e) => onUpdateSede(section.id, e.target.value || null)}
                disabled={section.isArchived}
                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">— sin sede —</option>
                {sedes.map((s) => (<option key={s.id} value={s.id}>{s.code} · {s.name}</option>))}
              </select>

              {!section.isArchived && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRename(section.id, section.name)}
                  className="ml-auto h-7 px-2 text-indigo-700 hover:bg-indigo-50"
                  title="Cambiar el nombre de la sección"
                >
                  Renombrar
                </Button>
              )}

              {/* Archivar / Reactivar — siempre disponible para SUPERADMIN/ADMIN */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onArchive(section.id, section.name, !section.isArchived)}
                className={`${section.isArchived ? 'ml-auto' : ''} h-7 px-2 ${section.isArchived ? 'text-emerald-700 hover:bg-emerald-50' : 'text-amber-700 hover:bg-amber-50'}`}
                title={section.isArchived ? 'Reactivar (volverá a ser editable)' : 'Archivar (queda read-only, datos se conservan)'}
              >
                {section.isArchived ? (
                  <><ArchiveRestore className="h-3.5 w-3.5 mr-1" /> Reactivar</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-1" /> Archivar</>
                )}
              </Button>

              {/* Eliminar definitivo SOLO si no tiene estudiantes y NO está archivada */}
              {!hasEnrollments && !section.isArchived && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(section.id, section.name)}
                  className="h-7 px-2 text-red-600 hover:bg-red-50"
                  title="Eliminar definitivamente (solo posible porque no tiene estudiantes)"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          )}

          {/* Fechas de dictado */}
          {canEdit && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 flex-wrap text-xs">
              <label className="font-medium text-gray-700">Fechas:</label>
              {editingDates ? (
                <>
                  <Input
                    type="date"
                    value={startInput}
                    onChange={(e) => setStartInput(e.target.value)}
                    className="h-7 w-36 text-xs"
                    placeholder="inicio"
                  />
                  <span className="text-gray-400">→</span>
                  <Input
                    type="date"
                    value={endInput}
                    onChange={(e) => setEndInput(e.target.value)}
                    className="h-7 w-36 text-xs"
                    placeholder="fin"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdateDates(section.id, startInput || null, endInput || null)
                      setEditingDates(false)
                    }}
                    className="h-7"
                  >
                    OK
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingDates(false)} className="h-7">
                    ✕
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-gray-700">
                    {section.startDate ? formatDateShort(section.startDate) : 'sin inicio'}
                    {' → '}
                    {section.endDate ? formatDateShort(section.endDate) : 'sin fin'}
                  </span>
                  {!section.isArchived && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setStartInput(isoToInputDate(section.startDate))
                        setEndInput(isoToInputDate(section.endDate))
                        setEditingDates(true)
                      }}
                      className="h-6 px-2 text-[11px] text-indigo-700 hover:bg-indigo-50"
                    >
                      Editar
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Instructores */}
          <PeopleSection
            title="Instructores"
            people={section.instructors}
            available={availableInstructors.filter((u) =>
              !section.instructors.some((i) => i.id === u.id)
            )}
            canEdit={writable}
            onAdd={(userId) => onAssignInstructor(section.id, userId)}
            onRemove={(userId, name) => onUnassignInstructor(section.id, userId, name)}
            emptyMessage="Sin instructores asignados"
            addLabel="+ Asignar instructor"
          />

          {/* Estudiantes */}
          <PeopleSection
            title={`Estudiantes (${section.enrolledStudents.length})`}
            people={section.enrolledStudents}
            available={availableStudents.filter((u) =>
              !section.enrolledStudents.some((e) => e.id === u.id)
            )}
            canEdit={writable}
            onAdd={(userId) => onEnrollStudent(section.id, userId)}
            onRemove={(userId, name) => onUnenrollStudent(section.id, userId, name)}
            emptyMessage="Sin estudiantes inscriptos"
            addLabel="+ Inscribir estudiante"
            maxVisible={5}
          />

          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-3 mb-1.5">
            📅 Calendario
          </h4>
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
                    readOnly={section.isArchived}
                    onToggle={(open, availableAt, closesAfterHours) => onToggleLesson(section.id, lesson.id, open, availableAt, closesAfterHours)}
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

