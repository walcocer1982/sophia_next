/**
 * Material de apoyo del panel derecho: lectura, compatibilidad y serialización.
 *
 * Una lección declara bloques tipados en `activity.teaching.blocks`. Las
 * lecciones viejas tienen `teaching.images` (o `image`): este módulo las lee
 * como bloques de tipo `image` sin tocar los datos. Todo lo que muestra o cita
 * material pasa por aquí: la página de /learn, el prompt de texto y el de voz.
 *
 * Especificación: investigacion/panel-de-apoyo-especificacion.md
 */
import type { Activity, ImageBlock, ImageMarker, LessonContent, SupportBlock } from '@/types/lesson'
import type { Cited } from '@/lib/material-markers'
import { serializeSimulatorForPrompt } from '@/lib/simulator'
import { serializeClassifyForPrompt } from '@/lib/clasificar'

/** Bloque con la actividad que lo declara (para filtrar en el cliente). */
export type BlockWithActivity = SupportBlock & { activityId: string }

/**
 * Bloques de una actividad: las imágenes viejas convertidas, más los bloques
 * nuevos. Las imágenes viejas ya se mostraron a alumnos: se consideran
 * validadas, con uso «equipment» y licencia sin registrar.
 */
export function getActivityBlocks(activity: Activity | undefined): SupportBlock[] {
  if (!activity) return []
  const legacy = activity.teaching?.images ?? (activity.teaching?.image ? [activity.teaching.image] : [])
  const fromImages: ImageBlock[] = legacy
    .filter((i) => i?.url)
    .map((i, n) => ({
      id: `${activity.id}-img-${n + 1}`,
      type: 'image',
      title: legacy.length > 1 ? `Imagen ${n + 1}` : 'Imagen',
      url: i.url,
      description: i.description,
      // El panel viejo ignoraba showWhen y las mostraba siempre. Si se
      // respetara aquí, las lecciones publicadas esconderían sus imágenes
      // hasta que Sophia escribiera un marcador que nunca aprendió a escribir.
      showWhen: 'on_start',
      kind: 'equipment',
      license: 'sin registrar',
      validated: true,
      source: 'sin registrar',
    }))
  return [...fromImages, ...(activity.teaching?.blocks ?? [])]
}

/** Lo que el alumno puede ver: una imagen sin validar no sale, salvo en modo prueba. */
export function isVisibleToStudent(block: SupportBlock, isTest = false): boolean {
  if (block.type === 'image' && !block.validated) return isTest
  return true
}

/**
 * Bloques que corresponden a una actividad en pantalla: los suyos más los
 * `pinned` de las actividades anteriores (la fórmula de la nota acompaña a
 * Rosa y a la prioridad TC2/EF). Orden: fijados primero, luego los propios.
 */
export function blocksForActivity(
  content: LessonContent | null | undefined,
  activityId: string | null | undefined,
  isTest = false,
): { pinned: BlockWithActivity[]; current: BlockWithActivity[] } {
  const activities = content?.activities ?? []
  const idx = activityId ? activities.findIndex((a) => a.id === activityId) : 0
  const upto = idx < 0 ? 0 : idx
  const pinned: BlockWithActivity[] = []
  for (let i = 0; i < upto; i++) {
    for (const b of getActivityBlocks(activities[i])) {
      if (b.pinned && isVisibleToStudent(b, isTest)) pinned.push({ ...b, activityId: activities[i].id })
    }
  }
  const actual = activities[upto]
  const current = getActivityBlocks(actual)
    .filter((b) => isVisibleToStudent(b, isTest))
    .map((b) => ({ ...b, activityId: actual?.id ?? '' }))
  return { pinned, current }
}

/** Todos los bloques de la lección con su actividad (para que el cliente filtre al avanzar). */
export function allLessonBlocks(content: LessonContent | null | undefined, isTest = false): BlockWithActivity[] {
  return (content?.activities ?? []).flatMap((a) =>
    getActivityBlocks(a)
      .filter((b) => isVisibleToStudent(b, isTest))
      .map((b) => ({ ...b, activityId: a.id })),
  )
}

/** Lo que la pizarra necesita saber de cada actividad para plegar lo fijado. */
export interface ActivityPanelInfo {
  type: string
  uses?: string[]
  hasBlocks: boolean
}

export function panelInfo(content: LessonContent | null | undefined): Record<string, ActivityPanelInfo> {
  return Object.fromEntries(
    (content?.activities ?? []).map((a) => [
      a.id,
      { type: a.type, uses: a.teaching?.uses, hasBlocks: getActivityBlocks(a).length > 0 },
    ]),
  )
}

/**
 * ¿Un bloque fijado de una actividad anterior se muestra ABIERTO en esta?
 * Sí cuando la actividad lo declara en `teaching.uses`. Sin ese campo: abierto
 * solo si la actividad no trae material propio y no es de reflexión ni cierre.
 * (13 oct 2026: en el cierre de EVA-NOTA el ecualizador quedaba abierto con
 * «10 desaprueba» en rojo, de la actividad 6, mientras el alumno reflexionaba.)
 */
