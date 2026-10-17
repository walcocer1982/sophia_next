'use client'

/**
 * Estado compartido del material de apoyo entre el chat y el panel.
 *
 * - `cited`: bloques y señalamientos que Sophia mostró, leídos de los
 *   marcadores [[block:ID]] / [[marker:ID:n]] de sus mensajes. Como los
 *   marcadores quedan en los mensajes guardados, al recargar se reconstruye.
 * - `opened`: bloques «a pedido» que el alumno abrió con el botón.
 * - `focus`: el bloque que hay que traer a la vista (citado recién o tocado
 *   desde una tarjeta del chat). El layout abre el panel o el cajón.
 *
 * Fuera de /learn (sin proveedor) el hook devuelve un estado vacío y no falla.
 * Spec: investigacion/panel-de-apoyo-especificacion.md §6.2.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { citedBlocksInOrder, citedFromTexts, type Cited } from '@/lib/material-markers'
import type { BlockWithActivity } from '@/lib/support-blocks'
import type { MaterialState, SimState } from '@/lib/simulator'

interface Focus {
  id: string
  /** Cambia en cada pedido, para que el mismo bloque se pueda enfocar dos veces. */
  nonce: number
  /** true si lo pidió el alumno (tocar la tarjeta): abre el panel o el cajón. */
  byUser: boolean
}

interface MaterialContextValue {
  cited: Cited
  /**
   * Bloques citados en el último mensaje de Sophia. Siguen en el panel aunque
   * la actividad haya avanzado en ese mismo mensaje (la transición cita
   * «Antiplagio» y ya presenta la actividad siguiente).
   */
  lastCited: string[]
  opened: Set<string>
  focus: Focus | null
  /** Hay un bloque nuevo que el alumno aún no vio (celular: punto en «Material»). */
  unseen: boolean
  blocksById: Map<string, BlockWithActivity>
  reportMessages: (assistantContents: string[]) => void
  openBlock: (id: string) => void
  markSeen: () => void
  /** false fuera de /learn (vista previa del editor): el ecualizador usa estado local. */
  hasProvider: boolean
  /** Estado de cada ecualizador, por id de bloque. Lo que el alumno movió. */
  simStates: MaterialState
  setSimState: (blockId: string, state: SimState) => void
  /** Vuelve un ecualizador a su caso inicial (al dejar la actividad que lo usa). */
  resetSimState: (blockId: string) => void
  /** Lo que el chat manda al servidor con cada mensaje (spec §16.3). */
  getMaterialState: () => MaterialState
}

const VACIO: Cited = { blocks: new Set(), markers: new Set() }

const MaterialContext = createContext<MaterialContextValue | null>(null)

const mismoConjunto = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))

// ── Material «a pedido» abierto: se guarda en el navegador por sesión ──────
// No queda en ningún mensaje, así que sin esto se volvía a ocultar al recargar.
// useSyncExternalStore: el servidor ve «nada abierto» y el cliente lee lo
// guardado sin error de hidratación. Si el navegador bloquea el almacenamiento,
// queda solo en memoria.
const EVENTO_ABIERTOS = 'sophia:material-abierto'
function leerAbiertos(clave: string): string {
  try {
    return window.localStorage.getItem(clave) ?? ''
  } catch {
    return ''
  }
}
function suscribirAbiertos(aviso: () => void) {
  window.addEventListener('storage', aviso)
  window.addEventListener(EVENTO_ABIERTOS, aviso)
  return () => {
    window.removeEventListener('storage', aviso)
    window.removeEventListener(EVENTO_ABIERTOS, aviso)
  }
}

