import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CareerSelector } from '@/components/career-selector'

export default async function SelectCareerPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // If user already has a career, redirect to lessons
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { careerId: true },
  })
  if (user?.careerId) redirect('/lessons')

  // Onboarding: Sede → Carrera → Admisión.
  // Solo sedes activas CON carreras asignadas (los programas internos sin
  // sede — Tutoría, ENTER, Inducción — no aparecen como opción de carrera).
  const [sedes, periods] = await Promise.all([
    prisma.sede.findMany({
      where: { isActive: true, careers: { some: {} } },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        careers: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.academicPeriod.findMany({
      where: { isActive: true },
      orderBy: { name: 'desc' },
      select: { id: true, name: true },
    }),
  ])

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Completa tus datos</h1>
          <p className="mt-2 text-muted-foreground">
            Elige tu sede, carrera y admisión para ver tus lecciones.
          </p>
        </div>

        {sedes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No hay sedes con carreras disponibles todavía. Contacta al administrador.
            </p>
          </div>
        ) : (
          <CareerSelector sedes={sedes} periods={periods} />
        )}
      </div>
    </div>
  )
}
