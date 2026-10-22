/**
 * Reporte de la sesión por sección (lib/reporte-clase.ts): la suma de los
 * reportes por alumno, con el umbral de «qué reforzar con toda la sala».
 *
 *   npm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reporteDeClase, UMBRAL_CLASE } from '@/lib/reporte-clase'
import type { ReporteSesion, ActividadDelReporte } from '@/lib/reporte-sesion'

const keyPoints = ['Cuándo una tarea es trabajo en altura', 'Peligros de caída', 'Caída de personas y de objetos']

function actividad(indice: number, extra: Partial<ActividadDelReporte> = {}): ActividadDelReporte {
  return {
    id: `a${indice}`,
    indice,
    titulo: `Actividad ${indice}`,
    evaluativa: indice >= 4 && indice <= 8,
    puntoClave: indice === 4 || indice === 5 || indice === 8 ? 0 : indice === 6 ? 1 : indice === 7 ? 2 : null,
    estado: 'completada',
    nivel: indice >= 4 && indice <= 8 ? 'logrado' : null,
    porLimite: false,
    intentos: 1,
    criterios: [],
    primera: null,
    respuesta: null,
    lectura: null,
    normaTitulo: null,
    turnos: 1,
    cita: null,
    mensajes: 1,
    palabras: 8,
    minutos: 2,
    ...extra,
  }
}

/** Un reporte mínimo coherente; `cambios` ajusta actividades, oportunidades y ubicación. */
function reporte(opts: {
  hechas?: number
  ubicacion?: ReporteSesion['ubicacion']['estado']
  nivel?: ReporteSesion['logro']['nivelSesion']
  faltas?: { indice: number; criterio: string; cita: string }[]
  duda?: string | null
  porLimite?: number[]
}): ReporteSesion {
  const hechas = opts.hechas ?? 9
  const actividades = Array.from({ length: 9 }, (_, i) => {
    const n = i + 1
    const estado: ActividadDelReporte['estado'] = n <= hechas ? 'completada' : n === hechas + 1 ? 'en_curso' : 'sin_llegar'
    const falta = opts.faltas?.find((f) => f.indice === n)
    return actividad(n, {
      estado,
      nivel: estado === 'completada' && n >= 4 && n <= 8 ? (falta ? 'en_proceso' : 'logrado') : null,
      respuesta: falta?.cita ?? null,
      porLimite: !!opts.porLimite?.includes(n),
    })
  })
  const puntosClave = keyPoints.map((titulo, indice) => {
    const propias = actividades.filter((a) => a.evaluativa && a.puntoClave === indice)
    const evaluadas = propias.filter((a) => a.estado === 'completada' && a.nivel)
    const nivel = evaluadas.length ? (evaluadas.some((a) => a.nivel === 'en_proceso') ? 'en_proceso' : 'logrado') : null
    return { indice, titulo, nivel: nivel as ReporteSesion['puntosClave'][number]['nivel'], completo: propias.every((a) => a.estado === 'completada'), actividades: propias }
  })
  const actual = actividades.find((a) => a.estado === 'en_curso') ?? null
  return {
    avance: { hechas, total: 9, conNotaHechas: Math.min(5, Math.max(0, hechas - 3)), conNota: 5, terminada: hechas === 9, mensajes: hechas, palabrasPorMensaje: 8 },
    ubicacion: { estado: opts.ubicacion ?? (hechas === 9 ? 'terminada' : 'lo_dejo'), actividad: actual, minutosSinEscribir: 12 },
    logro: { puntosLogrados: 0, puntosTotal: 3, porcentaje: 0, nivelSesion: opts.nivel ?? 'logrado', nota: 60, notaVeinte: 12, parcial: hechas < 9, criteriosCubiertos: 0, criteriosTotal: 11, lecturasComprobadas: 0, lecturasTotal: 4 },
    puntosClave,
    actividades,
    fortalezas: [],
    oportunidades: (opts.faltas ?? []).map((f) => ({ actividad: actividades[f.indice - 1], tipo: 'criterio' as const, texto: 'En proceso · 2 intentos', falta: [f.criterio] })),
    duda: opts.duda ?? null,
    acciones: [],
  }
}

