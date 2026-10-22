/**
 * Subrayar (20 oct 2026): en un bloque de texto marcado `subrayable`, el
 * alumno toca las líneas que respaldan su respuesta. Es *Orquestar la lectura*
 * (Lemov): no se le pide «lee», se le pide encontrar dónde lo dice. Un toque
 * no se dicta mal como una cifra («1,20 m» → «metro 20»).
 *
 * El estado vive en el navegador (material-context.tsx), viaja con cada
 * mensaje y aquí se valida contra la lección. Sophia y el verificador reciben
 * el TEXTO de lo subrayado. Independiente del tema: las líneas las pone la lección.
 */
import type { SupportBlock, TextBlock } from '@/types/lesson'

export interface SubrayadoState {
  /** Índices de las líneas subrayadas (ver `lineasDelTexto`), en orden. */
  lineas: number[]
}

export const sinSubrayar = (): SubrayadoState => ({ lineas: [] })

/** Las líneas tocables de un texto: cada línea no vacía (un punto de una lista, un párrafo). */
export function lineasDelTexto(body: string): string[] {
  return body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}

/** Una línea sin marcas de lista ni negritas: lo que se le pasa a Sophia y al verificador. */
export function textoPlano(linea: string): string {
  return linea.replace(/^(\d+[.)]|[-*•])\s+/, '').replace(/\*\*/g, '').trim()
}

export function sanitizeSubrayado(b: TextBlock, crudo: unknown): SubrayadoState | null {
  if (!crudo || typeof crudo !== 'object') return null
  const lineas = (crudo as { lineas?: unknown }).lineas
  if (!Array.isArray(lineas)) return null
  const total = lineasDelTexto(b.body).length
  const validas = [...new Set(lineas.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < total))].sort((a, z) => a - z)
  return { lineas: validas }
}

export function alternar(s: SubrayadoState, n: number): SubrayadoState {
  const set = new Set(s.lineas)
  if (set.has(n)) set.delete(n)
  else set.add(n)
  return { lineas: [...set].sort((a, z) => a - z) }
}

const subrayadas = (b: TextBlock, s: SubrayadoState) => {
  const lineas = lineasDelTexto(b.body)
  return s.lineas.map((n) => textoPlano(lineas[n] ?? '')).filter(Boolean)
}

/** Lo que Sophia ve del texto en este turno. */
export function describeSubrayadoForPrompt(b: TextBlock, s: SubrayadoState): string {
  const marcadas = subrayadas(b, s)
  if (!marcadas.length) {
    return `«${b.title}»: todavía no subrayó nada. Si tu pregunta pide justificar con el material, pídele que toque en ese texto la línea que respalda su respuesta.`
  }
  const resultado = evaluarSubrayado(b, s)
  const juicio =
    resultado === 'respalda'
      ? ' Esa línea SÍ respalda la respuesta de esta actividad.'
      : resultado === 'no_respalda'
        ? ' Esa línea NO respalda la respuesta de esta actividad. No le digas cuál la respalda, de qué habla ni qué palabra buscar: la encuentra él.'
        : ''
  return `«${b.title}»: subrayó ${marcadas.map((t) => `«${t}»`).join(' · ')}.${juicio}
  Cómo usarlo: si lo subrayado respalda su respuesta, reconócelo en una frase y sigue con lo que indique el estado (no le pidas otra línea); si no la respalda, pregúntale por qué eligió esa línea, sin decirle cuál era.`
}

/** Lo que el verificador recibe junto con el mensaje. */
export function describeSubrayadoForVerifier(b: TextBlock, s: SubrayadoState): string | null {
  const marcadas = subrayadas(b, s)
  if (!marcadas.length) return null
  return `En la pizarra, el estudiante subrayó en «${b.title}» (es la evidencia que eligió del material; cuenta como su cita, pero la aplicación al caso la tiene que decir él): ${marcadas.map((t) => `«${t}»`).join('; ')}.`
}

/** Lo subrayado, como se guarda en el mensaje del alumno y se muestra en la conversación. */
export interface SubrayadoGuardado {
  blockId: string
  titulo: string
  lineas: string[]
  /** Si la lección declara la línea que respalda: lo decidió el código al recibir el mensaje. */
  resultado?: 'respalda' | 'no_respalda'
  /** Tras el segundo intento fallido, la línea que respaldaba (se muestra en la pizarra). */
  revelada?: string[]
  /** De lo subrayado, solo las líneas que respaldan: las únicas que se pintan de verde. */
  respaldan?: string[]
}

export function paraGuardar(b: TextBlock, s: SubrayadoState, extra: Pick<SubrayadoGuardado, 'resultado' | 'revelada' | 'respaldan'> = {}): SubrayadoGuardado | null {
  const lineas = subrayadas(b, s)
  return lineas.length ? { blockId: b.id, titulo: b.title, lineas, ...extra } : null
}

