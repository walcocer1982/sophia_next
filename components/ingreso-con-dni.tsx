'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IdCard, Loader2 } from 'lucide-react'

/**
 * Primer paso del ingreso de una cuenta nueva (26 oct 2026): si el alumno está en
 * el padrón y entró con otro correo, escribe su DNI y su cuenta se une a la del
 * padrón (POST /api/user/vincular). Quien no está en el padrón sigue con sede y
 * carrera, como antes.
 */
export function IngresoConDni({ children }: { children: ReactNode }) {
  const [dni, setDni] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [sinDni, setSinDni] = useState(false)

  if (sinDni) return <>{children}</>

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setAviso(null)
    try {
      const res = await fetch('/api/user/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni }),
      })
      if (res.ok) {
        // Recarga completa: el token pasa a la cuenta del padrón en el siguiente pedido (auth.ts).
        window.location.href = '/lessons'
        return
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setAviso(data.error || 'No se pudo revisar tu DNI. Intenta de nuevo.')
    } catch {
      setAviso('No se pudo revisar tu DNI. Intenta de nuevo.')
    }
    setEnviando(false)
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-start gap-3">
        <IdCard className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div>
          <p className="font-medium">¿Eres alumno de CETEMIN?</p>
          <p className="text-sm text-muted-foreground">
            Escribe tu DNI para entrar a tu cuenta, con tus cursos y tu avance.
          </p>
        </div>
      </div>
      <form onSubmit={enviar} className="flex gap-2">
        <Input
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="DNI (8 dígitos)"
          aria-label="DNI"
          className="h-10"
        />
        <Button type="submit" disabled={dni.length !== 8 || enviando} className="h-10">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
        </Button>
      </form>
      {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
      <button
        type="button"
        onClick={() => setSinDni(true)}
        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        No estoy en el padrón de CETEMIN: elegir mi carrera
      </button>
    </div>
  )
}
