'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AssessmentSession } from './assessment-session'
import { AssessmentResult } from './assessment-result'
import { useT } from '@/lib/i18n/use-translation'
import type { Locale } from '@/lib/i18n/strings'
import Image from 'next/image'

interface AssessmentInfo {
  id: string
  code: string
  title: string
  isActive: boolean
  timeLimitMin: number
  collectEmail: boolean
  collectDni: boolean
  lessonId: string
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

interface TranslatedContent {
  title: string
  objective: string
  keyPoints: string[]
  imageDescriptions: { url: string; description: string }[]
}

type Stage = 'register' | 'session' | 'finished'

interface FinishedData {
  participantId: string
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
}

const LANG_STORAGE_KEY = 'sophia.kiosko.lang'

export function AssessmentKiosko({ assessment }: { assessment: AssessmentInfo }) {
  const [stage, setStage] = useState<Stage>('register')
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [participantName, setParticipantName] = useState<string>('')
  const [finishedData, setFinishedData] = useState<FinishedData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Idioma del kiosko. Persiste en localStorage para que el operador del
  // stand no tenga que reseleccionar EN entre cada participante. Se aplica
  // al participant.language + session.language al hacer registro.
  const [language, setLanguage] = useState<Locale>('ES')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'EN' || stored === 'ES') setLanguage(stored)
  }, [])
  const switchLanguage = (next: Locale) => {
    setLanguage(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, next)
    }
  }

  const t = useT(language)

  // Traducción del contenido estático de la lección (title, objective,
  // keyPoints, image descriptions). Se trae lazy cuando se elige EN.
  // Cacheado del lado servidor en LessonContentTranslation, así que las
  // próximas visitas EN para la misma lección son instantáneas.
  const [translation, setTranslation] = useState<TranslatedContent | null>(null)
  const [translating, setTranslating] = useState(false)
  useEffect(() => {
    if (language !== 'EN' || translation || translating) return
    setTranslating(true)
    fetch(`/api/lesson/${assessment.lessonId}/translation?language=EN`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.title) setTranslation(data)
      })
      .catch(() => {
        // Si falla, el kiosko sigue funcionando con el contenido en español.
      })
      .finally(() => setTranslating(false))
  }, [language, assessment.lessonId, translation, translating])

  // Contenido a mostrar — si EN y hay traducción, usá la traducida; si no, original.
  const displayObjective = language === 'EN' && translation ? translation.objective : assessment.lessonObjective
  const displayKeyPoints = language === 'EN' && translation ? translation.keyPoints : assessment.keyPoints
  const displayLessonTitle = language === 'EN' && translation ? translation.title : assessment.lessonTitle
  // Mergeamos descripciones traducidas en las galleryImages preservando metadata.
  const displayGalleryImages = language === 'EN' && translation
    ? assessment.galleryImages.map((img) => {
        const trans = translation.imageDescriptions.find((d) => d.url === img.url)
        return { ...img, description: trans?.description ?? img.description }
      })
    : assessment.galleryImages

  // Form state
  const [firstName, setFirstName] = useState('')
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim()) {
      toast.error(t('register_error_missing_name'))
      return
    }
    if (assessment.collectDni && !dni.trim()) {
      toast.error(t('register_dni') + ' *')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/eval/${assessment.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, dni, email, language }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t('register_error_generic'))
      }
      const data = await res.json() as {
        status: 'created' | 'recovered' | 'already_completed'
        participantId: string
        sessionId: string
        grade?: number
        gradeOver20?: number
        passed?: boolean
        participantName?: string
        language?: 'ES' | 'EN'
      }
      // El idioma del recovery puede diferir del toggle actual — respetamos el
      // de la sesión original para no romper el historial conversacional.
      if (data.language && data.language !== language) {
        switchLanguage(data.language)
      }
      setParticipantId(data.participantId)
      setSessionId(data.sessionId)
      setParticipantName(data.participantName || firstName.trim())

      if (data.status === 'already_completed') {
        // Saltar directo a la pantalla de resultado guardado
        setFinishedData({
          participantId: data.participantId,
          grade: data.grade ?? 0,
          gradeOver20: data.gradeOver20 ?? 0,
          passed: data.passed ?? false,
          participantName: data.participantName || firstName.trim(),
        })
        setStage('finished')
      } else {
        if (data.status === 'recovered') {
          toast.success(t('register_recovered_toast'))
        }
        setStage('session')
      }
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
    await fetch(`/api/eval/${assessment.code}/end`, { method: 'POST' }).catch(() => {})
    setStage('register')
    setFirstName('')
    setDni('')
    setEmail('')
    setParticipantId(null)
    setSessionId(null)
    setFinishedData(null)
    // language NO se resetea — el operador del stand probablemente quiera
    // mantenerlo en EN si está en un evento internacional.
  }

  if (!assessment.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a1628] p-4">
        <div className="text-center max-w-md">
          <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={120} height={120} className="mx-auto mb-6 rounded-lg" />
          <h1 className="text-2xl font-bold text-white mb-2">
            {language === 'EN' ? 'Class closed' : 'Clase cerrada'}
          </h1>
          <p className="text-slate-400">
            {language === 'EN' ? 'This class is no longer available.' : 'Esta clase ya no está disponible.'}
          </p>
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

      {/* Content */}
      <main className={`flex-1 min-h-0 flex flex-col ${stage === 'register' || stage === 'finished' ? 'items-center justify-center p-6' : ''}`}>
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
                {/* Toggle de idioma — chips ES/EN arriba del form.
                    Solo visible en stage register; al pasar a session se
                    pierde de vista para evitar switching mid-class. */}
                <div className="flex items-center justify-center gap-2 mb-5" role="group" aria-label={t('language_switch_aria')}>
                  <button
                    type="button"
                    onClick={() => switchLanguage('ES')}
                    aria-pressed={language === 'ES'}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      language === 'ES'
                        ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    🇪🇸 ES
                  </button>
                  <button
                    type="button"
                    onClick={() => switchLanguage('EN')}
                    aria-pressed={language === 'EN'}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      language === 'EN'
                        ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>

                <div className="text-center mb-6">
                  <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={80} height={80} className="mx-auto mb-4 rounded-xl" />
                  <h2 className="text-3xl font-bold text-white mb-1">{t('register_title')}</h2>
                  <p className="text-sm text-cyan-400/80 font-medium">{displayLessonTitle}</p>
                  {translating && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {language === 'EN' ? 'Loading English content...' : 'Cargando contenido...'}
                    </p>
                  )}
                </div>

                <form onSubmit={handleStart} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="firstName">
                      {t('register_first_name')} *
                    </label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t('register_first_name')}
                      required
                      autoFocus
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/50"
                    />
                  </div>
                  {/* DNI: opcional siempre — sirve como llave de recovery además
                       del cookie. La línea "(opcional — ...)" le explica al
                       visitante por qué darlo. El admin puede forzarlo via
                       assessment.collectDni si su evento requiere registro. */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="dni">
                      {t('register_dni')} {assessment.collectDni && '*'}
                    </label>
                    <Input
                      id="dni"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder="12345678"
                      maxLength={20}
                      required={assessment.collectDni}
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      {t('register_dni_hint')}
                    </p>
                  </div>
                  {assessment.collectEmail && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide" htmlFor="email">
                        {t('register_email')} {t('register_email_optional')}
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400 focus-visible:border-cyan-400/50"
                      />
                    </div>
                  )}

                  <div className="text-xs text-slate-400 bg-cyan-500/5 border border-cyan-400/20 rounded-lg p-3">
                    {language === 'EN' ? (
                      <>The class takes about <strong className="text-cyan-300">{assessment.timeLimitMin} minutes</strong>. Talk with Sophia — she will guide you step by step.</>
                    ) : (
                      <>La clase dura aproximadamente <strong className="text-cyan-300">{assessment.timeLimitMin} minutos</strong>. Conversá con Sophia, ella te va guiando paso a paso.</>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg shadow-cyan-500/30"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {t('register_starting')}
                      </>
                    ) : (
                      t('register_start')
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
                lessonTitle={displayLessonTitle}
                lessonObjective={displayObjective}
                keyPoints={displayKeyPoints}
                galleryImages={displayGalleryImages}
                videoUrl={assessment.videoUrl}
                voiceEnabled={assessment.voiceEnabled ?? true}
                timeLimitMin={assessment.timeLimitMin}
                language={language}
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
                sessionId={sessionId ?? ''}
                grade={finishedData.grade}
                gradeOver20={finishedData.gradeOver20}
                passed={finishedData.passed}
                participantName={finishedData.participantName}
                language={language}
                onNext={handleNextParticipant}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
