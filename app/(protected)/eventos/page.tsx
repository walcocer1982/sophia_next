'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Megaphone, Calendar, MapPin, ExternalLink, Users, CheckCircle2,
  Smile, Frown, Plus, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface AssessmentSummary {
  id: string
  code: string
  title: string
  lessonTitle: string
  isActive: boolean
  timeLimitMin: number
  createdAt: string
  closedAt: string | null
  stats: {
    totalParticipants: number
    completed: number
    completionRate: number
    npsAvg: number | null
    npsScore: number | null
    surveyCount: number
  }
}

interface Campaign {
  id: string
  name: string
  shortName: string | null
  startDate: string
  endDate: string
  location: string | null
  url: string | null
  isArchived: boolean
  assessments: AssessmentSummary[]
}

interface LessonOption {
  id: string
  title: string
  courseId: string
  courseTitle: string
  courseTrack: 'REGULAR' | 'CONTINUA'
}

interface ActiveCampaignOption {
  id: string
  name: string
  shortName: string | null
}

interface EventosData {
  campaigns: Campaign[]
  orphanAssessments: AssessmentSummary[]
  options: {
    lessons: LessonOption[]
    activeCampaigns: ActiveCampaignOption[]
  }
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = sameYear && s.getMonth() === e.getMonth()
  const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'short' })
  if (sameMonth) return `${s.getDate()}-${e.getDate()} ${monthFmt.format(s)} ${s.getFullYear()}`
  if (sameYear) return `${s.getDate()} ${monthFmt.format(s)} – ${e.getDate()} ${monthFmt.format(e)} ${s.getFullYear()}`
  return `${s.getDate()} ${monthFmt.format(s)} ${s.getFullYear()} – ${e.getDate()} ${monthFmt.format(e)} ${e.getFullYear()}`
}

function npsColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 30) return 'text-green-600'
  if (score >= 0) return 'text-yellow-600'
  return 'text-red-600'
}

