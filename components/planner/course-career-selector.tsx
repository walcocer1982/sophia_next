'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface CourseCareerSelectorProps {
  courseId: string
  currentCareerId: string | null
  careers: Array<{ id: string; name: string }>
}

export function CourseCareerSelector({ courseId, currentCareerId, careers }: CourseCareerSelectorProps) {
  const [value, setValue] = useState(currentCareerId || 'all')
  const [saving, setSaving] = useState(false)

  const handleChange = async (newValue: string) => {
    setValue(newValue)
    setSaving(true)
    try {
      const res = await fetch('/api/planner/course/update-career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          careerId: newValue === 'all' ? null : newValue,
        }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      toast.success(newValue === 'all' ? 'Curso asignado a todas las carreras' : 'Carrera actualizada')
    } catch {
      setValue(currentCareerId || 'all')
      toast.error('Error al actualizar carrera')
    } finally {
      setSaving(false)
    }
  }

  const currentLabel = value === 'all'
    ? 'Todas las carreras'
    : careers.find(c => c.id === value)?.name || 'Sin carrera'

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Carrera:</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 disabled:opacity-50"
      >
        <option value="all">Todas las carreras</option>
        {careers.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {saving && <span className="text-xs text-gray-400">Guardando...</span>}
    </div>
  )
}
