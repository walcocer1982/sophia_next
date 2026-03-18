'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Check, RotateCcw, Pencil, X } from 'lucide-react'
import type { Activity } from '@/types/lesson'

interface ActivityCardProps {
  activity: Activity
  position: number
  total: number
  keyPoints: string[]
  isApproved: boolean
  onApprove: (activityId: string) => void
  onRevoke: (activityId: string) => void
  onEdit?: (activityId: string, updates: Partial<ActivityEdits>) => void
}

export interface ActivityEdits {
  agent_instruction: string
  question: string
  must_include: string[]
  open_ended: boolean
  max_attempts: number
  understanding_level: string
}


export function ActivityCard({ activity, position, total, keyPoints, isApproved, onApprove, onRevoke, onEdit }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(!isApproved)
  const [isEditing, setIsEditing] = useState(false)
  const [editInstruction, setEditInstruction] = useState(activity.teaching.agent_instruction)
  const [editQuestion, setEditQuestion] = useState(activity.verification.question)
  const [editCriteria, setEditCriteria] = useState(activity.verification.success_criteria.must_include.join('\n'))
  const [editOpenEnded, setEditOpenEnded] = useState(activity.verification.open_ended ?? false)
  const [editMaxAttempts, setEditMaxAttempts] = useState(activity.verification.max_attempts ?? 5)
  const [editUnderstandingLevel, setEditUnderstandingLevel] = useState<string>(activity.verification.success_criteria?.understanding_level ?? 'understood')
  const keyPoint = activity.keyPointIndex !== null
    ? (keyPoints[activity.keyPointIndex] || `Punto ${activity.keyPointIndex + 1}`)
    : 'Cierre general'

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${
        isApproved
          ? 'border-emerald-300 bg-emerald-50/50'
          : 'border-orange-200 bg-orange-50/30'
      }`}
    >
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-xs ${
              isApproved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-muted text-muted-foreground'
            }`}>
              {isApproved ? <Check className="inline h-3 w-3" /> : null} {position}/{total}
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm leading-snug">{activity.teaching.agent_instruction}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {keyPoint}
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Instrucción al AI */}
          <div>
            <h4 className="mb-1 text-sm font-semibold">Instrucción al AI</h4>
            {isEditing ? (
              <textarea
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {activity.teaching.agent_instruction}
              </p>
            )}
          </div>

          {/* Pregunta de verificación */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <h4 className="mb-1 text-sm font-semibold text-blue-800">Pregunta de Verificación</h4>
            {isEditing ? (
              <textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="w-full rounded-md border border-blue-300 bg-white p-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                rows={2}
              />
            ) : (
              <p className="text-sm italic text-blue-900">&quot;{activity.verification.question}&quot;</p>
            )}
          </div>

          {/* Criterios de éxito */}
          <div>
            <h4 className="mb-1 text-sm font-semibold">Criterios de Éxito</h4>
            {isEditing ? (
              <>
                <textarea
                  value={editCriteria}
                  onChange={(e) => setEditCriteria(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  rows={4}
                  placeholder="Un criterio por línea"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Un criterio por línea</p>
              </>
            ) : (
              <ul className="list-inside list-disc space-y-1">
                {activity.verification.success_criteria.must_include.map((c, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {isEditing ? (
              <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editOpenEnded}
                      onChange={(e) => setEditOpenEnded(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="font-medium">Evaluación abierta</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    {editOpenEnded ? 'Evalúa comprensión, no palabras exactas' : 'Requiere criterios específicos'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="text-sm">
                    <span className="font-medium">Max intentos:</span>{' '}
                    <select
                      value={editMaxAttempts}
                      onChange={(e) => setEditMaxAttempts(Number(e.target.value))}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={7}>7</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="font-medium">Nivel esperado:</span>{' '}
                    <select
                      value={editUnderstandingLevel}
                      onChange={(e) => setEditUnderstandingLevel(e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="memorized">Memoriza</option>
                      <option value="understood">Comprende</option>
                      <option value="applied">Aplica</option>
                      <option value="analyzed">Analiza</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  {activity.verification.open_ended ? '📖 Evaluación abierta' : '📋 Evaluación por criterios'}
                </span>
                <span>
                  Nivel:{' '}
                  {activity.verification.success_criteria.understanding_level ?? 'understood'}
                </span>
                <span>
                  Max intentos: {activity.verification.max_attempts ?? 5}
                </span>
              </div>
            )}
          </div>

          {/* Errores comunes */}
          {activity.commonMistakes && activity.commonMistakes.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Errores Comunes</h4>
              <ul className="list-inside list-disc space-y-1">
                {activity.commonMistakes.map((m, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 border-t pt-2 text-xs text-muted-foreground">
            <span>ID: {activity.id}</span>
            {activity.teaching.target_length && (
              <span>Target: {activity.teaching.target_length}</span>
            )}
            {activity.teaching.context && (
              <span>Contexto: {activity.teaching.context}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      const criteria = editCriteria
                        .split('\n')
                        .map((c) => c.trim())
                        .filter(Boolean)
                      onEdit?.(activity.id, {
                        agent_instruction: editInstruction.trim(),
                        question: editQuestion.trim(),
                        must_include: criteria,
                        open_ended: editOpenEnded,
                        max_attempts: editMaxAttempts,
                        understanding_level: editUnderstandingLevel,
                      })
                      setIsEditing(false)
                    }}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Guardar edición
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditInstruction(activity.teaching.agent_instruction)
                      setEditQuestion(activity.verification.question)
                      setEditCriteria(activity.verification.success_criteria.must_include.join('\n'))
                      setEditOpenEnded(activity.verification.open_ended ?? false)
                      setEditMaxAttempts(activity.verification.max_attempts ?? 5)
                      setEditUnderstandingLevel(activity.verification.success_criteria?.understanding_level ?? 'understood')
                      setIsEditing(false)
                    }}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
            </div>

            <div>
              {isApproved ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRevoke(activity.id)
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Revisar de nuevo
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation()
                    onApprove(activity.id)
                    setIsExpanded(false)
                  }}
                >
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Aprobar actividad
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
