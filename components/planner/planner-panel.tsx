'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { PanelSection } from './panel-section'
import { PanelSectionTema } from './panel-section-tema'
import { PanelSectionObjetivo } from './panel-section-objetivo'
import { PanelSectionInstrucciones } from './panel-section-instrucciones'
import { PanelSectionKeypoints } from './panel-section-keypoints'
import { PanelSectionContenido } from './panel-section-contenido'
import { PanelSectionEstructura } from './panel-section-estructura'
import type { PlannerData, PlannerStep, SectionStatus } from '@/types/planner'
import { PLANNER_STEPS, STEP_LABELS } from '@/types/planner'

interface PlannerPanelProps {
  data: PlannerData
  step: PlannerStep
  sectionStatuses: Record<PlannerStep, SectionStatus>
  editingSection: PlannerStep | null
  onEdit: (field: keyof PlannerData, value: unknown) => void
  onEditSection: (section: PlannerStep | null) => void
  isCollapsed: boolean
  onToggle: () => void
  disabled?: boolean
}

export function PlannerPanel({
  data,
  step,
  sectionStatuses,
  editingSection,
  onEdit,
  onEditSection,
  isCollapsed,
  onToggle,
  disabled = false,
}: PlannerPanelProps) {
  // Calcular progreso
  const completedSteps = PLANNER_STEPS.filter(
    (s) => sectionStatuses[s] === 'completed'
  ).length
  const progressPercentage = Math.round(
    (completedSteps / PLANNER_STEPS.length) * 100
  )

  if (isCollapsed) return null

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-bold text-gray-700">Estructura de Clase</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="border-b px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Paso {PLANNER_STEPS.indexOf(step) + 1} de {PLANNER_STEPS.length}</span>
          <span className="font-medium text-emerald-600">{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
        <p className="mt-1 text-[10px] text-gray-400">
          {STEP_LABELS[step]}
        </p>
      </div>

      {/* Sections */}
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Tema */}
        <PanelSection
          title="Tema"
          status={sectionStatuses.TEMA}
          isEditing={editingSection === 'TEMA'}
          onStartEdit={() => !disabled && onEditSection('TEMA')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionTema
            value={data.tema}
            isEditing={editingSection === 'TEMA'}
            onSave={(v) => {
              onEdit('tema', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Objetivo */}
        <PanelSection
          title="Objetivo"
          status={sectionStatuses.OBJETIVO}
          isEditing={editingSection === 'OBJETIVO'}
          onStartEdit={() => !disabled && onEditSection('OBJETIVO')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionObjetivo
            value={data.objetivo}
            isEditing={editingSection === 'OBJETIVO'}
            onSave={(v) => {
              onEdit('objetivo', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Instrucciones */}
        <PanelSection
          title="Instrucciones"
          status={sectionStatuses.INSTRUCCIONES}
          isEditing={editingSection === 'INSTRUCCIONES'}
          onStartEdit={() => !disabled && onEditSection('INSTRUCCIONES')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionInstrucciones
            value={data.instrucciones}
            isEditing={editingSection === 'INSTRUCCIONES'}
            onSave={(v) => {
              onEdit('instrucciones', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Actividades (Puntos Clave) */}
        <PanelSection
          title="Actividades"
          status={sectionStatuses.KEY_POINTS}
          isEditing={editingSection === 'KEY_POINTS'}
          onStartEdit={() => !disabled && onEditSection('KEY_POINTS')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionKeypoints
            value={data.keyPoints}
            isEditing={editingSection === 'KEY_POINTS'}
            onSave={(v) => {
              onEdit('keyPoints', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Contenido Técnico */}
        <PanelSection
          title="Contenido Técnico"
          status={sectionStatuses.CONTENIDO}
          isEditing={editingSection === 'CONTENIDO'}
          onStartEdit={() => !disabled && onEditSection('CONTENIDO')}
          onCancelEdit={() => onEditSection(null)}
          canEdit={!disabled}
        >
          <PanelSectionContenido
            value={data.contenidoTecnico}
            isEditing={editingSection === 'CONTENIDO'}
            onSave={(v) => {
              onEdit('contenidoTecnico', v)
              onEditSection(null)
            }}
          />
        </PanelSection>

        {/* Estructura */}
        <PanelSection
          title="Estructura"
          status={sectionStatuses.ESTRUCTURA}
          isEditing={false}
          onStartEdit={() => {}}
          onCancelEdit={() => {}}
          canEdit={false}
        >
          <PanelSectionEstructura value={data.activities} />
        </PanelSection>

      </div>
    </aside>
  )
}
