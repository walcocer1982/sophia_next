/**
 * ¿La respuesta de Sophia plantea la pregunta de la actividad siguiente?
 * Sophia parafrasea, así que no se exige el texto literal: basta con que
 * aparezca un tercio de las palabras con contenido de la pregunta, y nunca
 * menos de dos. 14 oct 2026: con una pregunta de solo tres palabras largas
 * («ecualizador», «panel», «crees»), un «¿qué crees que deberías hacer?» sobre
 * la actividad anterior contó como planteada: el puntero avanzó y la
 * conversación se quedó atrás, bajo el título de la actividad siguiente.
 */
export function planteaLaPregunta(respuesta: string, pregunta: string): boolean {
  const normalizar = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ')
  const palabras = [...new Set(normalizar(pregunta).split(/\s+/).filter((w) => w.length >= 5))]
  if (palabras.length === 0) return true
  const texto = normalizar(respuesta)
  const presentes = palabras.filter((w) => texto.includes(w)).length
  const necesarias = Math.max(Math.min(2, palabras.length), Math.ceil(palabras.length / 3))
  return presentes >= necesarias
}
