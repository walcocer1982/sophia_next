/**
 * Detector de hallucinations típicas de Whisper / transcripciones de voz.
 *
 * Se activa cuando el estudiante usa modo voz y la transcripción captura
 * ruido del entorno como si fueran palabras. Ejemplos reales observados:
 *   "ADRIAN PORDA ALFARONE ALFARONE"
 *   "Bienvenidos a Communication Labs もしくはコネクタイヤ..."
 *   "Nivel de tiempo de flotaciónashingo translation input pain Dan..."
 *
 * El detector es CONSERVADOR: prefiere falsos negativos (dejar pasar texto
 * dudoso) a falsos positivos (rechazar respuestas legítimas). Solo marca
 * como hallucination cuando hay evidencia clara: idiomas mezclados, cadenas
 * sin sentido, o sustantivos propios random.
 *
 * Devuelve { isHallucination, reason } para que el caller decida qué hacer
 * (saltar verificación, no contar como intento, etc).
 */

export interface HallucinationCheck {
  isHallucination: boolean
  reason?: string
}

const NON_LATIN_RE = /[぀-ゟ゠-ヿ一-鿿Ѐ-ӿ؀-ۿ가-힯]/
// Palabras comunes en inglés/otros idiomas que NO suelen aparecer en respuestas
// españolas auténticas sobre minería / temas técnicos en español.
const FOREIGN_WORD_RE = /\b(input|output|labs?|labs|members|certificate|cognition|translation|assignment|welcoming|module|content|copyright|subscribe|notification|video|channel|youtube|thanks|watching)\b/i
// Patrones de "tarjetas de presentación" hallucinated.
const NAME_SOUP_RE = /^[A-ZÁÉÍÓÚÑ\s]{15,}$/  // todo mayúsculas largo (15+ chars sin minúscula)

export function detectHallucination(message: string): HallucinationCheck {
  const trimmed = message.trim()
  if (!trimmed) return { isHallucination: false }

  // Mensajes muy cortos (<5 chars) no se evalúan — pueden ser "sí", "ok", etc.
  if (trimmed.length < 5) return { isHallucination: false }

  // 1) Idioma no-latino mezclado en respuesta supuestamente en español
  if (NON_LATIN_RE.test(trimmed)) {
    return { isHallucination: true, reason: 'mezcla de caracteres no-latinos (chino/japonés/cirílico/árabe)' }
  }

  // 2) Sopa de mayúsculas (típico de Whisper transcribiendo nombres random)
  if (NAME_SOUP_RE.test(trimmed)) {
    return { isHallucination: true, reason: 'cadena larga sin minúsculas (probable transcripción de ruido como nombres)' }
  }

  // 3) Conteo de palabras inglesas/foráneas en un texto largo en español
  const foreignMatches = trimmed.match(new RegExp(FOREIGN_WORD_RE, 'gi')) || []
  if (foreignMatches.length >= 3) {
    return { isHallucination: true, reason: `${foreignMatches.length} palabras foráneas en texto en español` }
  }

  // 4) Ratio de caracteres latinos: si <40% son letras latinas y el mensaje
  //    es largo (>30 chars), es ruido.
  if (trimmed.length > 30) {
    const latinChars = (trimmed.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/g) || []).length
    const ratio = latinChars / trimmed.length
    if (ratio < 0.4) {
      return { isHallucination: true, reason: `solo ${Math.round(ratio * 100)}% de caracteres latinos (mucho ruido)` }
    }
  }

  return { isHallucination: false }
}
