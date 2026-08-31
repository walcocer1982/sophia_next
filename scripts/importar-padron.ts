/**
 * Importa el padrón académico a Sophia desde «BASE GENERAL DE RETENCIÓN
 * ESTUDIANTIL.xlsx», hoja «BASE OFICIAL».
 *
 * Por qué existe: hasta ahora el alumno entraba con su gmail y se autodeclaraba
 * carrera y admisión en el onboarding. De ahí salieron nombres como «Ocicat
 * Ocicat» y admisiones que nadie puede verificar. Con el padrón, el dato oficial
 * manda y el login solo lo reclama.
 *
 * Uso:
 *   npx tsx scripts/importar-padron.ts <archivo.xlsx>            # solo alumnos
 *   npx tsx scripts/importar-padron.ts <archivo.xlsx> --aplicar  # escribe
 *   npx tsx scripts/importar-padron.ts <archivo.xlsx> --aplicar --curso <slug>
 *
 * Sin --aplicar simula y no toca la base.
 * Con --curso además crea las secciones de ese curso y matricula a sus alumnos.
 *
 * ⚠️ El archivo tiene datos personales de alumnos: se lee desde donde esté
 * (Descargas, OneDrive) y NO se copia al repositorio.
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { prisma } from '../lib/prisma'

const ADMISIONES = ['2026-I', '2026-II'] // el alcance de Sophia
const ROMANOS: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4' }

/** «2026-I» y «2023 III» → «2026-1». El padrón usa romanos y a veces espacio. */
function normalizaAdmision(v: string): string | null {
  const m = v.trim().replace(/\s+/g, '-').match(/^(\d{4})-([IVX]+)$/i)
  if (!m) return null
  const num = ROMANOS[m[2].toUpperCase()]
  return num ? `${m[1]}-${num}` : null
}

/** El padrón trae la especialidad en código corto; Sophia usa el mismo. */
const CARRERA_POR_CODIGO: Record<string, string> = {
  EOM: 'EOM', PM: 'PM', SI: 'SI', MMP: 'MMP', MSEII: 'MSEII', GMI: 'GMI',
}

function limpia(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(typeof v === 'object' && 'text' in (v as object) ? (v as { text: string }).text : v).trim()
  return ['NO INDICA', '-', '#N/A', '#REF!', '0'].includes(s.toUpperCase()) ? '' : s
}

/** «YUCRA HANCCONAIRA, Jeferson» → «Jeferson Yucra Hancconaira» */
function nombrePropio(v: string): string {
  const capitaliza = (s: string) =>
    s.toLowerCase().split(/\s+/).filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
  if (v.includes(',')) {
    const [ap, nom] = v.split(',')
    return `${capitaliza(nom)} ${capitaliza(ap)}`.trim()
  }
  return capitaliza(v)
}

interface Fila {
  dni: string
  nombre: string
  admision: string
  sede: string
  carrera: string
  seccion: string
  correo: string
  correoInst: string
  celular: string
}

/**
 * Lee el Excel a través de scripts/padron_a_json.py. No hay librería de Excel
 * en Node acá (npm no es alcanzable), y Python trae openpyxl. El JSON viaja por
 * stdout: así el archivo con datos personales no deja copias en disco.
 */
function extraer(archivo: string): Record<string, string>[] {
  const script = path.join(__dirname, 'padron_a_json.py')
  try {
    const salida = execFileSync('python', [script, archivo], {
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })
    return JSON.parse(salida) as Record<string, string>[]
  } catch (e) {
    const err = e as { stderr?: string; message: string }
    throw new Error(`No se pudo leer el Excel: ${err.stderr?.trim() || err.message}`)
  }
}

function leer(archivo: string) {
  const crudas = extraer(archivo)
  const filas: Fila[] = []
  const descartes = { admision: 0, retirado: 0, sinDni: 0, sinCarrera: 0 }

  for (const r of crudas) {
    const admRaw = limpia(r.admision).replace(/\s+/g, '-')
    if (!ADMISIONES.includes(admRaw)) { descartes.admision++; continue }
    if (limpia(r.estado).toUpperCase() !== 'ACTIVO') { descartes.retirado++; continue }
    const dni = limpia(r.dni).replace(/\D/g, '')
    if (!dni) { descartes.sinDni++; continue }
    const carrera = CARRERA_POR_CODIGO[limpia(r.carrera).toUpperCase()]
    if (!carrera) { descartes.sinCarrera++; continue }
    const admision = normalizaAdmision(admRaw)
    if (!admision) { descartes.admision++; continue }

    filas.push({
      dni, admision, carrera,
      nombre: nombrePropio(limpia(r.nombre)),
      sede: limpia(r.sede).toUpperCase(),
      seccion: limpia(r.seccion),
      correo: limpia(r.correo).toLowerCase(),
      correoInst: limpia(r.correoInst).toLowerCase(),
      celular: limpia(r.celular).replace(/[^\d+]/g, ''),
    })
  }
  return { filas, descartes }
}

