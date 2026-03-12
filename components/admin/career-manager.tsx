'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, GraduationCap, Users, BookOpen, Pencil, Trash2, Check, X } from 'lucide-react'

type CareerRow = {
  id: string
  name: string
  slug: string
  _count: { users: number; courses: number }
}

export function CareerManager({ careers: initialCareers }: { careers: CareerRow[] }) {
  const [careers, setCareers] = useState(initialCareers)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newName.trim() || newName.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })

      if (res.ok) {
        const { career } = (await res.json()) as { career: CareerRow }
        setCareers((prev) => [...prev, career].sort((a, b) => a.name.localeCompare(b.name)))
        setNewName('')
        toast.success(`Carrera "${career.name}" creada`)
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al crear carrera')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim() || editName.trim().length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres')
      return
    }

    setLoading(id)
    try {
      const res = await fetch('/api/admin/careers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName.trim() }),
      })

      if (res.ok) {
        const { career } = (await res.json()) as { career: CareerRow }
        setCareers((prev) =>
          prev.map((c) => (c.id === id ? career : c)).sort((a, b) => a.name.localeCompare(b.name))
        )
        setEditingId(null)
        toast.success('Carrera renombrada')
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al renombrar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la carrera "${name}"?`)) return

    setLoading(id)
    try {
      const res = await fetch('/api/admin/careers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        setCareers((prev) => prev.filter((c) => c.id !== id))
        toast.success(`Carrera "${name}" eliminada`)
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(null)
    }
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
          disabled={creating || !newName.trim()}
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
                    disabled={loading === career.id}
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
                      disabled={loading === career.id}
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