// ── La línea que respalda (21 oct 2026) ─────────────────────────────────
// La lección declara en `lineasClave` qué línea respalda la respuesta de la
// actividad. Sin eso, Sophia dijo «Correcto» a quien subrayó la línea de
// minería para un caso de obra: el texto escrito estaba bien y nadie miró el
// subrayado.

export type ResultadoSubrayado = 'sin_subrayar' | 'sin_clave' | 'respalda' | 'no_respalda'

/**
 * Respalda si marcó al menos una línea clave y no marcó de más (a lo sumo una
 * línea extra): subrayar todo no cuenta.
 */
export function evaluarSubrayado(b: TextBlock, s: SubrayadoState): ResultadoSubrayado {
  if (!s.lineas.length) return 'sin_subrayar'
  const clave = b.lineasClave ?? []
  if (!clave.length) return 'sin_clave'
  const acierta = s.lineas.some((n) => clave.includes(n))
  return acierta && s.lineas.length <= clave.length + 1 ? 'respalda' : 'no_respalda'
}

/** De lo subrayado, las líneas que están entre las que respaldan. */
export function subrayadasQueRespaldan(b: TextBlock, s: SubrayadoState): string[] {
  const lineas = lineasDelTexto(b.body)
  const clave = b.lineasClave ?? []
  return s.lineas.filter((n) => clave.includes(n)).map((n) => textoPlano(lineas[n] ?? '')).filter(Boolean)
}

export function lineasClaveTexto(b: TextBlock): string[] {
  const lineas = lineasDelTexto(b.body)
  return (b.lineasClave ?? []).map((n) => textoPlano(lineas[n] ?? '')).filter(Boolean)
}

/** El navegador nunca recibe la clave: se vería con las herramientas del navegador. */
export function ocultarClaves<T extends SupportBlock>(bloques: T[]): T[] {
  return bloques.map((b) => {
    if (b.type !== 'text' || !b.lineasClave) return b
    const { lineasClave: _oculta, ...resto } = b
    void _oculta
    return resto as T
  })
}

/**
 * Turno de revisar el subrayado: la respuesta escrita aprobó, pero la línea
 * subrayada no la respalda. Primera vez: no avanza ni cuenta intento. El
 * mensaje lo escribe el código, sin modelo (21 oct 2026): cuando lo escribía
 * Sophia, insinuaba la línea correcta («busca la que habla de electricidad»)
 * aunque la guía se lo prohibía. En la pizarra la línea vibra y se pone roja.
 */
export function mensajeRevisarSubrayado(b: TextBlock): string {
  return `Esa línea no respalda tu respuesta. Inténtalo de nuevo: toca en «${b.title}» la línea que sí la respalda.`
}

/** Segundo subrayado equivocado: se muestra la línea que respaldaba y se sigue. */
export function guiaRevelarSubrayado(b: TextBlock): string {
  const clave = lineasClaveTexto(b).map((t) => `«${t}»`).join(' y ')
  return `SUBRAYADO: por segunda vez subrayó una línea que no respalda su respuesta. Tu PRIMERA oración es exactamente: "Tu respuesta va bien, pero la línea que la respalda es ${clave}." Nada más sobre esa línea: ya está marcada en verde en la pizarra. PROHIBIDO empezar con "Correcto", "Exacto", "Perfecto" o "Bien": se leería como si el subrayado estuviera bien. Después pasa DIRECTO a la siguiente actividad, como indica la transición: no vuelvas a explicar ni a preguntar esta actividad.`
}

/** Lee lo guardado en `Message.material` sin confiar en su forma. */
export function leerSubrayadoGuardado(material: unknown): SubrayadoGuardado[] {
  const lista = (material as { subrayado?: unknown } | null)?.subrayado
  if (!Array.isArray(lista)) return []
  return lista.filter(
    (x): x is SubrayadoGuardado =>
      !!x && typeof x === 'object' && typeof x.titulo === 'string' && Array.isArray(x.lineas) && x.lineas.every((l: unknown) => typeof l === 'string'),
  )
}

/**
 * Turno de subrayar (investigacion/turno-de-subrayar-2026-10-20.md): el alumno
 * respondió sin subrayar en una actividad que lo pide. El código no evalúa ni
 * cuenta intento, y el mensaje lo escribe él, sin modelo (21 oct 2026): con una
 * guía, Sophia igual decía «Exacto», insinuaba la línea («la que respalda por
 * qué cambia según el rubro») o pasaba a otro tema con una pregunta inventada.
 */
export function mensajeTurnoDeSubrayar(titulos: string[]): string {
  const donde = titulos.map((t) => `«${t}»`).join(' o ')
  // Prueba de Edwin (21 oct 2026): «Anoto tu respuesta» se leía como si la respuesta
  // no hubiera llegado, y volvía a dictarla. Ahora dice que quedó y que no se escribe más.
  return `${PEDIDO_SUBRAYAR} toca en ${donde}, en la pizarra, la línea que respalda tu respuesta. No hace falta escribir de nuevo: se revisa apenas la tocas.`
}

/**
 * Si vuelve a escribir sin tocar la línea, se le recuerda UNA vez, sin evaluar
 * lo que escribió. A la segunda, se sigue y queda «lectura no comprobada».
 */
