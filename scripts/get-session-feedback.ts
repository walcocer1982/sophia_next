/**
 * Trae el reporte/feedback generado por Sophia para una sesión específica.
 * Busca por nombre del participante (asssessment demo) o por sessionId.
 *
 * Uso:
 *   npx tsx scripts/get-session-feedback.ts "María Céspedes"
 *   npx tsx scripts/get-session-feedback.ts <sessionId>
 */

import { prisma } from '../lib/prisma'

async function main() {
  const query = process.argv[2]
  if (!query) {
    console.error('Uso: npx tsx scripts/get-session-feedback.ts "Nombre" | <sessionId>')
    process.exit(1)
  }

  // Buscar por nombre del participante (assessment) o por session id
  const sessions = await prisma.lessonSession.findMany({
    where: {
      OR: [
        { id: query },
        {
          assessmentParticipant: {
            OR: [
              { firstName: { contains: query.split(' ')[0], mode: 'insensitive' } },
              { lastName: { contains: query.split(' ').slice(1).join(' '), mode: 'insensitive' } },
            ],
          },
        },
        { user: { name: { contains: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
      lesson: { select: { title: true } },
      assessmentParticipant: {
        select: { firstName: true, lastName: true, grade: true, gradeOver20: true, passed: true, dni: true },
      },
      activities: {
        select: {
          activityId: true,
          status: true,
          attempts: true,
          tangentCount: true,
          evidenceData: true,
        },
      },
      messages: {
        select: { role: true, content: true, timestamp: true, activityId: true },
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: { startedAt: 'desc' },
  })

  if (sessions.length === 0) {
    console.log(`Sin sesiones para "${query}"`)
    await prisma.$disconnect()
    return
  }

  for (const s of sessions) {
    const who = s.assessmentParticipant
      ? `${s.assessmentParticipant.firstName} ${s.assessmentParticipant.lastName ?? ''}`
      : s.user.name ?? s.user.email

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`👤 ${who}`)
    console.log(`📚 ${s.lesson.title}`)
    console.log(`🆔 ${s.id}`)
    console.log(`📅 ${s.startedAt.toISOString()} → ${(s.endedAt ?? s.lastActivityAt).toISOString()}`)
    if (s.assessmentParticipant) {
      console.log(`📊 Nota: ${s.assessmentParticipant.grade}/100 (${s.assessmentParticipant.gradeOver20}/20) — ${s.assessmentParticipant.passed ? '✅ Aprobado' : '❌ No aprobado'}`)
    }
    console.log(`Actividades: ${s.activities.length}, completadas: ${s.activities.filter(a => a.status === 'COMPLETED').length}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    if (s.summaryText) {
      console.log(`\n📝 REPORTE DE SOPHIA:\n`)
      console.log(s.summaryText)
      console.log()
    }

    // Imprimir el chat completo siempre
    if (s.messages.length > 0) {
      console.log(`\n💬 CHAT COMPLETO (${s.messages.length} mensajes):`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      for (const m of s.messages) {
        const time = m.timestamp.toISOString().slice(11, 19)
        const tag = m.role === 'user' ? '👤 USER' : '🤖 SOPHIA'
        console.log(`\n[${time}] ${tag}${m.activityId ? ` (act: ${m.activityId})` : ''}`)
        console.log(m.content)
      }
      console.log()
    }

    if (!s.summaryText) {
      console.log(`\n⚠️  Sin reporte generado (summaryText es null)`)
      console.log(`Esto puede pasar si la sesión no se finalizó correctamente o la generación falló.`)

      // Mostrar evidence data para que vea qué quedó
      console.log('\n🔍 Evidencia recolectada por actividad:')
      for (const a of s.activities) {
        const ev = a.evidenceData as { attempts?: Array<{ studentResponse?: string; analysis?: { understanding_level?: string; criteriaMatched?: string[]; criteriaMissing?: string[] } }> } | null
        const lastAtt = ev?.attempts?.at(-1)
        console.log(`  Act ${a.activityId} (${a.status}, ${a.attempts} intentos):`)
        if (lastAtt?.analysis) {
          console.log(`    Nivel: ${lastAtt.analysis.understanding_level}`)
          console.log(`    Cumplió: ${lastAtt.analysis.criteriaMatched?.join(', ') || 'N/A'}`)
          console.log(`    Faltó: ${lastAtt.analysis.criteriaMissing?.join(', ') || 'N/A'}`)
        }
      }
    }
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
