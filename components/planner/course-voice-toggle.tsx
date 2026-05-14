'use client'

import { useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CourseVoiceToggleProps {
  courseId: string
  initialVoiceEnabled: boolean
}

export function CourseVoiceToggle({ courseId, initialVoiceEnabled }: CourseVoiceToggleProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(initialVoiceEnabled)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next = !voiceEnabled
    setLoading(true)
    try {
      const res = await fetch('/api/planner/course/update-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, voiceEnabled: next }),
      })
      if (res.ok) {
        setVoiceEnabled(next)
        toast.success(next ? 'Voz habilitada para el curso' : 'Voz deshabilitada para el curso')
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al actualizar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={`gap-1.5 ${
        voiceEnabled
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-gray-300 text-gray-600'
      }`}
      title={voiceEnabled ? 'Voz habilitada — click para deshabilitar' : 'Voz deshabilitada — click para habilitar'}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : voiceEnabled ? (
        <Mic className="h-3.5 w-3.5" />
      ) : (
        <MicOff className="h-3.5 w-3.5" />
      )}
      Voz {voiceEnabled ? 'ON' : 'OFF'}
    </Button>
  )
}
