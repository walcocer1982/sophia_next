'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, GraduationCap, Users, BookOpen, Pencil, Trash2, Check, X, Building2 } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useAsyncOp } from '@/lib/hooks/use-async-op'

type SedeMini = { id: string; code: string; name: string }

type CareerRow = {
  id: string
  name: string
  slug: string
  code: string | null
  sedes: SedeMini[]
  _count: { users: number; courses: number }
}

export function CareerManager({
  careers: initialCareers,
  sedes,
}: {
  careers: CareerRow[]
  sedes: SedeMini[]
}) {
  const [careers, setCareers] = useState(initialCareers)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newSedeIds, setNewSedeIds] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editSedeIds, setEditSedeIds] = useState<string[]>([])
  const { run, isPending } = useAsyncOp()

  const resetNew = () => {
    setShowNew(false); setNewName(''); setNewCode(''); setNewSedeIds([])
  }
  const startEdit = (c: CareerRow) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditCode(c.code || '')
    setEditSedeIds(c.sedes.map((s) => s.id))
  }

  const handleCreate = async () => {
    const result = await run(
      () =>
        apiFetch<{ career: CareerRow }>('/api/admin/careers', {
          method: 'POST',
          json: {
            name: newName.trim(),
            code: newCode.trim() || null,
            sedeIds: newSedeIds,
          },
        }),
      { key: 'create' }
    )
    if (!result) return
    setCareers((prev) => [...prev, result.career].sort((a, b) => (a.code ?? 'zzz').localeCompare(b.code ?? 'zzz')))
    resetNew()
    toast.success(`Carrera "${result.career.name}" creada`)
  }

  const handleSave = async (id: string) => {
    const result = await run(
      () =>
        apiFetch<{ career: CareerRow }>('/api/admin/careers', {
          method: 'PUT',
          json: {
            id,
            name: editName.trim(),
            code: editCode.trim() || null,
            sedeIds: editSedeIds,
          },
        }),
      { key: id }
    )
    if (!result) return
    setCareers((prev) => prev.map((c) => (c.id === id ? result.career : c)))
    setEditingId(null)
    toast.success('Carrera actualizada')
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

  const toggleSedeInList = (list: string[], setList: (next: string[]) => void, sedeId: string) => {
    setList(list.includes(sedeId) ? list.filter((id) => id !== sedeId) : [...list, sedeId])
  }

  const SedeMultiSelect = ({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) => (
    <div className="flex flex-wrap gap-1">
      {sedes.map((s) => {
        const isOn = selected.includes(s.id)
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => toggleSedeInList(selected, onChange, s.id)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border transition-colors ${
              isOn
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {isOn && <Check className="h-2.5 w-2.5" />}
            {s.code}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Crear nueva */}
      {!showNew ? (
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nueva carrera
        </Button>
      ) : (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Código (sigla)</label>
              <Input
                placeholder="EOM"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-700 block mb-1">Nombre completo *</label>
              <Input
                placeholder="Exploración y Operación Minera"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Sedes donde se dicta</label>
            <SedeMultiSelect selected={newSedeIds} onChange={setNewSedeIds} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={isPending('create') || !newName.trim()} size="sm">
              Crear carrera
            </Button>
            <Button onClick={resetNew} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {careers.length === 0 ? (
        <p className="text-sm text-gray-500">No hay carreras creadas todavía.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {careers.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-4">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="EOM"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                      maxLength={10}
                      className="font-mono text-sm"
                    />
                    <Input
                      placeholder="Nombre"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="col-span-2 text-sm"
                    />
                  </div>
                  <SedeMultiSelect selected={editSedeIds} onChange={setEditSedeIds} />
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleSave(c.id)} disabled={isPending(c.id)}>
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
                      <GraduationCap className="h-4 w-4 text-gray-400" />
                      {c.code && (
                        <code className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {c.code}
                        </code>
                      )}
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(c)}>
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c.id, c.name)} disabled={isPending(c.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </div>
                  {/* Sedes */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    {c.sedes.length === 0 ? (
                      <span className="text-[11px] text-gray-400 italic">sin sedes asignadas</span>
                    ) : (
                      c.sedes.map((s) => (
                        <code
                          key={s.id}
                          className="text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded"
                          title={s.name}
                        >
                          {s.code}
                        </code>
                      ))
                    )}
                  </div>
                  {/* Counts */}
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Users className="h-3 w-3" />
                      {c._count.users}
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <BookOpen className="h-3 w-3" />
                      {c._count.courses}
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
