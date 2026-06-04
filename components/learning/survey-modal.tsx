'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { type SurveySubmitInput } from '@/lib/validators/survey'
import { useT } from '@/lib/i18n/use-translation'
import type { Locale } from '@/lib/i18n/strings'

interface SurveyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string
  /** Idioma de la encuesta. Default ES — en kiosko se pasa el de la sesión. */
  language?: Locale
  /** Llamado tras un POST exitoso, para que el caller marque submitted=true. */
  onSubmitted?: () => void
}

type UtilityKey = SurveySubmitInput['utility']

const NPS_VALUES = Array.from({ length: 10 }, (_, i) => i + 1) // 1..10

/** Color del botón NPS según el valor — promotores verde, pasivos amarillo,
 * detractores rojo. */
function npsColor(n: number, selected: boolean): string {
  if (n >= 9) return selected
    ? 'bg-green-600 text-white border-green-600'
    : 'bg-white text-green-700 border-green-300 hover:bg-green-50'
  if (n >= 7) return selected
    ? 'bg-yellow-500 text-white border-yellow-500'
    : 'bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50'
  return selected
    ? 'bg-red-600 text-white border-red-600'
    : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
}

export function SurveyModal({ open, onOpenChange, sessionId, language = 'ES', onSubmitted }: SurveyModalProps) {
  const t = useT(language)

  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [npsReason, setNpsReason] = useState('')
  const [utility, setUtility] = useState<UtilityKey | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const utilityOptions: { value: UtilityKey; label: string }[] = [
    { value: 'VERY_USEFUL', label: t('survey_utility_very') },
    { value: 'USEFUL', label: t('survey_utility_useful') },
    { value: 'LOW_USEFUL', label: t('survey_utility_low') },
    { value: 'NOT_USEFUL', label: t('survey_utility_not') },
  ]

  const canSubmit = npsScore !== null && utility !== null && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          npsScore,
          npsReason: npsReason.trim() || null,
          utility,
          language,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Error ${res.status}`)
      }
      toast.success(t('survey_thanks'))
      onSubmitted?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('survey_error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('survey_title')}</DialogTitle>
          <DialogDescription>{t('survey_description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Pregunta 1 — NPS */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-3">
              1. {t('survey_q1')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {NPS_VALUES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNpsScore(n)}
                  className={`w-9 h-9 rounded-full border-2 text-sm font-medium transition-all ${npsColor(n, npsScore === n)}`}
                  aria-label={`${t('survey_q1')} ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 mt-2 px-1">
              <span>{t('survey_nps_low')}</span>
              <span>{t('survey_nps_high')}</span>
            </div>
          </div>

          {/* Pregunta 2 — razón opcional */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              2. {t('survey_q2')}
              <span className="text-gray-400 text-xs ml-2 font-normal">{t('survey_optional')}</span>
            </label>
            <Textarea
              value={npsReason}
              onChange={(e) => setNpsReason(e.target.value.slice(0, 300))}
              placeholder={t('survey_q2_placeholder')}
              rows={3}
              className="resize-none"
            />
            <div className="text-right text-[11px] text-gray-400 mt-1">
              {npsReason.length}/300
            </div>
          </div>

          {/* Pregunta 3 — utility */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              3. {t('survey_q3')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="space-y-2">
              {utilityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setUtility(opt.value)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm transition-all ${
                    utility === opt.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="inline-block w-4 h-4 rounded-full border-2 mr-2 align-middle"
                    style={{
                      borderColor: utility === opt.value ? '#2563eb' : '#d1d5db',
                      backgroundColor: utility === opt.value ? '#2563eb' : 'transparent',
                    }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-40"
          >
            {t('survey_later')}
          </button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? t('survey_sending') : t('survey_submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
