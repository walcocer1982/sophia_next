/**
 * Asigna track + sedes a los cursos reales, y campaign a los assessments
 * relacionados. Idempotente.
 *
 * Mapeo:
 *   Plan de Tutoría             → REGULAR / ABQ+IRQ+FCHB
 *   AI 101                       → REGULAR / ENTER
 *   Procesos Metalúrgicos        → CONTINUA / sin sede / campaign ProExplo 2026
 *   Geología de Yacimientos      → CONTINUA / sin sede / campaign ProExplo 2026
 *   Operación Minera Subterránea → CONTINUA / sin sede / campaign ProExplo 2026
 *   Introducción a la Minería    → CONTINUA / sin sede / campaign WMC 2026
 *
 * Los demás cursos quedan como están (REGULAR sin sede asignada) — se
 * configuran después manualmente vía UI cuando se construya el editor.
 *
 * Uso: npx tsx scripts/assign-courses-track-sedes.ts [--dry-run]
 */
import { prisma } from '../lib/prisma'

const dryRun = process.argv.includes('--dry-run')

interface CourseSpec {
  titleMatch: string         // substring para buscar
  track: 'REGULAR' | 'CONTINUA'
  sedeCodes: string[]        // codes de sedes a conectar
  campaignName?: string      // si CONTINUA, opcional asignar assessments a esta campaign
}

const COURSE_SPECS: CourseSpec[] = [
  {
    titleMatch: 'Tutoría',
    track: 'REGULAR',
    sedeCodes: ['ABQ', 'IRQ', 'FCHB'],
  },
  {
    titleMatch: 'AI 101',
    track: 'REGULAR',
    sedeCodes: ['ENTER'],
  },
  {
    // "Procesos Metalúrgicos: Flotación" — match específico para no agarrar
    // "Química aplicada a Procesos Metalúrgicos" que es otro curso distinto.
    titleMatch: 'Flotación',
    track: 'CONTINUA',
    sedeCodes: [],
    campaignName: 'ProExplo 2026',
  },
  {
    titleMatch: 'Geología',
    track: 'CONTINUA',
    sedeCodes: [],
    campaignName: 'ProExplo 2026',
  },
  {
    titleMatch: 'Operación Minera Subterránea',
    track: 'CONTINUA',
    sedeCodes: [],
    campaignName: 'ProExplo 2026',
  },
  {
    titleMatch: 'Introducción a la Minería',
    track: 'CONTINUA',
    sedeCodes: [],
    campaignName: '27th World Mining Congress 2026',
  },
]

async function main() {
  console.log(`\n${dryRun ? '🧪 DRY RUN' : '🚀 EJECUCIÓN REAL'} — Asignar track/sedes/campaigns a cursos\n`)

  // Cache de sedes y campaigns por código/nombre
  const allSedes = await prisma.sede.findMany()
  const sedeByCode = new Map(allSedes.map((s) => [s.code, s]))

  const allCampaigns = await prisma.eventCampaign.findMany()
  const campaignByName = new Map(allCampaigns.map((c) => [c.name, c]))

  for (const spec of COURSE_SPECS) {
    const matching = await prisma.course.findMany({
      where: { title: { contains: spec.titleMatch, mode: 'insensitive' } },
      select: {
        id: true,
        title: true,
        track: true,
        sedes: { select: { code: true } },
        lessons: {
          select: { id: true, assessments: { select: { id: true, code: true, campaignId: true } } },
        },
      },
    })

    if (matching.length === 0) {
      console.log(`⚠️  Sin match: "${spec.titleMatch}"`)
      continue
    }

    for (const course of matching) {
      const sedesActuales = course.sedes.map((s) => s.code).sort().join(',') || '(ninguna)'
      const sedesTarget = spec.sedeCodes.sort().join(',') || '(ninguna)'

      console.log(`\n📚 ${course.title}`)
      console.log(`   track: ${course.track} → ${spec.track}`)
      console.log(`   sedes: ${sedesActuales} → ${sedesTarget}`)

      if (!dryRun) {
        // Resetear sedes y conectar las nuevas
        const sedeIds = spec.sedeCodes
          .map((code) => sedeByCode.get(code)?.id)
          .filter((id): id is string => !!id)

        await prisma.course.update({
          where: { id: course.id },
          data: {
            track: spec.track,
            sedes: {
              set: sedeIds.map((id) => ({ id })),
            },
          },
        })
        console.log(`   ✓ actualizado`)
      }

      // Asignar campaign a los assessments del curso
      if (spec.campaignName) {
        const campaign = campaignByName.get(spec.campaignName)
        if (!campaign) {
          console.log(`   ⚠️  Campaign "${spec.campaignName}" no encontrada`)
          continue
        }

        const assessmentIds: string[] = []
        for (const lesson of course.lessons) {
          for (const a of lesson.assessments) {
            if (a.campaignId !== campaign.id) {
              assessmentIds.push(a.id)
            }
          }
        }

        if (assessmentIds.length > 0) {
          console.log(`   campaign: ${assessmentIds.length} assessments → "${campaign.name}"`)
          if (!dryRun) {
            await prisma.assessment.updateMany({
              where: { id: { in: assessmentIds } },
              data: { campaignId: campaign.id },
            })
            console.log(`   ✓ campaign asignada`)
          }
        }
      }
    }
  }

  // Resumen
  console.log(`\n📊 Estado final\n`)
  const courses = await prisma.course.findMany({
    select: {
      title: true,
      track: true,
      sedes: { select: { code: true } },
      lessons: { select: { assessments: { select: { campaign: { select: { shortName: true, name: true } } } } } },
    },
    orderBy: { title: 'asc' },
  })

  for (const c of courses) {
    const sedeStr = c.sedes.map((s) => s.code).sort().join('+') || '—'
    const campaignSet = new Set<string>()
    for (const l of c.lessons) {
      for (const a of l.assessments) {
        if (a.campaign) campaignSet.add(a.campaign.shortName || a.campaign.name)
      }
    }
    const campaignStr = campaignSet.size > 0 ? Array.from(campaignSet).join(', ') : '—'
    console.log(`   ${c.title.padEnd(45)}  ${c.track.padEnd(10)} sedes:${sedeStr.padEnd(15)} campaign:${campaignStr}`)
  }

  console.log()
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
