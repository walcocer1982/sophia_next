'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { GraduationCap, MapPin, CalendarDays, Loader2, ChevronLeft } from 'lucide-react'

type Career = {
  id: string
  name: string
}

type SedeWithCareers = {
  id: string
  code: string
  name: string
  careers: Career[]
}

type Period = {
  id: string
  name: string
}

interface Props {
  sedes: SedeWithCareers[]
  periods: Period[]
}

// Onboarding del estudiante en 3 pasos: Sede → Carrera → Admisión.
// Las carreras mostradas son solo las que se dictan en la sede elegida
// (los programas internos sin sede no aparecen).
export function CareerSelector({ sedes, periods }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [sedeId, setSedeId] = useState<string | null>(null)
  const [careerId, setCareerId] = useState<string | null>(null)
  const [periodId, setPeriodId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedSede = useMemo(
    () => sedes.find((s) => s.id === sedeId) || null,
    [sedes, sedeId]
  )

  const handleConfirm = async () => {
    if (!sedeId || !careerId || !periodId) return
    setSaving(true)
    try {
      const res = await fetch('/api/user/select-career', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sedeId, careerId, admissionPeriodId: periodId }),
      })
      if (res.ok) {
        toast.success('Datos guardados')
        // Force full page reload to refresh JWT session with new careerId
        window.location.href = '/lessons'
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al guardar tus datos')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const optionClass = (active: boolean) =>
    `flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
      active
        ? 'border-blue-500 bg-blue-50 text-blue-900'
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
    }`

  return (
    <div className="space-y-4">
      {/* Indicador de paso */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <span className={step === 1 ? 'font-semibold text-blue-600' : ''}>1. Sede</span>
        <span>→</span>
        <span className={step === 2 ? 'font-semibold text-blue-600' : ''}>2. Carrera</span>
        <span>→</span>
        <span className={step === 3 ? 'font-semibold text-blue-600' : ''}>3. Admisión</span>
      </div>

      {/* Paso 1: Sede */}
      {step === 1 && (
        <div className="space-y-2">
          {sedes.map((sede) => (
            <button
              key={sede.id}
              onClick={() => {
                setSedeId(sede.id)
                setCareerId(null)
                setStep(2)
              }}
              className={optionClass(sedeId === sede.id)}
            >
              <MapPin className={`h-5 w-5 shrink-0 ${sedeId === sede.id ? 'text-blue-500' : 'text-gray-400'}`} />
              <span>
                <span className="font-medium">{sede.code}</span>
                <span className="block text-sm text-gray-500">{sede.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2: Carrera (solo las de la sede elegida) */}
      {step === 2 && selectedSede && (
        <div className="space-y-2">
          {selectedSede.careers.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay carreras registradas para {selectedSede.code}. Contacta al administrador.
            </p>
          ) : (
            selectedSede.careers.map((career) => (
              <button
                key={career.id}
                onClick={() => {
                  setCareerId(career.id)
                  setStep(3)
                }}
                className={optionClass(careerId === career.id)}
              >
                <GraduationCap className={`h-5 w-5 shrink-0 ${careerId === career.id ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium">{career.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Paso 3: Admisión */}
      {step === 3 && (
        <div className="space-y-2">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodId(p.id)}
              className={optionClass(periodId === p.id)}
            >
              <CalendarDays className={`h-5 w-5 shrink-0 ${periodId === p.id ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="font-medium">Admisión {p.name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
            disabled={saving}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Atrás
          </Button>
        )}
        {step === 3 && (
          <Button
            onClick={handleConfirm}
            disabled={!periodId || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
