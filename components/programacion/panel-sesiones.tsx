'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, CalendarDays, Check, Clock, Loader2, Lock, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Lesson, Section } from './types'
import { closeTime, formatDate, hoursBetween, localTime, toLocalISO, todayISO } from './helpers'
import { avisosDe, estadoDe, faltaPara, fin, horasSugeridas } from './avisos'
import { AccionesSeccion } from './acciones-seccion'

/** Reloj del panel. Date.now() en el render es impuro y dejaba el «cierra en…»
 *  congelado hasta el siguiente re-render. */
function useAhora(intervaloMs = 30_000) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
  return ahora
}

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DIA_JS = [1, 2, 3, 4, 5, 6, 0] // lunes primero

interface Props {
  section: Section
  canEdit: boolean
  onToggleLesson: (
    sectionId: string, lessonId: string, isOpen: boolean,
    availableAt?: string, closesAfterHours?: number
  ) => Promise<void>
}

/** Tabla de sesiones de una sección: donde realmente se pone fecha y hora. */
export function PanelSesiones({ section, canEdit, onToggleLesson }: Props) {
  const lecciones = section.course.lessons
  const [editando, setEditando] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [abrirPlan, setAbrirPlan] = useState(false)
  const ahora = useAhora()

  const porLeccion = useMemo(
    () => new Map(section.schedules.map((s) => [s.lessonId, s])),
    [section.schedules]
  )

  const sinProgramar = lecciones.filter((l) => !porLeccion.has(l.id)).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Sección {section.name}</h3>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Users className="h-3.5 w-3.5" />
            {section.enrolledCount}
          </span>
          {section.isArchived && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">archivada</span>
          )}
        </div>
        {canEdit && !section.isArchived && (
          <Button size="sm" variant={sinProgramar > 0 ? 'default' : 'outline'} onClick={() => setAbrirPlan((v) => !v)} className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Programar todo el plan
          </Button>
        )}
      </div>

      {canEdit && <AccionesSeccion section={section} />}

      {abrirPlan && (
        <ProgramarPlan
          lecciones={lecciones}
          onAplicar={async (fechas, ini, hrs) => {
            for (const [lessonId, fecha] of fechas) {
              await onToggleLesson(section.id, lessonId, true, toLocalISO(fecha, ini), hrs)
            }
            setAbrirPlan(false)
          }}
          onCancelar={() => setAbrirPlan(false)}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        {lecciones.map((leccion, i) => {
          const sched = porLeccion.get(leccion.id)
          const estado = estadoDe(sched, ahora)
          const avisos = avisosDe(leccion, sched, section.schedules, lecciones, ahora)
          const enEdicion = editando === leccion.id

          return (
            <div
              key={leccion.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                i > 0 ? 'border-t border-gray-100' : ''
              } ${
                avisos.some((a) => a.tipo === 'choque')
                  ? 'bg-red-50/50'
                  : estado === 'abierta'
                    ? 'bg-emerald-50/50'
                    : estado === 'sin-programar'
                      ? 'bg-white'
                      : 'bg-white'
              }`}
            >
              <span className="w-4 shrink-0 font-mono text-xs text-gray-400">{leccion.order}</span>

              <div className="min-w-[14rem] flex-1">
                <p className={`text-sm ${estado === 'sin-programar' ? 'text-gray-500' : 'font-medium text-gray-900'}`}>
                  {leccion.title}
                </p>
                {sched && !enEdicion && (
                  <p className="mt-0.5 font-mono text-xs text-gray-500">
                    {formatDate(sched.availableAt)} · {localTime(sched.availableAt)}–
                    {closeTime(sched.availableAt, sched.closesAfterHours)}
                    {estado === 'abierta' && (
                      <span className="ml-2 font-sans text-emerald-700">
                        cierra en {faltaPara(fin(sched) - ahora)}
                      </span>
                    )}
                  </p>
                )}
                {leccion.activityCount ? (
                  <p className="mt-0.5 text-[11px] text-gray-400">{leccion.activityCount} actividades</p>
                ) : null}

                {avisos.map((a) => (
                  <p
                    key={a.tipo}
                    className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${
                      a.tipo === 'choque' ? 'text-red-700' : a.tipo === 'ventana' ? 'text-amber-700' : 'text-gray-600'
                    }`}
                  >
                    {a.tipo === 'ventana' ? <Clock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {a.texto}
                  </p>
                ))}
              </div>

              <Estado estado={estado} />

              {canEdit && !section.isArchived && (
                enEdicion ? (
                  <EditorFecha
                    leccion={leccion}
                    schedule={sched}
                    ocupado={ocupado === leccion.id}
                    onGuardar={async (fecha, ini, hrs) => {
                      setOcupado(leccion.id)
                      await onToggleLesson(section.id, leccion.id, true, toLocalISO(fecha, ini), hrs)
                      setOcupado(null)
                      setEditando(null)
                    }}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant={sched ? 'outline' : 'default'} onClick={() => setEditando(leccion.id)} className="h-8">
                      {sched ? 'Cambiar' : 'Programar'}
                    </Button>
                    {sched && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ocupado === leccion.id}
                        onClick={async () => {
                          const dentro = estado === 'abierta'
                          if (!confirm(
                            dentro
                              ? `¿Cerrar «${leccion.title}» ahora? Está abierta y los ${section.enrolledCount} estudiantes de la sección pierden el acceso.`
                              : `¿Quitar la programación de «${leccion.title}»?`
                          )) return
                          setOcupado(leccion.id)
                          await onToggleLesson(section.id, leccion.id, false)
                          setOcupado(null)
                        }}
                        className="h-8 gap-1 text-amber-700 hover:bg-amber-50"
                      >
                        {ocupado === leccion.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Estado({ estado }: { estado: ReturnType<typeof estadoDe> }) {
  const mapa = {
    'sin-programar': { txt: 'Sin programar', cls: 'bg-gray-100 text-gray-500' },
    programada: { txt: 'Programada', cls: 'bg-blue-50 text-blue-700' },
    abierta: { txt: 'Abierta', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    cerrada: { txt: 'Cerrada', cls: 'bg-gray-100 text-gray-500' },
  }[estado]
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${mapa.cls}`}>
      {mapa.txt}
    </span>
  )
}

function EditorFecha({
  leccion, schedule, ocupado, onGuardar, onCancelar,
}: {
  leccion: Lesson
  schedule?: { availableAt: string; closesAfterHours: number }
  ocupado: boolean
  onGuardar: (fecha: string, inicio: string, horas: number) => Promise<void>
  onCancelar: () => void
}) {
  const sugeridas = horasSugeridas(leccion.activityCount ?? 0)
  const [fecha, setFecha] = useState(
    schedule ? new Date(schedule.availableAt).toISOString().slice(0, 10) : todayISO()
  )
  const [ini, setIni] = useState(schedule ? localTime(schedule.availableAt) : '19:00')
  const [fin_, setFin] = useState(
    schedule ? closeTime(schedule.availableAt, schedule.closesAfterHours) : `${String(19 + Math.max(sugeridas, 2)).padStart(2, '0')}:00`
  )

  const horas = hoursBetween(ini, fin_)
  const corta = sugeridas > 0 && horas > 0 && horas < sugeridas

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-8 w-36 text-sm" />
      <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} className="h-8 w-24 text-sm" />
      <span className="text-xs text-gray-400">a</span>
      <Input type="time" value={fin_} onChange={(e) => setFin(e.target.value)} className="h-8 w-24 text-sm" />
      {horas > 0 && (
        <span className={`text-xs font-medium ${corta ? 'text-amber-700' : 'text-emerald-700'}`}>
          {horas} h{corta ? ` · sugerido ${sugeridas}` : ''}
        </span>
      )}
      <Button
        size="sm"
        disabled={ocupado || horas === 0}
        onClick={() => {
          if (horas === 0) { toast.error('La hora de cierre debe ser posterior a la de inicio'); return }
          void onGuardar(fecha, ini, horas)
        }}
        className="h-8"
      >
        {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button size="sm" variant="outline" onClick={onCancelar} className="h-8">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

/** Patrón para todo el plan: una fecha de inicio, días de la semana y ventana. */
function ProgramarPlan({
  lecciones, onAplicar, onCancelar,
}: {
  lecciones: Lesson[]
  onAplicar: (fechas: Array<[string, string]>, inicio: string, horas: number) => Promise<void>
  onCancelar: () => void
}) {
  const [desde, setDesde] = useState(todayISO())
  const [dias, setDias] = useState<number[]>([2, 4]) // martes y jueves
  const [ini, setIni] = useState('19:00')
  const [fin_, setFin] = useState('22:00')
  const [aplicando, setAplicando] = useState(false)

  const horas = hoursBetween(ini, fin_)
  const maxActividades = Math.max(0, ...lecciones.map((l) => l.activityCount ?? 0))
  const sugeridas = horasSugeridas(maxActividades)

  // Reparte las sesiones en los días elegidos, a partir de la fecha de inicio.
  const fechas = useMemo(() => {
    if (dias.length === 0) return []
    const out: Array<[string, string]> = []
    const cursor = new Date(`${desde}T12:00:00`)
    let guardas = 0
    while (out.length < lecciones.length && guardas < 400) {
      guardas++
      if (dias.includes(cursor.getDay())) {
        out.push([lecciones[out.length].id, cursor.toISOString().slice(0, 10)])
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [desde, dias, lecciones])

  const mapaFechas = new Map(fechas)

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span className="text-gray-700">Desde</span>
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-8 w-36 bg-white text-sm" />
        <span className="text-gray-700">los</span>
        <div className="flex gap-1">
          {DIAS.map((d, i) => {
            const val = DIA_JS[i]
            const on = dias.includes(val)
            return (
              <button
                key={i}
                onClick={() => setDias((prev) => (on ? prev.filter((x) => x !== val) : [...prev, val]))}
                className={`h-8 w-8 rounded-md border text-xs font-medium ${
                  on ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>
        <span className="text-gray-700">de</span>
        <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} className="h-8 w-24 bg-white text-sm" />
        <span className="text-gray-700">a</span>
        <Input type="time" value={fin_} onChange={(e) => setFin(e.target.value)} className="h-8 w-24 bg-white text-sm" />
        {horas > 0 && (
          <span className={`text-xs font-medium ${sugeridas > horas ? 'text-amber-700' : 'text-emerald-700'}`}>
            {horas} h · {sugeridas > horas ? `la más larga necesita ${sugeridas} h` : 'alcanza para el plan'}
          </span>
        )}
      </div>

      <div className="space-y-1 rounded-lg bg-white/70 p-3">
        {lecciones.map((l) => (
          <p key={l.id} className="flex items-center gap-2 text-xs">
            <span className="w-4 font-mono text-gray-400">{l.order}</span>
            <span className="flex-1 truncate text-gray-700">{l.title}</span>
            <span className="font-mono text-gray-600">
              {mapaFechas.get(l.id)
                ? new Date(`${mapaFechas.get(l.id)}T12:00:00`).toLocaleDateString('es-PE', {
                    weekday: 'short', day: '2-digit', month: 'short',
                  })
                : '—'}
            </span>
          </p>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={onCancelar}>Cancelar</Button>
        <Button
          size="sm"
          disabled={aplicando || horas === 0 || fechas.length < lecciones.length}
          onClick={async () => {
            setAplicando(true)
            try {
              await onAplicar(fechas, ini, horas)
              toast.success(`${fechas.length} sesiones programadas`)
            } finally {
              setAplicando(false)
            }
          }}
        >
          {aplicando ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Programar {lecciones.length} sesiones
        </Button>
      </div>
    </div>
  )
}
