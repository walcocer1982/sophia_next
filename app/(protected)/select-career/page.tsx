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

  const careers = await prisma.career.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Selecciona tu carrera</h1>
          <p className="mt-2 text-muted-foreground">
            Elige la carrera a la que perteneces para ver tus lecciones.
          </p>
        </div>

        {careers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No hay carreras disponibles todavía. Contacta al administrador.
            </p>
          </div>
        ) : (
          <CareerSelector careers={careers} />
        )}
      </div>
    </div>
  )
}
