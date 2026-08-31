'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserMini } from './types'

// ═══════════════════════════════════════════════════════════════
// PeopleSection: lista de personas (estudiantes o instructores) con
// botón para agregar y × para quitar. Reusable.
// ═══════════════════════════════════════════════════════════════
export function PeopleSection({
  title, people, available, canEdit, onAdd, onRemove,
  emptyMessage, addLabel, maxVisible,
}: {
  title: string
  people: UserMini[]
  available: { id: string; name: string | null; email: string }[]
  canEdit: boolean
  onAdd: (userId: string) => void
  onRemove: (userId: string, name: string) => void
  emptyMessage: string
  addLabel: string
  maxVisible?: number
}) {
  const [showAll, setShowAll] = useState(false)
  const [picking, setPicking] = useState(false)
  const [filter, setFilter] = useState('')

  const visible = maxVisible && !showAll ? people.slice(0, maxVisible) : people
  const hiddenCount = people.length - visible.length

  const filteredAvailable = filter.trim()
    ? available.filter((u) => {
        const q = filter.toLowerCase()
        return (
          (u.name?.toLowerCase().includes(q) ?? false) ||
          u.email.toLowerCase().includes(q)
        )
      })
    : available

  return (
    <div className="border-t border-gray-200 pt-2">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h4>
        {canEdit && !picking && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPicking(true)}
            className="h-6 px-2 text-[11px] text-indigo-700 hover:bg-indigo-50"
          >
            {addLabel}
          </Button>
        )}
      </div>

      {picking && (
        <div className="mb-2 bg-white border border-indigo-200 rounded-md p-2">
          <Input
            placeholder="Buscar por nombre o email..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 text-xs mb-1.5"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredAvailable.length === 0 ? (
              <p className="text-[11px] text-gray-400 px-2 py-1.5">
                {available.length === 0 ? 'No hay usuarios disponibles.' : 'Sin resultados.'}
              </p>
            ) : (
              filteredAvailable.slice(0, 30).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onAdd(u.id)
                    setPicking(false)
                    setFilter('')
                  }}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-indigo-50 rounded"
                >
                  <span className="font-medium text-gray-800">{u.name || '(sin nombre)'}</span>
                  <span className="text-gray-500 ml-1">· {u.email}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end pt-1.5 mt-1 border-t border-gray-100">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setPicking(false); setFilter('') }}
              className="h-6 px-2 text-[11px]"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {people.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">{emptyMessage}</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {visible.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[11px]"
            >
              <span className="text-gray-800">{p.name || p.email}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id, p.name || p.email)}
                  className="text-gray-400 hover:text-red-600 leading-none"
                  title="Quitar"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-[11px] text-indigo-600 hover:underline px-1.5"
            >
              + {hiddenCount} más
            </button>
          )}
          {showAll && maxVisible && people.length > maxVisible && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="text-[11px] text-gray-500 hover:underline px-1.5"
            >
              Mostrar menos
            </button>
          )}
        </div>
      )}
    </div>
  )
}