export function mensajeRecordatorioSubrayado(titulos: string[]): string {
  const donde = titulos.map((t) => `«${t}»`).join(' o ')
  return `${RECORDATORIO_SUBRAYAR} toca en ${donde} la línea que respalda tu respuesta; está marcada en la pizarra. Tu respuesta ya quedó guardada.`
}

const PEDIDO_SUBRAYAR = 'Tu respuesta quedó guardada. Falta un paso:'
const RECORDATORIO_SUBRAYAR = 'Todavía falta tocar la línea:'

/**
 * ¿Este mensaje de Sophia pide tocar una línea? Devuelve los ids de los textos
 * que nombra. Los dos mensajes los escribe el código, así que se reconocen por
 * su comienzo: la pantalla ilumina el texto aunque el alumno recargue la página.
 */
export function textosPedidosEn(mensaje: string, bloques: { id: string; title: string; type: string }[]): string[] {
  const t = mensaje.trimStart()
  if (!t.startsWith(PEDIDO_SUBRAYAR) && !t.startsWith(RECORDATORIO_SUBRAYAR)) return []
  return bloques.filter((b) => b.type === 'text' && t.includes(`«${b.title}»`)).map((b) => b.id)
}

/**
 * Qué textos siguen pendientes de tocar, y por qué (21 oct 2026, prueba de
 * Walther): el pedido de Sophia sin línea marcada, o una última revisión «no
 * respalda» sin línea revelada, en la actividad actual. Con una línea
 * equivocada, el aviso desaparecía y el alumno no sabía dónde tocar.
 */
export function pendientesDeSubrayar(args: {
  ultimoMensajeDeSophia: string | null
  bloques: { id: string; title: string; type: string; activityId?: string }[]
  subrayados: Record<string, SubrayadoState | undefined>
  revisados: Record<string, Pick<SubrayadoGuardado, 'blockId' | 'resultado' | 'revelada'> | undefined>
  actividadActual: string | null
}): { ids: string[]; motivo: 'pedido' | 'equivocada' | null } {
  const { ultimoMensajeDeSophia, bloques, subrayados, revisados, actividadActual } = args
  const porPedido = ultimoMensajeDeSophia
    ? textosPedidosEn(ultimoMensajeDeSophia, bloques).filter((id) => !subrayados[id]?.lineas.length)
    : []
  const porRevision = Object.values(revisados)
    .filter((r): r is NonNullable<typeof r> => !!r && r.resultado === 'no_respalda' && !r.revelada?.length)
    .filter((r) => bloques.find((b) => b.id === r.blockId)?.activityId === actividadActual)
    .map((r) => r.blockId)
  const ids = [...new Set([...porRevision, ...porPedido])]
  return { ids, motivo: ids.length ? (porRevision.length ? 'equivocada' : 'pedido') : null }
}

// ── ¿Hay que volver a revisar lo subrayado? (21 oct 2026, prueba de Maritza) ──
// Solo lo que cambió desde la última vez, salvo un caso: el alumno toca OTRA VEZ
// la misma línea equivocada (un «listo» sin respuesta nueva). Antes el servidor
// no respondía nada y la línea quedaba en gris «en revisión» para siempre.

export interface UltimoSubrayado {
  /** Las líneas guardadas la última vez, unidas con «|». */
  lineas: string
  resultado?: string
  revelada: boolean
}

export function esRepeticionEquivocada(lineasAhora: string, ultimo: UltimoSubrayado | undefined, esToque: boolean): boolean {
  return esToque && !!lineasAhora && !!ultimo && lineasAhora === ultimo.lineas && ultimo.resultado === 'no_respalda' && !ultimo.revelada
}

export function hayQueRevisarSubrayado(lineasAhora: string, ultimo: UltimoSubrayado | undefined, esToque: boolean): boolean {
  if (!lineasAhora) return false
  return lineasAhora !== ultimo?.lineas || esRepeticionEquivocada(lineasAhora, ultimo, esToque)
}

/**
 * La línea que tocó respalda su respuesta (21 oct 2026). Con dos «inténtalo
 * de nuevo» en la historia, Sophia trataba la línea correcta como otra
 * equivocada («Mira bien el texto… ¿cuál es esa línea?»). La primera oración
 * la fija el código; lo que sigue depende de si la respuesta escrita aprobó.
 */
export function guiaLineaCorrecta(aprobo: boolean): string {
  return `SUBRAYADO CORRECTO: la línea que acaba de tocar SÍ respalda su respuesta. Tu PRIMERA oración es exactamente: "Esa es la línea." ⛔ PROHIBIDO pedirle otra línea, decirle que mire el texto de nuevo o preguntarle cuál es la línea: ya la encontró. ${
    aprobo
      ? 'Después haz la transición a la siguiente actividad, como indica el estado.'
      : 'Después pide SOLO lo que falta de su respuesta escrita (lo que dice «Lo que falta por cubrir»), sin dar la razón tú ni repetir la línea.'
  }`
}
