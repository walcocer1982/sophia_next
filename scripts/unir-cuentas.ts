/**
 * Cuentas duplicadas de alumnos (26 oct 2026, ver lib/cuenta-duplicada.ts).
 *
 * Una cuenta sin DNI cuyo nombre coincide con UNA sola cuenta del padrón (y de
 * la misma carrera, si las dos la tienen) es el mismo alumno que entró con otro
 * correo. Este script las lista y, con --aplicar, las une (lib/unir-cuentas.ts).
 * Las ambiguas y las que el nombre no alcanza se unen a mano, con el DNI.
 *
 *   npx tsx scripts/unir-cuentas.ts                                   # lista, no escribe
 *   npx tsx scripts/unir-cuentas.ts --aplicar                         # une las seguras
 *   npx tsx scripts/unir-cuentas.ts <correo-duplicado> <dni> [--aplicar]   # una a mano
 */
import { prisma } from '../lib/prisma'
import { nombresCoinciden } from '../lib/cuenta-duplicada'
import { unirCuentas } from '../lib/unir-cuentas'

const args = process.argv.slice(2)
const aplicar = args.includes('--aplicar')
const [correo, dni] = args.filter((a) => !a.startsWith('--'))

type Fila = { id: string; name: string | null; email: string; careerId: string | null; _count: { lessonSessions: number } }

async function unaAMano() {
  const dup = await prisma.user.findUnique({ where: { email: correo.toLowerCase() }, select: { id: true, name: true, dni: true, unidaA: true, _count: { select: { lessonSessions: true } } } })
  const padron = await prisma.user.findUnique({ where: { dni }, select: { id: true, name: true } })
  if (!dup) throw new Error(`No hay cuenta con el correo ${correo}`)
  if (!padron) throw new Error(`No hay cuenta del padrón con DNI ${dni}`)
  console.log(`${dup.name} <${correo}> (${dup._count.lessonSessions} sesiones)  →  ${padron.name} (DNI ${dni})`)
  if (!nombresCoinciden(dup.name, padron.name)) console.log('  ⚠️  los nombres comparten menos de dos palabras: confirmar que es la misma persona')
  if (!aplicar) return console.log('\nSin --aplicar no se escribe nada.')
  console.log('  unida:', await unirCuentas(dup.id, padron.id))
}

async function todas() {
  const alumno = { role: 'STUDENT' as const, unidaA: null }
  const select = { id: true, name: true, email: true, careerId: true, _count: { select: { lessonSessions: true } } }
  const [sinDni, padron] = await Promise.all([
    prisma.user.findMany({ where: { ...alumno, dni: null }, select }) as Promise<Fila[]>,
    prisma.user.findMany({ where: { ...alumno, dni: { not: null } }, select: { ...select, dni: true } }) as Promise<(Fila & { dni: string })[]>,
  ])
  const seguras: { dup: Fila; gemela: Fila & { dni: string } }[] = []
  const aMano: string[] = []
  for (const dup of sinDni) {
    const gemelas = padron.filter((p) => nombresCoinciden(dup.name, p.name))
    if (gemelas.length === 0) continue
    const compatibles = gemelas.filter((g) => !dup.careerId || !g.careerId || dup.careerId === g.careerId)
    if (compatibles.length === 1) seguras.push({ dup, gemela: compatibles[0] })
    else
      aMano.push(
        `${dup.name} <${dup.email}> · ${compatibles.length === 0 ? 'carrera distinta' : 'más de una gemela'}: ` +
          gemelas.map((g) => `${g.name} (DNI ${g.dni})`).join(' | ')
      )
  }
  console.log(`Seguras (${seguras.length}):`)
  for (const { dup, gemela } of seguras)
    console.log(`- ${dup.name} <${dup.email}> (${dup._count.lessonSessions} sesiones)  →  ${gemela.name} (DNI ${gemela.dni}, ${gemela._count.lessonSessions} sesiones)`)
  console.log(`\nA mano (${aMano.length}):`)
  for (const l of aMano) console.log('- ' + l)
  if (!aplicar) return console.log('\nSin --aplicar no se escribe nada.')
  console.log('\nUniendo…')
  for (const { dup, gemela } of seguras) {
    try {
      console.log(`- ${dup.email}:`, await unirCuentas(dup.id, gemela.id))
    } catch (e) {
      console.log(`- ${dup.email}: ✗ ${(e as Error).message}`)
    }
  }
}

;(correo && dni ? unaAMano() : todas())
  .catch((e) => {
    console.error((e as Error).message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
