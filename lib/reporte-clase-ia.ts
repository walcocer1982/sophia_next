/**
 * La parte redactada del reporte de la clase (22 oct 2026). El código ya eligió
 * QUÉ reforzar (`reporteDeClase`); el modelo solo escribe CÓMO abordarlo en los
 * 15 minutos, con el material de la propia sesión como único insumo. En el
 * ejemplo del 22 oct, sin ese material inventó «minería (variable)», «RNE» y
 * «PETAR», que no estaban en la clase.
 */
import { anthropic, DEFAULT_MODEL } from '@/lib/anthropic'
import { logger } from '@/lib/logger'
import { getActivityBlocks } from '@/lib/support-blocks'
import type { ReporteClase } from '@/lib/reporte-clase'
import type { Activity } from '@/types/lesson'

const cache = new Map<string, { texto: string; en: Date }>()
const VIGENCIA_MS = 30 * 60_000

function huella(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return h.toString(16)
}

/** Normas, casos y láminas de la sesión: lo único que el modelo puede citar. */
export function materialDeLaSesion(actividades: Activity[]): string {
  const partes: string[] = []
  const vistos = new Set<string>()
  actividades.forEach((a, i) => {
    for (const b of getActivityBlocks(a)) {
      if (vistos.has(b.id)) continue
      vistos.add(b.id)
      if (b.type === 'text') partes.push(`[Act ${i + 1}] TEXTO «${b.title}»:\n${b.body}`)
      else if (b.type === 'case') partes.push(`[Act ${i + 1}] CASO «${b.title}»: ${b.name}. ${b.facts.join(' · ')}`)
      else if (b.type === 'image') partes.push(`[Act ${i + 1}] LÁMINA «${b.title}»: ${b.description}`)
    }
    const q = a.verification?.question?.trim()
    if (q) partes.push(`[Act ${i + 1}] PREGUNTA: ${q}`)
  })
  return partes.join('\n\n')
}

export const SIN_REFUERZO = 'Ningún criterio falló en más de un alumno. Lo individual está en «A quién mirar».'

export async function redactarRefuerzo(input: {
  sesion: string
  actividades: Activity[]
  clase: ReporteClase
  fresco?: boolean
}): Promise<{ texto: string; generadoEn: Date; desdeCache: boolean }> {
  const { sesion, actividades, clase } = input
  if (clase.queReforzar.length === 0) return { texto: SIN_REFUERZO, generadoEn: new Date(), desdeCache: false }

  const datos = {
    sesion,
    entraron: clase.resumen.entraron,
    queReforzar: clase.queReforzar.map((c) => ({
      puntoClave: c.puntoClave,
      actividad: `Act ${c.actividadIndice} · ${c.actividadTitulo}`,
      criterio: c.criterio,
      fallaron: c.alumnos.length,
      llegaron: c.llegaron,
      respuestasLiterales: c.alumnos.map((a) => a.cita).filter(Boolean).slice(0, 4),
    })),
  }
  const clave = huella(JSON.stringify(datos))
  const previo = cache.get(clave)
  if (previo && !input.fresco && Date.now() - previo.en.getTime() < VIGENCIA_MS) {
    return { texto: previo.texto, generadoEn: previo.en, desdeCache: true }
  }

  const system = [
    'Eres el asistente pedagógico del instructor de un instituto técnico peruano (CETEMIN). Terminó el bloque de 45 minutos con la tutora de IA y el instructor tiene 15 minutos para aclarar antes del trabajo en equipo. Escribes para él, en español peruano formal, con vocabulario de evaluación (criterio, punto clave, nivel de logro).',
    'REGLAS DURAS: (1) Los criterios a reforzar ya están elegidos y vienen en QUE_REFORZAR; no agregues otros ni cambies el orden. (2) Solo puedes citar normas, cifras, casos y ejemplos que aparezcan en MATERIAL_DE_LA_SESION; si algo no está ahí, no lo digas. (3) Cita literalmente las respuestas de los alumnos para mostrar la confusión, sin nombrarlos. (4) No evalúes ni califiques: los niveles ya están calculados. (5) Sin saludos, sin felicitaciones, sin relleno.',
    'FORMATO (Markdown, nada más que esto): por cada criterio de QUE_REFORZAR, un bloque con el título «### Reforzar: <punto clave>» y tres partes cortas: **Qué confunden** (una o dos oraciones con una cita literal), **Cómo abordarlo en 3 a 5 minutos** (una pregunta para la sala y un ejemplo del mismo rubro tomado del material, o una variación mínima de uno del material) y **Para comprobar** (una pregunta de salida de una línea). Al final, «### Para abrir los 15 minutos» con una sola pregunta que conecte lo que más falló.',
  ].join('\n')

  const res = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1100,
    system,
    messages: [
      {
        role: 'user',
        content: `QUE_REFORZAR (JSON):\n${JSON.stringify(datos, null, 1)}\n\nMATERIAL_DE_LA_SESION:\n${materialDeLaSesion(actividades)}`,
      },
    ],
  })
  const texto = res.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim()
  const en = new Date()
  cache.set(clave, { texto, en })
  logger.info('reporte_clase.redactado', { sesion, criterios: clase.queReforzar.length, tokens: res.usage?.output_tokens })
  return { texto, generadoEn: en, desdeCache: false }
}
