'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * El botón del instructor para terminar el bloque de Sophia (22 oct 2026).
 * Vive en el reporte de la sesión por sección. Al cerrar, los alumnos que
 * escriban reciben un mensaje fijo y la ventana cuenta como cerrada en todo el
 * Monitor; «Reabrir» deshace un clic equivocado.
 */
export function TerminarBloque({
  courseId,
  sectionId,
  lessonId,
  cierre,
  cerradoPorInstructor,
  abierta,
}: {
  courseId: string
  sectionId: string
  lessonId: string
  /**
   * La hora de cierre ya formateada en el servidor («12:23 p. m.»); null si la
   * sesión no tiene horario. Se formatea allá porque la ICU de Node y la del
   * navegador escriben distinto «p. m.» y eso rompía la hidratación.
   */
  cierre: string | null
  cerradoPorInstructor: boolean
  /** La ventana está abierta ahora mismo. */
  abierta: boolean
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enviar = async (accion: 'cerrar' | 'reabrir') => {
    if (accion === 'cerrar' && !window.confirm('¿Terminar el bloque de Sophia para esta sección? Los alumnos ya no podrán seguir escribiendo.')) return
    setOcupado(true)
    setError(null)
    try {
      const r = await fetch(`/api/dashboard/${courseId}/bloque`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, lessonId, accion }),
      })
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null
        throw new Error(j?.error ?? `No se pudo (${r.status})`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo')
    } finally {
      setOcupado(false)
    }
  }

  if (!cierre) return <span className="text-sm text-gray-500">Esta sesión no tiene horario en la sección.</span>

  return (
    <div className="flex flex-wrap items-center gap-3">
      {cerradoPorInstructor ? (
        <>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            Bloque terminado a las {cierre}
          </span>
          <button onClick={() => enviar('reabrir')} disabled={ocupado} className="text-sm text-blue-600 hover:underline disabled:opacity-50">
            Reabrir
          </button>
        </>
      ) : abierta ? (
        <>
          <span className="text-sm text-gray-600">La ventana cierra a las {cierre}</span>
          <button
            onClick={() => enviar('cerrar')}
            disabled={ocupado}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {ocupado ? 'Terminando…' : 'Terminar el bloque de Sophia'}
          </button>
        </>
      ) : (
        <span className="text-sm text-gray-500">Cerró a las {cierre}</span>
      )}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  )
}
