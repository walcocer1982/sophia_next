'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ShieldCheck, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ActivityCard, type ActivityEdits } from './activity-card'
import type { Activity } from '@/types/lesson'

interface Props {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  activities: Activity[]
  keyPoints: string[]
}

export function VerificationManager({
  lessonId,
  lessonTitle,
  courseId,
  courseTitle,
  activities: initialActivities,
  keyPoints,
}: Props) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(
    () => new Set(initialActivities.filter((a) => a.verified).map((a) => a.id))
  )
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  const approvedCount = approvedIds.size
  const totalCount = activities.length
  const allApproved = approvedCount === totalCount
  const hasEdits = editedIds.size > 0

  const handleApprove = (activityId: string) => {
    setApprovedIds((prev) => new Set(prev).add(activityId))
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, verified: true } : a))
    )
    setEditedIds((prev) => new Set(prev).add(activityId))
  }

  const handleRevoke = (activityId: string) => {
    setApprovedIds((prev) => {
      const next = new Set(prev)
      next.delete(activityId)
      return next
    })
    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, verified: false } : a))
    )
    setEditedIds((prev) => new Set(prev).add(activityId))
  }

  const handleApproveAll = () => {
    setApprovedIds(new Set(activities.map((a) => a.id)))
    setActivities((prev) => prev.map((a) => ({ ...a, verified: true })))
    setEditedIds(new Set(activities.map((a) => a.id)))
  }

  const handleEdit = useCallback((activityId: string, updates: Partial<ActivityEdits>) => {
    setActivities((prev) =>
      prev.map((a) => {
        if (a.id !== activityId) return a
        return {
          ...a,
          teaching: {
            ...a.teaching,
            ...(updates.agent_instruction !== undefined && {
              agent_instruction: updates.agent_instruction,
            }),
          },
          verification: {
            ...a.verification,
            ...(updates.question !== undefined && {
              question: updates.question,
            }),
            ...(updates.open_ended !== undefined && {
              open_ended: updates.open_ended,
            }),
            ...(updates.max_attempts !== undefined && {
              max_attempts: updates.max_attempts,
            }),
            success_criteria: {
              ...a.verification.success_criteria,
              ...(updates.must_include !== undefined && {
                must_include: updates.must_include,
              }),
              ...(updates.understanding_level !== undefined && {
                understanding_level: updates.understanding_level as 'memorized' | 'understood' | 'applied' | 'analyzed',
              }),
            },
          },
        }
      })
    )
    setEditedIds((prev) => new Set(prev).add(activityId))
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/planner/session/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          keyPoints,
          contentJson: { activities },
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Error al guardar')
      }

      setEditedIds(new Set())
      toast.success('Cambios guardados exitosamente')
      router.push(`/planner/${courseId}`)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/planner/${courseId}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {courseTitle}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold">
          Verificación: {lessonTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa las preguntas y criterios de éxito de cada actividad. Puedes editar o aprobar cada una.
        </p>
      </div>

      {/* Progress bar */}
      <div className={`mb-6 flex items-center justify-between rounded-lg px-4 py-3 ${
        allApproved
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-orange-50 border border-orange-200'
      }`}>
        <div className="flex items-center gap-2">
          {allApproved ? (
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">
              {approvedCount}
            </div>
          )}
          <span className={`text-sm font-medium ${
            allApproved ? 'text-emerald-800' : 'text-orange-800'
          }`}>
            {allApproved
              ? 'Todas las actividades aprobadas'
              : `${approvedCount} de ${totalCount} actividades aprobadas`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasEdits && (
            <span className="text-xs font-medium text-blue-600">
              {editedIds.size} editada{editedIds.size > 1 ? 's' : ''}
            </span>
          )}
          {!allApproved && (
            <button
              onClick={handleApproveAll}
              className="text-xs font-medium text-orange-700 underline hover:text-orange-900"
            >
              Aprobar todas
            </button>
          )}
        </div>
      </div>

      {/* Activity cards */}
      <div className="space-y-4">
        {activities.map((activity, i) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            position={i + 1}
            total={totalCount}
            keyPoints={keyPoints}
            isApproved={approvedIds.has(activity.id)}
            onApprove={handleApprove}
            onRevoke={handleRevoke}
            onEdit={handleEdit}
          />
        ))}
      </div>

      {/* Save bar - appears when there are edits */}
      {hasEdits && (
        <div className="mt-8 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Tienes <strong>{editedIds.size}</strong> actividad{editedIds.size > 1 ? 'es' : ''} editada{editedIds.size > 1 ? 's' : ''} sin guardar.
          </p>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}

      {/* Footer summary */}
      {allApproved && !hasEdits && (
        <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <Check className="h-5 w-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">
            Todas las verificaciones revisadas. La sesión está lista.
          </p>
        </div>
      )}
    </div>
  )
}
