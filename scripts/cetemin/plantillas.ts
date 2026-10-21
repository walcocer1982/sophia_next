/**
 * Plantillas de las actividades de una sesión de curso. Aquí vive UNA sola vez
 * la forma de cada pieza (reglas de CLAUDE.md, «Sesiones de curso con Sophia»):
 *  - rutina de entrada en tres pasos sin nota, sin calificar ni interpretar;
 *  - punto clave enseñado primero, con ejemplo resuelto, y una pregunta abierta;
 *  - caso corto individual;
 *  - cierre que alimenta al instructor.
 * Si algo de la forma está mal, se corrige aquí y vale para todas las sesiones.
 */
import type { Activity, CaseBlock, ClassifyBlock, ImageBlock, SupportBlock, TextBlock } from '../../types/lesson'
import type { PuntoClaveSpec, RutinaSpec, SesionSpec, Subida } from './tipos'
import { lineasDelTexto, textoPlano } from '../../lib/subrayado'

export const RUTINA_BLOCK_ID = 'rutina-veo'

/** «IMG-SI-ALTORIESGO-S1-FOTO-BORDE» → «img-foto-borde». */
export function idDeBloqueImagen(imagenId: string): string {
  const m = imagenId.match(/-S\d+-(.+)$/)
  return `img-${(m ? m[1] : imagenId).toLowerCase()}`
}

export function bloqueImagen(
  spec: SesionSpec,
  subidas: Subida,
  imagenId: string,
  title: string,
  showWhen: ImageBlock['showWhen'] = 'on_start',
  pinned = false,
): ImageBlock {
  const f = spec.imagenes.find((i) => i.id === imagenId)
  if (!f) throw new Error(`imagen no declarada en la sesión: ${imagenId}`)
  const s = subidas[imagenId]
  if (!s) throw new Error(`imagen sin subir: ${imagenId}`)
  return {
    id: idDeBloqueImagen(imagenId),
    type: 'image',
    title,
    showWhen,
    pinned,
    url: s.url,
    bankId: s.bankId,
    description: f.description,
    kind: f.kind,
    license: f.license,
    source: f.source.slice(0, 160),
    validated: true,
  }
}

function bloqueRutina(r: RutinaSpec): TextBlock {
  return {
    id: RUTINA_BLOCK_ID,
    type: 'text',
    kind: 'consigna',
    title: 'Veo · Pienso · Me pregunto',
    source: r.fuente ?? 'Rutina de pensamiento de Project Zero (Harvard)',
    pinned: true,
    body: [
      // «sin leer nada más» era ambiguo (¿qué no se lee?); 21 oct 2026.
      'Mira la fotografía y responde una pregunta a la vez.',
      '',
      `- **VEO:** ${r.preguntas.veo}`,
      `- **PIENSO:** ${r.preguntas.pienso}`,
      `- **ME PREGUNTO:** ${r.preguntas.mePregunto}`,
    ].join('\n'),
  }
}

function sinNota(question: string, criterios: string[], max_attempts: 1 | 2): Activity['verification'] {
  return {
    question,
    success_criteria: { must_include: criterios, min_completeness: 30, understanding_level: 'developing' },
    max_attempts,
    open_ended: true,
    is_evaluative: false,
  }
}

