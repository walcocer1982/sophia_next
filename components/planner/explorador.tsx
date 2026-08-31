'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, GraduationCap, Megaphone, Search, Sparkles, X } from 'lucide-react'

export interface CursoLista {
  id: string
  title: string
  capacidad: string | null
  isPublished: boolean
  track: 'REGULAR' | 'CONTINUA'
  scope: 'TRANSVERSAL' | 'SPECIALIZATION'
  instructor: string | null
  total: number
  disenadas: number
  listas: number
  /** Claves de grupo a las que pertenece: ids de carrera, o TRANSVERSAL / SIN. */
  grupos: string[]
}

export interface GrupoLista {
  clave: string
  nombre: string
  tipo: 'transversal' | 'carrera' | 'sin'
  cursos: number
  disenadas: number
  total: number
}

interface Props {
  grupos: GrupoLista[]
  cursos: CursoLista[]
  seleccion: string | null
}

/**
 * Mismo patrón que Programación: barra para ubicarse, panel para trabajar.
 * Acá el árbol tiene un solo nivel —la carrera— porque el diseño es de la
 * plantilla, y la plantilla no tiene admisión ni sede: un curso se diseña una
 * vez y se dicta en muchas partes.
 *
 * El curso NO se abre en el panel sino a pantalla completa: poner fechas cabe
 * en 900 px, diseñar una sesión no.
 */
export function Explorador({ grupos, cursos, seleccion }: Props) {
  const [busca, setBusca] = useState('')

  const grupoActivo = grupos.find((g) => g.clave === seleccion) ?? null

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase()
    // Buscar cruza todas las carreras: con 40 cursos por malla, encontrar gana
    // a navegar.
    const base = q
      ? cursos
      : grupoActivo
        ? cursos.filter((c) => c.grupos.includes(grupoActivo.clave))
        : cursos
    return q ? base.filter((c) => c.title.toLowerCase().includes(q)) : base
  }, [cursos, grupoActivo, busca])

  const buscando = busca.trim().length > 0

  return (
    <div className="flex h-[calc(100vh-15rem)] min-h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-100">
        <div className="flex h-12 items-center border-b border-gray-200 pl-4 pr-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Carreras</span>
        </div>
        <div className="py-3 text-sm">
          <Link
            href="/planner"
            className={`flex items-center gap-2 py-2.5 pl-4 pr-3 ${
              !seleccion ? 'bg-indigo-100 font-medium text-indigo-900' : 'hover:bg-gray-200/60'
            }`}
          >
            <BookOpen className={`h-3.5 w-3.5 shrink-0 ${!seleccion ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span>Todos</span>
            <span className="ml-auto font-mono text-[11px] text-gray-500">{cursos.length}</span>
          </Link>

          {grupos.map((g) => {
            const activo = seleccion === g.clave
            const falta = g.total - g.disenadas
            return (
              <Link
                key={g.clave}
                href={`/planner?carrera=${encodeURIComponent(g.clave)}`}
                className={`flex items-center gap-2 py-2.5 pl-4 pr-3 ${
                  activo ? 'bg-indigo-100 font-medium text-indigo-900' : 'hover:bg-gray-200/60'
                }`}
              >
                {g.tipo === 'transversal' ? (
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                ) : g.tipo === 'sin' ? (
                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                ) : (
                  <GraduationCap
                    className={`h-3.5 w-3.5 shrink-0 ${activo ? 'text-indigo-600' : 'text-gray-400'}`}
                  />
                )}
                <span className="truncate">{g.nombre}</span>
                {g.total > 0 && (
                  <span
                    className={`ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] ${
                      falta === 0
                        ? 'text-gray-400'
                        : g.disenadas === 0
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-gray-500'
                    }`}
                    title={`${g.disenadas} de ${g.total} sesiones diseñadas`}
                  >
                    {g.disenadas}/{g.total}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar un curso…"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          {buscando && (
            <button onClick={() => setBusca('')} className="text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="shrink-0 text-xs text-gray-400">
            {visibles.length} curso{visibles.length !== 1 ? 's' : ''}
            {buscando ? ' en todas las carreras' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
              <BookOpen className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                {buscando ? 'Ningún curso coincide con la búsqueda.' : 'Esta carrera no tiene cursos todavía.'}
              </p>
            </div>
          ) : (
            visibles.map((c, i) => {
              const falta = c.total - c.disenadas
              return (
                <Link
                  key={c.id}
                  href={`/planner/${c.id}`}
                  className={`flex items-center gap-4 px-4 py-3 hover:bg-indigo-50/50 ${
                    i > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  {c.scope === 'TRANSVERSAL' ? (
                    <Sparkles className="h-4 w-4 shrink-0 text-purple-600" />
                  ) : (
                    <BookOpen className="h-4 w-4 shrink-0 text-gray-400" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{c.title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{c.total} sesiones</span>
                      <span className="text-gray-300">·</span>
                      <span className={falta > 0 ? 'font-medium text-amber-700' : ''}>
                        {c.disenadas}/{c.total} diseñadas
                      </span>
                      <span className="text-gray-300">·</span>
                      <span title="Lista = publicada. El alumno la ve cuando se le abre una ventana en Programación.">
                        {c.listas}/{c.total} listas
                      </span>
                      {c.instructor && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-indigo-600">{c.instructor}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {c.track === 'CONTINUA' && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      <Megaphone className="h-3 w-3" />
                      Kiosko
                    </span>
                  )}
                  {!c.isPublished && (
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Borrador
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </Link>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
