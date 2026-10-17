/**
 * Lógica de la vista «Cuaderno» de /learn (14 oct 2026): la conversación se
 * lee como una hoja de trabajo, una sección por actividad. El material va en
 * la Pizarra (components/learning/pizarra.tsx). Funciones puras: qué mensaje
 * va en qué sección y qué parte del mensaje es el pedido.
 * Diseño: investigacion/design-leccion/propuestas-ui.html (propuesta B).
 */

type ConActividad = { activityId?: string | null }

/**
 * Agrupa los mensajes por actividad, en el orden de la lección. Un mensaje sin
 * actividad (la bienvenida se guarda sin ella) va con el mensaje siguiente que
 * sí la tenga; si no hay ninguno después, con la actividad actual.
 */
export function agruparPorActividad<M extends ConActividad>(
  mensajes: M[],
  orden: string[],
  actualId: string | null,
): { actividadId: string; mensajes: M[] }[] {
  const conocida = (id: string | null | undefined): id is string => !!id && orden.includes(id)
  const asignada: string[] = new Array(mensajes.length)
  let siguiente: string = conocida(actualId) ? actualId : orden[0] ?? ''
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const id = mensajes[i].activityId
    if (conocida(id)) siguiente = id
    asignada[i] = conocida(id) ? id : siguiente
  }
  const grupos = new Map<string, M[]>()
  mensajes.forEach((m, i) => {
    const id = asignada[i]
    if (!id) return
    if (!grupos.has(id)) grupos.set(id, [])
    grupos.get(id)!.push(m)
  })
  return orden.filter((id) => grupos.has(id)).map((id) => ({ actividadId: id, mensajes: grupos.get(id)! }))
}

const PEDIDO_SIN_SIGNO = /^(→\s*)?(reescribe|redacta|escribe|explica|describe|dime|cuéntame|indica|menciona|propón|elige|compara|identifica|señala|completa|resume|mueve|baja|sube|carga|prueba|lee|mira|ubica|justifica)\b/i

/**
 * Separa lo que Sophia pide del resto de su mensaje, para destacarlo: la
 * oración (o las oraciones seguidas) del final que preguntan o piden algo.
 * Solo esas: el 14 oct 2026 una bienvenida de un solo párrafo salió entera en
 * negrita porque se destacaba el último párrafo completo.
 */
export function separarPedido(texto: string): { cuerpo: string; pedido: string | null } {
  const limpio = texto.trim()
  const corte = limpio.lastIndexOf('\n\n')
  const antes = corte >= 0 ? limpio.slice(0, corte) : ''
  const ultimo = corte >= 0 ? limpio.slice(corte + 2).trim() : limpio
  const oraciones = ultimo.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g)?.map((o) => o.trim()).filter(Boolean) ?? []
  let desde = oraciones.length
  while (desde > 0) {
    const o = oraciones[desde - 1]
    const pide = o.includes('?') || (desde === oraciones.length && PEDIDO_SIN_SIGNO.test(o))
    if (!pide) break
    desde--
  }
  if (desde === oraciones.length) return { cuerpo: texto, pedido: null }
  const pedido = oraciones.slice(desde).join(' ')
  if (pedido.length > 400) return { cuerpo: texto, pedido: null }
  const restoDelParrafo = oraciones.slice(0, desde).join(' ')
  return { cuerpo: [antes, restoDelParrafo].filter(Boolean).join('\n\n'), pedido }
}
