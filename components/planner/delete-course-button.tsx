'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function DeleteCourseButton({
  courseId,
  courseTitle,
}: {
  courseId: string
  courseTitle: string
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/planner/course/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
        credentials: 'include',
      })
      if (res.ok) {
        toast.success('Curso eliminado')
        router.push('/planner')
      } else {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-red-500"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="mr-1 h-4 w-4" />
        Eliminar
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Eliminar curso
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          Esta acción ocultará el curso y todas sus sesiones. Escribe el nombre
          del curso para confirmar:
        </p>
        <p className="mb-3 rounded bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          {courseTitle}
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Escribe el nombre del curso..."
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowConfirm(false)
              setConfirmText('')
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={confirmText !== courseTitle || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar curso'}
          </Button>
        </div>
      </div>
    </div>
  )
}
