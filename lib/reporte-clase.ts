/**
 * Reporte de la sesión para una sección (22 oct 2026): lo que el instructor
 * mira en sus 15 minutos después del bloque con Sophia. Es la SUMA de los
 * reportes por alumno (`lib/reporte-sesion.ts`), así la clase y la ficha dicen
 * lo mismo con las mismas palabras. Todo lo de aquí es calculado; la IA solo
 * redacta cómo abordar lo que esta función eligió (`lib/reporte-clase-ia.ts`).
 */
import { NIVEL_TEXTO, type ReporteSesion } from '@/lib/reporte-sesion'

export type AlumnoDeClase = { userId: string; nombre: string; reporte: ReporteSesion | null }

export type FilaPuntoClave = {
  indice: number
  titulo: string
  destacado: number
  logrado: number
  enProceso: number
  enInicio: number
  incompleto: number
  sinLlegar: number
  total: number
}

export type CriterioFallado = {
  criterio: string
  actividadIndice: number
  actividadTitulo: string
  puntoClave: string | null
  alumnos: { userId: string; nombre: string; cita: string | null }[]
  /** Cuántos de la clase llegaron a esa actividad: el denominador honesto. */
  llegaron: number
  /** Falló en más de un alumno y en una parte de los que llegaron: se refuerza con toda la sala. */
  paraClase: boolean
}

export type Mirar = { userId: string; nombre: string; motivo: string }

export type FilaAlumnoClase = {
  userId: string
  nombre: string
  estado: string
  avance: string
  nivel: string
  desempeno: string
  participacion: string
  reporte: ReporteSesion | null
}

export type ReporteClase = {
  resumen: { matriculados: number; entraron: number; terminaron: number; enCurso: number; loDejaron: number; cerraronSinTerminar: number; noEntraron: number }
  puntosClave: FilaPuntoClave[]
  /** Todos los criterios que alguien no cubrió, los más fallados primero. */
  criterios: CriterioFallado[]
  /** Los que pasan el umbral de clase: eso es lo que la IA redacta. */
  queReforzar: CriterioFallado[]
  porLimite: { userId: string; nombre: string; actividadIndice: number; actividadTitulo: string }[]
  lecturaSinComprobar: { userId: string; nombre: string; actividadIndice: number }[]
  dudas: { userId: string; nombre: string; texto: string }[]
  aQuienMirar: Mirar[]
  alumnos: FilaAlumnoClase[]
}

/** Un criterio es de la clase si falló en al menos 2 alumnos y en al menos el 30 % de los que llegaron. */
export const UMBRAL_CLASE = { minimoAlumnos: 2, fraccion: 0.3 }

const ESTADO: Record<ReporteSesion['ubicacion']['estado'], string> = {
  terminada: 'terminó',
  escribiendo: 'escribiendo ahora',
  en_pausa: 'en pausa',
  lo_dejo: 'lo dejó',
  cerro_sin_terminar: 'cerró sin terminar',
}

const DUDA_VACIA = /^(ninguna|nada|no|ok|listo|todo (está |me quedó )?claro)[.!]?$/i

