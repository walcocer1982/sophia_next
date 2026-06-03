'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
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
  lessonObjective: string
  keyPoints: string[]
  galleryImages: {
    activityId: string
    url: string
    description: string
    showWhen?: 'on_start' | 'on_reference' | 'on_demand'
    order: number
  }[]
  videoUrl?: string | null
  voiceEnabled?: boolean
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
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (assessment.collectDni && !dni.trim()) {
      toast.error('DNI es obligatorio para esta clase')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/eval/${assessment.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, dni, email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo iniciar la clase')
      }
      const data = await res.json()
      setParticipantId(data.participantId)
      setSessionId(data.sessionId)
      setParticipantName(firstName.trim())
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
    setDni('')
    setEmail('')
    setParticipantId(null)
    setSessionId(null)
    setFinishedData(null)
  }

  if (!assessment.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628] p-4">
        <div className="text-center max-w-md">
          <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={120} height={120} className="mx-auto mb-6 rounded-lg" />
          <h1 className="text-2xl font-bold text-white mb-2">Clase cerrada</h1>
          <p className="text-slate-400">Esta clase ya no está disponible.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0a1628] flex flex-col relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#0a1628]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={40} height={40} className="rounded-md" />
          <div>
            <h1 className="text-sm font-semibold text-white">Sophia · Clase</h1>
            <p className="text-xs text-slate-400">{assessment.title}</p>
          </div>
        </div>
        <div className="text-xs text-slate-400">Código: <span className="font-mono font-semibold text-white">{assessment.code}</span></div>
      </header>

      {/* Content — flex-1 + min-h-0 para que el hijo (session/register) llene
          exactamente lo que queda tras el header, sin necesidad de scroll. */}
      <main className={`flex-1 min-h-0 flex flex-col ${stage === 'register' ? 'items-center justify-center p-6' : ''}`}>
        <AnimatePresence mode="wait">
          {stage === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative w-full max-w-md"
            >
              {/* Glow border effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl opacity-30 blur-md" />

              <div className="relative bg-[#0d1f3c]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-6">
                  <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={80} height={80} className="mx-auto mb-4 rounded-xl" />
                  <h2 className="text-3xl font-bold text-white mb-1">Bienvenido</h2>
                  <p className="text-sm text-cyan-400/80 font-medium">{assessment.lessonTitle}</p>
                </div>

                <form onSubmit={handleStart} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="firstName">Nombre *</label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Tu nombre"
                      required
                      autoFocus
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/50"
                    />
                  </div>
                  {assessment.collectDni && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="dni">DNI *</label>
                      <Input
                        id="dni"
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        placeholder="12345678"
                        maxLength={20}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/50"
                      />
                    </div>
                  )}
                  {assessment.collectEmail && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="email">Correo (opcional)</label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/50"
                      />
                    </div>
                  )}

                  <div className="text-xs text-slate-400 bg-cyan-500/5 border border-cyan-400/20 rounded-lg p-3">
                    La clase dura aproximadamente <strong className="text-cyan-300">{assessment.timeLimitMin} minutos</strong>.
                    Conversá con Sophia, ella te va guiando paso a paso.
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/30"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Iniciando...
                      </>
                    ) : (
                      'Iniciar clase'
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {stage === 'session' && sessionId && participantId && (
            <motion.div
              key="session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex-1 min-h-0 flex flex-col"
            >
              <AssessmentSession
                sessionId={sessionId}
                participantId={participantId}
                participantName={participantName}
                lessonTitle={assessment.lessonTitle}
                lessonObjective={assessment.lessonObjective}
                keyPoints={assessment.keyPoints}
                galleryImages={assessment.galleryImages}
                videoUrl={assessment.videoUrl}
                voiceEnabled={assessment.voiceEnabled ?? true}
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
