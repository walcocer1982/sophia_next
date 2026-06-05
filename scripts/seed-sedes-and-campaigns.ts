/**
 * Seed inicial del nuevo modelo organizacional:
 *  - 4 Sedes: ABQ, IRQ, FCHB (físicas) + ENTER (virtual)
 *  - 2 Programas (Career): Inducción Académica + ENTER
 *  - 2 EventCampaigns: 27th World Mining Congress 2026 + ProExplo 2026
 *
 * Idempotente: si ya existen no se duplican (usa upsert por code/name).
 *
 * Uso: npx tsx scripts/seed-sedes-and-campaigns.ts
 */
import { prisma } from '../lib/prisma'

async function main() {
  console.log('\n🌱 Seed: Sedes + Programas + Campaigns\n')

  // ═══════════════════════════════════════════════════════════════
  // 1) SEDES
  // ═══════════════════════════════════════════════════════════════
  const sedes = [
    { code: 'ABQ', name: 'Alberto Benavides de la Quintana', city: null, isVirtual: false },
    { code: 'IRQ', name: 'Isaac Ríos Quinteros', city: null, isVirtual: false },
    { code: 'FCHB', name: 'Francisco Chávez Belaúnde', city: null, isVirtual: false },
    { code: 'ENTER', name: 'ENTER — Innovación', city: null, isVirtual: true },
  ]
  for (const s of sedes) {
    const existing = await prisma.sede.findUnique({ where: { code: s.code } })
    if (existing) {
      console.log(`  ⏩ Sede ${s.code} ya existía`)
      continue
    }
    await prisma.sede.create({ data: s })
    console.log(`  ✓ Sede creada: ${s.code} — ${s.name}${s.isVirtual ? ' (virtual)' : ''}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // 2) PROGRAMAS (Career)
  // ═══════════════════════════════════════════════════════════════
  const programas = [
    { name: 'Inducción Académica', slug: 'induccion-academica' },
    { name: 'ENTER', slug: 'enter' },
  ]
  for (const p of programas) {
    const existing = await prisma.career.findUnique({ where: { slug: p.slug } })
    if (existing) {
      console.log(`  ⏩ Programa ${p.name} ya existía`)
      continue
    }
    await prisma.career.create({ data: p })
    console.log(`  ✓ Programa creado: ${p.name}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // 3) EVENT CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════
  const campaigns = [
    {
      name: '27th World Mining Congress 2026',
      shortName: 'WMC 2026',
      startDate: new Date('2026-06-24'),
      endDate: new Date('2026-06-26'),
      location: 'Lima, Perú',
      url: 'https://wmc2026.com',
      isArchived: false,
    },
    {
      name: 'ProExplo 2026',
      shortName: 'ProExplo',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
      location: 'Multi-sede',
      url: null,
      isArchived: false,
    },
  ]
  for (const c of campaigns) {
    const existing = await prisma.eventCampaign.findFirst({ where: { name: c.name } })
    if (existing) {
      console.log(`  ⏩ Campaign "${c.name}" ya existía`)
      continue
    }
    await prisma.eventCampaign.create({ data: c })
    console.log(`  ✓ Campaign creada: ${c.name}`)
  }

  console.log('\n✅ Seed completo\n')

  // Resumen
  const sedeCount = await prisma.sede.count()
  const programaCount = await prisma.career.count()
  const campaignCount = await prisma.eventCampaign.count()
  console.log(`📊 Estado actual del catálogo:`)
  console.log(`   Sedes: ${sedeCount}`)
  console.log(`   Programas: ${programaCount}`)
  console.log(`   EventCampaigns: ${campaignCount}\n`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
