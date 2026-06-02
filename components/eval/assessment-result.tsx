'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface AssessmentResultProps {
  // Estos campos quedan en la interfaz por compatibilidad con el flujo /eval
  // existente, pero la UI ya NO los muestra al visitante — es una clase, no
  // una evaluación. Solo se muestra agradecimiento.
  grade: number
  gradeOver20: number
  passed: boolean
  participantName: string
  onNext: () => void
}

export function AssessmentResult({
  participantName,
  onNext,
}: AssessmentResultProps) {
  const firstName = participantName.split(' ')[0]

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-0.5 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl opacity-30 blur-md" />

      <div className="relative bg-[#0d1f3c]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
        <Image src="/cetemin-logo.jpg" alt="CETEMIN" width={56} height={56} className="mx-auto mb-4 rounded-lg opacity-90" />

        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-600 ring-4 ring-cyan-400/40 mb-5 shadow-xl"
        >
          <Sparkles className="h-10 w-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">
          ¡Gracias por participar, {firstName}!
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Esperamos que esta clase te haya servido para aprender algo nuevo.
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
          Tus respuestas quedaron guardadas para que el instructor pueda revisarlas.
        </p>
      </div>
    </div>
  )
}
