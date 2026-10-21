'use client'

/**
 * «Material de apoyo» de una lección (planner, etapa 3). Reemplaza al gestor de
 * imágenes: por actividad, bloques de siete tipos con vista previa igual a la
 * del alumno. Guarda con actualización parcial: no toca el contexto ni el resto
 * del contenido de la lección.
 * Spec: investigacion/panel-de-apoyo-especificacion.md §9.1
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Columns2,
  FileInput,
  FileText,
  GitBranch,
  ImageIcon,
  SlidersHorizontal,
  Columns3,
  Library,
  Pin,
  Plus,
  Save,
  Sigma,
  Table2,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  BLOCK_TYPE_HINTS,
  BLOCK_TYPE_LABELS,
  lessonBlockIds,
  newBlock,
  referenceToBlock,
  validateMaterial,
  type BlockIssue,
} from '@/lib/material-editor'
import type { Activity, SupportBlock, SupportBlockType } from '@/types/lesson'
import { MarkerPreviewProvider, SupportBlockCard } from '@/components/learning/support-block'
import { BlockForm } from './block-form'

const ICONO: Record<SupportBlockType, typeof ImageIcon> = {
  image: ImageIcon,
  compare: Columns2,
  formula: Sigma,
  table: Table2,
  text: FileText,
  case: UserRound,
  diagram: GitBranch,
  simulator: SlidersHorizontal,
  classify: Columns3,
}

const TIPOS: SupportBlockType[] = ['image', 'table', 'formula', 'simulator', 'text', 'case', 'compare', 'diagram']

const TYPE_LABELS: Record<string, string> = { explanation: 'Explicación', practice: 'Práctica', reflection: 'Reflexión', closing: 'Cierre' }
const TYPE_COLORS: Record<string, string> = {
  explanation: 'bg-blue-100 text-blue-700',
  practice: 'bg-green-100 text-green-700',
  reflection: 'bg-purple-100 text-purple-700',
  closing: 'bg-amber-100 text-amber-700',
}
const CUANDO: Record<string, string> = { on_start: 'Al entrar', on_reference: 'Al citarlo', on_demand: 'A pedido' }

const MAX_BLOQUES = 6

interface Props {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  /** Actividades con las imágenes viejas ya pasadas a bloques. */
  activities: Activity[]
  /** Hubo imágenes viejas convertidas: guardar las escribe como bloques. */
  migrated: boolean
  referencias: string[]
  imageFolder: string
}