async function main() {
  const archivo = process.argv[2]
  if (!archivo) {
    console.error('Uso: npx tsx scripts/importar-padron.ts <archivo.xlsx> [--aplicar] [--curso <slug>]')
    process.exit(1)
  }
  const aplicar = process.argv.includes('--aplicar')
  const cursoSlug = process.argv[process.argv.indexOf('--curso') + 1]
  const conCurso = process.argv.includes('--curso') && cursoSlug && !cursoSlug.startsWith('--')

  const { filas, descartes } = leer(archivo)
  console.log(`Leídas ${filas.length} filas de ${ADMISIONES.join(' y ')} activas`)
  console.log(`  descartadas: ${descartes.admision} de otra admisión · ${descartes.retirado} retiradas · ${descartes.sinDni} sin DNI · ${descartes.sinCarrera} con carrera desconocida\n`)

  // DNI duplicado dentro del archivo: gana la última fila, pero se avisa.
  const porDni = new Map<string, Fila>()
  const duplicados: string[] = []
  for (const f of filas) {
    if (porDni.has(f.dni)) duplicados.push(f.dni)
    porDni.set(f.dni, f)
  }
  if (duplicados.length) console.log(`⚠️  ${duplicados.length} DNI repetidos en el archivo (se toma la última fila)\n`)

  // Catálogos
  const [sedes, carreras, periodos] = await Promise.all([
    prisma.sede.findMany({ select: { id: true, code: true, careers: { select: { code: true } } } }),
    prisma.career.findMany({ where: { code: { not: null } }, select: { id: true, code: true } }),
    prisma.academicPeriod.findMany({ select: { id: true, name: true } }),
  ])
  const idSede = new Map(sedes.map((s) => [s.code, s.id]))
  const idCarrera = new Map(carreras.map((c) => [c.code!, c.id]))
  // El período puede llamarse «2026-1» o «2026-I» según cómo lo hayan creado.
  const idPeriodo = new Map<string, string>()
  for (const p of periodos) {
    idPeriodo.set(p.name, p.id)
    const n = normalizaAdmision(p.name)
    if (n) idPeriodo.set(n, p.id)
  }

  const problemas: string[] = []
  const validas = [...porDni.values()].filter((f) => {
    if (!idSede.has(f.sede)) { problemas.push(`sede desconocida «${f.sede}» (DNI ${f.dni})`); return false }
    if (!idCarrera.has(f.carrera)) { problemas.push(`carrera sin código «${f.carrera}»`); return false }
    if (!idPeriodo.has(f.admision)) { problemas.push(`admisión «${f.admision}» no existe en Sophia`); return false }
    const sede = sedes.find((s) => s.code === f.sede)!
    if (!sede.careers.some((c) => c.code === f.carrera)) {
      problemas.push(`${f.carrera} no está dada de alta en ${f.sede}`); return false
    }
    return true
  })

  if (problemas.length) {
    const unicos = [...new Set(problemas)]
    console.log(`⚠️  ${problemas.length} filas no se pueden importar:`)
    for (const p of unicos.slice(0, 10)) console.log(`     ${p}`)
    if (unicos.length > 10) console.log(`     … y ${unicos.length - 10} motivos más`)
    console.log()
  }

  // Resumen de lo que se va a crear
  const grupos = new Map<string, Fila[]>()
  for (const f of validas) {
    const k = `${f.admision}|${f.sede}|${f.carrera}|${f.seccion}`
    grupos.set(k, [...(grupos.get(k) ?? []), f])
  }
  console.log(`${validas.length} alumnos en ${grupos.size} grupos:`)
  for (const [k, g] of [...grupos.entries()].sort()) {
    const [adm, sede, car, sec] = k.split('|')
    console.log(`   ${adm}  ${sede.padEnd(5)} ${car.padEnd(6)} sección ${sec.padEnd(3)} ${String(g.length).padStart(3)} alumnos`)
  }

  if (!aplicar) {
    console.log('\n(simulación — agrega --aplicar para escribir)')
    return
  }

  // ── Alumnos ──────────────────────────────────────────────────
  let creados = 0, actualizados = 0
  const dobles: string[] = []
  for (const f of validas) {
    // Orden deliberado: el DNI manda. Un OR con findFirst podía devolver la
    // coincidencia por correo aunque el DNI ya perteneciera a otra cuenta, y
    // entonces el update chocaba contra la restricción de unicidad.
    let existente = await prisma.user.findUnique({ where: { dni: f.dni }, select: { id: true } })
    if (!existente && f.correo) {
      existente = await prisma.user.findUnique({ where: { email: f.correo }, select: { id: true } })
    }
    if (!existente && f.correoInst) {
      existente = await prisma.user.findUnique({
        where: { institutionalEmail: f.correoInst }, select: { id: true },
      })
    }

    // Si se encontró por correo pero el DNI ya lo tiene OTRA cuenta, hay dos
    // cuentas para la misma persona: se avisa y no se pisa el identificador.
    let dniLibre = true
    if (existente) {
      const dueno = await prisma.user.findUnique({ where: { dni: f.dni }, select: { id: true, email: true } })
      if (dueno && dueno.id !== existente.id) {
        dobles.push(`${f.nombre} (DNI ${f.dni}): ${dueno.email} ya lo tiene`)
        dniLibre = false
      }
    }

    const datos = {
      name: f.nombre,
      ...(dniLibre ? { dni: f.dni } : {}),
      institutionalEmail: f.correoInst || null,
      phone: f.celular || null,
      academicSection: f.seccion || null,
      careerId: idCarrera.get(f.carrera)!,
      sedeId: idSede.get(f.sede)!,
      admissionPeriodId: idPeriodo.get(f.admision)!,
    }

    if (existente) {
      // No se toca el rol: un ADMIN que además figure en el padrón no se degrada.
      await prisma.user.update({ where: { id: existente.id }, data: datos })
      actualizados++
    } else {
      // Sin correo personal no hay con qué crear la cuenta: se usa el
      // institucional, que existe en el 100% de las filas.
      await prisma.user.create({
        data: { ...datos, email: f.correo || f.correoInst, role: 'STUDENT' },
      })
      creados++
    }
  }
  console.log(`\n✅ alumnos: ${creados} creados · ${actualizados} actualizados`)

  if (!conCurso) {
    console.log('   (sin --curso no se crearon secciones ni matrículas)')
    return
  }

  // ── Secciones y matrículas de un curso ───────────────────────
  const curso = await prisma.course.findUnique({
    where: { slug: cursoSlug },
    select: { id: true, title: true, scope: true, careers: { select: { code: true } } },
  })
  if (!curso) throw new Error(`No existe el curso «${cursoSlug}»`)

  const suyas = curso.scope === 'TRANSVERSAL'
    ? validas
    : validas.filter((f) => curso.careers.some((c) => c.code === f.carrera))

  console.log(`\n${curso.title} (${curso.scope}) → ${suyas.length} alumnos`)

  let secciones = 0, matriculas = 0
  const porGrupo = new Map<string, Fila[]>()
  for (const f of suyas) {
    const k = `${f.admision}|${f.sede}|${f.carrera}|${f.seccion}`
    porGrupo.set(k, [...(porGrupo.get(k) ?? []), f])
  }

  for (const [k, alumnos] of porGrupo) {
    const [adm, sede, car, sec] = k.split('|')
    const nombre = `${car} ${sec}`
    const periodId = idPeriodo.get(adm)!
    const sedeId = idSede.get(sede)!

    let seccion = await prisma.section.findFirst({
      where: { courseId: curso.id, periodId, sedeId, name: nombre },
      select: { id: true },
    })
    if (!seccion) {
      seccion = await prisma.section.create({
        data: { name: nombre, courseId: curso.id, periodId, sedeId },
        select: { id: true },
      })
      secciones++
    }

    for (const f of alumnos) {
      const u = await prisma.user.findUnique({ where: { dni: f.dni }, select: { id: true } })
      if (!u) continue
      const ya = await prisma.enrollment.findFirst({
        where: { userId: u.id, sectionId: seccion.id }, select: { id: true },
      })
      if (!ya) {
        await prisma.enrollment.create({ data: { userId: u.id, sectionId: seccion.id } })
        matriculas++
      }
    }
    console.log(`   ${adm} ${sede.padEnd(5)} ${nombre.padEnd(9)} ${alumnos.length} alumnos`)
  }
  console.log(`\n✅ ${secciones} secciones creadas · ${matriculas} matrículas nuevas`)
}

main()
  .catch((e) => { console.error('\n❌', e instanceof Error ? e.message : e); process.exit(1) })
  .finally(() => prisma.$disconnect())
