/**
 * Lógica del editor de material de apoyo (planner, etapa 3). Funciones puras,
 * sin React, para que se prueben sin pantalla.
 *
 * Spec: investigacion/panel-de-apoyo-especificacion.md §9
 */
import { GeneratedStructureSchema, SupportBlockSchema, SupportBlockSchemaByType } from '@/lib/planner/validation'
import { getActivityBlocks } from '@/lib/support-blocks'
import type { Activity, SupportBlock, SupportBlockType } from '@/types/lesson'

export const BLOCK_TYPE_LABELS: Record<SupportBlockType, string> = {
  image: 'Imagen',
  compare: 'Comparación',
  formula: 'Fórmula',
  table: 'Tabla',
  text: 'Texto',
  case: 'Caso',
  diagram: 'Diagrama',
  simulator: 'Ecualizador',
}

export const BLOCK_TYPE_HINTS: Record<SupportBlockType, string> = {
  image: 'Una foto con fuente: equipo, escena de caso o palabra técnica',
  compare: 'Dos o tres fotos lado a lado, con pies neutros',
  formula: 'Un cálculo que el alumno debe aplicar, con ejemplo resuelto',
  table: 'Umbrales, pesos, criterios o una comparación',
  text: 'Un fragmento que el alumno lee y cita',
  case: 'Un personaje con datos que se usan en varios turnos',
  diagram: 'Un flujo, ciclo, jerarquía o línea de tiempo (nunca un equipo)',
  simulator: 'Barras que el alumno mueve para ver cómo cambia un resultado ponderado (una nota)',
}

const quitarTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** id estable a partir de un título: «Semáforo de faltas» → «semaforo-de-faltas». */
export function slugifyId(text: string): string {
  const base = quitarTildes(text.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return base.length >= 2 ? base : `bloque-${base || 'nuevo'}`
}

/** id único en la lección (Sophia cita por id: dos iguales mostrarían el equivocado). */
export function uniqueBlockId(base: string, existing: Iterable<string>): string {
  const usados = new Set(existing)
  const raiz = slugifyId(base)
  if (!usados.has(raiz)) return raiz
  for (let n = 2; n < 1000; n++) {
    const id = `${raiz}-${n}`.slice(0, 60)
    if (!usados.has(id)) return id
  }
  return `${raiz}-${Date.now()}`
}

/** Todos los ids de bloque de la lección, incluidos los de imágenes viejas. */
export function lessonBlockIds(activities: Activity[]): string[] {
  return activities.flatMap((a) => getActivityBlocks(a).map((b) => b.id))
}

const TITULO_NUEVO: Record<SupportBlockType, string> = {
  image: 'Imagen nueva',
  compare: 'Comparación nueva',
  formula: 'Fórmula nueva',
  table: 'Tabla nueva',
  text: 'Texto nuevo',
  case: 'Caso nuevo',
  diagram: 'Diagrama nuevo',
  simulator: 'Ecualizador nuevo',
}

/** Bloque nuevo con contenido mínimo de ejemplo; el editor lo completa. */
export function newBlock(type: SupportBlockType, existingIds: Iterable<string>): SupportBlock {
  const title = TITULO_NUEVO[type]
  const id = uniqueBlockId(BLOCK_TYPE_LABELS[type], existingIds)
  switch (type) {
    case 'image':
      return { id, type, title, url: '', description: '', kind: 'equipment', license: '', validated: false, source: '' }
    case 'compare':
      return { id, type, title, items: [] }
    case 'formula':
      return { id, type, title, expression: '' }
    case 'table':
      return { id, type, title, columns: ['Columna 1', 'Columna 2'], rows: [['', '']] }
    case 'text':
      return { id, type, title, body: '' }
    case 'case':
      return { id, type, title, name: '', facts: [''] }
    case 'diagram':
      return { id, type, title, kind: 'flow', nodes: [{ id: 'n1', label: 'Paso 1' }, { id: 'n2', label: 'Paso 2' }] }
    case 'simulator':
      // Plantilla con la nota de los cursos TP de CETEMIN (Reglamento, Art. 52.8).
      return {
        id, type, title: 'Tu nota', kind: 'weighted_sum',
        variables: [
          { id: 'cv', label: 'CV', weight: 10 }, { id: 'ep', label: 'EP', weight: 20 }, { id: 'ef', label: 'EF', weight: 20 },
          { id: 'tc1', label: 'TC1', weight: 25 }, { id: 'tc2', label: 'TC2', weight: 25 },
        ],
        scale: { min: 0, max: 20, pass: 13, round: 'half_up' },
        presets: [{ label: 'Ejemplo', values: { cv: 12, ep: 12, ef: 12, tc1: 14, tc2: 14 } }],
        allowOwnValues: true,
      }
  }
}

/**
 * Pasa las imágenes viejas (`teaching.images` / `image`) a bloques `image` con
 * el MISMO id que les da el adaptador, para que las citas guardadas sigan
 * valiendo. El editor deja de escribir `images` (spec §5.4).
 */
export function migrateLegacyImages(activity: Activity): Activity {
  const teaching = activity.teaching ?? { agent_instruction: '' }
  const tieneViejas = !!(teaching.images?.length || teaching.image?.url)
  if (!tieneViejas) return activity
  const resto = { ...teaching }
  delete resto.image
  delete resto.images
  return { ...activity, teaching: { ...resto, blocks: getActivityBlocks(activity) } }
}

/**
 * Convierte una entrada de `context.referencias` en un bloque:
 * - «Caso Rosa (…): dato; dato; dato» → caso con un hecho por oración o punto y coma.
 * - «Fragmento 1 — Título: «texto»» → texto con ese título.
 * - Cualquier otra → texto.
 */
export function referenceToBlock(ref: string, existingIds: Iterable<string>): SupportBlock {
  const limpio = ref.trim()
  const caso = limpio.match(/^Caso\s+([^:(]+?)\s*(?:\([^)]*\))?\s*:\s*([\s\S]+)$/i)
  if (caso) {
    const nombre = caso[1].trim().slice(0, 40)
    const hechos = caso[2]
      .split(/(?<=[.;])\s+|;\s*/)
      .map((h) => h.replace(/[.;]\s*$/, '').trim())
      .filter((h) => h.length > 0)
      .slice(0, 8)
      .map((h) => (h.length > 140 ? `${h.slice(0, 137)}…` : h))
    return {
      id: uniqueBlockId(`caso ${nombre}`, existingIds),
      type: 'case',
      title: `Caso: ${nombre}`.slice(0, 60),
      name: nombre,
      facts: hechos.length ? hechos : [caso[2].slice(0, 140)],
    }
  }
  const frag = limpio.match(/^([^:«]{3,80}?)\s*[:—-]\s*«([\s\S]+)»\s*$/)
  const titulo = (frag ? frag[1] : limpio.split(/[:.]/)[0]).replace(/^Fragmento\s+\d+\s*[—-]\s*/i, '').trim()
  const cuerpo = frag ? frag[2].trim() : limpio
  const tituloFinal = (titulo.length >= 3 ? titulo : 'Referencia').slice(0, 60)
  return {
    id: uniqueBlockId(tituloFinal, existingIds),
    type: 'text',
    title: tituloFinal,
    body: cuerpo,
    kind: 'fragment',
  }
}

const VACIAS = new Set(['para', 'como', 'esta', 'este', 'esto', 'entre', 'sobre', 'desde', 'hasta', 'cuando', 'donde', 'porque', 'tiene', 'trabajador', 'imagen', 'foto'])

/**
 * Palabras de un pie de foto que aparecen en la respuesta esperada. Un pie
 * como «Mal colocado» delata cuál es la foto correcta (spec §9.1, compare).
 */
export function captionLeaks(caption: string, mustInclude: string[]): string[] {
  const respuesta = quitarTildes(mustInclude.join(' ').toLowerCase())
  return quitarTildes(caption.toLowerCase())
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 4 && !VACIAS.has(w) && new RegExp(`\\b${w}`).test(respuesta))
}

