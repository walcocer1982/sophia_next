'use client'

import { CheckCircle2, Circle, Loader2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SectionStatus } from '@/types/planner'

interface PanelSectionProps {
  title: string
  status: SectionStatus
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  canEdit?: boolean
  children: React.ReactNode
  editChildren?: React.ReactNode
}

function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    case 'in_progress':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    default:
      return <Circle className="h-4 w-4 text-gray-300" />
  }
}

export function PanelSection({
  title,
  status,
  isEditing,
  onStartEdit,
  onCancelEdit,
  canEdit = true,
  children,
  editChildren,
}: PanelSectionProps) {
  const hasContent = status !== 'not_started'

  return (
    <div className="border-b border-gray-200 pb-3">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        {canEdit && hasContent && !isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onStartEdit}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="pl-6">
        {isEditing && editChildren ? editChildren : children}
      </div>
    </div>
  )
}
