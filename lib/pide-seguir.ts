/**
 * ¿El alumno pide seguir («¿podemos continuar?», «¿por qué no respondes?»), en
 * vez de responder?
 *
 * Pruebas de Maritza (24 oct 2026, SI-ALTORIESGO) y clase de Rosario (26 oct,
 * S0 de tutoría): la pregunta de Sophia no se vio o no se entendió que esperaba
 * respuesta, y el alumno escribió «continua», «agora?», «Sophía podemos
 * continuar?». Cada uno se evaluó como respuesta: gastó un intento o un turno de
 * desglose, cerró la actividad por tope y en la S0 dejó pasar la actividad 3 con
 * una respuesta de la 2. Ahora no se evalúa ni cuenta intento: el código repite
 * lo que Sophia pidió, con un mensaje fijo.
 *
 * Solo mensajes cortos y sobre la conversación misma; una respuesta que empieza
 * con «sigue…» («sigue trabajando sin arnés») tiene más palabras y no entra.
 * «continuar» o «listo» solos son continuaciones (CONTINUATION_REGEX en la ruta):
 * los manda el navegador al tocar una línea y se verifican como siempre.
 */
import { separarPedido } from '@/lib/cuaderno'
import { stripMarkers } from '@/lib/material-markers'

const MAX_PALABRAS = 10

const PIDE_SEGUIR = [
  // «¿podemos continuar?», «cómo avanzo», «quiero pasar»
  /\b(podemos|puedo|se puede|vamos a|quiero|como)\s+(continuar|seguir|avanzar|pasar)\b/,
  // «continua», «y ahora aquí continúa», «que sigue», «sigamos por favor»
  /^(y\s+)?(ahora\s+)?(aqui\s+)?(que\s+)?(continua|continue|continuo|sigue|sigo|sigamos|siga|seguimos|continuamos|avanza|avancemos|pasemos)(\s+(por favor|porfa))?$/,
  // «¿por qué no respondes?», «por que nmo respondes?» (con la errata), «no me contestas»
  /\bpor\s*que\s+(\w{1,4}\s+)?(me\s+)?(respondes|contestas|responde|contesta|avanza|avanzas|sigue|sigues|continua|continuas)\b/,
  /\bno\s+(me\s+)?(respondes|contestas|responde|contesta)\b/,
  // «no sale la actividad 3», «no avanza», «no me deja avanzar»
  /^no\s+(me\s+)?(avanza|continua|sigue|pasa|carga|sale|aparece|deja avanzar|deja seguir)(\s+(nada|la actividad( \d+)?|la pregunta|la siguiente( actividad)?|el texto|el caso|la respuesta|tu respuesta|la pagina))?$/,
  // «agora?», «y ahora?», «hola?»
  /^(y\s+)?(ahora|agora|entonces|hola|alo)$/,
  // «ahora que paso?», «y ahora qué hago»
  /^(y\s+)?(ahora\s+)?(que|q)\s+(paso|pasa|sigue|hago|hago ahora|toca)$/,
  // «¿sigues ahí?»
  /\b(sigues|estas)\s+ahi\b/,
]

function normalizar(mensaje: string): string {
  return mensaje
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:…"«»()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // El nombre al comienzo: «Sophía podemos continuar?»
    .replace(/^(sophia|sofia|profe|profesora|miss)\s+/, '')
}

export function pideSeguir(mensaje: string): boolean {
  const t = normalizar(mensaje)
  if (!t || t.split(' ').length > MAX_PALABRAS) return false
  return PIDE_SEGUIR.some((re) => re.test(t))
}

/**
 * La respuesta fija: lo último que Sophia pidió, tal cual. Si su último mensaje
 * no pide nada, la pregunta de la actividad.
 */
export function mensajePideSeguir(ultimoDeSophia: string, preguntaDeLaActividad: string): string {
  const pedido = separarPedido(stripMarkers(ultimoDeSophia ?? '')).pedido ?? preguntaDeLaActividad.trim()
  const intro = pedido.includes('?')
    ? 'Sigo aquí. Para avanzar necesito tu respuesta a esta pregunta:'
    : 'Sigo aquí. Para avanzar falta este paso:'
  return `${intro}\n\n${pedido}`
}