const recortar = (v: unknown, max: number): string => {
  const s = v === undefined || v === null ? '' : String(v)
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

/**
 * Ajusta a los límites lo que el modelo suele pasarse (probado el 6 oct: celdas
 * de más de 60 caracteres, nombres largos, filas de ejemplo con otro formato).
 * Recortar con «…» deja el bloque a la vista del instructor para corregirlo,
 * en vez de perderlo. Devuelve el bloque y si hubo que tocarlo.
 */
function repararBloque(crudo: Record<string, unknown>): { bloque: Record<string, unknown>; reparado: boolean } {
  const antes = JSON.stringify(crudo)
  const b: Record<string, unknown> = { ...crudo }
  if (typeof b.title === 'string') b.title = recortar(b.title, 60)
  switch (b.type) {
    case 'case':
      b.name = recortar(b.name, 40)
      if (Array.isArray(b.facts)) b.facts = b.facts.slice(0, 8).map((f) => recortar(f, 140))
      if (b.question !== undefined) b.question = recortar(b.question, 200)
      break
    case 'table': {
      const cols = Array.isArray(b.columns) ? b.columns.slice(0, 6).map((c) => recortar(c, 60)) : []
      b.columns = cols
      if (Array.isArray(b.rows)) {
        b.rows = b.rows.slice(0, 20).map((r) => {
          const fila = Array.isArray(r) ? r.slice(0, cols.length).map((c) => recortar(c, 60)) : []
          while (fila.length < cols.length) fila.push('')
          return fila
        })
      }
      if (b.legend !== undefined) b.legend = recortar(b.legend, 200)
      break
    }
    case 'formula': {
      if (typeof b.expression === 'string') b.expression = recortar(b.expression, 200)
      if (Array.isArray(b.terms)) {
        b.terms = b.terms.slice(0, 8).map((t: Record<string, unknown>) => ({
          symbol: recortar(t?.symbol, 12),
          meaning: recortar(t?.meaning, 60),
          ...(t?.value !== undefined ? { value: recortar(t.value, 20) } : {}),
        }))
      }
      const ej = b.example as { label?: unknown; rows?: unknown; total?: unknown } | undefined
      if (ej) {
        const filas = Array.isArray(ej.rows)
          ? ej.rows.slice(0, 8).map((r: Record<string, unknown>) => ({
              term: recortar(r?.term, 20), value: recortar(r?.value, 20),
              weight: recortar(r?.weight, 20), result: typeof r?.result === 'string' || typeof r?.result === 'number' ? recortar(r.result, 20) : '',
            }))
          : []
        // Un ejemplo sin filas completas no sirve: se quita el ejemplo, no la fórmula.
        const completo = filas.length > 0 && filas.every((f) => f.term && f.value && f.result) && ej.total
        if (completo) b.example = { label: recortar(ej.label, 40), rows: filas, total: recortar(ej.total, 30) }
        else delete b.example
      }
      break
    }
    case 'diagram':
      if (Array.isArray(b.nodes)) {
        b.nodes = b.nodes.slice(0, 12).map((n: Record<string, unknown>, i: number) => ({
          id: recortar(n?.id ?? `n${i + 1}`, 30),
          label: recortar(n?.label, 40),
          ...(n?.note !== undefined ? { note: recortar(n.note, 80) } : {}),
        }))
      }
      break
  }
  return { bloque: b, reparado: JSON.stringify(b) !== antes }
}

/**
 * Limpia los bloques que propone el planner conversacional antes de validar la
 * estructura. Sin esto, un solo bloque mal formado hacía descartar TODAS las
 * actividades propuestas (la ruta salta el PANEL_DATA completo si no valida).
 * - Imagen y comparación se descartan: el modelo nunca inventa URLs; las
 *   imágenes van como `image_suggestions` y las sube el profesor (spec §9.2).
 * - Un bloque que no valida se descarta solo él.
 * - Un id repetido o inválido se reemplaza por uno único a partir del título.
 * - Máximo 6 por actividad.
 * Devuelve las actividades limpias y cuántos bloques se descartaron.
 */
export function sanitizeGeneratedBlocks(activities: unknown): { activities: unknown; dropped: number; reasons: string[] } {
  if (!Array.isArray(activities)) return { activities, dropped: 0, reasons: [] }
  const reasons: string[] = []
  const usados = new Set<string>()
  let dropped = 0
  const limpias = activities.map((a) => {
    const teaching = (a as { teaching?: { blocks?: unknown } })?.teaching
    if (!teaching || !Array.isArray(teaching.blocks)) return a
    const validos: SupportBlock[] = []
    for (const crudo of teaching.blocks) {
      const tipo = (crudo as { type?: string })?.type
      if (tipo === 'image' || tipo === 'compare' || validos.length >= 6) {
        dropped++
        reasons.push(`${tipo}: ${validos.length >= 6 ? 'más de 6 bloques' : 'el planner no propone imágenes'}`)
        continue
      }
      const { bloque: reparadoBloque, reparado } = repararBloque({ ...(crudo as Record<string, unknown>) })
      if (reparado) reasons.push(`${tipo} «${String(reparadoBloque.title ?? '')}»: ajustado a los límites (revisar en el editor)`)
      const conId = reparadoBloque as { id?: string; title?: string }
      if (!conId.id || !/^[a-z0-9][a-z0-9-]{1,59}$/.test(conId.id) || usados.has(conId.id)) {
        conId.id = uniqueBlockId(conId.title ?? tipo ?? 'bloque', usados)
      }
      // Contra el esquema de su tipo: la unión solo diría «Invalid input».
      const esquema = tipo && tipo in SupportBlockSchemaByType ? SupportBlockSchemaByType[tipo as keyof typeof SupportBlockSchemaByType] : SupportBlockSchema
      const r = esquema.safeParse(conId)
      if (!r.success) {
        dropped++
        reasons.push(`${tipo} «${conId.title ?? conId.id}»: ${r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`)
        continue
      }
      usados.add(r.data.id)
      validos.push(r.data as SupportBlock)
    }
    const resto: Record<string, unknown> = { ...teaching }
    delete resto.blocks
    return { ...(a as object), teaching: validos.length ? { ...resto, blocks: validos } : resto }
  })
  return { activities: limpias, dropped, reasons }
}

export interface BlockIssue {
  activityIndex: number
  blockIndex: number | null
  message: string
}

const CAMPOS: Record<string, string> = {
  title: 'título', id: 'id', url: 'imagen', description: 'descripción', license: 'licencia', source: 'fuente',
  kind: 'uso', markers: 'señalamientos', label: 'texto del señalamiento', items: 'imágenes', caption: 'pie',
  expression: 'expresión', terms: 'términos', symbol: 'símbolo', meaning: 'significado', example: 'ejemplo',
  rows: 'filas', columns: 'columnas', total: 'total', legend: 'leyenda', body: 'texto', name: 'nombre',
  facts: 'hechos', question: 'pregunta', nodes: 'pasos', edges: 'flechas',
}

/** Mensaje en español para un instructor: qué campo y qué falta. */
function mensajeEnEspanol(issue: { code: string; message: string; path: PropertyKey[]; minimum?: unknown; maximum?: unknown; origin?: string }): string {
  const campos = issue.path.filter((p): p is string => typeof p === 'string').map((p) => CAMPOS[p] ?? p)
  const campo = campos[campos.length - 1]
  const n = (v: unknown) => Number(v)
  const esLista = issue.origin === 'array'
  switch (issue.code) {
    case 'too_small':
      return esLista ? `${campo}: agrega al menos ${n(issue.minimum)}` : n(issue.minimum) <= 1 ? `${campo}: falta completarlo` : `${campo}: mínimo ${n(issue.minimum)} caracteres`
    case 'too_big':
      return esLista ? `${campo}: máximo ${n(issue.maximum)}` : `${campo}: máximo ${n(issue.maximum)} caracteres`
    case 'invalid_format':
      return campo === 'imagen' ? 'imagen: falta subirla o elegirla del banco' : `${campo}: formato no válido`
    case 'invalid_type':
      return `${campo}: falta completarlo`
    default:
      // Los mensajes propios del esquema (refine) ya están en español.
      return campo ? `${campo}: ${issue.message}` : issue.message
  }
}

/** Valida la lección entera con el mismo esquema que el servidor y ubica cada error. */
export function validateMaterial(activities: Activity[]): BlockIssue[] {
  const r = GeneratedStructureSchema.safeParse({ activities })
  if (r.success) return []
  return r.error.issues.flatMap((i) => {
    const [, act, , campo, blk] = i.path
    const activityIndex = typeof act === 'number' ? act : -1
    const blockIndex = campo === 'blocks' && typeof blk === 'number' ? blk : null
    // Error de la unión de tipos en la raíz del bloque: se valida contra el
    // esquema de su tipo para decir qué campo falla («Invalid input» no sirve).
    if (i.code === 'invalid_union' && blockIndex !== null && i.path.length === 5) {
      const bloque = activities[activityIndex]?.teaching.blocks?.[blockIndex]
      const esquema = bloque && SupportBlockSchemaByType[bloque.type]
      const detalle = esquema?.safeParse(bloque)
      if (detalle && !detalle.success) {
        return detalle.error.issues.map((d) => ({ activityIndex, blockIndex, message: mensajeEnEspanol(d as Parameters<typeof mensajeEnEspanol>[0]) }))
      }
    }
    return [{ activityIndex, blockIndex, message: mensajeEnEspanol(i as Parameters<typeof mensajeEnEspanol>[0]) }]
  })
}
