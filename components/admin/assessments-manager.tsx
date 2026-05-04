'use client'

import { useState } from 'react'
import { Plus, Copy, Power, Trash2, ExternalLink, BarChart3, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

interface Assessment {
  id: string
  code: string
  title: string
  isActive: boolean
  timeLimitMin: number
  collectDni: boolean
  collectEmail: boolean
  createdAt: string
  participantsCount: number
}

interface Props {
  lessonId: string
  courseId: string
  initialAssessments: Assessment[]
}

export function AssessmentsManager({ lessonId, courseId, initialAssessments }: Props) {
  const [assessments, setAssessments] = useState(initialAssessments)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(initialAssessments.length === 0)
  const [title, setTitle] = useState('')
  const [timeLimitMin, setTimeLimitMin] = useState(10)
  const [collectDni, setCollectDni] = useState(true)
  const [collectEmail, setCollectEmail] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, title, timeLimitMin, collectDni, collectEmail }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al crear')
      }
      const data = await res.json()
      // Reload via fresh fetch to get full record
      const listRes = await fetch(`/api/admin/assessments?lessonId=${lessonId}`)
      const listData = await listRes.json()
      const mapped = listData.assessments.map((a: { id: string; code: string; title: string; isActive: boolean; timeLimitMin: number; collectDni: boolean; collectEmail: boolean; createdAt: string; _count: { participants: number } }) => ({
        id: a.id,
        code: a.code,
        title: a.title,
        isActive: a.isActive,
        timeLimitMin: a.timeLimitMin,
        collectDni: a.collectDni,
        collectEmail: a.collectEmail,
        createdAt: a.createdAt,
        participantsCount: a._count.participants,
      }))
      setAssessments(mapped)
      setShowForm(false)
      setTitle('')
      toast.success(`Evaluación creada con código: ${data.code}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/assessments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    if (res.ok) {
      setAssessments(prev => prev.map(a => a.id === id ? { ...a, isActive: !isActive } : a))
      toast.success(isActive ? 'Evaluación cerrada' : 'Evaluación reabierta')
    } else {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta evaluación y todos los datos de participantes?')) return
    const res = await fetch(`/api/admin/assessments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAssessments(prev => prev.filter(a => a.id !== id))
      toast.success('Evaluación eliminada')
    } else {
      toast.error('Error al eliminar')
    }
  }

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/eval/${code}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado')
  }

  return (
    <div className="space-y-6">
      {/* Create new */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva evaluación
        </Button>
      ) : (
        <form onSubmit={handleCreate} className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold">Nueva evaluación</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Título *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Evaluación ProExplo - Sesión 1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tiempo límite (minutos)</label>
              <Input
                type="number"
                min={1}
                max={60}
                value={timeLimitMin}
                onChange={e => setTimeLimitMin(parseInt(e.target.value) || 10)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={collectDni}
                onChange={e => setCollectDni(e.target.checked)}
              />
              Solicitar DNI
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={collectEmail}
                onChange={e => setCollectEmail(e.target.checked)}
              />
              Solicitar correo (opcional)
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Crear evaluación
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-3">
        {assessments.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No hay evaluaciones creadas todavía.
          </p>
        )}
        {assessments.map(a => (
          <div key={a.id} className="bg-white border rounded-lg p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  {a.isActive ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Activa</span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Cerrada</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 space-x-3">
                  <span>Código: <span className="font-mono font-semibold text-gray-700">{a.code}</span></span>
                  <span>· {a.timeLimitMin} min</span>
                  <span>· {a.participantsCount} participantes</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(a.code)}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar link
                </Button>
                <Link href={`/eval/${a.code}`} target="_blank">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </Button>
                </Link>
                <Link href={`/planner/${courseId}/${lessonId}/assessments/${a.id}/results`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Resultados
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggle(a.id, a.isActive)}
                  className="gap-1.5"
                  title={a.isActive ? 'Cerrar evaluación' : 'Reabrir'}
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(a.id)}
                  className="gap-1.5 text-red-600 hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
