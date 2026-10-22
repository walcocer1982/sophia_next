/**
 * El árbol del Monitor: admisión ▸ sede ▸ carrera, el mismo recorrido que
 * Programación (21 oct 2026). Antes la portada listaba todos los cursos al
 * alcance mezclados, y al superadmin le salían juntas SI 1 y la sección de
 * práctica. Funciones puras sobre las secciones al alcance; la página les
 * pone los números que salen de las matrices.
 */

export type CarreraMini = { id: string; name: string; code: string | null }

export type SeccionDelArbol = {
  id: string
  name: string
  alumnos: number
  period: { id: string; name: string; isActive: boolean }
  sede: { id: string; code: string; careers?: CarreraMini[] } | null
  course: { id: string; title: string; scope: string; careers: CarreraMini[] }
}

export type Seleccion = { admision: string | null; sede: string | null; carrera: string | null }

/** Las secciones sin sede (datos viejos) cuelgan de un nodo propio. */
export const SIN_SEDE = { id: 'sin-sede', code: 'Sin sede' }

export type NodoCarrera = CarreraMini & { secciones: SeccionDelArbol[]; alumnos: number; enRiesgo: number }
export type NodoSede = { id: string; code: string; carreras: NodoCarrera[]; alumnos: number; enRiesgo: number }
export type NodoAdmision = {
  id: string
  name: string
  isActive: boolean
  sedes: NodoSede[]
  alumnos: number
  enRiesgo: number
}

/** Un curso llega a una carrera por su lista m:n, o por ser transversal (misma regla que Programación). */
export function sirveA(course: { scope: string; careers: { id: string }[] }, careerId: string): boolean {
  return course.scope === 'TRANSVERSAL' || course.careers.some((c) => c.id === careerId)
}

/**
 * Las matrices se calculan una vez por (curso, admisión, sede): todas las
 * secciones de ese grupo sirven a las mismas carreras, así que el número se
 * reparte sin volver a consultar.
 */
export function claveGrupo(s: { course: { id: string }; period: { id: string }; sede: { id: string } | null }): string {
  return `${s.course.id}:${s.period.id}:${s.sede?.id ?? SIN_SEDE.id}`
}

function sumaDeGrupos(secciones: SeccionDelArbol[], enRiesgoPorGrupo: Map<string, number>): number {
  const grupos = new Set(secciones.map(claveGrupo))
  let total = 0
  for (const g of grupos) total += enRiesgoPorGrupo.get(g) ?? 0
  return total
}

const porNombre = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, 'es')

export function armarArbol(
  secciones: SeccionDelArbol[],
  enRiesgoPorGrupo: Map<string, number> = new Map()
): NodoAdmision[] {
  const admisiones = new Map<string, SeccionDelArbol['period']>()
  for (const s of secciones) admisiones.set(s.period.id, s.period)

  return [...admisiones.values()]
    .sort((a, b) => b.name.localeCompare(a.name, 'es')) // la admisión más nueva arriba
    .map((periodo) => {
      const suyas = secciones.filter((s) => s.period.id === periodo.id)
      const sedes = new Map<string, { id: string; code: string; careers: CarreraMini[] }>()
      for (const s of suyas) {
        const sede = s.sede ?? { ...SIN_SEDE, careers: [] }
        const previa = sedes.get(sede.id)
        sedes.set(sede.id, { id: sede.id, code: sede.code, careers: [...(previa?.careers ?? []), ...(sede.careers ?? [])] })
      }

      const nodosSede: NodoSede[] = [...sedes.values()]
        .sort((a, b) => a.code.localeCompare(b.code, 'es'))
        .map((sede) => {
          const deLaSede = suyas.filter((s) => (s.sede?.id ?? SIN_SEDE.id) === sede.id)
          // Candidatas: las carreras que se dictan en la sede más las de los
          // cursos que tienen sección ahí. Queda la que tenga al menos una sección.
          const candidatas = new Map<string, CarreraMini>()
          for (const c of sede.careers) candidatas.set(c.id, c)
          for (const s of deLaSede) for (const c of s.course.careers) candidatas.set(c.id, c)
          const carreras: NodoCarrera[] = [...candidatas.values()]
            .sort(porNombre)
            .map((car) => {
              const propias = deLaSede.filter((s) => sirveA(s.course, car.id))
              return {
                ...car,
                secciones: propias,
                alumnos: propias.reduce((n, s) => n + s.alumnos, 0),
                enRiesgo: sumaDeGrupos(propias, enRiesgoPorGrupo),
              }
            })
            .filter((c) => c.secciones.length > 0)
          return {
            id: sede.id,
            code: sede.code,
            carreras,
            alumnos: deLaSede.reduce((n, s) => n + s.alumnos, 0),
            enRiesgo: sumaDeGrupos(deLaSede, enRiesgoPorGrupo),
          }
        })

      return {
        id: periodo.id,
        name: periodo.name,
        isActive: periodo.isActive,
        sedes: nodosSede,
        alumnos: suyas.reduce((n, s) => n + s.alumnos, 0),
        enRiesgo: sumaDeGrupos(suyas, enRiesgoPorGrupo),
      }
    })
}

const texto = (v: string | string[] | undefined): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function seleccionDe(params: Record<string, string | string[] | undefined>): Seleccion {
  return { admision: texto(params.admision), sede: texto(params.sede), carrera: texto(params.carrera) }
}

export function enlaceRama(sel: Seleccion, base = '/dashboard'): string {
  const q = new URLSearchParams()
  if (sel.admision) q.set('admision', sel.admision)
  if (sel.sede) q.set('sede', sel.sede)
  if (sel.carrera) q.set('carrera', sel.carrera)
  const s = q.toString()
  return s ? `${base}?${s}` : base
}

export type Rama = { admision: NodoAdmision; sede: NodoSede; carrera: NodoCarrera }

export function ramaDe(arbol: NodoAdmision[], sel: Seleccion): Rama | null {
  if (!sel.admision || !sel.sede || !sel.carrera) return null
  const admision = arbol.find((a) => a.id === sel.admision)
  const sede = admision?.sedes.find((s) => s.id === sel.sede)
  const carrera = sede?.carreras.find((c) => c.id === sel.carrera)
  return admision && sede && carrera ? { admision, sede, carrera } : null
}

/** Si el árbol tiene una sola carrera (el caso del instructor), se entra directo. */
export function unicaRama(arbol: NodoAdmision[]): Seleccion | null {
  const hojas: Seleccion[] = []
  for (const a of arbol) for (const s of a.sedes) for (const c of s.carreras) hojas.push({ admision: a.id, sede: s.id, carrera: c.id })
  return hojas.length === 1 ? hojas[0] : null
}
