'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, GraduationCap, Users, BookOpen, Pencil, Trash2, Check, X } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useAsyncOp } from '@/lib/hooks/use-async-op'

type CareerRow = {
  id: string
  name: string
  slug: string
  _count: { users: number; courses: number }
}

export function CareerManager({ careers: initialCareers }: { careers: CareerRow[] }) {
  const [careers, setCareers] = useState(initialCareers)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const { run, isPending } = useAsyncOp()

  const handleCreate = async () => {
    if (!newName.trim() || newName.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres')
      return
    }

    const result = await run(
      () =>
        apiFetch<{ career: CareerRow }>('/api/admin/careers', {
          method: 'POST',
          json: { name: newName.trim() },
        }),
      { key: 'create' }
    )
    if (!result) return

    setCareers((prev) =>
      [...prev, result.career].sort((a, b) => a.name.localeCompare(b.name))
    )
    setNewName('')
    toast.success(`Carrera "${result.career.name}" creada`)
  }

  const handleRename = async (id: string) => {
    if (!editName.trim() || editName.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres')
      return
    }

    const result = await run(
      () =>
        apiFetch<{ career: CareerRow }>('/api/admin/careers', {
          method: 'PUT',
          json: { id, name: editName.trim() },
        }),
      { key: id }
    )
    if (!result) return

    setCareers((prev) =>
      prev.map((c) => (c.id === id ? result.career : c)).sort((a, b) => a.name.localeCompare(b.name))
    )
    setEditingId(null)
    toast.success('Carrera renombrada')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la carrera "${name}"?`)) return

    const result = await run(
      () => apiFetch('/api/admin/careers', { method: 'DELETE', json: { id } }),
      { key: id }
    )
    if (result === undefined) return

    setCareers((prev) => prev.filter((c) => c.id !== id))
    toast.success(`Carrera "${name}" eliminada`)
  }

  return (
    <div className="space-y-4">
      {/* Create new career */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nueva carrera (ej: Procesos Metalúrgicos)..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="max-w-sm"
        />
        <Button
          onClick={handleCreate}
          disabled={isPending('create') || !newName.trim()}
          size="sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          Crear
        </Button>
      </div>

      {/* Career list */}
      {careers.length === 0 ? (
        <p className="text-sm text-gray-500">No hay carreras creadas todavía.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {careers.map((career) => (
            <div
              key={career.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              {editingId === career.id ? (
                <div className="flex flex-1 items-center gap-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(career.id)}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleRename(career.id)}
                    disabled={isPending(career.id)}
                  >
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm">{career.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Users className="h-3 w-3" />
                      {career._count.users}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <BookOpen className="h-3 w-3" />
                      {career._count.courses}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(career.id)
                        setEditName(career.name)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDelete(career.id, career.name)}
                      disabled={isPending(career.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </Button>
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
