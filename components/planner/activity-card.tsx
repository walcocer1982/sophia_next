'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Activity } from '@/types/lesson'

interface ActivityCardProps {
  activity: Activity
  position: number
  total: number
  keyPoints: string[]
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  explanation: { label: 'Explicación', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  practice: { label: 'Práctica', className: 'bg-green-100 text-green-800 border-green-200' },
  reflection: { label: 'Reflexión', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  closing: { label: 'Cierre', className: 'bg-amber-100 text-amber-800 border-amber-200' },
}

const COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'Simple',
  moderate: 'Moderado',
  complex: 'Complejo',
}

export function ActivityCard({ activity, position, total, keyPoints }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const typeInfo = TYPE_CONFIG[activity.type] || TYPE_CONFIG.explanation
  const keyPoint = activity.keyPointIndex !== null
    ? (keyPoints[activity.keyPointIndex] || `Punto ${activity.keyPointIndex + 1}`)
    : 'Cierre general'

  // Extraer un título corto de la instrucción
  const shortTitle = activity.teaching.agent_instruction.length > 80
    ? activity.teaching.agent_instruction.slice(0, 80) + '...'
    : activity.teaching.agent_instruction

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {position}/{total}
            </span>
            <CardTitle className="text-base">{shortTitle}</CardTitle>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className={typeInfo.className}>{typeInfo.label}</Badge>
            {activity.complexity && (
              <Badge variant="outline">{COMPLEXITY_LABELS[activity.complexity]}</Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Punto clave: {keyPoint}
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Instrucción al AI */}
          <div>
            <h4 className="mb-1 text-sm font-semibold">Instrucción al AI</h4>
            <p className="text-sm text-muted-foreground">
              {activity.teaching.agent_instruction}
            </p>
          </div>

          {/* Pregunta de verificación */}
          <div>
            <h4 className="mb-1 text-sm font-semibold">Pregunta de Verificación</h4>
            <p className="text-sm italic">&quot;{activity.verification.question}&quot;</p>
          </div>

          {/* Criterios de éxito */}
          <div>
            <h4 className="mb-1 text-sm font-semibold">Criterios de Éxito</h4>
            <ul className="list-inside list-disc space-y-1">
              {activity.verification.success_criteria.must_include.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                Min completitud:{' '}
                {activity.verification.success_criteria.min_completeness ?? 60}%
              </span>
              <span>
                Nivel:{' '}
                {activity.verification.success_criteria.understanding_level ?? 'understood'}
              </span>
              <span>
                Max intentos: {activity.verification.max_attempts ?? 3}
              </span>
            </div>
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
        </CardContent>
      )}
    </Card>
  )
}
