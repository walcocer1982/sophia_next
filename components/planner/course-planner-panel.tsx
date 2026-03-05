'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PanelSection } from './panel-section'
import { PanelSectionTema } from './panel-section-tema'
import { PanelSectionObjetivo } from './panel-section-objetivo'
import { PanelSectionKeypoints } from './panel-section-keypoints'
import { CoursePanelTemas } from './course-panel-temas'
import type { CoursePlannerData, CoursePlannerStep, SectionStatus } from '@/types/planner'
import { COURSE_PLANNER_STEPS, COURSE_STEP_LABELS } from '@/types/planner'

interface CoursePlannerPanelProps {
  data: CoursePlannerData
  step: CoursePlannerStep
  sectionStatuses: Record<CoursePlannerStep, SectionStatus>
  editingSection: CoursePlannerStep | null
  onEdit: (field: keyof CoursePlannerData, value: unknown) => void
  onEditSection: (section: CoursePlannerStep | null) => void
  isCollapsed: boolean
  onToggle: () => void
  disabled?: boolean
}

export function CoursePlannerPanel({
  data,
  step,
  sectionStatuses,
  editingSection,
  onEdit,
  onEditSection,
  isCollapsed,
  onToggle,
  disabled = false,
}: CoursePlannerPanelProps) {
  const completedSteps = COURSE_PLANNER_STEPS.filter(
    (s) => sectionStatuses[s] === 'completed'
  ).length
  const progressPercentage = Math.round(
    (completedSteps / COURSE_PLANNER_STEPS.length) * 100
  )

  if (isCollapsed) return null

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-bold text-gray-700">Estructura del Curso</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="border-b px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Paso {COURSE_PLANNER_STEPS.indexOf(step) + 1} de {COURSE_PLANNER_STEPS.length}</span>
          <span className="font-medium text-emerald-600">{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
        <p className="mt-1 text-[10px] text-gray-400">
          {COURSE_STEP_LABELS[step]}
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Curso (título) */}
        <PanelSection
          title="Curso"
          status={sectionStatuses.CURSO}
          isEditing={editingSection === 'CURSO'}
          onStartEdit={() => !disabled && onEditSection('CURSO')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionTema
            value={data.titulo}
            isEditing={editingSection === 'CURSO'}
            onSave={(v) => {
              onEdit('titulo', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Capacidad */}
        <PanelSection
          title="Capacidad"
          status={sectionStatuses.CAPACIDAD}
          isEditing={editingSection === 'CAPACIDAD'}
          onStartEdit={() => !disabled && onEditSection('CAPACIDAD')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionObjetivo
            value={data.capacidad}
            isEditing={editingSection === 'CAPACIDAD'}
            onSave={(v) => {
              onEdit('capacidad', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Aprendizajes */}
        <PanelSection
          title="Aprendizajes Esperados"
          status={sectionStatuses.APRENDIZAJES}
          isEditing={editingSection === 'APRENDIZAJES'}
          onStartEdit={() => !disabled && onEditSection('APRENDIZAJES')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionKeypoints
            value={data.aprendizajes}
            isEditing={editingSection === 'APRENDIZAJES'}
            onSave={(v) => {
              onEdit('aprendizajes', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Temas */}
        <PanelSection
          title="Temas / Sesiones"
          status={sectionStatuses.TEMAS}
          isEditing={editingSection === 'TEMAS'}
          onStartEdit={() => !disabled && onEditSection('TEMAS')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <CoursePanelTemas
            value={data.temas}
            isEditing={editingSection === 'TEMAS'}
            onSave={(v) => {
              onEdit('temas', v)
              onEditSection(null)
            }}
          />
        </PanelSection>
      </div>
    </aside>
  )
}
