'use client'

import { createContext, useContext } from 'react'
import { useProgramacion } from './use-programacion'

type Valor = ReturnType<typeof useProgramacion>

const Ctx = createContext<Valor | null>(null)

/**
 * Una sola carga de datos para el árbol y el panel. Sin esto, cada pantalla
 * llamaría al API por su cuenta y el árbol quedaría desfasado del panel
 * después de cada cambio.
 */
export function ProgramacionProvider({ children }: { children: React.ReactNode }) {
  const valor = useProgramacion()
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useProgramacionCtx(): Valor {
  const v = useContext(Ctx)
  if (!v) throw new Error('useProgramacionCtx debe usarse dentro de ProgramacionProvider')
  return v
}
