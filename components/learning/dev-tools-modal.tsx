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
import { Loader2, FileText, Copy, Check } from 'lucide-react'

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
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcript, setTranscript] = useState<string>('')
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

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

  const handleTranscript = async () => {
    setIsLoadingTranscript(true)

    try {
      const response = await fetch(`/api/dev/transcript?sessionId=${sessionId}`)

      if (!response.ok) {
        throw new Error('Error al obtener transcripción')
      }

      const data = await response.json()

      // Formatear transcripción
      const formatted = formatTranscript(data)
      setTranscript(formatted)
      setShowTranscript(true)
    } catch (error) {
      console.error('Error getting transcript:', error)
      toast.error('Error al generar transcripción')
    } finally {
      setIsLoadingTranscript(false)
    }
  }

  const formatTranscript = (data: {
    metadata: Record<string, unknown>
    messages: Array<{ role: string; content: string; timestamp: string }>
  }) => {
    let output = '---\n'
    output += `sessionId: ${data.metadata.sessionId}\n`
    output += `lessonTitle: ${data.metadata.lessonTitle}\n`
    output += `startedAt: ${data.metadata.startedAt}\n`
    output += `currentActivity: ${data.metadata.currentActivity}\n`
    output += `attempts: ${data.metadata.attempts}\n`
    output += `tangentCount: ${data.metadata.tangentCount}\n`
    output += `progress: ${data.metadata.progress}%\n`
    output += `completedActivities: ${data.metadata.completedActivities}/${data.metadata.totalActivities}\n`
    output += '---\n\n'

    data.messages.forEach((msg) => {
      const role = msg.role === 'assistant' ? '[LLM]' : '[USER]'
      output += `${role}\n${msg.content}\n\n`
    })

    return output
  }

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript)
      setIsCopied(true)
      toast.success('Transcripción copiada al portapapeles')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Error copying transcript:', error)
      toast.error('Error al copiar transcripción')
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
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

        {showTranscript ? (
          /* Vista de transcripción */
          <div className="py-4 space-y-4 max-w-xs sm:max-w-lg md:max-w-2xl mx-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">📄 Transcripción de Clase</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyTranscript}
                  disabled={isCopied}
                >
                  {isCopied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowTranscript(false)}
                >
                  Volver
                </Button>
              </div>
            </div>
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto max-h-[60vh] overflow-y-auto border">
              {transcript}
            </pre>
          </div>
        ) : (
          /* Vista principal */
          <>
            <div className="py-4 space-y-6">
              {/* Transcripción */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcribir Clase
                </h3>
                <p className="text-sm text-gray-500">
                  Genera una transcripción completa de la conversación con
                  metadatos para compartir o analizar.
                </p>
                <Button
                  variant="outline"
                  onClick={handleTranscript}
                  disabled={isLoadingTranscript}
                  className="w-full"
                >
                  {isLoadingTranscript ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Transcribir Clase
                    </>
                  )}
                </Button>
              </div>

              {/* Reiniciar */}
              <div className="space-y-2 border-t pt-4">
                <h3 className="font-medium text-sm">⚠️ Reiniciar Clase</h3>
                <p className="text-sm text-gray-500">
                  Elimina todos los mensajes y progreso de actividades de esta
                  sesión. La página se recargará automáticamente.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleResetLesson}
                disabled={isResetting}
              >
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
