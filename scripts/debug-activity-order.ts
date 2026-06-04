/**
 * Confirma si el orden de session.activities (DB) coincide con
 * el de contentJson.activities (definición). Si no, el reporte mezcla
 * labels con data equivocada.
 */
import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

async function main() {
  const session = await prisma.lessonSession.findFirst({
    where: {
      assessmentParticipant: {
        firstName: { contains: 'María', mode: 'insensitive' },
      },
    },
    include: {
      lesson: { select: { contentJson: true } },
      activities: { select: { activityId: true, attempts: true, evidenceData: true } },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (!session) return
  const content = session.lesson.contentJson as unknown as LessonContent

  console.log(`\n📋 ORDEN EN contentJson.activities (definición de la lección):`)
  content.activities?.forEach((a, i) => console.log(`   [${i}] ${a.id}`))

  console.log(`\n📋 ORDEN EN session.activities (lo que devuelve Prisma sin orderBy):`)
  session.activities.forEach((a, i) => console.log(`   [${i}] ${a.activityId} — ${a.attempts} intentos`))

  console.log(`\n🚨 SI LOS ORDENES NO COINCIDEN, el reporte cruza labels con data equivocada.`)
  console.log(`   Ejemplo del reporte real generado:`)
  console.log(`   "Requirió 4 intentos en la Actividad 2 (perforación + voladura)"`)
  console.log(`   ¿Es eso cierto? Veamos qué actividad tuvo 4 intentos:\n`)

  const fourAttempts = session.activities.find((a) => a.attempts === 4)
  if (fourAttempts) {
    console.log(`   ⚠️  La actividad con 4 intentos fue: ${fourAttempts.activityId}`)
    const idxInContent = content.activities?.findIndex((a) => a.id === fourAttempts.activityId)
    console.log(`   Esa actividad está en índice ${idxInContent} en contentJson`)
    console.log(`   Pero el reporte la llamó "Actividad 2" → puede estar equivocado.\n`)
  }

  console.log(`\n🔍 EVIDENCIA — criteriaMatched que se loguea en evidenceData:`)
  session.activities.forEach((a) => {
    const ev = a.evidenceData as { attempts?: Array<{ analysis?: { criteriaMatched?: string[] } }> } | null
    const last = ev?.attempts?.at(-1)
    console.log(`   ${a.activityId}: ${JSON.stringify(last?.analysis?.criteriaMatched ?? [])}`)
  })

  console.log(`\n   ⚠️  Estos criterios son strings GENÉRICOS ("Respuesta con reflexión",`)
  console.log(`   "Actividad ya completada"), NO los must_include reales de la lección.`)
  console.log(`   Aunque le pasáramos los must_include al reporte, los criteria matched`)
  console.log(`   en evidenceData siguen siendo inútiles para evaluar qué se cumplió.\n`)

  await prisma.$disconnect()
}

main().catch(console.error)
