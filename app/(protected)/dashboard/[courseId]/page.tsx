'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatTime, hace } from '@/lib/formatters'
import type { FilaMonitor, PendienteMonitor, RespuestaMonitor } from '@/types/monitor'

/**
 * Monitor por curso.
 *
 * Una sola definición de estado, la misma que la matriz (lib/monitor.ts):
 * activa · en pausa (ventana abierta, sin escribir) · sin terminar (ventana
 * cerrada: a medias o sin avanzar) · terminó. Arriba, «pendientes de llamar»:
 * lo que quedó sin terminar o sin abrir y nadie marcó todavía en seguimiento.
 */

const VISIBLE_PENDIENTES = 10

const ESTADO_FILA: Record<
  FilaMonitor['estado'],
  { punto: string; fila: string; texto: (f: FilaMonitor) => string }
> = {
  activa: {
    punto: 'bg-green-500',
    fila: 'border-green-50 bg-green-50/30 hover:bg-green-50',
    texto: () => 'Activa',
  },
  'en-pausa': {
    punto: 'bg-amber-400',
    fila: 'border-amber-50 bg-amber-50/20 hover:bg-amber-50/40',
    texto: (f) => `En pausa · ${hace(f.lastActivityAt)}`,
  },
  'sin-terminar': {
    punto: 'bg-gray-400',
    fila: 'border-gray-100 bg-gray-50/40 hover:bg-gray-100/50',
    texto: (f) => (f.avance === 'a-medias' ? 'A medias' : 'Sin avanzar'),
  },
  terminada: {
    punto: 'bg-blue-500',
    fila: 'border-blue-50 bg-blue-50/20 hover:bg-blue-50/40',
    texto: () => 'Terminó',
  },
}

const ESTADO_PENDIENTE: Record<PendienteMonitor['lecciones'][number]['estado'], string> = {
  'no-entro': 'no entró',
  'sin-avanzar': 'abrió sin avanzar',
  'a-medias': 'a medias',
}