/** Tres pasos, tres turnos (Pienso admite uno más para «¿qué te hace decir eso?»). Sin nota. */
function rutina(spec: SesionSpec, subidas: Subida, prefijo: string): Activity[] {
  const r = spec.rutina
  const mural = bloqueImagen(spec, subidas, r.imagenId, r.tituloImagen, 'on_start', true)
  const usa = [mural.id, RUTINA_BLOCK_ID]
  const pista = r.pistaVeo ? ` Si no describe nada, pregúntale ${r.pistaVeo}.` : ''
  return [
    {
      id: `${prefijo}-1`,
      type: 'reflection',
      title: r.titulos.veo,
      subtitle: 'Veo',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction: `Primer paso de la rutina Veo · Pienso · Me pregunto. Dile que mire la fotografía «${r.tituloImagen}» de la pizarra antes de leer los textos y hazle la pregunta tal cual. Sin nota. No califiques (nada de «correcto», «exacto» ni «bien») y no interpretes la foto por él: recoge lo que describa en una frase neutra y pasa al paso siguiente.${pista} Nada de normas todavía.`,
        target_length: '40-70 palabras',
        blocks: [mural, bloqueRutina(r)],
      },
      verification: sinNota(`Mira la fotografía «${r.tituloImagen}» de la pizarra: ${r.preguntas.veo}`, ['Describe algo de lo que ve en la foto'], 1),
    },
    {
      id: `${prefijo}-2`,
      type: 'reflection',
      title: r.titulos.pienso,
      subtitle: 'Pienso',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction: `Segundo paso de la rutina: Pienso. Haz la pregunta tal cual: el punto y qué le hace decir eso. Si da el punto sin la evidencia, pregúntale solo «¿qué te hace decir eso?». No califiques (nada de «correcto», «exacto» ni «bien») ni completes su respuesta: recógela en una frase neutra y pasa al paso siguiente. Nada de normas todavía.`,
        target_length: '40-70 palabras',
        uses: usa,
      },
      verification: sinNota(`En esa misma fotografía: ${r.preguntas.pienso.replace(/\?\s*$/, '')}, y qué te hace decir eso?`, ['Señala un punto desde donde podría caer alguien o algo', 'Dice qué de la foto le hace pensarlo'], 2),
    },
    {
      id: `${prefijo}-3`,
      type: 'reflection',
      title: r.titulos.mePregunto,
      subtitle: 'Me pregunto',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction: `Tercer paso de la rutina: Me pregunto. Haz la pregunta tal cual; se refiere a los puntos que el estudiante señaló en el paso anterior. No la respondas tú: si dice «no sé», eso es lo que buscamos; recógelo como su pregunta («eso lo vemos ahora») sin calificar. No anuncies temas ni hagas otra pregunta: la bienvenida ya presentó los temas de hoy.`,
        target_length: '40-70 palabras',
        uses: usa,
      },
      verification: sinNota(`De los puntos que señalaste: ${r.preguntas.mePregunto}`, ['Dice qué hay abajo de al menos un punto, o qué le falta saber'], 1),
    },
  ]
}

function puntoClave(spec: SesionSpec, subidas: Subida, prefijo: string, n: number, p: PuntoClaveSpec): Activity {
  const norma: TextBlock = { id: p.norma.id, type: 'text', kind: 'norma', title: p.norma.title, source: p.norma.source, pinned: true, body: p.norma.body }
  if (p.subrayar) {
    // Las líneas que respaldan se declaran por fragmentos de su texto. Si alguno
    // no aparece, quedan vacías y el validador no deja cargar la sesión.
    const lineas = lineasDelTexto(p.norma.body).map((l) => textoPlano(l).toLowerCase())
    const fragmentos = ([] as string[]).concat(p.subrayar.respalda)
    const claves = fragmentos.map((f) => lineas.findIndex((l) => l.includes(f.toLowerCase())))
    norma.subrayable = true
    norma.lineasClave = claves.every((i) => i >= 0) ? [...new Set(claves)] : []
  }
  const blocks: SupportBlock[] = [
    bloqueImagen(spec, subidas, p.lamina.imagenId, p.lamina.title, 'on_start'),
    norma,
    ...(p.clasificar ? [{ ...p.clasificar, type: 'classify', showWhen: 'on_start' } as ClassifyBlock] : []),
    ...(p.apoyo ?? []).map((a) => bloqueImagen(spec, subidas, a.imagenId, a.title, 'on_reference')),
  ]
  return {
    id: `${prefijo}-${n}`,
    type: 'practice',
    title: p.title,
    subtitle: p.subtitle,
    complexity: 'moderate',
    keyPointIndex: p.keyPointIndex,
    teaching: {
      agent_instruction: `Enseña primero, con la lámina «${p.lamina.title}» de la pizarra: ${p.regla} Resuelve tú este ejemplo: ${p.ejemplo} Primero regla y ejemplo, sin mandar a leer otro texto; después, la pregunta tal cual.`,
      target_length: '90-130 palabras',
      blocks,
    },
    verification: {
      question: p.pregunta,
      success_criteria: { must_include: p.criterios, critical: p.critical, min_completeness: 60, understanding_level: 'achieved' },
      max_attempts: 2,
      open_ended: false,
    },
    commonMistakes: p.commonMistakes,
  }
}

