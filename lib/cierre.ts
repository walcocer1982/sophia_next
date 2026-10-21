/**
 * El resumen con que cierra la lección lo escribe el código, con los puntos
 * clave literales de la lección (21 oct 2026). Escrito por Sophia, mezclaba
 * datos en las tres simulaciones de ese día («a cualquier altura si hay riesgo
 * de caída a distinto nivel», «equipos peligrosos») aunque el prompt le pedía
 * usar las mismas palabras: lo último que lee el alumno no puede enseñar algo
 * falso. Independiente del tema: los puntos los pone la lección.
 */
export function resumenDeCierre(puntosClave: string[]): string {
  const puntos = puntosClave.map((p) => p.trim()).filter(Boolean)
  return `Hoy trabajamos:\n${puntos.map((p) => `- ${p}`).join('\n')}\n\nGracias por participar.`
}
