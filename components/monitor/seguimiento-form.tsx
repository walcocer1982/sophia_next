'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/**
 * La segunda columna del lienzo del 1 oct: lo que el instructor marca cuando
 * llamó a alguien. Cinco estados y cuatro motivos, cerrados a propósito; la
 * nota es opcional. Al guardar se recarga la página de servidor, que es la que
 * pinta la marca vigente y el historial.
 */

const ESTADOS = [
  { valor: 'SIN_NOVEDAD', texto: 'Sin novedad', ayuda: 'no hay nada que anotar' },
  { valor: 'NO_RESPONDE', texto: 'No responde', ayuda: 'llamado o escrito, sin respuesta' },
  { valor: 'JUSTIFICADO', texto: 'Justificado', ayuda: 'habló y hay un motivo' },
  { valor: 'DESERTO', texto: 'Desertó', ayuda: 'dejó el instituto; sale de todos sus cursos' },
  { valor: 'RETOMO', texto: 'Retomó', ayuda: 'volvió a entrar' },
] as const

const MOTIVOS = [
  { valor: 'HORARIO', texto: 'Horario' },
  { valor: 'CONEXION', texto: 'Conexión' },
  { valor: 'NO_ENTENDIO', texto: 'No entendió la sesión' },
  { valor: 'PERSONAL', texto: 'Personal' },
] as const

type Estado = (typeof ESTADOS)[number]['valor']
type Motivo = (typeof MOTIVOS)[number]['valor']

export function SeguimientoForm({
  userId,
  cursos,
}: {
  userId: string
  /** Cursos del alumno a los que puede referirse el motivo (el actual primero). */
  cursos: Array<{ id: string; title: string }>
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [courseId, setCourseId] = useState<string>('')
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async () => {
    if (!estado) return
    if (estado === 'JUSTIFICADO' && !motivo) {
      setError('«Justificado» necesita un motivo.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch(`/api/seguimiento/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, motivo, courseId: courseId || null, nota }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? `No se pudo guardar (${res.status})`)
        return
      }
      setAbierto(false)
      setEstado(null)
      setMotivo(null)
      setCourseId('')
      setNota('')
      router.refresh()
    } catch {
      setError('No se pudo guardar. Revisa la conexión.')
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(true)}>
        Anotar seguimiento
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-gray-900">¿Qué pasó con este estudiante?</p>
        <p className="text-xs text-gray-500">
          La marca es del alumno, no del curso: se ve en todos sus cursos.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ESTADOS.map((e) => {
          const activo = estado === e.valor
          return (
            <button
              key={e.valor}
              type="button"
              onClick={() => setEstado(e.valor)}
              aria-pressed={activo}
              className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                activo
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-gray-200 text-gray-800 hover:border-gray-300'
              }`}
            >
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                  activo ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                }`}
                aria-hidden="true"
              />
              <span>
                <span className="font-medium">{e.texto}</span>
                <span className="ml-1 text-xs text-gray-500">{e.ayuda}</span>
              </span>
            </button>
          )
        })}
      </div>

      {estado === 'JUSTIFICADO' && (
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-gray-600">Motivo</p>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map((m) => {
                const activo = motivo === m.valor
                return (
                  <button
                    key={m.valor}
                    type="button"
                    onClick={() => setMotivo(m.valor)}
                    aria-pressed={activo}
                    className={`h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                      activo
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {m.texto}
                  </button>
                )
              })}
            </div>
          </div>
          {cursos.length > 0 && (
            <label className="block text-xs font-medium text-gray-600">
              Curso al que se refiere (opcional)
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="mt-1 block h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm font-normal text-gray-900 focus:border-gray-400 focus:outline-none"
              >
                <option value="">Todos</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <label className="block text-xs font-medium text-gray-600">
        Nota (opcional)
        <Textarea
          value={nota}
          onChange={(e) => setNota(e.target.value.slice(0, 500))}
          placeholder="Llamé el 30 set a las 6 pm, no contesta."
          className="mt-1 min-h-20 text-sm"
        />
      </label>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setAbierto(false)
            setError(null)
          }}
          disabled={guardando}
        >
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={guardar} disabled={!estado || guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
