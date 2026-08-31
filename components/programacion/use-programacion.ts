'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { ProgramacionData } from './types'
import { todayISO } from './helpers'

/**
 * Datos y acciones de Programación, compartidos por los tres niveles de la
 * navegación (períodos → sedes → cursos → fechas). Una sola llamada al API
 * devuelve todo; cada pantalla filtra lo que le toca mostrar.
 */
export function useProgramacion() {
  const [data, setData] = useState<ProgramacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedTransversales, setExpandedTransversales] = useState<Set<string>>(new Set())
  const [showNewPeriod, setShowNewPeriod] = useState(false)
  const [showNewSection, setShowNewSection] = useState(false)
  // Mostrar también períodos cerrados (default: no). Cambia el query del API.
  const [includeArchived, setIncludeArchived] = useState(false)

  const refetch = useCallback(async (): Promise<void> => {
    try {
      const url = includeArchived
        ? '/api/programacion?includeArchived=true'
        : '/api/programacion'
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const json = (await res.json()) as ProgramacionData
      setData(json)
      // Si el período activo seleccionado ya no está en la lista (porque
      // lo acabamos de cerrar y dejó de incluirse), saltar al primero activo.
      const currentExists = activePeriodId && json.periods.some((p) => p.id === activePeriodId)
      if (!currentExists) {
        const active = json.periods.find((p) => p.isActive) ?? json.periods[0]
        setActivePeriodId(active?.id ?? null)
      }
    } catch {
      toast.error('No se pudo cargar la programación')
    }
  }, [activePeriodId, includeArchived])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  const handleTogglePeriodActive = async (periodId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? 'cerrar' : 'reactivar'
    const period = data?.periods.find((p) => p.id === periodId)
    if (!confirm(
      currentlyActive
        ? `¿Cerrar el período "${period?.name}"? Las secciones de este período se ocultarán de la vista. Podés reabrirlo después.`
        : `¿Reactivar el período "${period?.name}"?`
    )) return
    try {
      const res = await fetch(`/api/admin/periods/${periodId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentlyActive }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success(currentlyActive ? 'Período cerrado' : 'Período reactivado')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message + ` (al ${action})`)
    }
  }

  const toggleExpand = (id: string, setFn: typeof setExpandedSections) => {
    setFn((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const handleToggleLesson = async (sectionId: string, lessonId: string, isOpen: boolean, availableAt?: string, closesAfterHours?: number) => {
    try {
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          publish: isOpen,
          sectionId,
          availableAt: availableAt || todayISO(),
          ...(closesAfterHours ? { closesAfterHours } : {}),
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

  const handleBulkToggle = async (lessonId: string, sectionIds: string[], publish: boolean, availableAt?: string, closesAfterHours?: number) => {
    try {
      const res = await fetch('/api/programacion/bulk-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          sectionIds,
          publish,
          availableAt: availableAt || todayISO(),
          ...(closesAfterHours ? { closesAfterHours } : {}),
        }),
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
    if (!confirm(`¿Eliminar la sección "${name}"? Solo funciona si no tiene estudiantes (es definitivo).`)) return
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

  const handleRenameSection = async (sectionId: string, currentName: string) => {
    const newName = prompt('Nuevo nombre de la sección:', currentName)
    if (newName === null) return
    const trimmed = newName.trim()
    if (!trimmed || trimmed === currentName) return
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Sección renombrada')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleArchiveSection = async (sectionId: string, name: string, archive: boolean) => {
    const msg = archive
      ? `¿Archivar la sección "${name}"? Quedará read-only (histórico). Los datos se conservan y podés desarchivarla cuando quieras.`
      : `¿Reactivar la sección "${name}"? Volverá a ser editable.`
    if (!confirm(msg)) return
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: archive }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success(archive ? 'Sección archivada' : 'Sección reactivada')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleEnrollStudent = async (sectionId: string, userId: string) => {
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [userId] }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Estudiante inscripto')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleUnenrollStudent = async (sectionId: string, userId: string, name: string) => {
    if (!confirm(`¿Quitar a "${name || userId}" de la sección?`)) return
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}/enrollments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Estudiante removido')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleAssignInstructor = async (sectionId: string, userId: string) => {
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}/instructors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Instructor asignado')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleUnassignInstructor = async (sectionId: string, userId: string, name: string) => {
    if (!confirm(`¿Quitar a "${name || userId}" como instructor?`)) return
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}/instructors`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Instructor removido')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleUpdateSectionDates = async (sectionId: string, startDate: string | null, endDate: string | null) => {
    try {
      const res = await fetch(`/api/admin/sections/${sectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success('Fechas actualizadas')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleBulkArchiveEnded = async () => {
    if (!activePeriodId) return
    // Primero dry-run para mostrar cuántas serían
    try {
      const dryRes = await fetch('/api/admin/sections/bulk-archive-ended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: activePeriodId, dryRun: true }),
      })
      const dry = await dryRes.json()
      const n = dry.wouldArchive ?? 0
      if (n === 0) {
        toast.success('No hay secciones terminadas hace +7 días para archivar')
        return
      }
      if (!confirm(`¿Archivar ${n} sección${n !== 1 ? 'es' : ''} cuya fecha de fin pasó hace más de 7 días?`)) return
      const res = await fetch('/api/admin/sections/bulk-archive-ended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: activePeriodId }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error || 'Error')
      toast.success(`${out.archived} sección${out.archived !== 1 ? 'es' : ''} archivada${out.archived !== 1 ? 's' : ''}`)
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  /**
   * Dicta un curso ya diseñado a una carrera. Reemplaza al formulario de
   * «Nueva sección»: la admisión, la sede y la carrera vienen del contexto, y
   * el nombre se deriva del padrón — nadie escribe nada.
   */
  const handleAgregarCurso = async (
    courseId: string, periodId: string, sedeId: string, careerId: string
  ) => {
    try {
      const res = await fetch('/api/programacion/agregar-curso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, periodId, sedeId, careerId }),
      })
      // Un 500 sin cuerpo dejaba `res.json()` explotando con «Unexpected end
      // of JSON input», que no dice nada de lo que pasó.
      const texto = await res.text()
      const data = texto ? JSON.parse(texto) : {}
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      if (data.yaExistia) {
        toast.info('Ese curso ya estaba en esta carrera')
      } else if (data.seleccionable) {
        toast.success('Sección creada — agrega los estudiantes por DNI')
      } else {
        toast.success(
          `${data.secciones} sección${data.secciones !== 1 ? 'es' : ''} · ${data.matriculas} matriculados`
        )
      }
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

  return {
    data,
    loading,
    activePeriodId,
    setActivePeriodId,
    expandedSections,
    setExpandedSections,
    expandedTransversales,
    setExpandedTransversales,
    showNewPeriod,
    setShowNewPeriod,
    showNewSection,
    setShowNewSection,
    includeArchived,
    setIncludeArchived,
    refetch,
    toggleExpand,
    handleTogglePeriodActive,
    handleToggleLesson,
    handleBulkToggle,
    handleDeleteSection,
    handleRenameSection,
    handleArchiveSection,
    handleEnrollStudent,
    handleUnenrollStudent,
    handleAssignInstructor,
    handleUnassignInstructor,
    handleUpdateSectionDates,
    handleBulkArchiveEnded,
    handleUpdateSectionSede,
    handleAgregarCurso,
  }
}