const UMBRAL = 'Concluye que el umbral depende del rubro'

test('umbral de clase: un criterio que falló en 2 de 3 que llegaron se refuerza con la sala; en 1 solo, va a quien mirar', () => {
  const clase = reporteDeClase(
    [
      { userId: 'u1', nombre: 'Milagros', reporte: reporte({}) },
      { userId: 'u2', nombre: 'Luis', reporte: reporte({ faltas: [{ indice: 5, criterio: UMBRAL, cita: 'supera porque está a más de uno veinte' }, { indice: 8, criterio: 'Nombra el peligro', cita: 'hay un balde' }] }) },
      { userId: 'u3', nombre: 'Jhon', reporte: reporte({ hechas: 6, faltas: [{ indice: 5, criterio: UMBRAL, cita: 'en la embotelladora, porque sí' }] }) },
      { userId: 'u4', nombre: 'Brayan', reporte: null },
    ],
    keyPoints
  )
  assert.deepEqual(clase.resumen, { matriculados: 4, entraron: 3, terminaron: 2, enCurso: 0, loDejaron: 1, cerraronSinTerminar: 0, noEntraron: 1 })
  assert.equal(clase.criterios.length, 2)
  assert.deepEqual(clase.queReforzar.map((c) => c.criterio), [UMBRAL])
  const q = clase.queReforzar[0]
  assert.deepEqual([q.alumnos.length, q.llegaron, q.puntoClave], [2, 3, keyPoints[0]])
  assert.deepEqual(q.alumnos.map((a) => a.cita), ['supera porque está a más de uno veinte', 'en la embotelladora, porque sí'])
  // El criterio que falló solo Luis no es de la clase: aparece en su línea de «a quién mirar».
  const luis = clase.aQuienMirar.find((m) => m.userId === 'u2')!
  assert.ok(luis.motivo.includes('no cubrió «Nombra el peligro» (Act 8)'))
  assert.ok(!luis.motivo.includes(UMBRAL))
  const jhon = clase.aQuienMirar.find((m) => m.userId === 'u3')!
  assert.ok(jhon.motivo.startsWith('dejó la sesión en la actividad 7 hace 12 min'))
  assert.equal(clase.aQuienMirar.find((m) => m.userId === 'u4')!.motivo, 'no entró a la sesión')
  assert.equal(clase.aQuienMirar.some((m) => m.userId === 'u1'), false)
})

test('logro por punto clave de la clase y filas de alumnos', () => {
  const clase = reporteDeClase(
    [
      { userId: 'u1', nombre: 'Milagros', reporte: reporte({}) },
      { userId: 'u3', nombre: 'Jhon', reporte: reporte({ hechas: 6 }) },
    ],
    keyPoints
  )
  // Punto 1 (act 4, 5, 8): Milagros logrado; Jhon incompleto (no llegó a la 8).
  assert.deepEqual(clase.puntosClave.map((p) => [p.logrado, p.incompleto, p.sinLlegar]), [
    [1, 1, 0],
    [2, 0, 0],
    [1, 0, 1],
  ])
  assert.equal(clase.alumnos[1].estado, 'lo dejó en Act 7')
  assert.equal(clase.alumnos[1].desempeno, '12 de 20 (parcial)')
  assert.equal(UMBRAL_CLASE.minimoAlumnos, 2)
})

test('las dudas vacías («ninguna», «todo claro») no se listan', () => {
  const clase = reporteDeClase(
    [
      { userId: 'u1', nombre: 'A', reporte: reporte({ duda: 'ninguna' }) },
      { userId: 'u2', nombre: 'B', reporte: reporte({ duda: '¿Qué norma rige en una fábrica en el Perú?' }) },
    ],
    keyPoints
  )
  assert.deepEqual(clase.dudas, [{ userId: 'u2', nombre: 'B', texto: '¿Qué norma rige en una fábrica en el Perú?' }])
})
