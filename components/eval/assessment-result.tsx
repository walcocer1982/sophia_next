'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { gradeToRubricLevel } from '@/lib/rubric'
import { useT } from '@/lib/i18n/use-translation'
import type { Locale, StringKey } from '@/lib/i18n/strings'
import { SurveyModal } from '@/components/learning/survey-modal'
import Image from 'next/image'

interface AssessmentResultProps {
  /** sessionId del LessonSession del participante — necesario para guardar
   * la encuesta NPS. */
  sessionId: string
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
  language?: Locale
  onNext: () => void
}

type LevelKey = 'logrado_destacado' | 'logrado' | 'en_proceso' | 'en_inicio'

interface LevelInfo {
  labelKey: StringKey
  descKey: StringKey
  from: string
  to: string
  ring: string
  text: string
}

/**
 * Mapeo qualitative del nivel rubric a label + color visible al participante.
 * Strings traducibles via labelKey/descKey contra el diccionario i18n.
 */
const LEVEL_INFO: Record<LevelKey, LevelInfo> = {
  logrado_destacado: {
    labelKey: 'rubric_destacado',
    descKey: 'rubric_destacado_desc',
    from: 'from-emerald-400',
    to: 'to-emerald-600',
    ring: 'ring-emerald-400/40',
    text: 'text-emerald-300',
  },
  logrado: {
    labelKey: 'rubric_logrado',
    descKey: 'rubric_logrado_desc',
    from: 'from-cyan-400',
    to: 'to-blue-600',
    ring: 'ring-cyan-400/40',
    text: 'text-cyan-300',
  },
  en_proceso: {
    labelKey: 'rubric_proceso',
    descKey: 'rubric_proceso_desc',
    from: 'from-amber-400',
    to: 'to-orange-600',
    ring: 'ring-amber-400/40',
    text: 'text-amber-300',
  },
  en_inicio: {
    labelKey: 'rubric_inicio',
    descKey: 'rubric_inicio_desc',
    from: 'from-rose-400',
    to: 'to-red-600',
    ring: 'ring-rose-400/40',
    text: 'text-rose-300',
  },
}

export function AssessmentResult({
  sessionId,
  grade,
  gradeOver20,
  participantName,
  language = 'ES',
  onNext,
}: AssessmentResultProps) {
  const t = useT(language)
  const firstName = participantName.split(' ')[0]
  const level = gradeToRubricLevel(grade) as LevelKey
  const info = LEVEL_INFO[level] || LEVEL_INFO.logrado

  // Survey: se abre 1.5s después de mostrar el resultado, dando tiempo al
  // visitante a leer la nota. Si ya respondió (caso raro: si volviera atrás),
  // no se abre.
  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyChecked, setSurveyChecked] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    fetch(`/api/survey/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        setSurveyChecked(true)
        if (data && !data.submitted) {
          setTimeout(() => {
            if (!cancelled) setShowSurvey(true)
          }, 1500)
        }
      })
      .catch(() => setSurveyChecked(true))
    return () => {
      cancelled = true
    }
  }, [sessionId])

  return (
    <>
      <div className="relative w-full max-w-md">
        <div className={`absolute -inset-0.5 bg-gradient-to-br ${info.from} ${info.to} rounded-2xl opacity-30 blur-md`} />

        <div className="relative bg-[#0d1f3c]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
          <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={56} height={56} className="mx-auto mb-4 rounded-lg opacity-90" />

          {/* La nota es el elemento protagonista de la pantalla */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`mx-auto w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-br ${info.from} ${info.to} ring-4 ${info.ring} mb-5 shadow-xl`}
          >
            {/* Número centrado en el eje, denominador debajo — el "/20" a la
                derecha desplazaba el número del centro del círculo. */}
            <span className="flex flex-col items-center">
              <span className="text-5xl font-extrabold text-white leading-none">{gradeOver20.toFixed(1)}</span>
              <span className="mt-1.5 text-base font-semibold text-white/75 leading-none">/20</span>
            </span>
          </motion.div>

          <h2 className="text-lg font-semibold text-white mb-2">
            {language === 'EN' ? `Thanks for participating, ${firstName}!` : `¡Gracias por participar, ${firstName}!`}
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-4"
          >
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">{t('result_level_label')}</p>
            <p className={`text-2xl font-bold ${info.text}`}>{t(info.labelKey)}</p>
          </motion.div>

          <p className="text-sm text-slate-400 mb-6">
            {t(info.descKey)}
          </p>

          <Button
            onClick={onNext}
            size="lg"
            className={`w-full h-12 gap-2 bg-gradient-to-r ${info.from} ${info.to} hover:opacity-90 text-white border-0 font-semibold shadow-lg`}
          >
            {language === 'EN' ? 'Next participant' : 'Siguiente participante'}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-[10px] text-slate-500 mt-4">
            {language === 'EN'
              ? 'Your answers were saved for the instructor to review.'
              : 'Tus respuestas quedaron guardadas para que el instructor pueda revisarlas.'}
          </p>
        </div>
      </div>

      {surveyChecked && sessionId && (
        <SurveyModal
          open={showSurvey}
          onOpenChange={setShowSurvey}
          sessionId={sessionId}
          language={language}
        />
      )}
    </>
  )
}
