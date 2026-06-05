/**
 * Seed CETEMIN real:
 *  - Fix nombre FCHB (Francisco → Fernando) + city
 *  - Cities a ABQ e IRQ (ambas en Chosica, Lima)
 *  - Crea las 5 carreras técnicas oficiales con sus códigos:
 *      EOM   Exploración y Operación Minera
 *      PM    Procesos Metalúrgicos y Químicos
 *      SI    Seguridad Industrial
 *      MMP   Mantenimiento de Maquinaria Pesada
 *      MSEII Mantenimiento de Sistemas Eléctricos e Instrumentación Industrial
 *  - Asigna m:n carrera ↔ sede según info real:
 *      ABQ:  EOM, PM, SI
 *      IRQ:  MMP, MSEII
 *      FCHB: EOM, SI, MMP, MSEII (todas menos PM)
 *  - Marca Plan de Tutoría como TRANSVERSAL.
 *
 * Idempotente. Uso: npx tsx scripts/seed-cetemin-carreras.ts
 */
import { prisma } from '../lib/prisma'

const SEDES_FIX = [
  { code: 'ABQ', name: 'Alberto Benavides de la Quintana', city: 'Chosica, Lima' },
  { code: 'IRQ', name: 'Isaac Ríos Quinteros', city: 'Chosica, Lima' },
  { code: 'FCHB', name: 'Fernando Chaves Belaunde', city: 'Vítor, Arequipa' },
]

const CARRERAS = [
  {
    code: 'EOM',
    name: 'Exploración y Operación Minera',
    slug: 'exploracion-operacion-minera',
    sedeCodes: ['ABQ', 'FCHB'],
  },
  {
    code: 'PM',
    name: 'Procesos Metalúrgicos y Químicos',
    slug: 'procesos-metalurgicos-quimicos',
    sedeCodes: ['ABQ'],
  },
  {
    code: 'SI',
    name: 'Seguridad Industrial',
    slug: 'seguridad-industrial',
    sedeCodes: ['ABQ', 'FCHB'],
  },
  {
    code: 'MMP',
    name: 'Mantenimiento de Maquinaria Pesada',
    slug: 'mantenimiento-maquinaria-pesada',
    sedeCodes: ['IRQ', 'FCHB'],
  },
  {
    code: 'MSEII',
    name: 'Mantenimiento de Sistemas Eléctricos e Instrumentación Industrial',
    slug: 'mantenimiento-sistemas-electricos-instrumentacion',
    sedeCodes: ['IRQ', 'FCHB'],
  },
]

async function main() {
  console.log(`\n🌱 Seed CETEMIN: sedes + carreras + scopes\n`)

  // ═══════════════════════════════════════════════════════════════
  // 1) Fix nombres y ciudades de sedes
  // ═══════════════════════════════════════════════════════════════
  for (const s of SEDES_FIX) {
    const existing = await prisma.sede.findUnique({ where: { code: s.code } })
    if (!existing) {
      console.log(`  ⚠️  Sede ${s.code} no existe — saltando`)
      continue
    }
    const changed = existing.name !== s.name || existing.city !== s.city
    if (!changed) {
      console.log(`  ⏩ Sede ${s.code} ya correcta`)
      continue
    }
    await prisma.sede.update({
      where: { code: s.code },
      data: { name: s.name, city: s.city },
    })
    console.log(`  ✓ Sede ${s.code} actualizada: ${s.name} (${s.city})`)
  }

  // ═══════════════════════════════════════════════════════════════
  // 2) Crear/actualizar las 5 carreras técnicas con code
  // ═══════════════════════════════════════════════════════════════
  // Cache de sedes por code
  const allSedes = await prisma.sede.findMany()
  const sedeByCode = new Map(allSedes.map((s) => [s.code, s]))

  for (const c of CARRERAS) {
    const sedeIds = c.sedeCodes
      .map((code) => sedeByCode.get(code)?.id)
      .filter((id): id is string => !!id)

    // Buscar por code, slug o nombre (tres formas de coincidir con data legacy)
    const existing =
      (c.code ? await prisma.career.findFirst({ where: { code: c.code } }) : null) ??
      (await prisma.career.findFirst({ where: { slug: c.slug } })) ??
      (await prisma.career.findFirst({ where: { name: c.name } }))

    if (existing) {
      await prisma.career.update({
        where: { id: existing.id },
        data: {
          code: c.code,
          name: c.name,
          slug: c.slug,
          sedes: { set: sedeIds.map((id) => ({ id })) },
        },
      })
      console.log(`  ✓ Carrera ${c.code} actualizada (sedes: ${c.sedeCodes.join('+')})`)
    } else {
      await prisma.career.create({
        data: {
          code: c.code,
          name: c.name,
          slug: c.slug,
          sedes: { connect: sedeIds.map((id) => ({ id })) },
        },
      })
      console.log(`  ✓ Carrera ${c.code} creada (sedes: ${c.sedeCodes.join('+')})`)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3) Marcar cursos transversales (Plan de Tutoría)
  // ═══════════════════════════════════════════════════════════════
  const tutoria = await prisma.course.findFirst({
    where: { title: { contains: 'Tutoría', mode: 'insensitive' } },
  })
  if (tutoria) {
    await prisma.course.update({
      where: { id: tutoria.id },
      data: { scope: 'TRANSVERSAL' },
    })
    console.log(`  ✓ "Plan de Tutoría" marcado como TRANSVERSAL`)
  }

  // ═══════════════════════════════════════════════════════════════
  // Resumen
  // ═══════════════════════════════════════════════════════════════
  const summary = await prisma.career.findMany({
    where: { code: { not: null } },
    orderBy: { code: 'asc' },
    include: {
      sedes: { select: { code: true } },
      _count: { select: { courses: true } },
    },
  })

  console.log(`\n📊 Estado final del catálogo de carreras CETEMIN:\n`)
  for (const c of summary) {
    const sedesStr = c.sedes.map((s) => s.code).sort().join(' + ')
    console.log(`   ${c.code?.padEnd(5)} ${c.name.padEnd(60)} sedes: ${sedesStr}  (${c._count.courses} cursos asignados)`)
  }
  console.log()

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
