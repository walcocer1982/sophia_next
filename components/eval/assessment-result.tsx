'use client'

import { motion } from 'framer-motion'
import { Award, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { levelFromGrade20 } from '@/lib/assessment-utils'

interface AssessmentResultProps {
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
  onNext: () => void
}

export function AssessmentResult({
  gradeOver20,
  passed,
  participantName,
  onNext,
}: AssessmentResultProps) {
  const level = levelFromGrade20(gradeOver20)
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  }
  const c = colorMap[level.color] || colorMap.blue

  return (
    <div className="w-full max-w-md bg-white border rounded-2xl shadow-xl p-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${c.bg} ${c.border} border-2 mb-4`}
      >
        <Award className={`h-10 w-10 ${c.text}`} />
      </motion.div>

      <h2 className="text-xl font-semibold text-gray-700 mb-1">
        ¡Bien hecho, {participantName.split(' ')[0]}!
      </h2>
      <p className="text-sm text-gray-500 mb-6">Tu evaluación ha terminado.</p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`mb-2 ${c.bg} ${c.border} border rounded-xl py-6`}
      >
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Tu puntaje</p>
        <p className={`text-6xl font-bold ${c.text}`}>
          {gradeOver20.toFixed(1)}
          <span className="text-2xl text-gray-400 font-normal">/20</span>
        </p>
        <p className={`mt-2 font-medium ${c.text}`}>{level.label}</p>
      </motion.div>

      <p className={`text-xs mb-6 ${passed ? 'text-emerald-600' : 'text-gray-500'}`}>
        {passed ? 'Aprobado · Comprensión demostrada' : 'En proceso · Sigue practicando'}
      </p>

      <Button
        onClick={onNext}
        size="lg"
        className="w-full gap-2"
      >
        Siguiente participante
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-[10px] text-gray-400 mt-4">
        Tus respuestas han sido guardadas para que el instructor pueda revisarlas.
      </p>
    </div>
  )
}
