'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2, Calendar, Clock } from 'lucide-react'

interface PublishToggleProps {
  lessonId: string
  initialPublished: boolean
  initialAvailableAt?: string | null
  initialClosesAfterHours?: number
  sectionId?: string // If provided, publishes for this section only
  sectionLabel?: string // e.g. "2026-1 Salón A"
}

export function PublishToggle({ lessonId, initialPublished, initialAvailableAt, initialClosesAfterHours = 3, sectionId, sectionLabel }: PublishToggleProps) {
  const [isPublished, setIsPublished] = useState(initialPublished)
  const [availableAt, setAvailableAt] = useState<string | null>(initialAvailableAt || null)
  const [closesAfterHours, setClosesAfterHours] = useState(initialClosesAfterHours)
  const [loading, setLoading] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSchedule(false)
      }
    }
    if (showSchedule) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSchedule])

  async function publishNow() {
    setLoading(true)
    try {
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, publish: true, availableAt: null, closesAfterHours, sectionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsPublished(true)
        setAvailableAt(data.availableAt)
        setShowSchedule(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function publishScheduled() {
    if (!scheduleDate) return
    setLoading(true)
    try {
      const dateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, publish: true, availableAt: dateTime.toISOString(), closesAfterHours, sectionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsPublished(true)
        setAvailableAt(data.availableAt)
        setShowSchedule(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function unpublish() {
    setLoading(true)
    try {
      const res = await fetch('/api/planner/lesson/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, publish: false, sectionId }),
      })
      if (res.ok) {
        setIsPublished(false)
        setAvailableAt(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const isScheduledFuture = availableAt && new Date(availableAt) > new Date()

  if (isPublished) {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={unpublish}
          disabled={loading}
          className="gap-1.5 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {isScheduledFuture ? 'Programada' : 'Publicada'}
        </Button>
        {isScheduledFuture && availableAt && (
          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            {new Date(availableAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}{' '}
            {new Date(availableAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSchedule(!showSchedule)}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
        {sectionLabel ? `Publicar ${sectionLabel}` : 'Publicar'}
      </Button>

      {showSchedule && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <p className="text-xs font-medium text-gray-700 mb-2">¿Cuándo estará disponible?</p>

          {/* Duración de la sesión */}
          <div className="mb-3 px-1">
            <p className="text-[10px] text-gray-500 mb-1">Cierre automático después de:</p>
            <div className="flex items-center gap-2">
              <select
                value={closesAfterHours}
                onChange={(e) => setClosesAfterHours(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value={1}>1 hora</option>
                <option value={2}>2 horas</option>
                <option value={3}>3 horas</option>
                <option value={4}>4 horas</option>
                <option value={6}>6 horas</option>
                <option value={8}>8 horas</option>
                <option value={12}>12 horas</option>
                <option value={24}>24 horas</option>
              </select>
            </div>
          </div>

          {/* Publicar ahora */}
          <button
            onClick={publishNow}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-green-50 text-green-700 font-medium mb-2 flex items-center gap-2"
          >
            <Eye className="h-3.5 w-3.5" />
            Publicar ahora
          </button>

          <div className="border-t border-gray-100 pt-2">
            <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Programar para:
            </p>

            <div className="flex gap-1.5 mb-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="relative">
                <Clock className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-24 text-xs border border-gray-200 rounded pl-6 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            <button
              onClick={publishScheduled}
              disabled={loading || !scheduleDate}
              className="w-full text-center px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Programar publicación
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
