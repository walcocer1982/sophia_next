'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, X } from 'lucide-react'

type Persona = {
  id: string
  name: string | null
  email: string
  role: string
  sede: { code: string } | null
  career: { code: string | null } | null
}

/**
 * Selector de «ver como» — solo lo monta el navbar para el superadmin.
 *
 * No suplanta: el superadmin ya ve todo, elegir a alguien solo recorta. Y el
 * modo es de solo lectura, bloqueado en `proxy.ts`, para que mirar no pueda
 * convertirse en tocar sin querer.
 */
export function VerComo() {
  const router = useRouter()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [activo, setActivo] = useState<string | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    fetch('/api/ver-como')
      .then((r) => (r.ok ? r.json() : { personas: [], viendoComo: null }))
      .then((d) => {
        setPersonas(d.personas ?? [])
        setActivo(d.viendoComo ?? null)
      })
      .catch(() => undefined)
  }, [])

  async function elegir(userId: string | null) {
    setCargando(true)
    try {
      await fetch('/api/ver-como', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setAbierto(false)
      router.refresh()
      // Las pantallas que traen sus datos por fetch no se enteran del refresh
      // del router, así que se recarga entera. Es una herramienta de
      // diagnóstico, no un camino caliente.
      window.location.reload()
    } finally {
      setCargando(false)
    }
  }

  if (activo) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1">
        <Eye className="h-3.5 w-3.5 text-amber-700" />
        <span className="text-xs font-medium text-amber-800">
          Viendo como {activo} · solo lectura
        </span>
        <button
          onClick={() => elegir(null)}
          disabled={cargando}
          className="rounded-full p-0.5 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
          title="Volver a mis ojos"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        <Eye className="h-3.5 w-3.5" />
        Ver como
      </button>

      {abierto && (
        <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-2 text-xs text-gray-500">
            Mirá la app con el alcance de otra persona. Solo lectura.
          </p>
          <div className="max-h-72 overflow-y-auto">
            {personas.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">Cargando…</p>
            )}
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => elegir(p.id)}
                disabled={cargando}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                  {p.name ?? p.email}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {p.sede?.code ?? '—'} · {p.career?.code ?? 'todas'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
