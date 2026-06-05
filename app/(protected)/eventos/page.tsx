import { Megaphone, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'

/**
 * /eventos — Placeholder. Próximamente:
 *  - Lista de Event Campaigns (eventos contenedores como "27th World Mining
 *    Congress 2026", "ProExplo Feria Junio").
 *  - Por campaña: kioskos asociados (cada Assessment es un kiosko).
 *  - Métricas por evento: participantes, NPS promedio, % completados.
 *
 * Hoy los kioskos viven dentro de cada lección en /planner/[c]/[l]/assessments.
 * Se reorganiza acá para ver TODOS los eventos juntos y por campaña.
 */
export default function EventosPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="h-7 w-7 text-instructor-600" />
          <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        </div>
        <p className="text-sm text-gray-600">
          Kioskos y campañas — cursos abiertos para ferias, demos y conferencias.
        </p>
      </div>

      <Card className="p-8 text-center bg-gradient-to-br from-orange-50 to-rose-50 border-orange-100">
        <Sparkles className="h-12 w-12 text-orange-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Próximamente
        </h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto mb-4">
          Acá vas a poder agrupar los kioskos por campaña (27th World Mining
          Congress, ProExplo Feria, etc.) y ver las métricas consolidadas
          de cada evento.
        </p>
        <p className="text-xs text-gray-500">
          Por ahora, los kioskos se crean dentro de cada lección en Diseño.
        </p>
      </Card>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">🎪 Campañas</h3>
          <p className="text-xs text-gray-500">Eventos contenedores</p>
        </Card>
        <Card className="p-4 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">📲 Kioskos</h3>
          <p className="text-xs text-gray-500">Acceso público por código</p>
        </Card>
        <Card className="p-4 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">📊 Métricas</h3>
          <p className="text-xs text-gray-500">Participantes + NPS por evento</p>
        </Card>
      </div>
    </div>
  )
}
