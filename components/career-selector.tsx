'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { GraduationCap, Loader2 } from 'lucide-react'

type Career = {
  id: string
  name: string
}

export function CareerSelector({ careers }: { careers: Career[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/user/select-career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careerId: selected }),
      })
      if (res.ok) {
        toast.success('Carrera seleccionada')
        // Force full page reload to refresh JWT session with new careerId
        window.location.href = '/lessons'
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al seleccionar carrera')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {careers.map((career) => (
          <button
            key={career.id}
            onClick={() => setSelected(career.id)}
            className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
              selected === career.id
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <GraduationCap className={`h-5 w-5 ${selected === career.id ? 'text-blue-500' : 'text-gray-400'}`} />
            <span className="font-medium">{career.name}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={handleConfirm}
        disabled={!selected || saving}
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : (
          'Confirmar carrera'
        )}
      </Button>
    </div>
  )
}