export function MaterialProvider({
  blocks,
  onOpenRequest,
  storageKey,
  children,
}: {
  blocks: BlockWithActivity[]
  /** Id de la sesión: guarda qué material «a pedido» abrió el alumno. */
  storageKey?: string
  /** El alumno pidió ver un bloque: el layout abre el panel o el cajón. */
  onOpenRequest?: () => void
  children: React.ReactNode
}) {
  const [cited, setCited] = useState<Cited>(VACIO)
  const [lastCited, setLastCited] = useState<string[]>([])
  const clave = storageKey ? `sophia:material-abierto:${storageKey}` : null
  const [abiertosEnMemoria, setAbiertosEnMemoria] = useState<Set<string>>(new Set())
  const guardados = useSyncExternalStore(
    suscribirAbiertos,
    () => (clave ? leerAbiertos(clave) : ''),
    () => '',
  )
  const opened = useMemo(
    () => new Set([...abiertosEnMemoria, ...guardados.split('|').filter(Boolean)]),
    [abiertosEnMemoria, guardados],
  )
  const [focus, setFocus] = useState<Focus | null>(null)
  const [unseen, setUnseen] = useState(false)
  const primeraLectura = useRef(true)
  const nonce = useRef(0)

  const blocksById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks])

  const citedRef = useRef<Cited>(VACIO)
  const reportMessages = useCallback((contents: string[]) => {
    const nuevo = citedFromTexts(contents)
    const ultimo = citedBlocksInOrder(contents[contents.length - 1] ?? '')
    setLastCited((p) => (p.join('|') === ultimo.join('|') ? p : ultimo))
    const prev = citedRef.current
    const esHistorial = primeraLectura.current
    primeraLectura.current = false
    if (mismoConjunto(prev.blocks, nuevo.blocks) && mismoConjunto(prev.markers, nuevo.markers)) return
    citedRef.current = nuevo
    setCited(nuevo)
    // Al cargar la página no hay «nuevo»: es el historial.
    if (esHistorial) return
    const recien = [...nuevo.blocks].filter((id) => !prev.blocks.has(id))
    const masReciente = recien[recien.length - 1]
    if (masReciente) {
      setFocus({ id: masReciente, nonce: ++nonce.current, byUser: false })
      setUnseen(true)
    }
  }, [])

  const openBlock = useCallback((id: string) => {
    setAbiertosEnMemoria((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    if (clave) {
      try {
        const ids = new Set(leerAbiertos(clave).split('|').filter(Boolean)).add(id)
        window.localStorage.setItem(clave, [...ids].join('|'))
        window.dispatchEvent(new Event(EVENTO_ABIERTOS))
      } catch {
        // Sin almacenamiento: queda en memoria hasta recargar.
      }
    }
    setFocus({ id, nonce: ++nonce.current, byUser: true })
    setUnseen(false)
    onOpenRequest?.()
  }, [onOpenRequest, clave])

  const markSeen = useCallback(() => setUnseen(false), [])

  // Ecualizadores: el estado vive aquí para que el chat lo mande a Sophia.
  const [simStates, setSimStates] = useState<MaterialState>({})
  const simRef = useRef<MaterialState>({})
  const setSimState = useCallback((blockId: string, state: SimState) => {
    simRef.current = { ...simRef.current, [blockId]: state }
    setSimStates(simRef.current)
  }, [])
  const resetSimState = useCallback((blockId: string) => {
    if (!(blockId in simRef.current)) return
    const resto = { ...simRef.current }
    delete resto[blockId]
    simRef.current = resto
    setSimStates(resto)
  }, [])
  const getMaterialState = useCallback(() => simRef.current, [])

  const value = useMemo(
    () => ({ cited, lastCited, opened, focus, unseen, blocksById, reportMessages, openBlock, markSeen, hasProvider: true, simStates, setSimState, resetSimState, getMaterialState }),
    [cited, lastCited, opened, focus, unseen, blocksById, reportMessages, openBlock, markSeen, simStates, setSimState, resetSimState, getMaterialState],
  )
  return <MaterialContext.Provider value={value}>{children}</MaterialContext.Provider>
}

const SIN_PROVEEDOR: MaterialContextValue = {
  cited: VACIO,
  lastCited: [],
  opened: new Set(),
  focus: null,
  unseen: false,
  blocksById: new Map(),
  reportMessages: () => {},
  openBlock: () => {},
  markSeen: () => {},
  hasProvider: false,
  simStates: {},
  setSimState: () => {},
  resetSimState: () => {},
  getMaterialState: () => ({}),
}

export function useMaterial(): MaterialContextValue {
  return useContext(MaterialContext) ?? SIN_PROVEEDOR
}
