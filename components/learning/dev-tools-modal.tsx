'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface DevToolsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
}

export function DevToolsModal({
  open,
  onOpenChange,
  sessionId,
}: DevToolsModalProps) {
  const router = useRouter()
  const [isResetting, setIsResetting] = useState(false)

  const handleResetLesson = async () => {

    setIsResetting(true)

    try {
      const response = await fetch('/api/dev/reset-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Error al reiniciar la clase')
      }

      const data = await response.json()

      toast.success(data.message || 'Clase reiniciada correctamente')

      // Cerrar modal
      onOpenChange(false)

      // Redirect a /lessons
      if (data.redirect) {
        router.push(data.redirect)
      }
    } catch (error) {
      console.error('Error resetting lesson:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al reiniciar la clase. Intenta de nuevo.'
      )
    } finally {
      setIsResetting(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔧 Dev Tools
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-normal">
              ⚠️ Solo desarrollo
            </span>
          </DialogTitle>
          <DialogDescription>
            Herramientas de desarrollo para testing y debugging.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium text-sm">⚠️ Reiniciar Clase</h3>
            <p className="text-sm text-gray-500">
              Elimina todos los mensajes y progreso de actividades de esta
              sesión. La página se recargará automáticamente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleResetLesson} disabled={isResetting}>
              {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  'Reiniciar Clase'
                )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
