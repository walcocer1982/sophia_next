'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Megaphone, Calendar, MapPin, ExternalLink, Users, CheckCircle2, Smile, Frown } from 'lucide-react'
import Link from 'next/link'
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

interface EventosData {
  campaigns: Campaign[]
  orphanAssessments: AssessmentSummary[]
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const sameMonth = sameYear && s.getMonth() === e.getMonth()
  const monthFmt = new Intl.DateTimeFormat('es-PE', { month: 'short' })
  const sDay = s.getDate()
  const eDay = e.getDate()
  if (sameMonth) {
    return `${sDay}-${eDay} ${monthFmt.format(s)} ${s.getFullYear()}`
  }
  if (sameYear) {
    return `${sDay} ${monthFmt.format(s)} – ${eDay} ${monthFmt.format(e)} ${s.getFullYear()}`
  }
  return `${sDay} ${monthFmt.format(s)} ${s.getFullYear()} – ${eDay} ${monthFmt.format(e)} ${e.getFullYear()}`
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

  useEffect(() => {
    fetch('/api/eventos')
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then(setData)
      .catch(() => toast.error('No se pudo cargar eventos'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-sm text-gray-500">Cargando eventos...</p>
      </div>
    )
  }

  if (!data) return null

  const activeCampaigns = data.campaigns.filter((c) => !c.isArchived)
  const archivedCampaigns = data.campaigns.filter((c) => c.isArchived)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="h-7 w-7 text-instructor-600" />
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        </div>
        <p className="text-sm text-gray-600">
          Campañas (ferias, conferencias, demos) y los kioskos asociados a cada una.
        </p>
      </div>

      {/* Campañas activas */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Campañas activas ({activeCampaigns.length})
        </h2>
        {activeCampaigns.length === 0 ? (
          <Card className="p-6 text-sm text-gray-500 text-center">
            No hay campañas activas
          </Card>
        ) : (
          <div className="space-y-4">
            {activeCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
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
                <AssessmentRow key={a.id} assessment={a} />
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
              <CampaignCard key={c.id} campaign={c} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function CampaignCard({ campaign, compact = false }: { campaign: Campaign; compact?: boolean }) {
  const totalParticipants = campaign.assessments.reduce(
    (sum, a) => sum + a.stats.totalParticipants, 0,
  )
  const allNpsScores = campaign.assessments.flatMap((a) =>
    a.stats.npsScore !== null ? [a.stats.npsScore] : [],
  )
  const avgNps = allNpsScores.length > 0
    ? Math.round(allNpsScores.reduce((s, n) => s + n, 0) / allNpsScores.length)
    : null

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-4 border-b border-indigo-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateRange(campaign.startDate, campaign.endDate)}
              </span>
              {campaign.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
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
                  <ExternalLink className="h-3.5 w-3.5" />
                  sitio
                </a>
              )}
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
              <Badge variant="outline" className="bg-white">
                {campaign.assessments.length} kiosko{campaign.assessments.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="p-4">
          {campaign.assessments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Sin kioskos asociados todavía
            </p>
          ) : (
            <div className="space-y-2">
              {campaign.assessments.map((a) => (
                <AssessmentRow key={a.id} assessment={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function AssessmentRow({ assessment }: { assessment: AssessmentSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
            {assessment.code}
          </code>
          {assessment.isActive ? (
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              Activo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600">
              Cerrado
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{assessment.title}</p>
        <p className="text-xs text-gray-500 truncate">{assessment.lessonTitle}</p>
      </div>
      <div className="flex items-center gap-4 text-xs">
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
        <Link
          href={`/eval/${assessment.code}`}
          target="_blank"
          className="text-xs text-indigo-600 hover:text-indigo-800 shrink-0"
        >
          Abrir
        </Link>
      </div>
    </div>
  )
}