export function pinnedStaysOpen(info: ActivityPanelInfo | undefined, blockId: string): boolean {
  if (!info) return true
  if (info.uses) return info.uses.includes(blockId)
  if (info.type === 'reflection' || info.type === 'closing') return false
  return !info.hasBlocks
}

const TIPO: Record<SupportBlock['type'], string> = {
  image: 'IMAGEN',
  compare: 'COMPARACIÓN',
  formula: 'FÓRMULA',
  table: 'TABLA',
  text: 'TEXTO',
  case: 'CASO',
  diagram: 'DIAGRAMA',
  simulator: 'ECUALIZADOR',
  classify: 'CLASIFICAR',
}

const palabras = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/**
 * Lo que Sophia recibe de un bloque. Regla: lo justo para citarlo y corregir,
 * nunca el contenido completo de lo que el alumno ya tiene en pantalla, para
 * que no lo copie al chat (spec §7.2).
 */
/** Un señalamiento se ve si es `on_start` o si Sophia ya lo citó. En una escena, por defecto aparece al citarlo. */
export function markerShowWhen(m: ImageMarker, b: ImageBlock) {
  return m.showWhen ?? (b.kind === 'scene' ? 'on_reference' : 'on_start')
}

export function isMarkerVisible(m: ImageMarker, b: ImageBlock, cited?: Cited): boolean {
  return markerShowWhen(m, b) === 'on_start' || !!cited?.markers.has(`${b.id}:${m.n}`)
}

/** Un bloque se ve si es `on_start`, si Sophia lo citó, o (a pedido) si el alumno lo abrió. */
export function isBlockShown(b: SupportBlock, cited?: Cited, opened?: Set<string>): boolean {
  const cuando = b.showWhen ?? 'on_start'
  if (cuando === 'on_start') return true
  if (cited?.blocks.has(b.id)) return true
  return cuando === 'on_demand' && !!opened?.has(b.id)
}

export function serializeBlockForPrompt(b: SupportBlock, cited?: Cited): string {
  switch (b.type) {
    case 'image': {
      const uso = { scene: 'escena de caso', term: 'palabra técnica', equipment: 'equipo', diagram: 'esquema' }[b.kind]
      const marcas = b.markers?.length
        ? ` Señalamientos: ${b.markers
            .map((m) => `${m.n} ${m.label} (${isMarkerVisible(m, b, cited) ? 'visible' : `oculto: para mostrarlo escribe [[marker:${b.id}:${m.n}]]`})`)
            .join(' · ')}.`
        : ''
      const escena = b.kind === 'scene'
        ? ' Es una escena de caso: no señales el peligro ni nombres lo que muestra hasta que el estudiante responda.'
        : ''
      return `(${uso}) ${b.description}${marcas}${escena}`
    }
    case 'compare':
      return `${b.items.map((it) => `«${it.caption}»: ${it.description}`).join(' | ')}. No digas cuál es cuál hasta que el estudiante responda.`
    case 'formula': {
      const terminos = b.terms?.length ? ` Términos: ${b.terms.map((t) => `${t.symbol} = ${t.meaning}${t.value ? ` (${t.value})` : ''}`).join('; ')}.` : ''
      const ejemplo = b.example ? ` Ejemplo resuelto en el material: ${b.example.label}, total ${b.example.total}.` : ''
      return `${b.expression}.${terminos}${ejemplo}`
    }
    case 'table': {
      const muestra = b.rows.slice(0, 3).map((r) => r.join(' | ')).join(' / ')
      const extra = b.rows.length > 3 ? ` (y ${b.rows.length - 3} filas más)` : ''
      const todo = b.forVerifier ? ` Filas completas: ${b.rows.map((r) => r.join(' | ')).join(' / ')}.` : ''
      return `Columnas: ${b.columns.join(' | ')}. ${b.rows.length} filas, por ejemplo: ${muestra}${extra}.${b.legend ? ` ${b.legend}` : ''}${todo}`
    }
    case 'text': {
      const lineas = b.body.split('\n').map((l) => l.trim()).filter(Boolean)
      const inicio = lineas.slice(0, 2).join(' ').slice(0, 220)
      return `${palabras(b.body)} palabras${b.source ? `, fuente ${b.source}` : ''}. Empieza: «${inicio}…». No lo copies: di «lee el texto en la pizarra» y cita la línea que necesites.`
    }
    case 'case':
      // En la bienvenida de EVA-NOTA (6 oct) Sophia recitó los datos de Luis
      // que el alumno ya tenía en el panel: los datos se le dan para razonar,
      // no para repetirlos.
      return `${b.name}: ${b.facts.join(' · ')}.${b.question ? ` Pregunta: ${b.question}` : ''} Estos datos ya están en la pizarra, a la vista del estudiante: no los enumeres; di «mira el caso de ${b.name} en la pizarra» y nombra como mucho el dato que importa para la pregunta.`
    case 'diagram': {
      const nombre = new Map(b.nodes.map((n) => [n.id, n.label]))
      if (b.kind === 'hierarchy') {
        // El árbol: «A > B» por cada relación; los de primer nivel, aparte.
        const relaciones = Object.entries(b.parent ?? {})
          .filter(([h, p]) => nombre.has(h) && nombre.has(p))
          .map(([h, p]) => `${nombre.get(p)} > ${nombre.get(h)}`)
        const raices = b.nodes.filter((n) => !b.parent?.[n.id] || !nombre.has(b.parent[n.id])).map((n) => n.label)
        return `(jerarquía) Primer nivel: ${raices.join(', ')}.${relaciones.length ? ` ${relaciones.join('; ')}.` : ''}`
      }
      const pasos = b.nodes.map((n, i) => {
        const etq = b.edges?.find((e) => e.from === n.id && e.to === b.nodes[i + 1]?.id)?.label
        return etq ? `${n.label} (${etq})` : n.label
      })
      const forma = { flow: 'flujo', cycle: 'ciclo, vuelve al primero', timeline: 'línea de tiempo', hierarchy: 'jerarquía' }[b.kind]
      return `(${forma}) ${pasos.join(' → ')}.`
    }
    case 'simulator':
      return serializeSimulatorForPrompt(b)
    case 'classify':
      return serializeClassifyForPrompt(b)
  }
}

