/**
 * Regla de nombres (14 oct 2026, decidida con Walther): desde el título de la
 * lección hasta el de cada actividad, el nombre dice LO QUE SE APRENDE, en tono
 * de sílabo. Antes los nombres eran códigos internos («EVA-NOTA · …»), frases
 * de motivación («Gana el TC») o personajes («Mario con fiebre»), y en el riel
 * de avance no sonaban serios.
 *
 * - Sustantivo o tema, no pregunta ni orden: «Justificación de inasistencias»,
 *   no «¿Cómo justifico?» ni «Justifica tu falta».
 * - Sin personajes ni situaciones: el caso va en `subtitle` («Caso Mario»).
 * - Sin códigos internos (EVA-NOTA, S1, LEC-MAN): el código vive en el slug.
 * - Mayúscula solo al inicio y en nombres propios (norma del español), sin
 *   punto final, de 2 a 8 palabras.
 *
 * El detector avisa, no bloquea: quien diseña decide.
 */

const CODIGO = /^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9-]{0,11}\s*[·—–:-]\s+/u
/** Primer verbo en imperativo de un pedido («Justifica…», «Identifica…»). */
const IMPERATIVO = /^(identifica|justifica|calcula|decide|elige|redacta|escribe|explica|analiza|aplica|reconoce|distingue|prioriza|ubica|define|compara|descubre|aprende|gana|organiza|construye|mapea|interpreta|usa|lee|resuelve|completa)\b/i
/** Palabras que no van con mayúscula en medio de un título en español. */
const MENORES = new Set(['a', 'al', 'ante', 'con', 'de', 'del', 'en', 'entre', 'la', 'las', 'el', 'los', 'o', 'para', 'por', 'sin', 'su', 'sus', 'tu', 'tus', 'un', 'una', 'y', 'e', 'que'])

export function revisarTitulo(titulo: string | undefined | null, opciones: { personajes?: string[] } = {}): string[] {
  const t = titulo?.trim() ?? ''
  if (!t) return []
  const avisos: string[] = []
  if (CODIGO.test(t)) avisos.push('Lleva un código interno al inicio: el código va en el identificador, no en el nombre.')
  if (/[¿?¡!]/.test(t)) avisos.push('Es una pregunta o una exclamación: el nombre dice el tema, sin signos.')
  const sinCodigo = t.replace(CODIGO, '')
  if (IMPERATIVO.test(sinCodigo)) avisos.push('Empieza con una orden («Justifica…»): usa el tema («Justificación de…»).')
  if (/\.$/.test(t)) avisos.push('Sin punto final.')
  const palabras = sinCodigo.split(/\s+/).filter(Boolean)
  if (palabras.length > 8) avisos.push('Más de 8 palabras: acórtalo al tema.')
  // Mayúsculas en medio del título (estilo inglés): «Sistema de Evaluación».
  const enMedio = palabras.slice(1).filter((p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]/.test(p) && !MENORES.has(p.toLowerCase()))
  if (enMedio.length >= 2) avisos.push('Mayúscula solo al inicio y en nombres propios: «Sistema de evaluación», no «Sistema de Evaluación».')
  const personaje = (opciones.personajes ?? []).find((n) => new RegExp(`\\b${n}\\b`, 'i').test(sinCodigo))
  if (personaje) avisos.push(`Nombra a un personaje («${personaje}»): el caso va en el subtítulo.`)
  return avisos
}

export interface AvisoDeTitulo {
  activityId: string | null
  texto: string
  motivos: string[]
}

type ActividadConNombre = { id: string; title?: string; subtitle?: string; teaching?: { blocks?: { type: string; name?: string }[] } }

/** Personajes de los casos del material: si aparecen en un título, va al subtítulo. */
function personajesDe(actividades: ActividadConNombre[]): string[] {
  return actividades
    .flatMap((a) => a.teaching?.blocks ?? [])
    .filter((b) => b.type === 'case' && b.name)
    .map((b) => (b.name as string).split(/[\s,]/)[0])
    .filter((n) => n.length >= 3)
}

/** Revisa el título de la lección y el de cada actividad. Las actividades sin título también avisan. */
export function avisosDeTitulos(tituloLeccion: string | null, actividades: ActividadConNombre[]): AvisoDeTitulo[] {
  const personajes = personajesDe(actividades)
  const avisos: AvisoDeTitulo[] = []
  if (tituloLeccion) {
    const m = revisarTitulo(tituloLeccion, { personajes })
    if (m.length) avisos.push({ activityId: null, texto: tituloLeccion, motivos: m })
  }
  for (const a of actividades) {
    if (!a.title?.trim()) {
      avisos.push({ activityId: a.id, texto: '', motivos: ['Sin nombre: el alumno verá «Actividad N».'] })
      continue
    }
    const m = revisarTitulo(a.title, { personajes })
    if (m.length) avisos.push({ activityId: a.id, texto: a.title, motivos: m })
  }
  return avisos
}

/** Nombre de la actividad para el alumno; sin título, «Actividad N». */
export function nombreDeActividad(actividad: { title?: string } | null | undefined, indice: number): string {
  return actividad?.title?.trim() || `Actividad ${indice + 1}`
}
