'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AssessmentSession } from './assessment-session'
import { AssessmentResult } from './assessment-result'
import Image from 'next/image'

interface AssessmentInfo {
  id: string
  code: string
  title: string
  isActive: boolean
  timeLimitMin: number
  collectEmail: boolean
  collectDni: boolean
  lessonTitle: string
}

type Stage = 'register' | 'session' | 'finished'

interface FinishedData {
  participantId: string
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
}

export function AssessmentKiosko({ assessment }: { assessment: AssessmentInfo }) {
  const [stage, setStage] = useState<Stage>('register')
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [participantName, setParticipantName] = useState<string>('')
  const [finishedData, setFinishedData] = useState<FinishedData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Nombre y apellido son obligatorios')
      return
    }
    if (assessment.collectDni && !dni.trim()) {
      toast.error('DNI es obligatorio para esta evaluación')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/eval/${assessment.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, dni, email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo iniciar la evaluación')
      }
      const data = await res.json()
      setParticipantId(data.participantId)
      setSessionId(data.sessionId)
      setParticipantName(`${firstName.trim()} ${lastName.trim()}`)
      setStage('session')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSessionFinished = (data: FinishedData) => {
    setFinishedData(data)
    setStage('finished')
  }

  const handleNextParticipant = async () => {
    // Clear cookies via API
    await fetch(`/api/eval/${assessment.code}/end`, { method: 'POST' }).catch(() => {})
    setStage('register')
    setFirstName('')
    setLastName('')
    setDni('')
    setEmail('')
    setParticipantId(null)
    setSessionId(null)
    setFinishedData(null)
  }

  if (!assessment.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Evaluación cerrada</h1>
          <p className="text-gray-500">Esta evaluación ya no está disponible.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/sophia-avatar.png" alt="Sophia" width={36} height={36} className="rounded-full" />
          <div>
            <h1 className="text-sm font-semibold">Sophia · Evaluación</h1>
            <p className="text-xs text-gray-500">{assessment.title}</p>
          </div>
        </div>
        <div className="text-xs text-gray-500">Código: <span className="font-mono font-semibold">{assessment.code}</span></div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {stage === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md bg-white border rounded-2xl shadow-lg p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido</h2>
              <p className="text-sm text-gray-500 mb-6">
                Tema: <span className="font-medium text-gray-700">{assessment.lessonTitle}</span>
              </p>

              <form onSubmit={handleStart} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">Nombre *</label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">Apellido *</label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Pérez"
                    required
                  />
                </div>
                {assessment.collectDni && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dni">DNI *</label>
                    <Input
                      id="dni"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder="12345678"
                      maxLength={20}
                      required
                    />
                  </div>
                )}
                {assessment.collectEmail && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Correo (opcional)</label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                    />
                  </div>
                )}

                <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-md p-3">
                  Tendrás <strong>{assessment.timeLimitMin} minutos</strong> para completar la evaluación.
                  Recibirás un puntaje sobre 20 al finalizar.
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    'Iniciar evaluación'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {stage === 'session' && sessionId && participantId && (
            <motion.div
              key="session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full"
            >
              <AssessmentSession
                sessionId={sessionId}
                participantId={participantId}
                participantName={participantName}
                lessonTitle={assessment.lessonTitle}
                timeLimitMin={assessment.timeLimitMin}
                onFinished={handleSessionFinished}
              />
            </motion.div>
          )}

          {stage === 'finished' && finishedData && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <AssessmentResult
                grade={finishedData.grade}
                gradeOver20={finishedData.gradeOver20}
                passed={finishedData.passed}
                participantName={finishedData.participantName}
                onNext={handleNextParticipant}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
