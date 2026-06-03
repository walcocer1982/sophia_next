'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { gradeToRubricLevel } from '@/lib/rubric'
import Image from 'next/image'

interface AssessmentResultProps {
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
  onNext: () => void
}

/**
 * Mapeo qualitative del nivel rubric a label + color visible al participante.
 * Mostramos solo el NIVEL (Logrado, Proceso, etc), no el número — es una clase,
 * no una evaluación con nota numérica. El nivel sirve como feedback positivo
 * para el visitante sin presión competitiva.
 */
const LEVEL_INFO: Record<string, { label: string; from: string; to: string; ring: string; text: string; description: string }> = {
  logrado_destacado: {
    label: 'Destacado',
    from: 'from-emerald-400',
    to: 'to-emerald-600',
    ring: 'ring-emerald-400/40',
    text: 'text-emerald-300',
    description: 'Demostraste comprensión profunda — más allá de lo esperado.',
  },
  logrado: {
    label: 'Logrado',
    from: 'from-cyan-400',
    to: 'to-blue-600',
    ring: 'ring-cyan-400/40',
    text: 'text-cyan-300',
    description: 'Comprendiste correctamente los conceptos clave de esta clase.',
  },
  en_proceso: {
    label: 'En proceso',
    from: 'from-amber-400',
    to: 'to-orange-600',
    ring: 'ring-amber-400/40',
    text: 'text-amber-300',
    description: 'Tenés una base — falta profundizar algunos conceptos.',
  },
  en_inicio: {
    label: 'En inicio',
    from: 'from-rose-400',
    to: 'to-red-600',
    ring: 'ring-rose-400/40',
    text: 'text-rose-300',
    description: 'Una base para seguir explorando el tema.',
  },
}

export function AssessmentResult({
  grade,
  participantName,
  onNext,
}: AssessmentResultProps) {
  const firstName = participantName.split(' ')[0]
  const level = gradeToRubricLevel(grade)
  const info = LEVEL_INFO[level] || LEVEL_INFO.logrado

  return (
    <div className="relative w-full max-w-md">
      <div className={`absolute -inset-0.5 bg-gradient-to-br ${info.from} ${info.to} rounded-2xl opacity-30 blur-md`} />

      <div className="relative bg-[#0d1f3c]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
        <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={56} height={56} className="mx-auto mb-4 rounded-lg opacity-90" />

        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${info.from} ${info.to} ring-4 ${info.ring} mb-5 shadow-xl`}
        >
          {level === 'logrado_destacado' ? <Award className="h-10 w-10 text-white" /> : <Sparkles className="h-10 w-10 text-white" />}
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Gracias por participar, {firstName}!
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-4"
        >
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Tu nivel</p>
          <p className={`text-2xl font-bold ${info.text}`}>{info.label}</p>
        </motion.div>

        <p className="text-sm text-slate-400 mb-6">
          {info.description}
        </p>

        <Button
          onClick={onNext}
          size="lg"
          className={`w-full h-12 gap-2 bg-gradient-to-r ${info.from} ${info.to} hover:opacity-90 text-white border-0 font-semibold shadow-lg`}
        >
          Siguiente participante
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-[10px] text-slate-500 mt-4">
          Tus respuestas quedaron guardadas para que el instructor pueda revisarlas.
        </p>
      </div>
    </div>
  )
}
