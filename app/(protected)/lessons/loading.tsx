import { AuroraBackground } from '@/components/ui/aurora-background'
import Loader from '@/components/ui/loader'

export default function Loading() {
  return (
    <main className="min-h-screen bg-white relative">
      <AuroraBackground>
        <Loader
        title="Cargando catálogo"
        subtitle="Preparando las clases disponibles para ti"
        size="md"
      />
      </AuroraBackground>
    </main>
  )
}
