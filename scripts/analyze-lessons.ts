import { prisma } from '../lib/prisma'
import type { LessonContent, Activity } from '../types/lesson'

async function main() {
  // 1. Get all published lessons with contentJson
  const lessons = await prisma.lesson.findMany({
    where: { isPublished: true },
    include: {
      course: { select: { title: true, slug: true } },
      sessions: {
        select: {
          id: true,
          startedAt: true,
          lastActivityAt: true,
          completedAt: true,
          isTest: true,
          messages: { select: { id: true } },
          activities: {
            select: {
              activityId: true,
              attempts: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
  })

  console.log(`\n${'='.repeat(120)}`)
  console.log(`LESSON DESIGN ANALYSIS — ${lessons.length} published lessons`)
  console.log(`${'='.repeat(120)}\n`)

  for (const lesson of lessons) {
    const content = lesson.contentJson as unknown as LessonContent
    const activities = content?.activities || []

    console.log(`${'─'.repeat(120)}`)
    console.log(`LESSON: ${lesson.title}`)
    console.log(`  Course: ${lesson.course.title} | Slug: ${lesson.slug} | Order: ${lesson.order}`)
    console.log(`  Objective: ${lesson.objective}`)
    console.log(`  Key Points: ${lesson.keyPoints.length} → ${lesson.keyPoints.join(' | ')}`)
    console.log(`  Total Activities: ${activities.length}`)

    // Activity details
    let totalInstructionChars = 0

    console.log(`\n  ACTIVITIES:`)
    console.log(`  ${'─'.repeat(116)}`)

    for (let i = 0; i < activities.length; i++) {
      const act = activities[i]
      const instructionLen = act.teaching?.agent_instruction?.length || 0
      totalInstructionChars += instructionLen

      const imageCount =
        (act.teaching?.images?.length || 0) +
        (act.teaching?.image ? 1 : 0)

      const mustInclude = act.verification?.success_criteria?.must_include || []
      const maxAttempts = act.verification?.max_attempts ?? 3
      const openEnded = act.verification?.open_ended ?? false
      const complexity = act.complexity || 'not set'

      console.log(`\n  [${i + 1}] ${act.id} (${act.type}) — complexity: ${complexity}`)
      console.log(`      agent_instruction (${instructionLen} chars): ${(act.teaching?.agent_instruction || '').substring(0, 150)}...`)
      console.log(`      verification.question (${(act.verification?.question || '').length} chars): ${(act.verification?.question || '').substring(0, 150)}...`)
      console.log(`      max_attempts: ${maxAttempts} | open_ended: ${openEnded} | images: ${imageCount}`)
      console.log(`      must_include (${mustInclude.length} criteria):`)
      for (const c of mustInclude) {
        console.log(`        - ${c}`)
      }
    }

    console.log(`\n  TOTALS:`)
    console.log(`    Total agent_instruction chars: ${totalInstructionChars.toLocaleString()}`)
    console.log(`    Avg instruction chars/activity: ${activities.length > 0 ? Math.round(totalInstructionChars / activities.length) : 0}`)

    // Session stats (exclude test sessions)
    const realSessions = lesson.sessions.filter(s => !s.isTest)
    const completedSessions = realSessions.filter(s => s.completedAt)

    console.log(`\n  SESSION STATS:`)
    console.log(`    Total sessions: ${realSessions.length} | Completed: ${completedSessions.length}`)

    if (completedSessions.length > 0) {
      // Avg messages per completed session
      const avgMessages =
        completedSessions.reduce((sum, s) => sum + s.messages.length, 0) /
        completedSessions.length

      // Avg duration in minutes
      const durations = completedSessions.map(s => {
        const start = new Date(s.startedAt).getTime()
        const end = new Date(s.lastActivityAt).getTime()
        return (end - start) / 1000 / 60 // minutes
      })
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const minDuration = Math.min(...durations)
      const maxDuration = Math.max(...durations)

      console.log(`    Avg messages/completed session: ${avgMessages.toFixed(1)}`)
      console.log(`    Avg duration (completed): ${avgDuration.toFixed(1)} min (min: ${minDuration.toFixed(1)}, max: ${maxDuration.toFixed(1)})`)
    } else {
      console.log(`    No completed sessions to analyze`)
    }

    // In-progress sessions (not completed)
    const inProgressSessions = realSessions.filter(s => !s.completedAt)
    if (inProgressSessions.length > 0) {
      const avgMessagesIP =
        inProgressSessions.reduce((sum, s) => sum + s.messages.length, 0) /
        inProgressSessions.length
      const durationsIP = inProgressSessions.map(s => {
        const start = new Date(s.startedAt).getTime()
        const end = new Date(s.lastActivityAt).getTime()
        return (end - start) / 1000 / 60
      })
      const avgDurationIP = durationsIP.reduce((a, b) => a + b, 0) / durationsIP.length

      console.log(`    In-progress sessions: ${inProgressSessions.length}`)
      console.log(`    Avg messages/in-progress: ${avgMessagesIP.toFixed(1)}`)
      console.log(`    Avg time spent (in-progress): ${avgDurationIP.toFixed(1)} min`)
    }

    // Avg attempts per activity across all students
    const allActivities = realSessions.flatMap(s => s.activities)
    if (allActivities.length > 0) {
      // Group by activityId
      const byActivity = new Map<string, { attempts: number[]; completed: number; total: number }>()
      for (const ap of allActivities) {
        if (!byActivity.has(ap.activityId)) {
          byActivity.set(ap.activityId, { attempts: [], completed: 0, total: 0 })
        }
        const entry = byActivity.get(ap.activityId)!
        entry.attempts.push(ap.attempts)
        entry.total++
        if (ap.status === 'COMPLETED') entry.completed++
      }

      console.log(`\n  ACTIVITY ATTEMPTS (across all students):`)
      console.log(`  ${'─'.repeat(116)}`)

      // Show in order of activities array
      for (let i = 0; i < activities.length; i++) {
        const act = activities[i]
        const stats = byActivity.get(act.id)
        if (stats) {
          const avgAttempts = stats.attempts.reduce((a, b) => a + b, 0) / stats.attempts.length
          const maxAtt = Math.max(...stats.attempts)
          console.log(
            `    [${i + 1}] ${act.id} (${act.type}): avg ${avgAttempts.toFixed(1)} attempts, max ${maxAtt}, completed ${stats.completed}/${stats.total} students`
          )
        } else {
          console.log(`    [${i + 1}] ${act.id} (${act.type}): no data`)
        }
      }
    }

    console.log('')
  }

  // Summary
  console.log(`\n${'='.repeat(120)}`)
  console.log('SUMMARY ACROSS ALL LESSONS')
  console.log(`${'='.repeat(120)}`)

  const summaryRows: {
    lesson: string
    activities: number
    totalChars: number
    avgMsgsCompleted: string
    avgDurationCompleted: string
    completedCount: number
    totalSessions: number
  }[] = []

  for (const lesson of lessons) {
    const content = lesson.contentJson as unknown as LessonContent
    const activities = content?.activities || []
    const totalChars = activities.reduce(
      (sum, a) => sum + (a.teaching?.agent_instruction?.length || 0),
      0
    )
    const realSessions = lesson.sessions.filter(s => !s.isTest)
    const completedSessions = realSessions.filter(s => s.completedAt)

    let avgMsgs = '-'
    let avgDur = '-'
    if (completedSessions.length > 0) {
      avgMsgs = (
        completedSessions.reduce((sum, s) => sum + s.messages.length, 0) /
        completedSessions.length
      ).toFixed(1)
      const durations = completedSessions.map(s => {
        const start = new Date(s.startedAt).getTime()
        const end = new Date(s.lastActivityAt).getTime()
        return (end - start) / 1000 / 60
      })
      avgDur = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    }

    summaryRows.push({
      lesson: lesson.title.substring(0, 50),
      activities: activities.length,
      totalChars,
      avgMsgsCompleted: avgMsgs,
      avgDurationCompleted: avgDur,
      completedCount: completedSessions.length,
      totalSessions: realSessions.length,
    })
  }

  // Print table
  console.log(
    `\n${'Lesson'.padEnd(52)} ${'Acts'.padStart(5)} ${'Chars'.padStart(7)} ${'AvgMsgs'.padStart(8)} ${'AvgMin'.padStart(8)} ${'Done'.padStart(6)} ${'Total'.padStart(6)}`
  )
  console.log(`${'─'.repeat(95)}`)
  for (const r of summaryRows) {
    console.log(
      `${r.lesson.padEnd(52)} ${String(r.activities).padStart(5)} ${String(r.totalChars).padStart(7)} ${r.avgMsgsCompleted.padStart(8)} ${r.avgDurationCompleted.padStart(8)} ${String(r.completedCount).padStart(6)} ${String(r.totalSessions).padStart(6)}`
    )
  }

  // Potential bottleneck flags
  console.log(`\n\nPOTENTIAL BOTTLENECKS:`)
  console.log(`${'─'.repeat(120)}`)
  for (const lesson of lessons) {
    const content = lesson.contentJson as unknown as LessonContent
    const activities = content?.activities || []
    const flags: string[] = []

    if (activities.length > 8) flags.push(`Too many activities (${activities.length})`)

    const longInstructions = activities.filter(
      a => (a.teaching?.agent_instruction?.length || 0) > 800
    )
    if (longInstructions.length > 0)
      flags.push(`${longInstructions.length} activities with instruction > 800 chars`)

    const highCriteria = activities.filter(
      a => (a.verification?.success_criteria?.must_include?.length || 0) > 4
    )
    if (highCriteria.length > 0)
      flags.push(`${highCriteria.length} activities with > 4 must_include criteria`)

    const noOpenEnded = activities.filter(a => !a.verification?.open_ended)
    if (noOpenEnded.length === activities.length && activities.length > 0)
      flags.push(`No open_ended activities (all require specific keywords)`)

    const highAttempts = activities.filter(a => (a.verification?.max_attempts ?? 3) > 4)
    if (highAttempts.length > 0)
      flags.push(`${highAttempts.length} activities with max_attempts > 4`)

    if (flags.length > 0) {
      console.log(`\n  ${lesson.title}:`)
      for (const f of flags) {
        console.log(`    ⚠ ${f}`)
      }
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
