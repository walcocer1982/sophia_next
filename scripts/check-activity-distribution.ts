import { prisma } from '../lib/prisma'

async function main() {
  // 1. Count passedCriteria distribution
  console.log('=== 1. passedCriteria Distribution ===\n')

  const [passedTrue, passedFalse] = await Promise.all([
    prisma.activityProgress.count({ where: { passedCriteria: true } }),
    prisma.activityProgress.count({ where: { passedCriteria: false } }),
  ])

  const total = passedTrue + passedFalse
  console.log(`  passedCriteria = true:  ${passedTrue} (${total ? ((passedTrue / total) * 100).toFixed(1) : 0}%)`)
  console.log(`  passedCriteria = false: ${passedFalse} (${total ? ((passedFalse / total) * 100).toFixed(1) : 0}%)`)
  console.log(`  Total:                  ${total}`)

  // 2. Understanding level distribution from evidenceData
  console.log('\n=== 2. Understanding Level Distribution (from evidenceData) ===\n')

  const allProgress = await prisma.activityProgress.findMany({
    where: { evidenceData: { not: undefined } },
    select: {
      evidenceData: true,
      passedCriteria: true,
      attempts: true,
    },
  })

  const understandingLevels: Record<string, number> = {}

  for (const ap of allProgress) {
    if (!ap.evidenceData) continue
    const data = ap.evidenceData as Record<string, unknown>

    // understanding_level is at attempts[].analysis.understanding_level
    let level: string | undefined

    if (Array.isArray(data.attempts) && data.attempts.length > 0) {
      const lastAttempt = data.attempts[data.attempts.length - 1] as Record<string, unknown>
      const analysis = lastAttempt.analysis as Record<string, unknown> | undefined
      if (analysis?.understanding_level) {
        level = String(analysis.understanding_level)
      }
    }

    if (level) {
      understandingLevels[level] = (understandingLevels[level] || 0) + 1
    }
  }

  if (Object.keys(understandingLevels).length === 0) {
    console.log('  No understanding_level values found in evidenceData.')
    // Show a sample evidenceData to understand the structure
    const sample = allProgress.find(ap => ap.evidenceData)
    if (sample) {
      console.log('\n  Sample evidenceData structure:')
      console.log(JSON.stringify(sample.evidenceData, null, 2).split('\n').map(l => '    ' + l).join('\n'))
    }
  } else {
    const sortedLevels = Object.entries(understandingLevels).sort((a, b) => b[1] - a[1])
    for (const [level, count] of sortedLevels) {
      console.log(`  ${level}: ${count}`)
    }
  }

  // 3. Example records with student info
  console.log('\n=== 3. Example Records ===\n')

  const examples = await prisma.activityProgress.findMany({
    take: 15,
    orderBy: { completedAt: 'desc' },
    where: { evidenceData: { not: undefined } },
    select: {
      activityId: true,
      attempts: true,
      passedCriteria: true,
      evidenceData: true,
      status: true,
      lessonSession: {
        select: {
          user: {
            select: { name: true },
          },
        },
      },
    },
  })

  console.log(
    '  ' +
    'Student'.padEnd(25) +
    'ActivityId'.padEnd(30) +
    'Att'.padEnd(5) +
    'Passed'.padEnd(8) +
    'Status'.padEnd(14) +
    'UndLevel'.padEnd(18) +
    'Completeness%'
  )
  console.log('  ' + '-'.repeat(120))

  for (const ex of examples) {
    const studentName = ex.lessonSession?.user?.name || 'Unknown'
    const data = (ex.evidenceData as Record<string, unknown>) || {}

    let level = '-'
    let completeness = '-'

    // Extract from attempts[].analysis structure
    if (Array.isArray(data.attempts) && data.attempts.length > 0) {
      const la = data.attempts[data.attempts.length - 1] as Record<string, unknown>
      const analysis = la.analysis as Record<string, unknown> | undefined
      if (analysis?.understanding_level) level = String(analysis.understanding_level)
      if (analysis?.completeness_percentage !== undefined) completeness = String(analysis.completeness_percentage)
    }

    console.log(
      '  ' +
      studentName.padEnd(25) +
      ex.activityId.substring(0, 28).padEnd(30) +
      String(ex.attempts).padEnd(5) +
      String(ex.passedCriteria).padEnd(8) +
      ex.status.padEnd(14) +
      level.padEnd(18) +
      completeness
    )
  }

  // 4. Status distribution
  console.log('\n=== 4. Status Distribution ===\n')
  const statusCounts = await prisma.activityProgress.groupBy({
    by: ['status'],
    _count: true,
  })
  for (const s of statusCounts) {
    console.log(`  ${s.status}: ${s._count}`)
  }

  // 5. response_type distribution from last attempt analysis
  console.log('\n=== 5. Last Attempt response_type Distribution ===\n')
  const responseTypes: Record<string, number> = {}
  for (const ap of allProgress) {
    if (!ap.evidenceData) continue
    const data = ap.evidenceData as Record<string, unknown>
    if (Array.isArray(data.attempts) && data.attempts.length > 0) {
      const last = data.attempts[data.attempts.length - 1] as Record<string, unknown>
      const analysis = last.analysis as Record<string, unknown> | undefined
      if (analysis?.response_type) {
        const rt = String(analysis.response_type)
        responseTypes[rt] = (responseTypes[rt] || 0) + 1
      }
    }
  }
  for (const [rt, count] of Object.entries(responseTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rt}: ${count}`)
  }

  // 6. Show some COMPLETED examples too
  console.log('\n=== 6. Completed Activity Examples ===\n')
  const completedExamples = await prisma.activityProgress.findMany({
    take: 10,
    orderBy: { completedAt: 'desc' },
    where: { status: 'COMPLETED' },
    select: {
      activityId: true,
      attempts: true,
      passedCriteria: true,
      evidenceData: true,
      lessonSession: {
        select: {
          user: { select: { name: true } },
        },
      },
    },
  })

  console.log(
    '  ' +
    'Student'.padEnd(25) +
    'ActivityId'.padEnd(30) +
    'Att'.padEnd(5) +
    'Passed'.padEnd(8) +
    'UndLevel'.padEnd(15) +
    'RespType'
  )
  console.log('  ' + '-'.repeat(100))

  for (const ex of completedExamples) {
    const studentName = ex.lessonSession?.user?.name || 'Unknown'
    const data = (ex.evidenceData as Record<string, unknown>) || {}
    let level = '-'
    let respType = '-'

    if (Array.isArray(data.attempts) && data.attempts.length > 0) {
      const la = data.attempts[data.attempts.length - 1] as Record<string, unknown>
      const analysis = la.analysis as Record<string, unknown> | undefined
      if (analysis?.understanding_level) level = String(analysis.understanding_level)
      if (analysis?.response_type) respType = String(analysis.response_type)
    }

    console.log(
      '  ' +
      studentName.substring(0, 23).padEnd(25) +
      ex.activityId.substring(0, 28).padEnd(30) +
      String(ex.attempts).padEnd(5) +
      String(ex.passedCriteria).padEnd(8) +
      level.padEnd(15) +
      respType
    )
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