export default function CourseDashboardPage() {
  const { data: session, status: estadoSesion } = useSession()
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string

  const [data, setData] = useState<RespuestaMonitor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedFunnel, setExpandedFunnel] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [showAllPendientes, setShowAllPendientes] = useState(false)

  const role = session?.user?.role || 'STUDENT'

  const fetchData = useCallback(async () => {
    try {
      const url = selectedSection
        ? `/api/dashboard/${courseId}?sectionId=${selectedSection}`
        : `/api/dashboard/${courseId}`
      const res = await fetch(url)
      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? `No se pudo cargar el Monitor (${res.status})`)
      }
    } catch (err) {
      console.error('Error loading course dashboard:', err)
      setError('No se pudo cargar el Monitor. Revisa la conexión.')
    } finally {
      setLoading(false)
    }
  }, [courseId, selectedSection])

  useEffect(() => {
    // Mientras la sesión carga, el rol todavía no se conoce: con el valor por
    // defecto («STUDENT») la página expulsaba al instructor que entraba por URL
    // o recargaba (21 oct 2026).
    if (estadoSesion === 'loading') return
    if (role === 'STUDENT') {
      router.push('/lessons')
      return
    }
    fetchData()
  }, [estadoSesion, role, router, fetchData])

  // Sondeo: cada 15 s si hay una ventana abierta o alguien escribiendo; si no,
  // cada minuto. Antes eran 15 s siempre, con o sin clase.
  const vivo = !!data && (data.enVivo || data.filas.some((f) => f.estado === 'activa'))
  useEffect(() => {
    if (estadoSesion === 'loading' || role === 'STUDENT') return
    const id = setInterval(fetchData, vivo ? 15_000 : 60_000)
    return () => clearInterval(id)
  }, [estadoSesion, role, fetchData, vivo])

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-40 bg-gray-200 rounded-lg" />
          <div className="h-60 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
          ← Monitor
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">{error}</p>
          <p className="mt-1 text-sm text-gray-500">
            Si deberías poder ver este curso, pedile a tu coordinador que revise tus secciones.
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { course, filas, pendientes, funnels } = data
  const q = search.trim().toLowerCase()
  const coincide = (name: string | null, email: string | null) =>
    !q || name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q)
  const filasVisibles = filas.filter((f) => coincide(f.name, f.email))
  const activos = filas.filter((f) => f.estado === 'activa').length
  const pendientesVisibles = showAllPendientes ? pendientes : pendientes.slice(0, VISIBLE_PENDIENTES)
  const ocultos = pendientes.length - VISIBLE_PENDIENTES

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Volver al Monitor">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-sm text-gray-500">
            {course.career?.name || 'Sin carrera'} • {course.instructor}
            {data.viendoComo && <> • viendo como {data.viendoComo}</>}
          </p>
        </div>
        <Link
          href={`/dashboard/${courseId}/matriz`}
          className="ml-auto text-sm text-blue-600 hover:underline"
        >
          Ver matriz
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error} Se muestra lo último que cargó.
        </p>
      )}

      {pendientes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Pendientes de llamar
              <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-normal">
                {pendientes.length}
              </span>
              <span className="text-xs font-normal text-amber-700">
                sesiones cerradas sin terminar o sin abrir, sin marca de seguimiento
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendientesVisibles.map((p) => (
                <div
                  key={p.userId}
                  className="flex flex-wrap items-start justify-between gap-3 p-3 bg-white rounded-lg border border-amber-100"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.name || p.email}</p>
                    <ul className="mt-0.5 space-y-0.5 text-xs text-gray-600">
                      {p.lecciones.map((l) => (
                        <li key={l.lessonId}>
                          <span className="text-gray-900">{l.lessonTitle}</span>
                          {' — '}
                          {ESTADO_PENDIENTE[l.estado]}
                          {l.activityIndex && l.activityTotal && (
                            <> · Act {l.activityIndex}/{l.activityTotal}</>
                          )}
                          {' · '}
                          {l.estado === 'no-entro' ? 'cerró el ' : 'último mensaje '}
                          {formatDate(l.fecha)}
                        </li>
                      ))}
                    </ul>
                    {p.seguimiento && (
                      <p className="mt-1 text-xs text-gray-500">Última marca: {p.seguimiento.texto}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.phone && (
                      <a
                        href={`https://wa.me/51${p.phone.replace(/\D/g, '').slice(-9)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                    <Link href={`/dashboard/${courseId}/${p.userId}`} className="text-xs text-blue-600 hover:underline">
                      Ficha y seguimiento
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {ocultos > 0 && (
              <button
                type="button"
                onClick={() => setShowAllPendientes((v) => !v)}
                className="mt-3 w-full text-sm text-amber-800 hover:text-amber-900 hover:bg-amber-100 py-2 rounded-lg border border-amber-200 transition-colors font-medium"
              >
                {showAllPendientes ? `Mostrar solo ${VISIBLE_PENDIENTES}` : `Ver ${ocultos} más`}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              {activos > 0 ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  {activos === 1 ? '1 estudiante escribiendo ahora' : `${activos} estudiantes escribiendo ahora`}
                </>
              ) : (
                'Sesiones'
              )}
              <span className="text-xs text-gray-400 font-normal ml-2">
                {vivo ? '(se actualiza cada 15 s)' : '(se actualiza cada minuto)'}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {data.sections.length > 1 && (
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  aria-label="Sección"
                  className="text-xs border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="">Todas las secciones</option>
                  {data.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.period.name} — {sec.name} ({sec._count.enrollments})
                    </option>
                  ))}
                </select>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  aria-label="Buscar estudiante"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filas.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              Ningún estudiante de las secciones visibles ha abierto una sesión. Los que no entraron se ven en la matriz.
            </p>
          ) : filasVisibles.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No se encontraron estudiantes</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium pl-3">Estado</th>
                    <th className="pb-2 font-medium">Estudiante</th>
                    <th className="pb-2 font-medium">Sesión</th>
                    <th className="pb-2 font-medium">Actividad</th>
                    <th className="pb-2 font-medium">Progreso</th>
                    <th className="pb-2 font-medium">Ingresó</th>
                    <th className="pb-2 font-medium">Último msg</th>
                    <th className="pb-2 font-medium">Duración</th>
                    <th className="pb-2 font-medium">Msgs</th>
                    <th className="pb-2 font-medium">Nivel</th>
                    <th className="pb-2 font-medium">Señales</th>
                  </tr>
                </thead>
                <tbody>
                  {filasVisibles.map((f) => (
                    <FilaSesion key={f.sessionId} f={f} courseId={courseId} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {funnels.map((lesson) => (
        <Card key={lesson.lessonId}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {lesson.lessonTitle}
              <span className="text-xs text-gray-400 font-normal ml-2">
                {lesson.totalStudents} estudiante{lesson.totalStudents !== 1 ? 's' : ''} abrieron la sesión
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lesson.funnel.map((act) => {
                const isExpanded = expandedFunnel === act.id
                return (
                  <div key={act.id}>
                    <button onClick={() => setExpandedFunnel(isExpanded ? null : act.id)} className="w-full text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-8 shrink-0">#{act.index}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`truncate max-w-[70%] ${act.cuelloDeBotella ? 'text-amber-700 font-medium' : 'text-gray-600'}`}>
                              {act.title}
                            </span>
                            <span className="text-gray-500">
                              {act.completadas}/{act.total} ({act.percentage}%)
                              {act.porLimite > 0 && (
                                <span className="ml-2 text-amber-700">{act.porLimite} por límite</span>
                              )}
                            </span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                act.percentage >= 80 ? 'bg-green-500' :
                                act.percentage >= 50 ? 'bg-blue-500' :
                                act.percentage >= 30 ? 'bg-amber-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${act.percentage}%` }}
                            />
                          </div>
                        </div>
                        {act.cuelloDeBotella ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" aria-label="Cuello de botella" />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 ml-11 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                        <div className="flex flex-wrap gap-6">
                          <div>
                            <span className="text-gray-500">Llegaron: </span>
                            <span className="font-medium">{act.llegaron}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Promedio intentos: </span>
                            <span className="font-medium">{act.promedioIntentos}</span>
                          </div>
                          {act.cuelloDeBotella && (
                            <span className="text-amber-700">
                              Menos de la mitad de los que llegaron la superó
                            </span>
                          )}
                          {act.criterioMasFallado && (
                            <div className="flex items-start gap-1">
                              <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                              <span className="text-red-600">Criterio más fallado: {act.criterioMasFallado}</span>
                            </div>
                          )}
                        </div>
                        <Comprension niveles={act.comprension} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FilaSesion({ f, courseId }: { f: FilaMonitor; courseId: string }) {
  const e = ESTADO_FILA[f.estado]
  const apagado = f.estado === 'sin-terminar' || f.estado === 'en-pausa'
  const texto = apagado ? 'text-gray-500' : 'text-gray-600'
  const barra =
    f.estado === 'activa' ? 'bg-green-500' : f.estado === 'terminada' ? 'bg-blue-500' : 'bg-gray-400'
  const pct = f.estado === 'terminada' ? 100 : Math.round(f.percentage)
  return (
    <tr className={`border-b ${e.fila}`}>
      <td className="py-1.5 pl-3">
        <div className="flex items-center gap-2">
          {f.estado === 'activa' ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
          ) : (
            <span className={`inline-flex rounded-full h-2 w-2 shrink-0 ${e.punto}`} />
          )}
          <span className="text-xs whitespace-nowrap">
            {e.texto(f)}
            {f.estado === 'sin-terminar' && f.cierre && (
              <span className="block text-[10px] text-gray-400">cerró el {formatDate(f.cierre)}</span>
            )}
          </span>
        </div>
      </td>
      <td className="py-1.5">
        <Link href={`/dashboard/${courseId}/${f.userId}`} className="hover:text-blue-600">
          <p className={`font-medium text-sm ${apagado ? 'text-gray-600' : 'text-gray-900'}`}>{f.name || f.email}</p>
        </Link>
      </td>
      <td className="py-1.5">
        <p className="text-[11px] text-gray-500 truncate max-w-[150px]" title={f.lessonTitle}>{f.lessonTitle}</p>
      </td>
      <td className="py-1.5">
        {f.estado === 'terminada' ? (
          <span className="text-xs text-blue-600 font-medium">Completó</span>
        ) : f.activityIndex && f.activityTotal ? (
          <div>
            <span className={`text-xs font-medium ${texto}`}>Act {f.activityIndex}/{f.activityTotal}</span>
            {f.activityTitle && (
              <p className="text-[10px] text-gray-500 truncate max-w-[150px]" title={f.activityTitle}>{f.activityTitle}</p>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
      <td className="py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barra}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs ${texto}`}>{pct}%</span>
        </div>
      </td>
      <td className={`py-1.5 text-xs ${texto}`}>
        {formatDate(f.startedAt)}, {formatTime(f.startedAt)}
      </td>
      <td className={`py-1.5 text-xs ${texto}`}>
        {formatDate(f.lastActivityAt)}, {formatTime(f.lastActivityAt)}
      </td>
      <td className={`py-1.5 text-xs ${texto}`}>{f.minutos} min</td>
      <td className={`py-1.5 text-xs ${texto}`}>{f.messageCount}</td>
      <td className="py-1.5">
        {f.estado !== 'activa' && f.grade !== null && f.estado === 'terminada' ? (
          <span className="text-xs font-medium text-gray-700">{Math.round(f.grade)}</span>
        ) : (
          <RubricBadge level={f.nivel} muted={apagado} />
        )}
      </td>
      <td className="py-1.5 max-w-[170px]">
        <Senales f={f} />
      </td>
    </tr>
  )
}

/**
 * Lo que pide acción. A diferencia del aviso anterior, que se encendía a los 3
 * intentos (el tope, cuando el código ya había avanzado al alumno) y se
 * apagaba en la actividad siguiente, acá se avisa a uno del tope y «avanzó por
 * límite» sigue visible después.
 */
function Senales({ f }: { f: FilaMonitor }) {
  const items: React.ReactNode[] = []
  if (f.intentos?.aviso) {
    items.push(
      <span key="intentos" className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
        <AlertTriangle className="h-2.5 w-2.5" />
        {f.intentos.actuales} de {f.intentos.maximo} intentos
      </span>
    )
    if (f.criterioFaltante) {
      items.push(
        <p key="criterio" className="text-[10px] text-red-600 truncate mt-0.5" title={f.criterioFaltante}>
          Falta: {f.criterioFaltante}
        </p>
      )
    }
  }
  if (f.porLimite) {
    items.push(
      <p key="limite" className="text-[10px] text-red-700 mt-0.5" title={f.porLimite.title}>
        Avanzó por límite en Act {f.porLimite.index}
      </p>
    )
  }
  if (f.lecturaSinComprobar?.length) {
    items.push(
      <p key="lectura" className="text-[10px] text-amber-700 mt-0.5" title={f.lecturaSinComprobar.map((a) => a.title).join(' · ')}>
        Lectura sin comprobar en Act {f.lecturaSinComprobar.map((a) => a.index).join(', ')}
      </p>
    )
  }
  if (f.seguimiento) {
    items.push(
      <p key="marca" className="text-[10px] text-gray-500 truncate mt-0.5" title={f.seguimiento.texto}>
        {f.seguimiento.texto}
      </p>
    )
  }
  if (items.length === 0) {
    return f.estado === 'terminada' ? (
      <span className="text-xs text-blue-600">Completado</span>
    ) : (
      <span className="text-xs text-gray-400">—</span>
    )
  }
  return <div>{items}</div>
}

function Comprension({ niveles }: { niveles: Record<string, number> }) {
  const total = Object.values(niveles).reduce((a, b) => a + b, 0)
  if (total === 0) return null
  const colors: Record<string, string> = {
    memorized: 'bg-red-400',
    understood: 'bg-blue-400',
    applied: 'bg-green-500',
    analyzed: 'bg-purple-500',
  }
  const labels: Record<string, string> = {
    memorized: 'Memorizado',
    understood: 'Comprendido',
    applied: 'Aplicado',
    analyzed: 'Analizado',
  }
  return (
    <div>
      <span className="text-gray-500">Comprensión de los que la completaron:</span>
      <div className="flex gap-1 mt-1">
        {Object.entries(niveles).map(([level, count]) => {
          const pct = Math.round((count / total) * 100)
          if (pct === 0) return null
          return (
            <div
              key={level}
              className={`${colors[level]} rounded px-2 py-0.5 text-[10px] font-medium text-white`}
              title={`${labels[level]}: ${pct}%`}
              style={{ width: `${Math.max(pct, 15)}%` }}
            >
              {labels[level]} {pct}%
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RubricBadge({ level, muted }: { level: string | null; muted?: boolean }) {
  if (!level) return <span className="text-gray-300 text-xs">—</span>
  const config: Record<string, { label: string; bg: string; text: string }> = {
    logrado_destacado: { label: 'Destacado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    logrado: { label: 'Logrado', bg: 'bg-blue-100', text: 'text-blue-700' },
    en_proceso: { label: 'En proceso', bg: 'bg-amber-100', text: 'text-amber-700' },
    en_inicio: { label: 'En inicio', bg: 'bg-red-100', text: 'text-red-600' },
  }
  const c = config[level] || config.en_proceso
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${c.bg} ${c.text} ${muted ? 'opacity-60' : ''}`}>
      {c.label}
    </span>
  )
}
