import { Button } from '@/components/ui/button'
import { Ripple } from '@/components/ui/ripple'
import { AuroraBackground } from '@/components/ui/aurora-background'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white relative">
      <AuroraBackground>
        <Ripple />
        <div className="text-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">
              Sophia
            </h1>
            {/* Gradients */}
            <div className="absolute inset-x-10 sm:inset-x-20 bottom-0 bg-linear-to-r from-transparent via-indigo-500 to-transparent h-0.5 w-3/4 blur-sm" />
            <div className="absolute inset-x-10 sm:inset-x-20 bottom-0 bg-linear-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
            <div className="absolute inset-x-10 sm:inset-x-60 bottom-0 bg-linear-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
            <div className="absolute inset-x-10 sm:inset-x-60 bottom-0 bg-linear-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />
          </div>
          <p className="text-2xl text-gray-600 mb-8">
            Aprendizaje impulsado por IA para todos
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/lessons">
              <Button>Iniciar</Button>
            </Link>
          </div>
        </div>
      </AuroraBackground>
    </main>
  )
}
