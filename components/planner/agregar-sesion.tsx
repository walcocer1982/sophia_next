'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Agrega una sesión al final del plan. Hasta ahora las sesiones solo nacían al
 * crear el curso, desde la lista de temas: si después hacía falta una más, no
 * había manera.
 */
export function AgregarSesion({ courseId }: { courseId: string }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!titulo.trim()) {
      toast.error('Ponle un título a la sesión')
      return
    }
    setGuardando(true)
    try {
      const res = await fetch('/api/planner/lesson/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: titulo, objective: objetivo }),
      })
      const texto = await res.text()
      const data = texto ? JSON.parse(texto) : {}
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      toast.success(`Sesión ${data.lesson.order} agregada`)
      setTitulo('')
      setObjetivo('')
      setAbierto(false)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Agregar sesión
      </Button>
    )
  }

  return (
    <div className="w-full space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Título de la sesión</label>
        <Input
          autoFocus
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void guardar() }}
          placeholder="S5 — Técnicas de estudio"
          className="bg-white"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">
          Objetivo <span className="font-normal text-gray-400">(opcional, se puede escribir después)</span>
        </label>
        <Input
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          placeholder="Qué debe lograr el estudiante al terminarla"
          className="bg-white"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setAbierto(false)} disabled={guardando}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" onClick={guardar} disabled={guardando} className="gap-1.5">
          {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Agregar
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Nace vacía y en borrador. Las actividades se diseñan después, en «Diseño».
      </p>
    </div>
  )
}
