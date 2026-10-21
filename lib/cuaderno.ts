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

/**
 * Oraciones de un párrafo. «!», «?» y «…» cierran siempre; un punto, solo si
 * le sigue un espacio y algo que abre oración (mayúscula, «¿», «¡», comillas).
 * Así «D.S. 024», «p. ej.» o «1,80 m.» no parten la pregunta: el 19 oct 2026
 * «(D. S.» quedó arriba y «024, desde 1,80 m…» salió en negrita como pedido.
 */
export function partirEnOraciones(texto: string): string[] {
  return (
    texto
      .match(/[\s\S]+?(?:[!?…]+["»”)]*|\.["»”)]*(?=\s+[¿¡«"“A-ZÁÉÍÓÚÑ])|\.?["»”)]*$)\s*/g)
      ?.map((o) => o.trim())
      .filter(Boolean) ?? []
  )
}

const PEDIDO_SIN_SIGNO =/^(→\s*)?(reescribe|redacta|escribe|explica|describe|dime|cuéntame|indica|menciona|propón|elige|compara|identifica|señala|completa|resume|mueve|baja|sube|carga|prueba|lee|mira|ubica|justifica|toca|subraya|marca)\b/i

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
  const oraciones = partirEnOraciones(ultimo)
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

/**
 * El mensaje que abre una actividad suele empezar cerrando la anterior
 * («Exacto. La baranda debe tener al menos 1,0 m…») y sigue con la nueva. Se
 * guarda bajo la actividad nueva (así lo archiva el servidor), pero ese primer
 * párrafo es el cierre de la anterior: el Cuaderno lo dibuja allá. Solo si es
 * corto, no pregunta ni trae alternativas y queda algo después (prueba del
 * 19 oct 2026: el cierre de la baranda aparecía bajo «Actividad 7»).
 */
export function separarCierreDeLaAnterior(texto: string): { cierre: string | null; resto: string } {
  const corte = texto.indexOf('\n\n')
  if (corte < 0) return { cierre: null, resto: texto }
  const primero = texto.slice(0, corte).trim()
  const resto = texto.slice(corte + 2).trim()
  const visible = primero.replace(/\[\[(block|marker):[^\]]*\]\]/g, '').trim()
  const esCierre =
    !!visible && !!resto && visible.length <= 300 && !visible.includes('?') && !/^[A-E]\)\s/m.test(visible) &&
    // Termina como oración: «Elige una:» presenta lo que sigue, no cierra nada.
    /[.!…]["»”)]*$/.test(visible)
  return esCierre ? { cierre: primero, resto } : { cierre: null, resto: texto }
}

/**
 * Negritas que Sophia deja mal cerradas: «**¿Qué hay abajo? **» no se aplica en
 * Markdown (el cierre no puede ir después de un espacio) y el alumno ve los
 * asteriscos (20 oct 2026). Se quitan los espacios pegados por dentro.
 */
export function arreglarNegritas(texto: string): string {
  return texto.replace(/\*\*[ \t]*([^*\n]*?[^*\s])[ \t]*\*\*/g, '**$1**')
}
