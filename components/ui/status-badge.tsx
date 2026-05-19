import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Semantic status pill. Consolidates the ~6 hand-rolled colored badge
 * variants previously inlined across dashboard / admin / lesson components
 * ("Activa/Cerrada", "Destacado/Logrado/En proceso/En inicio", etc.).
 */
export type Status =
  | 'active'
  | 'inactive'
  | 'completed'
  | 'pending'
  | 'logrado_destacado'
  | 'logrado'
  | 'en_proceso'
  | 'en_inicio'

const STYLES: Record<Status, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  logrado_destacado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  logrado: 'bg-blue-50 text-blue-700 border-blue-200',
  en_proceso: 'bg-amber-50 text-amber-700 border-amber-200',
  en_inicio: 'bg-red-50 text-red-600 border-red-200',
}

const DEFAULT_LABELS: Record<Status, string> = {
  active: 'Activa',
  inactive: 'Cerrada',
  completed: 'Completado',
  pending: 'Pendiente',
  logrado_destacado: 'Destacado',
  logrado: 'Logrado',
  en_proceso: 'En proceso',
  en_inicio: 'En inicio',
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: Status
  /** Override the default Spanish label. */
  label?: string
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(STYLES[status], className)}>
      {label ?? DEFAULT_LABELS[status]}
    </Badge>
  )
}