export default function EventosPage() {
  const [data, setData] = useState<EventosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)

  const refetch = useCallback(async (): Promise<void> => {
    try {
      const r = await fetch('/api/eventos')
      if (!r.ok) throw new Error('fetch failed')
      const json = await r.json()
      setData(json)
    } catch {
      toast.error('No se pudo cargar eventos')
    }
  }, [])

  useEffect(() => {
    refetch().finally(() => setLoading(false))
  }, [refetch])

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6"><p className="text-sm text-gray-500">Cargando eventos...</p></div>
  }
  if (!data) return null

  const activeCampaigns = data.campaigns.filter((c) => !c.isArchived)
  const archivedCampaigns = data.campaigns.filter((c) => c.isArchived)

  // "Abrir" deja el kiosko usable de inmediato: si está cerrado lo activa
  // (PATCH isActive) y luego abre /eval/[code]. La pestaña se abre ANTES del
  // await para no perder el gesto del clic (popup blocker).
  const handleOpenKiosko = async (a: AssessmentSummary) => {
    const win = window.open('about:blank', '_blank')
    if (!a.isActive) {
      const res = await fetch(`/api/admin/assessments/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) {
        win?.close()
        toast.error('No se pudo activar el kiosko')
        return
      }
      toast.success('Kiosko activado')
      void refetch()
    }
    if (win) win.location.href = `/eval/${a.code}`
  }

  const handleAssignCampaign = async (assessmentId: string, campaignId: string | null) => {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error')
      }
      toast.success(campaignId ? 'Campaña asignada' : 'Campaña removida')
      await refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="h-7 w-7 text-instructor-600" />
            <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
          </div>
          <p className="text-sm text-gray-600">
            Campañas (ferias, conferencias, demos) y los kioskos asociados a cada una.
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo kiosko
        </Button>
      </div>

      <NewKioskoModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        lessons={data.options.lessons}
        campaigns={data.options.activeCampaigns}
        onCreated={refetch}
      />

      {/* Campañas activas */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Campañas activas ({activeCampaigns.length})
        </h2>
        {activeCampaigns.length === 0 ? (
          <Card className="p-6 text-sm text-gray-500 text-center">No hay campañas activas</Card>
        ) : (
          <div className="space-y-4">
            {activeCampaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                campaigns={data.options.activeCampaigns}
                onAssignCampaign={handleAssignCampaign}
                onOpen={handleOpenKiosko}
              />
            ))}
          </div>
        )}
      </section>

      {/* Kioskos sin campaña */}
      {data.orphanAssessments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Kioskos sin campaña asignada ({data.orphanAssessments.length})
          </h2>
          <Card className="p-4">
            <div className="space-y-2">
              {data.orphanAssessments.map((a) => (
                <AssessmentRow
                  key={a.id}
                  assessment={a}
                  campaigns={data.options.activeCampaigns}
                  onAssignCampaign={handleAssignCampaign}
                  onOpen={handleOpenKiosko}
                />
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Campañas archivadas */}
      {archivedCampaigns.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Campañas archivadas ({archivedCampaigns.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {archivedCampaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                campaigns={data.options.activeCampaigns}
                onAssignCampaign={handleAssignCampaign}
                onOpen={handleOpenKiosko}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function CampaignCard({
  campaign, campaigns, onAssignCampaign, onOpen, compact = false,
}: {
  campaign: Campaign
  campaigns: ActiveCampaignOption[]
  onAssignCampaign: (assessmentId: string, campaignId: string | null) => void
  onOpen: (assessment: AssessmentSummary) => void
  compact?: boolean
}) {
  const totalParticipants = campaign.assessments.reduce((s, a) => s + a.stats.totalParticipants, 0)
  const allNpsScores = campaign.assessments.flatMap((a) => a.stats.npsScore !== null ? [a.stats.npsScore] : [])
  const avgNps = allNpsScores.length > 0 ? Math.round(allNpsScores.reduce((s, n) => s + n, 0) / allNpsScores.length) : null

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-4 border-b border-indigo-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDateRange(campaign.startDate, campaign.endDate)}</span>
              {campaign.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{campaign.location}</span>}
              {campaign.url && <a href={campaign.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"><ExternalLink className="h-3.5 w-3.5" />sitio</a>}
            </div>
          </div>
          {!compact && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <div className="text-xs text-gray-500">Participantes</div>
                <div className="font-semibold text-gray-900">{totalParticipants}</div>
              </div>
              {avgNps !== null && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">NPS prom.</div>
                  <div className={`font-semibold ${npsColor(avgNps)}`}>{avgNps > 0 ? '+' : ''}{avgNps}</div>
                </div>
              )}
              <Badge variant="outline" className="bg-white">{campaign.assessments.length} kiosko{campaign.assessments.length !== 1 ? 's' : ''}</Badge>
            </div>
          )}
        </div>
      </div>
      {!compact && (
        <div className="p-4">
          {campaign.assessments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin kioskos asociados todavía</p>
          ) : (
            <div className="space-y-2">
              {campaign.assessments.map((a) => (
                <AssessmentRow
                  key={a.id}
                  assessment={a}
                  campaigns={campaigns}
                  currentCampaignId={campaign.id}
                  onAssignCampaign={onAssignCampaign}
                  onOpen={onOpen}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function AssessmentRow({
  assessment, campaigns, currentCampaignId, onAssignCampaign, onOpen,
}: {
  assessment: AssessmentSummary
  campaigns: ActiveCampaignOption[]
  currentCampaignId?: string
  onAssignCampaign: (assessmentId: string, campaignId: string | null) => void
  onOpen: (assessment: AssessmentSummary) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{assessment.code}</code>
          {assessment.isActive
            ? <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Activo</Badge>
            : <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600">Cerrado</Badge>
          }
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{assessment.title}</p>
        <p className="text-xs text-gray-500 truncate">{assessment.lessonTitle}</p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className="text-right" title="Participantes / Completados">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="h-3 w-3" />
            <span className="font-semibold">{assessment.stats.totalParticipants}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <CheckCircle2 className="h-3 w-3" />
            <span>{assessment.stats.completionRate}%</span>
          </div>
        </div>
        {assessment.stats.npsScore !== null && (
          <div className="text-right" title={`NPS: ${assessment.stats.surveyCount} encuestas`}>
            <div className={`flex items-center gap-1 font-semibold ${npsColor(assessment.stats.npsScore)}`}>
              {assessment.stats.npsScore >= 0 ? <Smile className="h-3 w-3" /> : <Frown className="h-3 w-3" />}
              {assessment.stats.npsScore > 0 ? '+' : ''}{assessment.stats.npsScore}
            </div>
            <div className="text-gray-500">NPS</div>
          </div>
        )}
        {/* Dropdown asignar/cambiar/quitar campaña */}
        <select
          value={currentCampaignId ?? ''}
          onChange={(e) => onAssignCampaign(assessment.id, e.target.value || null)}
          className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white max-w-[120px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
          title="Asignar campaña"
        >
          <option value="">Sin campaña</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.shortName || c.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onOpen(assessment)}
          className="text-xs text-indigo-600 hover:text-indigo-800 shrink-0"
          title={assessment.isActive ? 'Abrir kiosko' : 'Activar y abrir kiosko'}
        >
          Abrir
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Modal: Nuevo kiosko
// ═══════════════════════════════════════════════════════════════

function NewKioskoModal({
  open, onOpenChange, lessons, campaigns, onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  lessons: LessonOption[]
  campaigns: ActiveCampaignOption[]
  onCreated: () => void | Promise<void>
}) {
  const [lessonId, setLessonId] = useState('')
  const [title, setTitle] = useState('')
  const [timeLimitMin, setTimeLimitMin] = useState(20)
  const [collectDni, setCollectDni] = useState(false)
  const [collectEmail, setCollectEmail] = useState(false)
  const [campaignId, setCampaignId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Auto-rellenar título cuando elige lección
  useEffect(() => {
    if (!lessonId) return
    const l = lessons.find((x) => x.id === lessonId)
    if (l && !title.trim()) setTitle(l.title)
  }, [lessonId, lessons, title])

  const reset = () => {
    setLessonId(''); setTitle(''); setTimeLimitMin(20)
    setCollectDni(false); setCollectEmail(false); setCampaignId('')
  }

  const handleSubmit = async () => {
    if (!lessonId || !title.trim()) {
      toast.error('Lección y título son requeridos')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          title: title.trim(),
          timeLimitMin,
          collectDni,
          collectEmail,
          campaignId: campaignId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al crear kiosko')
      }
      const data = await res.json()
      toast.success(`Kiosko creado: código ${data.code}`)
      reset()
      onOpenChange(false)
      await onCreated()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo kiosko</DialogTitle>
          <DialogDescription>
            Expone una lección como acceso público para una feria, demo o conferencia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lección */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Lección *</label>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 bg-white"
            >
              <option value="">— Elegir lección —</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  [{l.courseTrack === 'CONTINUA' ? 'C' : 'R'}] {l.courseTitle} — {l.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-0.5">
              [C] = Continua &nbsp; [R] = Regular
            </p>
          </div>

          {/* Título */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Título del kiosko *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Demo WMC 2026 — Introducción a la Minería"
              maxLength={120}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Se autocompleta con el título de la lección al elegirla.</p>
          </div>

          {/* Campaign */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Campaña (opcional)</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-2 bg-white"
            >
              <option value="">Sin campaña</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Tiempo + opciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Tiempo límite (min)</label>
              <Input
                type="number"
                min={5}
                max={180}
                value={timeLimitMin}
                onChange={(e) => setTimeLimitMin(parseInt(e.target.value, 10) || 20)}
              />
            </div>
            <div className="flex flex-col gap-1.5 self-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={collectDni} onChange={(e) => setCollectDni(e.target.checked)} />
                <span>Pedir DNI</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={collectEmail} onChange={(e) => setCollectEmail(e.target.checked)} />
                <span>Pedir email</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !lessonId || !title.trim()}>
            {submitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Creando...</> : 'Crear kiosko'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
