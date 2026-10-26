/**
 * ¿Sophia desglosa la respuesta o la actividad se cierra?
 *
 * Los turnos de una actividad son sus intentos más sus desgloses: el tope
 * (`max_attempts`) cuida el tiempo de la clase y un desglose también lo gasta.
 * El contador de intentos que usa la nota NO suma desgloses (no se castiga a
 * quien aprende por partes); eso lo decide la ruta, no esta función.
 *
 * Clase de SI A (26 oct 2026): en una actividad con nota de 2 intentos, Gianny
 * respondió tres veces y las tres se desglosaron; los intentos seguían en 0 y
 * Sophia reformulaba la misma pregunta. El arreglo de la mañana (clase de
 * Rosario) contaba los desgloses solo en pasos sin nota.
 */
export type DecisionDeDesglose =
  /** Sophia desglosa con una sub-pregunta; no cuenta intento. */
  | 'desglosa'
  /** Se acabaron los desgloses del tipo: avanza con el nivel que alcanzó. */
  | 'tope-de-desglose'
  /** Este turno agota los intentos: no se desglosa y cierra por límite. */
  | 'tope-de-intentos'

export function turnosPrevios(intentos: number, desgloses: number): number {
  return intentos + desgloses
}

export function decidirDesglose(p: {
  intentos: number
  desgloses: number
  topeDeDesgloses: number
  topeDeIntentos: number
  /** Sin nota, el tope de intentos cierra como antes por el camino del tope de desglose. */
  sinNota: boolean
}): DecisionDeDesglose {
  const agotaIntentos = turnosPrevios(p.intentos, p.desgloses) + 1 >= p.topeDeIntentos
  if (p.desgloses < p.topeDeDesgloses && !agotaIntentos) return 'desglosa'
  if (p.desgloses >= p.topeDeDesgloses || p.sinNota) return 'tope-de-desglose'
  return 'tope-de-intentos'
}
