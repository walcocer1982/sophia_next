'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Building2, BookOpen, Users, LayoutGrid, Pencil, Trash2, Check, X, Globe } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useAsyncOp } from '@/lib/hooks/use-async-op'

type SedeRow = {
  id: string
  code: string
  name: string
  city: string | null
  address: string | null
  isVirtual: boolean
  isActive: boolean
  _count: { courses: number; sections: number; users: number }
}

export function SedeManager({ sedes: initialSedes }: { sedes: SedeRow[] }) {
  const [sedes, setSedes] = useState(initialSedes)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newIsVirtual, setNewIsVirtual] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCity, setEditCity] = useState('')
  const { run, isPending } = useAsyncOp()

  const resetNewForm = () => {
    setShowNewForm(false)
    setNewCode('')
    setNewName('')
    setNewCity('')
    setNewIsVirtual(false)
  }

  const handleCreate = async () => {
    const result = await run(
      () =>
        apiFetch<{ sede: SedeRow }>('/api/admin/sedes', {
          method: 'POST',
          json: {
            code: newCode.trim().toUpperCase(),
            name: newName.trim(),
            city: newCity.trim() || null,
            isVirtual: newIsVirtual,
          },
        }),
      { key: 'create' }
    )
    if (!result) return
    setSedes((prev) => [...prev, result.sede].sort((a, b) => a.code.localeCompare(b.code)))
    resetNewForm()
    toast.success(`Sede "${result.sede.code}" creada`)
  }

  const handleSave = async (id: string) => {
    const result = await run(
      () =>
        apiFetch<{ sede: SedeRow }>('/api/admin/sedes', {
          method: 'PUT',
          json: {
            id,
            name: editName.trim(),
            city: editCity.trim() || null,
          },
        }),
      { key: id }
    )
    if (!result) return
    setSedes((prev) => prev.map((s) => (s.id === id ? result.sede : s)))
    setEditingId(null)
    toast.success('Sede actualizada')
  }

  const handleToggleActive = async (sede: SedeRow) => {
    const result = await run(
      () =>
        apiFetch<{ sede: SedeRow }>('/api/admin/sedes', {
          method: 'PUT',
          json: { id: sede.id, isActive: !sede.isActive },
        }),
      { key: `toggle-${sede.id}` }
    )
    if (!result) return
    setSedes((prev) => prev.map((s) => (s.id === sede.id ? result.sede : s)))
    toast.success(result.sede.isActive ? 'Sede activada' : 'Sede desactivada')
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`¿Eliminar la sede "${code}"? Esta acción es irreversible.`)) return
    const result = await run(
      () => apiFetch('/api/admin/sedes', { method: 'DELETE', json: { id } }),
      { key: id }
    )
    if (result === undefined) return
    setSedes((prev) => prev.filter((s) => s.id !== id))
    toast.success(`Sede "${code}" eliminada`)
  }

  return (
    <div className="space-y-4">
      {/* Crear nueva sede */}
      {!showNewForm ? (
        <Button onClick={() => setShowNewForm(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nueva sede
        </Button>
      ) : (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Código *</label>
              <Input
                placeholder="ABQ"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-700 block mb-1">Nombre completo *</label>
              <Input
                placeholder="Alberto Benavides de la Quintana"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-700 block mb-1">Ciudad (opcional)</label>
              <Input
                placeholder="Arequipa"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm self-end pb-2">
              <input
                type="checkbox"
                checked={newIsVirtual}
                onChange={(e) => setNewIsVirtual(e.target.checked)}
                className="rounded"
              />
              <span>Es virtual (sin campus físico)</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={isPending('create') || !newCode.trim() || !newName.trim()}
              size="sm"
            >
              Crear sede
            </Button>
            <Button onClick={resetNewForm} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de sedes */}
      {sedes.length === 0 ? (
        <p className="text-sm text-gray-500">No hay sedes creadas todavía.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sedes.map((sede) => (
            <div
              key={sede.id}
              className={`rounded-lg border p-4 ${sede.isActive ? 'bg-white' : 'bg-gray-50 opacity-70'}`}
            >
              {editingId === sede.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <code className="font-mono text-sm font-bold">{sede.code}</code>
                    <span className="text-xs text-gray-500">(no editable)</span>
                  </div>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre completo"
                    className="text-sm"
                  />
                  <Input
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="Ciudad"
                    className="text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSave(sede.id)}
                      disabled={isPending(sede.id)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="mr-1 h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                        {sede.code}
                      </code>
                      {sede.isVirtual && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Globe className="h-3 w-3" />
                          Virtual
                        </Badge>
                      )}
                      {!sede.isActive && (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 text-[10px]">
                          Inactiva
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingId(sede.id)
                          setEditName(sede.name)
                          setEditCity(sede.city || '')
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleToggleActive(sede)}
                        disabled={isPending(`toggle-${sede.id}`)}
                        title={sede.isActive ? 'Desactivar' : 'Activar'}
                      >
                        <span className={`text-xs font-bold ${sede.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {sede.isActive ? '●' : '○'}
                        </span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(sede.id, sede.code)}
                        disabled={isPending(sede.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-0.5">{sede.name}</p>
                  {sede.city && (
                    <p className="text-xs text-gray-500 mb-2">{sede.city}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Badge variant="outline" className="text-xs gap-1">
                      <BookOpen className="h-3 w-3" />
                      {sede._count.courses} cursos
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <LayoutGrid className="h-3 w-3" />
                      {sede._count.sections} secciones
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Users className="h-3 w-3" />
                      {sede._count.users} usuarios
                    </Badge>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
