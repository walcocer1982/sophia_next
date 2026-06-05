'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus, Megaphone, Calendar, MapPin, ExternalLink,
  Pencil, Trash2, Check, X, Archive, ArchiveRestore,
} from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useAsyncOp } from '@/lib/hooks/use-async-op'

type CampaignRow = {
  id: string
  name: string
  shortName: string | null
  startDate: string
  endDate: string
  location: string | null
  url: string | null
  isArchived: boolean
  _count: { assessments: number }
}

function toDateInput(iso: string): string {
  // YYYY-MM-DD para <input type="date">
  return new Date(iso).toISOString().slice(0, 10)
}

function formatRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'short' })
  const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()
  if (sameMonth) {
    return `${s.getDate()}-${e.getDate()} ${monthFmt.format(s)} ${s.getFullYear()}`
  }
  return `${s.getDate()} ${monthFmt.format(s)} – ${e.getDate()} ${monthFmt.format(e)} ${e.getFullYear()}`
}

export function CampaignManager({ campaigns: initial }: { campaigns: CampaignRow[] }) {
  const [campaigns, setCampaigns] = useState(initial)
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const { run, isPending } = useAsyncOp()

  // Form state — usado tanto para crear como para editar
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [url, setUrl] = useState('')

  const resetForm = () => {
    setName(''); setShortName(''); setStartDate(''); setEndDate('')
    setLocation(''); setUrl('')
  }

  const startEdit = (c: CampaignRow) => {
    setEditingId(c.id)
    setName(c.name)
    setShortName(c.shortName || '')
    setStartDate(toDateInput(c.startDate))
    setEndDate(toDateInput(c.endDate))
    setLocation(c.location || '')
    setUrl(c.url || '')
    setShowNew(false)
  }

  const handleCreate = async () => {
    const result = await run(
      () =>
        apiFetch<{ campaign: CampaignRow }>('/api/admin/campaigns', {
          method: 'POST',
          json: {
            name: name.trim(),
            shortName: shortName.trim() || null,
            startDate,
            endDate,
            location: location.trim() || null,
            url: url.trim() || null,
          },
        }),
      { key: 'create' }
    )
    if (!result) return
    setCampaigns((prev) => [result.campaign, ...prev])
    setShowNew(false)
    resetForm()
    toast.success(`Campaña "${result.campaign.name}" creada`)
  }

  const handleSave = async (id: string) => {
    const result = await run(
      () =>
        apiFetch<{ campaign: CampaignRow }>('/api/admin/campaigns', {
          method: 'PUT',
          json: {
            id,
            name: name.trim(),
            shortName: shortName.trim() || null,
            startDate,
            endDate,
            location: location.trim() || null,
            url: url.trim() || null,
          },
        }),
      { key: id }
    )
    if (!result) return
    setCampaigns((prev) => prev.map((c) => (c.id === id ? result.campaign : c)))
    setEditingId(null)
    resetForm()
    toast.success('Campaña actualizada')
  }

  const handleArchiveToggle = async (c: CampaignRow) => {
    const result = await run(
      () =>
        apiFetch<{ campaign: CampaignRow }>('/api/admin/campaigns', {
          method: 'PUT',
          json: { id: c.id, isArchived: !c.isArchived },
        }),
      { key: `archive-${c.id}` }
    )
    if (!result) return
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? result.campaign : x)))
    toast.success(result.campaign.isArchived ? 'Campaña archivada' : 'Campaña reactivada')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la campaña "${name}"? Esta acción es irreversible.`)) return
    const result = await run(
      () => apiFetch('/api/admin/campaigns', { method: 'DELETE', json: { id } }),
      { key: id }
    )
    if (result === undefined) return
    setCampaigns((prev) => prev.filter((c) => c.id !== id))
    toast.success(`Campaña "${name}" eliminada`)
  }

  const FormFields = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-gray-700 block mb-1">Nombre completo *</label>
        <Input
          placeholder="27th World Mining Congress 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Nombre corto (opcional)</label>
        <Input placeholder="WMC 2026" value={shortName} onChange={(e) => setShortName(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Ubicación (opcional)</label>
        <Input placeholder="Lima, Perú" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Inicio *</label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-1">Fin *</label>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-gray-700 block mb-1">URL del evento (opcional)</label>
        <Input placeholder="https://wmc2026.com" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
    </div>
  )

  const active = campaigns.filter((c) => !c.isArchived)
  const archived = campaigns.filter((c) => c.isArchived)

  return (
    <div className="space-y-4">
      {/* Botón nueva campaña */}
      {!showNew && editingId === null && (
        <Button onClick={() => { resetForm(); setShowNew(true) }} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Nueva campaña
        </Button>
      )}

      {/* Formulario nuevo */}
      {showNew && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          {FormFields}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleCreate}
              disabled={isPending('create') || !name.trim() || !startDate || !endDate}
              size="sm"
            >
              Crear campaña
            </Button>
            <Button onClick={() => { setShowNew(false); resetForm() }} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Lista de campañas activas */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Activas ({active.length})
          </h3>
          {active.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              isEditing={editingId === c.id}
              formFields={FormFields}
              onStartEdit={() => startEdit(c)}
              onCancelEdit={() => { setEditingId(null); resetForm() }}
              onSave={() => handleSave(c.id)}
              onArchive={() => handleArchiveToggle(c)}
              onDelete={() => handleDelete(c.id, c.name)}
              isSaving={isPending(c.id)}
              isToggling={isPending(`archive-${c.id}`)}
            />
          ))}
        </div>
      )}

      {/* Lista de campañas archivadas */}
      {archived.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Archivadas ({archived.length})
          </h3>
          {archived.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              isEditing={editingId === c.id}
              formFields={FormFields}
              onStartEdit={() => startEdit(c)}
              onCancelEdit={() => { setEditingId(null); resetForm() }}
              onSave={() => handleSave(c.id)}
              onArchive={() => handleArchiveToggle(c)}
              onDelete={() => handleDelete(c.id, c.name)}
              isSaving={isPending(c.id)}
              isToggling={isPending(`archive-${c.id}`)}
              compact
            />
          ))}
        </div>
      )}

      {campaigns.length === 0 && (
        <p className="text-sm text-gray-500">No hay campañas creadas todavía.</p>
      )}
    </div>
  )
}

interface CardProps {
  campaign: CampaignRow
  isEditing: boolean
  formFields: React.ReactNode
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onArchive: () => void
  onDelete: () => void
  isSaving: boolean
  isToggling: boolean
  compact?: boolean
}

function CampaignCard({
  campaign, isEditing, formFields,
  onStartEdit, onCancelEdit, onSave, onArchive, onDelete,
  isSaving, isToggling, compact,
}: CardProps) {
  if (isEditing) {
    return (
      <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50/30 p-4 space-y-3">
        {formFields}
        <div className="flex gap-2 pt-1">
          <Button onClick={onSave} disabled={isSaving} size="sm">
            <Check className="mr-1 h-3.5 w-3.5" />
            Guardar
          </Button>
          <Button onClick={onCancelEdit} variant="outline" size="sm">
            <X className="mr-1 h-3.5 w-3.5" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white p-4 ${compact ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Megaphone className="h-4 w-4 text-indigo-500 shrink-0" />
            <h4 className="text-sm font-semibold text-gray-900">{campaign.name}</h4>
            {campaign.shortName && (
              <Badge variant="outline" className="text-[10px]">{campaign.shortName}</Badge>
            )}
            <Badge variant="outline" className="text-[10px] gap-1">
              {campaign._count.assessments} kiosko{campaign._count.assessments !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatRange(campaign.startDate, campaign.endDate)}
            </span>
            {campaign.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {campaign.location}
              </span>
            )}
            {campaign.url && (
              <a
                href={campaign.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="h-3 w-3" />
                sitio
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onStartEdit}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5 text-gray-400" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onArchive}
            disabled={isToggling}
            title={campaign.isArchived ? 'Reactivar' : 'Archivar'}
          >
            {campaign.isArchived ? (
              <ArchiveRestore className="h-3.5 w-3.5 text-gray-400 hover:text-indigo-500" />
            ) : (
              <Archive className="h-3.5 w-3.5 text-gray-400 hover:text-amber-500" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onDelete}
            disabled={isSaving}
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}
