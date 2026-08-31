'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { RegularCourse, Sede } from './types'

// ═══════════════════════════════════════════════════════════════
// Modales
// ═══════════════════════════════════════════════════════════════

export function NewPeriodModal({ open, onOpenChange, onCreated }: {
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

export function NewSectionModal({ open, onOpenChange, periodId, sedes, courses, onCreated }: {
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
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCourseId(''); setName(''); setSedeId(''); setStartDate(''); setEndDate('')
  }

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
          startDate: startDate || null,
          endDate: endDate || null,
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Fecha de inicio</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Fecha de fin</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Las fechas son opcionales pero recomendadas: permiten ordenar las cohorts por inicio y archivar automáticamente las que ya terminaron.
          </p>
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