export function MaterialManager({ lessonId, lessonTitle, courseId, courseTitle, activities: inicial, migrated, referencias, imageFolder }: Props) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>(inicial)
  const [sel, setSel] = useState<{ a: number; id: string } | null>(null)
  const [issues, setIssues] = useState<BlockIssue[]>([])
  const [dirty, setDirty] = useState(migrated)
  const [saving, setSaving] = useState(false)
  const [refPara, setRefPara] = useState<number | null>(null)

  // No perder cambios al cerrar la pestaña.
  useEffect(() => {
    if (!dirty) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [dirty])

  const ids = useMemo(() => lessonBlockIds(activities), [activities])
  const bloques = (a: number) => activities[a]?.teaching.blocks ?? []
  const seleccionado = sel ? bloques(sel.a).find((b) => b.id === sel.id) ?? null : null

  const setBloques = (a: number, f: (bs: SupportBlock[]) => SupportBlock[]) => {
    setActivities((prev) => prev.map((act, i) => (i === a ? { ...act, teaching: { ...act.teaching, blocks: f(act.teaching.blocks ?? []) } } : act)))
    setDirty(true)
  }

  const agregar = (a: number, b: SupportBlock) => {
    if (bloques(a).length >= MAX_BLOQUES) {
      toast.error(`Máximo ${MAX_BLOQUES} bloques por actividad: el panel tiene que seguir legible`)
      return
    }
    setBloques(a, (bs) => [...bs, b])
    setSel({ a, id: b.id })
  }

  const mover = (a: number, i: number, d: -1 | 1) =>
    setBloques(a, (bs) => {
      const j = i + d
      if (j < 0 || j >= bs.length) return bs
      const c = [...bs]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  const quitar = (a: number, id: string) => {
    if (!confirm('¿Quitar este bloque de la actividad? La imagen sigue en el banco del curso.')) return
    setBloques(a, (bs) => bs.filter((b) => b.id !== id))
    if (sel?.id === id) setSel(null)
  }

  const errores = (a: number, i: number | null) => issues.filter((x) => x.activityIndex === a && x.blockIndex === i)

  const guardar = async () => {
    const encontrados = validateMaterial(activities)
    setIssues(encontrados)
    const deBloques = encontrados.filter((x) => x.blockIndex !== null)
    if (encontrados.length) {
      const primero = deBloques[0]
      if (primero) {
        const b = bloques(primero.activityIndex)[primero.blockIndex!]
        if (b) setSel({ a: primero.activityIndex, id: b.id })
      }
      toast.error(
        deBloques.length
          ? `Hay ${deBloques.length} dato(s) por completar en el material. Están marcados en rojo.`
          : `La lección tiene errores fuera del material: ${encontrados[0].message}`,
        { duration: 8000 },
      )
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/planner/session/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, activities }),
        credentials: 'include',
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || `Error ${res.status}`)
      }
      setDirty(false)
      toast.success('Material guardado')
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message, { duration: 8000 })
    } finally {
      setSaving(false)
    }
  }

  const total = activities.reduce((n, a) => n + (a.teaching.blocks?.length ?? 0), 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link href={`/planner/${courseId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> {courseTitle}
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Material de apoyo: {lessonTitle}</h1>
          <p className="text-sm text-gray-500">
            {total} bloque{total !== 1 ? 's' : ''} en {activities.filter((a) => a.teaching.blocks?.length).length} de {activities.length} actividades. Lo que el alumno ve en el panel derecho mientras conversa con Sophia.
          </p>
        </div>
        <Link href={`/planner/${courseId}/images`} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-gray-50">
          <Library className="h-4 w-4" /> Banco de imágenes del curso
        </Link>
      </div>
      {migrated && (
        <p className="mb-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Esta lección tenía imágenes en el formato anterior. Ya se ven aquí como bloques; al guardar quedan escritas así. Revisa su fuente y licencia.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Actividades y sus bloques */}
        <div className="space-y-3">
          {activities.map((act, a) => {
            const bs = act.teaching.blocks ?? []
            const sugerencias = act.teaching.image_suggestions ?? []
            const generales = errores(a, null)
            return (
              <section key={act.id} className="rounded-lg border bg-white">
                <div className="flex items-start gap-2 border-b px-3 py-2.5">
                  <span className="text-sm font-bold text-gray-400">{a + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_COLORS[act.type] ?? 'bg-gray-100')}>{TYPE_LABELS[act.type] ?? act.type}</span>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{act.teaching.agent_instruction}</p>
                    {sugerencias.length > 0 && <p className="mt-1 text-xs text-amber-700">Sugerido por el planner: {sugerencias.join(' · ')}</p>}
                    {generales.map((g, k) => (
                      <p key={k} className="mt-1 text-xs text-red-600">{g.message}</p>
                    ))}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="shrink-0 gap-1" disabled={bs.length >= MAX_BLOQUES}>
                        <Plus className="h-3.5 w-3.5" /> Bloque
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 bg-white">
                      {TIPOS.map((t) => {
                        const I = ICONO[t]
                        return (
                          <DropdownMenuItem key={t} onClick={() => agregar(a, newBlock(t, ids))} className="cursor-pointer items-start gap-2">
                            <I className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                              <span className="block text-sm font-medium">{BLOCK_TYPE_LABELS[t]}</span>
                              <span className="block text-xs text-gray-500">{BLOCK_TYPE_HINTS[t]}</span>
                            </span>
                          </DropdownMenuItem>
                        )
                      })}
                      {referencias.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRefPara(a)} className="cursor-pointer gap-2">
                            <FileInput className="h-4 w-4" /> Convertir una referencia en bloque
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {bs.length > 0 ? (
                  <ul className="divide-y">
                    {bs.map((b, i) => {
                      const I = ICONO[b.type]
                      const errs = errores(a, i)
                      const activo = sel?.a === a && sel.id === b.id
                      return (
                        <li key={b.id} className={cn('flex items-center gap-2 px-3 py-2', activo && 'bg-blue-50')}>
                          <button type="button" onClick={() => setSel({ a, id: b.id })} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <I className="h-4 w-4 shrink-0 text-gray-600" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{b.title}</span>
                              <span className="block text-[11px] text-gray-500">
                                {BLOCK_TYPE_LABELS[b.type]} · {CUANDO[b.showWhen ?? 'on_start']}
                                {b.type === 'image' && !b.validated && ' · sin validar'}
                              </span>
                            </span>
                            {b.pinned && <Pin className="h-3.5 w-3.5 text-gray-500" aria-label="Fijo" />}
                            {errs.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                <AlertTriangle className="h-3 w-3" /> {errs.length}
                              </span>
                            )}
                          </button>
                          <button type="button" aria-label="Subir" onClick={() => mover(a, i, -1)} disabled={i === 0} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" aria-label="Bajar" onClick={() => mover(a, i, 1)} disabled={i === bs.length - 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" aria-label="Quitar bloque" onClick={() => quitar(a, b.id)} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="px-3 py-2.5 text-xs text-gray-500">Sin material. El panel mostrará «Aquí aparece el material cuando Sophia lo muestre».</p>
                )}
              </section>
            )
          })}
        </div>

        {/* Editor del bloque seleccionado + vista previa */}
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {seleccionado && sel ? (
            <div className="space-y-4 rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2">
                <h2 className="flex-1 font-semibold">
                  {BLOCK_TYPE_LABELS[seleccionado.type]} · actividad {sel.a + 1}
                </h2>
                <button type="button" aria-label="Cerrar editor" onClick={() => setSel(null)} className="rounded p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              {errores(sel.a, bloques(sel.a).findIndex((b) => b.id === sel.id)).length > 0 && (
                <ul className="space-y-0.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                  {errores(sel.a, bloques(sel.a).findIndex((b) => b.id === sel.id)).map((e, k) => (
                    <li key={k}>{e.message}</li>
                  ))}
                </ul>
              )}
              <BlockForm
                block={seleccionado}
                activity={activities[sel.a]}
                courseId={courseId}
                imageFolder={imageFolder}
                onChange={(nuevo) => setBloques(sel.a, (bs) => bs.map((b) => (b.id === sel.id ? nuevo : b)))}
              />
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-700">Así lo ve el alumno (con todos los señalamientos)</p>
                <div className="max-w-[400px] rounded-lg bg-gray-50 p-3">
                  <MarkerPreviewProvider>
                    <SupportBlockCard block={seleccionado} isTest />
                  </MarkerPreviewProvider>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-white p-6 text-sm text-gray-500">
              Elige un bloque para editarlo, o agrega uno con «+ Bloque» en la actividad que lo necesita.
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
                <li>Tabla: umbrales, pesos, criterios. Fórmula: un cálculo que el alumno aplica.</li>
                <li>Texto: un fragmento que lee y cita. Caso: un personaje con datos.</li>
                <li>Imagen: con fuente y licencia; el alumno solo ve las validadas.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Referencia → bloque */}
      {refPara !== null && (
        <div role="dialog" aria-modal="true" aria-label="Convertir referencia" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRefPara(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center">
              <h2 className="flex-1 font-semibold">Convertir una referencia en bloque (actividad {refPara + 1})</h2>
              <button type="button" aria-label="Cerrar" onClick={() => setRefPara(null)} className="rounded p-1 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-xs text-gray-600">Las referencias son texto para Sophia. Si el alumno tiene que ver una, conviértela: «Caso X: …» se vuelve caso; lo demás, texto. La referencia sigue en el contexto de la lección.</p>
            <ul className="space-y-2">
              {referencias.map((r, k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => {
                      agregar(refPara, referenceToBlock(r, ids))
                      setRefPara(null)
                    }}
                    className="w-full rounded-lg border p-3 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                  >
                    <span className="line-clamp-3">{r}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Botón a la izquierda: los avisos (abajo a la derecha) lo tapaban. */}
      <div className="sticky bottom-0 mt-6 flex items-center gap-3 rounded-lg border bg-white p-3 shadow-lg">
        <Button onClick={guardar} disabled={saving || !dirty} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar material'}
        </Button>
        <p className="text-sm text-gray-600">{dirty ? 'Hay cambios sin guardar.' : 'Todo guardado.'} Las imágenes se guardan en el banco al subirlas.</p>
      </div>
    </div>
  )
}
