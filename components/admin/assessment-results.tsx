'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Participant {
  id: string
  firstName: string
  lastName: string
  dni: string | null
  email: string | null
  startedAt: string
  completedAt: string | null
  grade: number | null
  gradeOver20: number | null
  passed: boolean
}

interface Props {
  assessmentId: string
  title: string
  code: string
  participants: Participant[]
}

export function AssessmentResults({ title, code, participants }: Props) {
  const completed = participants.filter(p => p.completedAt)
  const grades = completed.map(p => p.gradeOver20 || 0).filter(g => g > 0)
  const avg = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : '0.0'
  const passedCount = completed.filter(p => p.passed).length
  const passRate = completed.length > 0 ? Math.round((passedCount / completed.length) * 100) : 0

  const exportCSV = () => {
    const rows = [
      ['Nombre', 'Apellido', 'DNI', 'Correo', 'Inicio', 'Fin', 'Nota /20', 'Nota /100', 'Aprobado'],
      ...participants.map(p => [
        p.firstName,
        p.lastName,
        p.dni || '',
        p.email || '',
        new Date(p.startedAt).toLocaleString('es-PE'),
        p.completedAt ? new Date(p.completedAt).toLocaleString('es-PE') : 'Sin terminar',
        p.gradeOver20?.toFixed(1) || '',
        p.grade?.toString() || '',
        p.passed ? 'Sí' : 'No',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `evaluacion_${code}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Participantes</p>
          <p className="text-2xl font-bold">{participants.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Completaron</p>
          <p className="text-2xl font-bold text-emerald-700">{completed.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Nota promedio /20</p>
          <p className="text-2xl font-bold text-blue-700">{avg}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-xs text-gray-500">Aprobación</p>
          <p className="text-2xl font-bold text-amber-700">{passRate}%</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-semibold">{title}</h2>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">DNI</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Inicio</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Nota /20</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Aún no hay participantes
                </td>
              </tr>
            )}
            {participants.map(p => (
              <tr key={p.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{p.firstName} {p.lastName}</div>
                  {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.dni || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(p.startedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3">
                  {p.completedAt ? (
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${p.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.passed ? 'Aprobado' : 'En proceso'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin terminar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {p.gradeOver20 !== null ? (
                    <span className={p.passed ? 'text-emerald-700' : 'text-amber-700'}>
                      {p.gradeOver20.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
