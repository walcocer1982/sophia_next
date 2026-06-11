import { prisma } from '../lib/prisma'

// 14:00 hora Lima (UTC-5) del 11 jun 2026 = 19:00 UTC
const AVAILABLE_AT = new Date('2026-06-11T19:00:00.000Z')
const CLOSES_AFTER_HOURS = 2 // 14:00 → 16:00

const sectionId = 'cmq5gnyga0001ju045umj5crh' // Junio ABQ
const lessonId = 'cmp5mzv1d0009ux5cy7zcbcy2'  // Técnicas de lectura técnica

async function main() {
  const updated = await prisma.sectionLessonSchedule.upsert({
    where: { sectionId_lessonId: { sectionId, lessonId } },
    create: { sectionId, lessonId, availableAt: AVAILABLE_AT, closesAfterHours: CLOSES_AFTER_HOURS },
    update: { availableAt: AVAILABLE_AT, closesAfterHours: CLOSES_AFTER_HOURS },
  })

  // Ensure global publish flag stays true
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { isPublished: true },
  })

  console.log('✅ Schedule actualizado:')
  console.log(`   availableAt (UTC): ${updated.availableAt?.toISOString() ?? 'null'}`)
  console.log(`   closesAfterHours:  ${updated.closesAfterHours}`)
  console.log(`   Lima:              14:00 → 16:00 del 11 jun 2026`)
}

main().finally(() => prisma.$disconnect())