export function reporteDeClase(alumnos: AlumnoDeClase[], keyPoints: string[]): ReporteClase {
  const con = alumnos.filter((a): a is AlumnoDeClase & { reporte: ReporteSesion } => a.reporte !== null)

  // ── Logro por punto clave ────────────────────────────────────────────────
  const puntosClave: FilaPuntoClave[] = keyPoints.map((titulo, indice) => {
    const fila: FilaPuntoClave = { indice, titulo, destacado: 0, logrado: 0, enProceso: 0, enInicio: 0, incompleto: 0, sinLlegar: 0, total: con.length }
    for (const a of con) {
      const k = a.reporte.puntosClave.find((x) => x.indice === indice)
      if (!k || (!k.completo && !k.nivel)) fila.sinLlegar++
      else if (!k.completo) fila.incompleto++
      else if (k.nivel === 'logrado_destacado') fila.destacado++
      else if (k.nivel === 'logrado') fila.logrado++
      else if (k.nivel === 'en_proceso') fila.enProceso++
      else fila.enInicio++
    }
    return fila
  })

  // ── Criterios no cubiertos, agrupados ────────────────────────────────────
  const porCriterio = new Map<string, CriterioFallado>()
  for (const a of con) {
    for (const o of a.reporte.oportunidades) {
      if (o.tipo !== 'criterio') continue
      for (const criterio of o.falta) {
        const clave = `${o.actividad.indice}|${criterio}`
        const e = porCriterio.get(clave) ?? {
          criterio,
          actividadIndice: o.actividad.indice,
          actividadTitulo: o.actividad.titulo,
          puntoClave: o.actividad.puntoClave !== null ? (keyPoints[o.actividad.puntoClave] ?? null) : null,
          alumnos: [],
          llegaron: 0,
          paraClase: false,
        }
        e.alumnos.push({ userId: a.userId, nombre: a.nombre, cita: o.actividad.respuesta })
        porCriterio.set(clave, e)
      }
    }
  }
  const llegaronA = (indice: number) => con.filter((a) => a.reporte.actividades[indice - 1]?.estado !== 'sin_llegar').length
  const criterios = [...porCriterio.values()]
    .map((c) => {
      const llegaron = llegaronA(c.actividadIndice)
      const n = c.alumnos.length
      return { ...c, llegaron, paraClase: n >= UMBRAL_CLASE.minimoAlumnos && n / Math.max(llegaron, 1) >= UMBRAL_CLASE.fraccion }
    })
    .sort((x, y) => y.alumnos.length - x.alumnos.length || x.actividadIndice - y.actividadIndice)
  const queReforzar = criterios.filter((c) => c.paraClase)

  const porLimite = con.flatMap((a) =>
    a.reporte.actividades.filter((x) => x.porLimite).map((x) => ({ userId: a.userId, nombre: a.nombre, actividadIndice: x.indice, actividadTitulo: x.titulo }))
  )
  const lecturaSinComprobar = con.flatMap((a) =>
    a.reporte.actividades.filter((x) => x.lectura === 'sin_comprobar').map((x) => ({ userId: a.userId, nombre: a.nombre, actividadIndice: x.indice }))
  )
  const dudas = con
    .filter((a) => a.reporte.duda && !DUDA_VACIA.test(a.reporte.duda))
    .map((a) => ({ userId: a.userId, nombre: a.nombre, texto: a.reporte.duda! }))

  // ── A quién mirar: una línea por alumno con todos sus motivos ────────────
  const motivos = new Map<string, string[]>()
  const anotar = (a: AlumnoDeClase, m: string) => motivos.set(a.userId, [...(motivos.get(a.userId) ?? []), m])
  for (const a of alumnos) {
    if (!a.reporte) {
      anotar(a, 'no entró a la sesión')
      continue
    }
    const u = a.reporte.ubicacion
    if (u.estado === 'lo_dejo') anotar(a, `dejó la sesión en la actividad ${u.actividad?.indice ?? '?'}${u.minutosSinEscribir !== null ? ` hace ${u.minutosSinEscribir} min` : ''}`)
    if (u.estado === 'cerro_sin_terminar') anotar(a, `cerró sin terminar, en la actividad ${u.actividad?.indice ?? '?'}`)
    if (u.estado === 'terminada' && a.reporte.logro.nivelSesion === 'en_inicio') anotar(a, 'terminó en nivel En inicio')
    for (const c of criterios) {
      if (c.paraClase) continue
      if (c.alumnos.some((x) => x.userId === a.userId)) anotar(a, `no cubrió «${c.criterio}» (Act ${c.actividadIndice})`)
    }
    for (const p of porLimite.filter((x) => x.userId === a.userId)) anotar(a, `avanzó por límite en la actividad ${p.actividadIndice}`)
    for (const l of lecturaSinComprobar.filter((x) => x.userId === a.userId)) anotar(a, `no señaló la línea de la norma en la actividad ${l.actividadIndice}`)
  }
  const aQuienMirar: Mirar[] = alumnos
    .filter((a) => motivos.has(a.userId))
    .map((a) => ({ userId: a.userId, nombre: a.nombre, motivo: motivos.get(a.userId)!.join(' · ') }))

  // ── Filas y resumen ──────────────────────────────────────────────────────
  const filas: FilaAlumnoClase[] = alumnos.map((a) => {
    const r = a.reporte
    if (!r) return { userId: a.userId, nombre: a.nombre, estado: 'no entró', avance: '—', nivel: '—', desempeno: '—', participacion: '—', reporte: null }
    const u = r.ubicacion
    return {
      userId: a.userId,
      nombre: a.nombre,
      estado: `${ESTADO[u.estado]}${u.actividad ? ` en Act ${u.actividad.indice}` : ''}`,
      avance: `${r.avance.hechas} de ${r.avance.total}`,
      nivel: r.logro.nivelSesion ? NIVEL_TEXTO[r.logro.nivelSesion] : 'sin nota',
      desempeno: r.logro.notaVeinte !== null ? `${r.logro.notaVeinte} de 20${r.logro.parcial ? ' (parcial)' : ''}` : '—',
      participacion: `${r.avance.mensajes} ${r.avance.mensajes === 1 ? 'mensaje' : 'mensajes'}${r.avance.palabrasPorMensaje !== null ? ` · ${r.avance.palabrasPorMensaje} palabras/mensaje` : ''}`,
      reporte: r,
    }
  })
  const cuenta = (e: ReporteSesion['ubicacion']['estado']) => con.filter((a) => a.reporte.ubicacion.estado === e).length

  return {
    resumen: {
      matriculados: alumnos.length,
      entraron: con.length,
      terminaron: cuenta('terminada'),
      enCurso: cuenta('escribiendo') + cuenta('en_pausa'),
      loDejaron: cuenta('lo_dejo'),
      cerraronSinTerminar: cuenta('cerro_sin_terminar'),
      noEntraron: alumnos.length - con.length,
    },
    puntosClave,
    criterios,
    queReforzar,
    porLimite,
    lecturaSinComprobar,
    dudas,
    aQuienMirar,
    alumnos: filas,
  }
}