function casoCorto(spec: SesionSpec, prefijo: string, n: number): Activity {
  const c = spec.casoCorto
  const caso: CaseBlock = { id: c.caso.id, type: 'case', title: c.caso.title, source: c.caso.source, name: c.caso.name, facts: c.caso.facts, question: c.caso.question }
  return {
    id: `${prefijo}-${n}`,
    type: 'practice',
    title: c.title,
    subtitle: c.subtitle,
    complexity: 'complex',
    keyPointIndex: c.keyPointIndex,
    teaching: {
      agent_instruction: `Caso corto individual, calentamiento del caso que después se resuelve en equipo; no inventes otro caso ni cites casos de la clase. Dile que lea el caso «${c.caso.title}» en la pizarra; no lo recites. Pide una decisión con su porqué. ${c.pistas}`,
      target_length: '60-100 palabras',
      uses: spec.puntosClave.map((p) => p.norma.id),
      blocks: [caso],
    },
    verification: {
      question: `Lee ${c.caso.referencia} en la pizarra: ${c.caso.question}`,
      success_criteria: { must_include: c.criterios, critical: c.critical, min_completeness: 60, understanding_level: 'achieved' },
      max_attempts: 2,
      open_ended: false,
    },
    commonMistakes: c.commonMistakes,
  }
}

function cierre(spec: SesionSpec, prefijo: string, n: number): Activity {
  return {
    id: `${prefijo}-${n}`,
    type: 'closing',
    title: spec.cierre?.title ?? 'Dudas para el instructor',
    subtitle: spec.cierre?.subtitle ?? 'Antes de la sala',
    complexity: 'simple',
    keyPointIndex: null,
    teaching: {
      agent_instruction: 'Cierre corto, sin nota. Pregúntale qué punto de hoy le quedó menos claro; esa respuesta la ve el instructor antes de aclarar en clase. No califiques. Reconoce una cosa concreta que haya hecho bien hoy, sin felicitaciones vacías. Anuncia en una oración que ahora el instructor aclara dudas y que luego, en equipo, trabajarán el caso de la clase. No resumas ni agradezcas: el resumen con los puntos clave y el «Gracias por participar» los agrega el sistema.',
      target_length: '40-70 palabras',
    },
    verification: sinNota('¿Qué punto de hoy te quedó menos claro?', ['Nombra un punto que le quedó menos claro, o dice que ninguno'], 1),
  }
}

/** Rutina (3) + puntos clave (n) + caso corto (1) + cierre (1). */
export function construirActividades(spec: SesionSpec, subidas: Subida): Activity[] {
  const prefijo = spec.idPrefijo
  const actividades = rutina(spec, subidas, prefijo)
  let n = actividades.length
  for (const p of spec.puntosClave) actividades.push(puntoClave(spec, subidas, prefijo, ++n, p))
  actividades.push(casoCorto(spec, prefijo, ++n))
  actividades.push(cierre(spec, prefijo, ++n))
  return actividades
}

/** Ids de las actividades de punto clave, en orden (los usa el auditor). */
export function idsDePuntosClave(spec: SesionSpec): string[] {
  return spec.puntosClave.map((_, i) => `${spec.idPrefijo}-${4 + i}`)
}

export function idDelCasoCorto(spec: SesionSpec): string {
  return `${spec.idPrefijo}-${4 + spec.puntosClave.length}`
}

/** Subidas de mentira para validar sin tocar Cloudinary ni la base. */
export function subidasFalsas(spec: SesionSpec): Subida {
  return Object.fromEntries(spec.imagenes.map((i) => [i.id, { url: 'https://example.invalid/pendiente.png', bankId: 'pendiente' }]))
}
