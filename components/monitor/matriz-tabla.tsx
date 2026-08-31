'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Matriz, EstadoSesion } from '@/lib/asistencia'

/**
 * La matriz: filas = estudiantes, columnas = sesiones.
 *
 * El orden de las filas no es alfabético a propósito — arriba van los que peor
 * están, porque la pregunta del martes es «¿a quién llamo?» y no «¿dónde está
 * Fulano?». Para eso está el buscador.
 */

const ESTILO: Record<EstadoSesion, { fondo: string; texto: string; simbolo: string; nombre: string }> = {
  terminada: { fondo: 'bg-emerald-100', texto: 'text-emerald-800', simbolo: '✓', nombre: 'Terminada' },
  'a-medias': { fondo: 'bg-amber-100', texto: 'text-amber-800', simbolo: '◐', nombre: 'A medias' },
  'sin-avanzar': { fondo: 'bg-orange-100', texto: 'text-orange-800', simbolo: '○', nombre: 'Abrió sin avanzar' },
  'no-entro': { fondo: 'bg-red-100', texto: 'text-red-700', simbolo: '✗', nombre: 'No entró' },
  pendiente: { fondo: 'bg-blue-50', texto: 'text-blue-600', simbolo: '·', nombre: 'Aún abierta' },
  'no-programada': { fondo: 'bg-gray-50', texto: 'text-gray-300', simbolo: '', nombre: 'No programada' },
}

export function MatrizTabla({ matriz, courseId }: { matriz: Matriz; courseId: string }) {
  const [busca, setBusca] = useState('')

  const filtrados = busca.trim()
    ? matriz.alumnos.filter((a) => {
        const q = busca.toLowerCase()
        return a.nombre.toLowerCase().includes(q) || (a.dni ?? '').includes(q)
      })
    : matriz.alumnos

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nombre o DNI…"
          className="h-9 w-72 rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-gray-400"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {(['terminada', 'a-medias', 'sin-avanzar', 'no-entro', 'pendiente'] as EstadoSesion[]).map((e) => (
            <span key={e} className="flex items-center gap-1.5">
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded ${ESTILO[e].fondo} ${ESTILO[e].texto} text-[10px] font-bold`}
              >
                {ESTILO[e].simbolo}
              </span>
              {ESTILO[e].nombre}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Estudiante
              </th>
              {matriz.lecciones.map((l) => (
                <th
                  key={l.id}
                  className="px-2 py-2.5 text-center text-xs font-semibold text-gray-600"
                  title={l.title}
                >
                  <Link
                    href={`/dashboard/${courseId}`}
                    className="block max-w-[7rem] truncate hover:text-gray-900 hover:underline"
                  >
                    {l.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((a) => (
              <tr key={a.userId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 hover:bg-gray-50">
                  <Link
                    href={`/dashboard/${courseId}/${a.userId}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {a.nombre}
                  </Link>
                  <span className="ml-2 text-xs text-gray-400">
                    {a.seccion}
                    {a.dni ? ` · ${a.dni}` : ''}
                  </span>
                </td>
                {matriz.lecciones.map((l) => {
                  const c = a.celdas[l.id]
                  const e = ESTILO[c.estado]
                  const detalle =
                    c.estado === 'terminada'
                      ? `${e.nombre}${c.grade !== null ? ` · nota ${Math.round(c.grade)}` : ''}${c.minutos !== null ? ` · ${c.minutos} min` : ''}`
                      : e.nombre
                  return (
                    <td key={l.id} className="px-2 py-2 text-center">
                      <span
                        title={`${l.title} — ${detalle}`}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${e.fondo} ${e.texto}`}
                      >
                        {e.simbolo}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-500">Nadie coincide con «{busca}».</p>
      )}
    </div>
  )
}