function estado(b: SupportBlock, cited?: Cited): string {
  const cuando = b.showWhen ?? 'on_start'
  if (cuando === 'on_start' || cited?.blocks.has(b.id)) return 'YA VISIBLE'
  if (cuando === 'on_demand') return `A PEDIDO: el estudiante puede abrirlo con un botón; si lo necesita, muéstralo escribiendo [[block:${b.id}]]`
  return `OCULTO: aparece cuando escribas [[block:${b.id}]] en el mensaje donde lo presentes`
}

/**
 * Bloque de instrucciones para el system prompt: qué material tiene el
 * estudiante delante, qué está oculto y cómo mostrarlo. Vacío si la actividad
 * no tiene material. `cited`: lo que Sophia ya mostró en la sesión.
 */
export function buildMaterialPrompt(blocks: SupportBlock[], pinned: SupportBlock[] = [], cited?: Cited): string {
  if (blocks.length === 0 && pinned.length === 0) return ''
  const linea = (b: SupportBlock, fijo: boolean) =>
    // El id va al final y sin corchetes: con «[formula-nota] FÓRMULA…» Sophia
    // escribió «mira la fórmula en el panel [formula-nota]» (prueba del 6 oct).
    `  - ${TIPO[b.type]} «${b.title}» — ${fijo ? 'FIJO de una actividad anterior, visible' : estado(b, cited)}. ${serializeBlockForPrompt(b, cited)} (id interno: ${b.id})`
  const lineas = [...pinned.map((b) => linea(b, true)), ...blocks.map((b) => linea(b, false))]
  const hayOcultos = [...blocks].some((b) => estado(b, cited) !== 'YA VISIBLE')
  const haySenales = blocks.some((b) => b.type === 'image' && b.markers?.some((m) => !isMarkerVisible(m, b, cited)))
  return `
MATERIAL DE APOYO (el estudiante lo ve en su PIZARRA, al lado de la conversación; cítalo por su título y NO lo reescribas):
${lineas.join('\n')}

REGLAS DEL MATERIAL:
- El material está en la PIZARRA del estudiante (en computadora, a la derecha; en celular, una pestaña). Llámalo «la pizarra» o por su título («el ecualizador de la pizarra»); NUNCA digas «el panel» ni «abajo», aunque la instrucción de la actividad lo diga.
- Refiérete al material por su título y a la fila, línea o número exacto: «mira la fila de 10 sesiones del "Semáforo de faltas"».
- El estudiante no conoce los ids internos: nunca los escribas sueltos ni entre corchetes. Un id solo va dentro de un marcador [[block:ID]] o [[marker:ID:n]].
- NUNCA copies en el chat una tabla, una fórmula, un fragmento o los datos de un caso que ya están en el material. El estudiante los está viendo.
- Si el estudiante pregunta algo que está en el material, señálaselo antes de responder.
- Usa solo lo que dice cada bloque. No inventes filas, valores, pasos ni detalles de una imagen.${hayOcultos ? `
- Para mostrar un bloque oculto escribe su marcador [[block:ID]] UNA sola vez, al final de la oración donde lo presentas. El estudiante no ve el marcador: ve el bloque aparecer en la pizarra.` : ''}${haySenales ? `
- Para mostrar un señalamiento de una imagen escribe [[marker:ID:n]] al final de la oración donde lo nombras. En una escena de caso, SOLO después de que el estudiante haya respondido qué ve; nunca al presentar la escena.` : ''}`
}

