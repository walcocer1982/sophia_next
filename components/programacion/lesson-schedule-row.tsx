'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import type { Lesson, Schedule } from './types'
import { closeTime, formatDate, hoursBetween, localTime, toLocalISO, todayISO } from './helpers'

// ═══════════════════════════════════════════════════════════════
// LessonScheduleRow: toggle individual de una lección × sección
// ═══════════════════════════════════════════════════════════════
export function LessonScheduleRow({
  index, lesson, isOpen, schedule, onToggle, readOnly,
}: {
  index: number
  lesson: Lesson
  isOpen: boolean
  schedule?: Schedule
  onToggle: (open: boolean, availableAt?: string, closesAfterHours?: number) => void
  readOnly?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [dateInput, setDateInput] = useState(schedule ? new Date(schedule.availableAt).toISOString().slice(0, 10) : todayISO())
  const [startTime, setStartTime] = useState(schedule ? localTime(schedule.availableAt) : '08:00')
  const [endTime, setEndTime] = useState(
    schedule ? closeTime(schedule.availableAt, schedule.closesAfterHours) : '10:00'
  )
  const [submitting, setSubmitting] = useState(false)

  const handleOpen = async () => {
    const hours = hoursBetween(startTime, endTime)
    if (hours === 0) {
      toast.error('La hora de cierre debe ser posterior a la de inicio')
      return
    }
    setSubmitting(true)
    await onToggle(true, toLocalISO(dateInput, startTime), hours)
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
          <p className="text-[10px] text-green-700">
            {formatDate(schedule.availableAt)} · {localTime(schedule.availableAt)}–{closeTime(schedule.availableAt, schedule.closesAfterHours)}
          </p>
        )}
      </div>
      {readOnly ? (
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {isOpen ? 'abierta' : 'cerrada'}
        </span>
      ) : editing ? (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)} className="text-[11px] h-7 w-32" />
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="text-[11px] h-7 w-24" title="Hora de inicio" />
          <span className="text-[10px] text-gray-400">a</span>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="text-[11px] h-7 w-24" title="Hora de cierre" />
          <Button size="sm" onClick={handleOpen} disabled={submitting} className="h-7">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'OK'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7">✕</Button>
        </div>
      ) : isOpen ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Sincronizar inputs con el valor actual antes de abrir el editor.
              if (schedule) {
                setDateInput(new Date(schedule.availableAt).toISOString().slice(0, 10))
                setStartTime(localTime(schedule.availableAt))
                setEndTime(closeTime(schedule.availableAt, schedule.closesAfterHours))
              }
              setEditing(true)
            }}
            disabled={submitting}
            className="h-7 gap-1 text-indigo-700 hover:bg-indigo-50 text-[11px]"
          >
            <Calendar className="h-3 w-3" />
            Editar
          </Button>
          <Button size="sm" variant="outline" onClick={handleClose} disabled={submitting} className="h-7 gap-1 text-amber-700 hover:bg-amber-50 text-[11px]">
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
            Cerrar
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 gap-1 text-green-700 hover:bg-green-50 text-[11px]">
          <Calendar className="h-3 w-3" />
          Abrir
        </Button>
      )}
    </div>
  )
}

