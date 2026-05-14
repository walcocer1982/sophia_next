'use client'

import { motion } from 'framer-motion'
import { Award, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { levelFromGrade20 } from '@/lib/assessment-utils'
import Image from 'next/image'

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
  const colorMap: Record<string, { from: string; to: string; ring: string; text: string }> = {
    emerald: { from: 'from-emerald-400', to: 'to-emerald-600', ring: 'ring-emerald-400/40', text: 'text-emerald-300' },
    blue: { from: 'from-cyan-400', to: 'to-blue-600', ring: 'ring-cyan-400/40', text: 'text-cyan-300' },
    amber: { from: 'from-amber-400', to: 'to-orange-600', ring: 'ring-amber-400/40', text: 'text-amber-300' },
    red: { from: 'from-rose-400', to: 'to-red-600', ring: 'ring-rose-400/40', text: 'text-rose-300' },
  }
  const c = colorMap[level.color] || colorMap.blue

  return (
    <div className="relative w-full max-w-md">
      {/* Outer glow */}
      <div className={`absolute -inset-0.5 bg-gradient-to-br ${c.from} ${c.to} rounded-2xl opacity-30 blur-md`} />

      <div className="relative bg-[#0d1f3c]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
        <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={56} height={56} className="mx-auto mb-4 rounded-lg opacity-90" />

        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${c.from} ${c.to} ring-4 ${c.ring} mb-5 shadow-xl`}
        >
          <Award className="h-10 w-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-1">
          ¡Bien hecho, {participantName.split(' ')[0]}!
        </h2>
        <p className="text-sm text-slate-400 mb-6">Tu evaluación ha terminado</p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-3"
        >
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Tu puntaje</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-7xl font-bold bg-gradient-to-br ${c.from} ${c.to} bg-clip-text text-transparent tabular-nums`}>
              {gradeOver20.toFixed(1)}
            </span>
            <span className="text-3xl text-slate-500 font-light">/20</span>
          </div>
          <p className={`mt-3 text-lg font-semibold ${c.text}`}>{level.label}</p>
        </motion.div>

        <p className={`text-xs mb-6 ${passed ? 'text-emerald-400/80' : 'text-slate-500'}`}>
          {passed ? '✓ Aprobado · Comprensión demostrada' : 'Sigue practicando para mejorar'}
        </p>

        <Button
          onClick={onNext}
          size="lg"
          className="w-full h-12 gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 font-semibold shadow-lg shadow-cyan-500/30"
        >
          Siguiente participante
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-[10px] text-slate-500 mt-4">
          Tus respuestas han sido guardadas para que el instructor pueda revisarlas.
        </p>
      </div>
    </div>
  )
}
