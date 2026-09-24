'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Archive, ArchiveRestore, CalendarRange, Check, Loader2, Pencil, UserPlus, Users, X } from 'lucide-react'
import type { Section } from './types'
import { useProgramacionCtx } from './contexto'

/**
 * Acciones de una sección que se quedaron sin camino en la interfaz cuando
 * Programación pasó al árbol admisión ▸ sede ▸ carrera: renombrar, archivar,
 * fechas de dictado, instructores y estudiantes. Los endpoints y los handlers
 * ya existían (use-programacion.ts); acá solo se les da un botón.
 *
 * La lista de estudiantes se arma pegando DNIs: es lo que el líder tiene a
 * mano, y el padrón resuelve quién es quién.
 */
export function AccionesSeccion({ section }: { section: Section }) {
  const p = useProgramacionCtx()
  const [panel, setPanel] = useState<'fechas' | 'instructores' | 'estudiantes' | null>(null)
  const archivada = section.isArchived

  const alternar = (cual: typeof panel) => setPanel((prev) => (prev === cual ? null : cual))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Boton icono={<Pencil />} texto="Renombrar" disabled={archivada}
          onClick={() => p.handleRenameSection(section.id, section.name)} />
        <Boton icono={<CalendarRange />} texto={rangoDictado(section)} activo={panel === 'fechas'} disabled={archivada}
          onClick={() => alternar('fechas')} />
        <Boton icono={<Users />} texto={`Instructores${section.instructors.length ? ` · ${section.instructors.length}` : ''}`}
          activo={panel === 'instructores'} disabled={archivada} onClick={() => alternar('instructores')} />
        <Boton icono={<UserPlus />} texto={`Estudiantes · ${section.enrolledCount}`}
          activo={panel === 'estudiantes'} disabled={archivada} onClick={() => alternar('estudiantes')} />
        <Boton icono={archivada ? <ArchiveRestore /> : <Archive />} texto={archivada ? 'Reactivar' : 'Archivar'}
          onClick={() => p.handleArchiveSection(section.id, section.name, !archivada)} />
      </div>

      {panel === 'fechas' && (
        <Fechas section={section} onGuardar={async (ini, fin) => {
          await p.handleUpdateSectionDates(section.id, ini, fin)
          setPanel(null)
        }} onCancelar={() => setPanel(null)} />
      )}
      {panel === 'instructores' && <Instructores section={section} />}
      {panel === 'estudiantes' && <Estudiantes section={section} />}
    </div>
  )
}

function rangoDictado(s: Section): string {
  const f = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  if (s.startDate && s.endDate) return `${f(s.startDate)} – ${f(s.endDate)}`
  if (s.startDate) return `desde ${f(s.startDate)}`
  return 'Fechas de dictado'
}

function Boton({ icono, texto, onClick, activo, disabled }: {
  icono: React.ReactNode; texto: string; onClick: () => void; activo?: boolean; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors disabled:opacity-40 [&>svg]:h-3.5 [&>svg]:w-3.5 ${
        activo ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icono}
      {texto}
    </button>
  )
}

function Fechas({ section, onGuardar, onCancelar }: {
  section: Section
  onGuardar: (inicio: string | null, fin: string | null) => Promise<void>
  onCancelar: () => void
}) {
  const aFecha = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '')
  const [ini, setIni] = useState(aFecha(section.startDate))
  const [fin, setFin] = useState(aFecha(section.endDate))
  const [guardando, setGuardando] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
      <span className="text-gray-700">Dictado del</span>
      <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} className="h-8 w-36 bg-white text-sm" />
      <span className="text-gray-700">al</span>
      <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="h-8 w-36 bg-white text-sm" />
      <Button size="sm" className="h-8" disabled={guardando} onClick={async () => {
        setGuardando(true)
        try { await onGuardar(ini || null, fin || null) } finally { setGuardando(false) }
      }}>
        {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button size="sm" variant="outline" className="h-8" onClick={onCancelar}><X className="h-3.5 w-3.5" /></Button>
      <span className="text-xs text-gray-500">Ordena las secciones y permite archivar las terminadas.</span>
    </div>
  )
}

function Instructores({ section }: { section: Section }) {
  const p = useProgramacionCtx()
  const [elegido, setElegido] = useState('')
  const asignados = new Set(section.instructors.map((i) => i.id))
  const candidatos = (p.data?.availableInstructors ?? []).filter((u) => !asignados.has(u.id))

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      {section.instructors.length === 0 ? (
        <p className="text-xs text-gray-500">Sin instructores asignados.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {section.instructors.map((i) => (
            <li key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
              {i.name || i.email}
              <button type="button" className="text-gray-400 hover:text-red-600"
                onClick={() => p.handleUnassignInstructor(section.id, i.id, i.name || i.email)} aria-label="Quitar">
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <select value={elegido} onChange={(e) => setElegido(e.target.value)}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm">
          <option value="">— Agregar instructor —</option>
          {candidatos.map((u) => (
            <option key={u.id} value={u.id}>{u.name || u.email} · {u.role === 'ADMIN' ? 'Líder' : u.role === 'SUPERADMIN' ? 'Super admin' : 'Instructor'}</option>
          ))}
        </select>
        <Button size="sm" className="h-8" disabled={!elegido} onClick={async () => {
          await p.handleAssignInstructor(section.id, elegido)
          setElegido('')
        }}>
          Asignar
        </Button>
      </div>
    </div>
  )
}

function Estudiantes({ section }: { section: Section }) {
  const p = useProgramacionCtx()
  const [dnis, setDnis] = useState('')
  const [matriculando, setMatriculando] = useState(false)
  const [mostrarLista, setMostrarLista] = useState(section.enrolledCount <= 12)
  const lista = dnis.split(/[\s,;]+/).map((d) => d.trim()).filter(Boolean)

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Matricular por DNI</label>
        <textarea
          value={dnis}
          onChange={(e) => setDnis(e.target.value)}
          rows={3}
          placeholder={'Pega los DNI, uno por línea o separados por coma\n72345678\n71234567'}
          className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {lista.length > 0 ? `${lista.length} DNI` : 'El padrón resuelve nombre, carrera y correo.'}
          </p>
          <Button size="sm" className="h-8 gap-1.5" disabled={lista.length === 0 || matriculando} onClick={async () => {
            setMatriculando(true)
            try {
              const r = await p.handleMatricularPorDni(section.id, lista)
              if (r) setDnis(r.noEncontrados.join('\n'))
            } finally {
              setMatriculando(false)
            }
          }}>
            {matriculando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Matricular
          </Button>
        </div>
      </div>

      <div>
        <button type="button" className="text-xs font-medium text-gray-700 hover:underline" onClick={() => setMostrarLista((v) => !v)}>
          {section.enrolledCount} matriculado{section.enrolledCount !== 1 ? 's' : ''} {mostrarLista ? '▾' : '▸'}
        </button>
        {mostrarLista && section.enrolledStudents.length > 0 && (
          <ul className="mt-1.5 max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-md bg-white ring-1 ring-gray-200">
            {section.enrolledStudents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
                <span className="truncate text-gray-700">{e.name || e.email}</span>
                <button type="button" className="shrink-0 text-gray-400 hover:text-red-600"
                  onClick={() => p.handleUnenrollStudent(section.id, e.id, e.name || e.email)} aria-label="Quitar">
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
