'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Users, UserCog, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Period {
  id: string
  name: string
  isActive: boolean
  _count: { sections: number }
}

interface CourseOption {
  id: string
  title: string
  userId: string | null
  career: { name: string } | null
}

interface SectionData {
  id: string
  name: string
  period: { id: string; name: string }
  course: { id: string; title: string; career: { name: string } | null }
  instructors: Array<{
    id: string
    user: { id: string; name: string | null; email: string | null }
  }>
  _count: { enrollments: number }
}

interface InstructorOption {
  id: string
  name: string | null
  email: string | null
}

interface SectionsManagerProps {
  periods: Period[]
  courses: CourseOption[]
  sections: SectionData[]
  instructors: InstructorOption[]
  isSuperAdmin: boolean
}

export function SectionsManager({
  periods: initialPeriods,
  courses,
  sections: initialSections,
  instructors,
  isSuperAdmin,
}: SectionsManagerProps) {
  const [periods, setPeriods] = useState(initialPeriods)
  const [sections, setSections] = useState(initialSections)
  const [newPeriodName, setNewPeriodName] = useState('')
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSection, setNewSection] = useState({ courseId: '', periodId: '', name: '' })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [assignInstructor, setAssignInstructor] = useState<{ sectionId: string; userId: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function createPeriod() {
    if (!newPeriodName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPeriodName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al crear periodo')
        return
      }
      setPeriods(prev => [{ ...data, _count: { sections: 0 } }, ...prev])
      setNewPeriodName('')
      setShowNewPeriod(false)
      toast.success(`Periodo "${data.name}" creado`)
    } finally {
      setLoading(false)
    }
  }

  async function createSection() {
    if (!newSection.courseId || !newSection.periodId || !newSection.name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al crear sección')
        return
      }
      // Reload page to get full section data
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  async function addInstructor(sectionId: string, userId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}/instructors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al asignar instructor')
        return
      }
      setSections(prev =>
        prev.map(s =>
          s.id === sectionId
            ? { ...s, instructors: [...s.instructors, data] }
            : s
        )
      )
      setAssignInstructor(null)
      toast.success('Instructor asignado')
    } finally {
      setLoading(false)
    }
  }

  async function removeInstructor(sectionId: string, userId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}/instructors`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        toast.error('Error al remover instructor')
        return
      }
      setSections(prev =>
        prev.map(s =>
          s.id === sectionId
            ? { ...s, instructors: s.instructors.filter(i => i.user.id !== userId) }
            : s
        )
      )
      toast.success('Instructor removido')
    } finally {
      setLoading(false)
    }
  }

  // Group sections by period
  const sectionsByPeriod = sections.reduce((acc, section) => {
    const periodName = section.period.name
    if (!acc[periodName]) acc[periodName] = []
    acc[periodName].push(section)
    return acc
  }, {} as Record<string, SectionData[]>)

  return (
    <div className="space-y-6">
      {/* Periods */}
      {isSuperAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Periodos Académicos</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowNewPeriod(!showNewPeriod)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo Periodo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showNewPeriod && (
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Ej: 2026-1"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  className="max-w-xs"
                  onKeyDown={(e) => e.key === 'Enter' && createPeriod()}
                />
                <Button size="sm" onClick={createPeriod} disabled={loading || !newPeriodName.trim()}>
                  Crear
                </Button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {periods.map(p => (
                <span
                  key={p.id}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p.name}
                  <span className="text-xs ml-1 opacity-60">({p._count.sections} secciones)</span>
                </span>
              ))}
              {periods.length === 0 && (
                <p className="text-sm text-gray-400">No hay periodos creados</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Section Form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Secciones</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowNewSection(!showNewSection)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nueva Sección
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewSection && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <select
                value={newSection.courseId}
                onChange={(e) => setNewSection(prev => ({ ...prev, courseId: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1.5"
              >
                <option value="">Seleccionar curso...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.career?.name ? `${c.career.name} — ` : ''}{c.title}
                  </option>
                ))}
              </select>
              <select
                value={newSection.periodId}
                onChange={(e) => setNewSection(prev => ({ ...prev, periodId: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1.5"
              >
                <option value="">Seleccionar periodo...</option>
                {periods.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Input
                placeholder="Nombre (ej: Salón A)"
                value={newSection.name}
                onChange={(e) => setNewSection(prev => ({ ...prev, name: e.target.value }))}
                className="max-w-[180px]"
              />
              <Button
                size="sm"
                onClick={createSection}
                disabled={loading || !newSection.courseId || !newSection.periodId || !newSection.name.trim()}
              >
                Crear Sección
              </Button>
            </div>
          )}

          {/* Sections list grouped by period */}
          {Object.entries(sectionsByPeriod).map(([periodName, periodSections]) => (
            <div key={periodName} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Periodo {periodName}
              </h3>
              <div className="space-y-2">
                {periodSections.map(section => (
                  <div key={section.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{section.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {section.course.career?.name} — {section.course.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3.5 w-3.5" /> {section._count.enrollments}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <UserCog className="h-3.5 w-3.5" /> {section.instructors.length}
                        </span>
                        {expandedSection === section.id
                          ? <ChevronUp className="h-4 w-4 text-gray-400" />
                          : <ChevronDown className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                    </button>

                    {expandedSection === section.id && (
                      <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                        {/* Instructors */}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Instructores asignados</p>
                          {section.instructors.length === 0 && (
                            <p className="text-xs text-gray-400 mb-2">Sin instructores asignados</p>
                          )}
                          {section.instructors.map(inst => (
                            <div key={inst.id} className="flex items-center justify-between py-1">
                              <span className="text-sm text-gray-700">
                                {inst.user.name || inst.user.email}
                              </span>
                              <button
                                onClick={() => removeInstructor(section.id, inst.user.id)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          {/* Add instructor */}
                          {assignInstructor?.sectionId === section.id ? (
                            <div className="flex gap-2 mt-2">
                              <select
                                value={assignInstructor.userId}
                                onChange={(e) => setAssignInstructor({ sectionId: section.id, userId: e.target.value })}
                                className="text-xs border rounded px-2 py-1 flex-1"
                              >
                                <option value="">Seleccionar instructor...</option>
                                {instructors
                                  .filter(i => !section.instructors.some(si => si.user.id === i.id))
                                  .map(i => (
                                    <option key={i.id} value={i.id}>{i.name || i.email}</option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                disabled={!assignInstructor.userId || loading}
                                onClick={() => addInstructor(section.id, assignInstructor.userId)}
                              >
                                Asignar
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssignInstructor({ sectionId: section.id, userId: '' })}
                              className="text-xs text-blue-600 hover:underline mt-1"
                            >
                              + Asignar instructor
                            </button>
                          )}
                        </div>

                        {/* Enrollment count */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Estudiantes matriculados</p>
                          <p className="text-sm text-gray-700">{section._count.enrollments} estudiantes</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No hay secciones creadas. Crea un periodo y luego una sección.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
