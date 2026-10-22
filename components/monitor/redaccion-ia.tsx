'use client'

import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatTime } from '@/lib/formatters'

/**
 * «Cómo abordarlo», redactado por el modelo a partir de lo que el código ya
 * eligió reforzar. Se pide al abrir la página; el servidor lo guarda media hora
 * mientras los datos no cambien. Siempre marcado como escrito por la IA.
 */
export function RedaccionIA({ courseId, lessonId, sectionId }: { courseId: string; lessonId: string; sectionId: string }) {
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando')
  const [texto, setTexto] = useState('')
  const [generadoEn, setGeneradoEn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pedir = useCallback(
    async (fresco: boolean) => {
      setEstado('cargando')
      setError(null)
      try {
        const r = await fetch(`/api/dashboard/${courseId}/clase/redaccion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, sectionId, fresco }),
        })
        if (!r.ok) {
          const j = (await r.json().catch(() => null)) as { error?: string } | null
          throw new Error(j?.error ?? `No se pudo redactar (${r.status})`)
        }
        const j = (await r.json()) as { texto: string; generadoEn: string }
        setTexto(j.texto)
        setGeneradoEn(j.generadoEn)
        setEstado('listo')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo redactar')
        setEstado('error')
      }
    },
    [courseId, lessonId, sectionId]
  )

  useEffect(() => {
    void pedir(false)
  }, [pedir])

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Cómo abordarlo · redactado por la IA con el material de la sesión</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {generadoEn && <span>redactado a las {formatTime(generadoEn)}</span>}
          <button onClick={() => pedir(true)} disabled={estado === 'cargando'} className="text-indigo-700 hover:underline disabled:opacity-50">
            Volver a redactar
          </button>
        </div>
      </div>
      {estado === 'cargando' && <p className="text-sm text-gray-500">Redactando con los datos de arriba…</p>}
      {estado === 'error' && <p className="text-sm text-red-700">{error}</p>}
      {estado === 'listo' && (
        <div className="prose prose-sm max-w-none prose-headings:mt-4 prose-headings:mb-1 prose-headings:text-sm prose-headings:font-semibold prose-p:my-1 prose-li:my-0.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{texto}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
