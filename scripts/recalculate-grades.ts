import { prisma } from '../lib/prisma'

async function recalculateGrades() {
  // Find all completed, non-test lesson sessions
  const sessions = await prisma.lessonSession.findMany({
    where: {
      completedAt: { not: null },
      isTest: false,
    },
    include: {
      user: { select: { name: true, email: true } },
      lesson: { select: { title: true } },
      activities: {
        where: { status: 'COMPLETED' },
      },
    },
  })

  console.log(`Found ${sessions.length} completed lesson sessions to recalculate.\n`)
  console.log('='.repeat(100))

  const comprehensionScores: Record<string, number> = {
    memorized: 40, understood: 70, applied: 85, analyzed: 100,
  }
  const attemptPenalty = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75]

  let updated = 0

  for (const session of sessions) {
    const completedActivities = session.activities
    if (completedActivities.length === 0) {
      console.log(`[SKIP] ${session.user.name || session.user.email} | ${session.lesson.title} | No completed activities`)
      continue
    }

    let totalScore = 0
    for (const ap of completedActivities) {
      const evidence = ap.evidenceData as { attempts?: Array<{ analysis?: { understanding_level?: string } }> } | null
      const lastAttempt = evidence?.attempts?.at(-1)
      const level = lastAttempt?.analysis?.understanding_level || 'memorized'
      const comprehension = comprehensionScores[level] || 40
      const efficiency = attemptPenalty[Math.min(ap.attempts - 1, 5)]
      const tangentPenalty = (ap.tangentCount || 0) > 3 ? 0.9 : 1.0
      const activityScore = (comprehension * 0.7) + (comprehension * 0.3 * efficiency * tangentPenalty)
      totalScore += activityScore
    }

    const newGrade = Math.round(totalScore / completedActivities.length)
    const oldGrade = session.grade

    if (oldGrade !== newGrade) {
      await prisma.lessonSession.update({
        where: { id: session.id },
        data: { grade: newGrade },
      })
      updated++
      console.log(`[UPDATED] ${(session.user.name || session.user.email || 'Unknown').padEnd(25)} | ${session.lesson.title.padEnd(40)} | old: ${String(oldGrade ?? 'null').padStart(4)} -> new: ${String(newGrade).padStart(4)}`)
    } else {
      console.log(`[OK]      ${(session.user.name || session.user.email || 'Unknown').padEnd(25)} | ${session.lesson.title.padEnd(40)} | grade: ${String(newGrade).padStart(4)} (unchanged)`)
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log(`Done. ${updated} of ${sessions.length} sessions updated.`)
}

recalculateGrades()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
