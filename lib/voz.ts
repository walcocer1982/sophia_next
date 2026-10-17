/**
 * Voz de Sophia con lo que trae el navegador (14 oct 2026): la voz de OpenAI
 * (transcripción en tiempo real y texto a voz) se retiró por decisión de
 * Walther, para no gastar más en OpenAI. Leer en voz alta usa
 * `speechSynthesis` y dictar usa el reconocimiento de voz del navegador: los
 * dos son gratis. Aquí, lo que no depende del navegador: qué texto se lee y
 * qué voz se elige.
 */
import { stripMarkers } from './material-markers'

/** El texto de Sophia listo para leer: sin marcadores del panel ni markdown, en oraciones. */
export function textoParaLeer(markdown: string): string[] {
  const plano = stripMarkers(markdown)
    .replace(/^\|.*\|$/gm, '') // tablas: no se leen («mira la tabla»)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*([A-E])\)\s+/gm, '$1: ') // alternativas: «A: …»
    .replace(/→/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plano) return []
  // Oraciones de hasta ~200 caracteres: Chrome corta las lecturas largas a los 15 s.
  const oraciones = plano.match(/[^.!?…]+[.!?…]+["»”)]*|[^.!?…]+$/g) ?? [plano]
  const trozos: string[] = []
  for (const o of oraciones.map((s) => s.trim()).filter(Boolean)) {
    const ultimo = trozos.at(-1)
    if (ultimo && ultimo.length + o.length < 200) trozos[trozos.length - 1] = `${ultimo} ${o}`
    else trozos.push(o)
  }
  return trozos
}

type VozMinima = { name: string; lang: string; localService?: boolean }

/**
 * La mejor voz en español disponible: primero Perú y Latinoamérica, después
 * España; dentro de cada idioma, las «naturales» (Edge, Google) antes que las
 * básicas del sistema.
 */
export function elegirVoz<V extends VozMinima>(voces: V[]): V | null {
  const idioma = (v: VozMinima) => v.lang.toLowerCase().replace('_', '-')
  const enEspanol = voces.filter((v) => idioma(v).startsWith('es'))
  if (!enEspanol.length) return null
  const puntaje = (v: VozMinima) => {
    const l = idioma(v)
    const n = v.name.toLowerCase()
    let p = 0
    if (l === 'es-pe') p += 50
    else if (['es-419', 'es-mx', 'es-us', 'es-co', 'es-cl', 'es-ar'].includes(l)) p += 40
    else if (l === 'es-es') p += 20
    if (/natural|online|neural/.test(n)) p += 30
    else if (/google/.test(n)) p += 20
    if (/sabina|dalia|camila|paloma|elena|helena|monica|mónica|paulina/.test(n)) p += 5
    return p
  }
  return [...enEspanol].sort((a, b) => puntaje(b) - puntaje(a))[0]
}
