/**
 * Carga una sesión de un curso de CETEMIN en Sophia.
 *
 *   npx tsx scripts/cetemin/cargar.ts <curso> <n> --solo-validar
 *   npx tsx scripts/cetemin/cargar.ts <curso> <n>
 *
 * <curso> y <n> salen de `cursos/registro.ts`. El flujo: plantillas → validador
 * (bloquea) → imágenes al banco del curso (Cloudinary + CourseImage) → curso y
 * lección en la base, sin publicar. Después de cargar: probar con el alumno
 * simulado y pasar `auditar-sesion.ts` sobre la sesión de prueba.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '../../lib/prisma'
import type { LessonContent } from '../../types/lesson'
import { REGISTRO } from './cursos/registro'
import { construirActividades, subidasFalsas } from './plantillas'
import { resumen, validarSesion } from './validar'
import type { CursoSpec, SesionSpec, Subida } from './tipos'

/** El proyecto de diseño es SOLO LECTURA: de aquí salen los archivos de imagen. */
export const FUENTE = 'C:/Users/LEGION/Claude/diseño-ppt-cetemin'

// tsx no carga .env (Prisma lo hace solo; Cloudinary no).
for (const linea of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = linea.match(/^(CLOUDINARY_[A-Z_]+)=(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, '')
}

function fallar(errores: string[]): never {
  for (const e of errores) console.error(`❌ ${e}`)
  console.error(`\n${errores.length} regla(s) sin cumplir: la sesión no se carga.`)
  process.exit(1)
}

async function subirImagenes(curso: CursoSpec, courseId: string, spec: SesionSpec): Promise<Subida> {
  const { uploadImage } = await import('../../lib/cloudinary')
  const subidas: Subida = {}
  for (const f of spec.imagenes) {
    const ficha = { description: f.description, kind: f.kind, source: f.source.slice(0, 160), license: f.license }
    const existente = await prisma.courseImage.findFirst({ where: { courseId, tags: { has: f.id } }, select: { id: true, url: true } })
    if (existente) {
      // La ficha del banco sigue a la spec: la descripción lleva el texto visible y puede cambiar.
      await prisma.courseImage.update({ where: { id: existente.id }, data: ficha })
      subidas[f.id] = { url: existente.url, bankId: existente.id }
      continue
    }
    const ruta = join(FUENTE, f.archivo)
    if (!existsSync(ruta)) throw new Error(`no existe el archivo de ${f.id}: ${ruta}`)
    const url = await uploadImage(readFileSync(ruta), `sophia/${curso.slug}`)
    const creada = await prisma.courseImage.create({
      data: {
        courseId,
        url,
        ...ficha,
        validated: true, // estado «aprobada» en imagenes.csv
        uploadedBy: curso.userId,
        validatedBy: curso.userId,
        validatedAt: new Date(),
        tags: [f.id, spec.etiqueta],
      },
      select: { id: true },
    })
    subidas[f.id] = { url, bankId: creada.id }
    console.log(`  ⬆ ${f.id} → ${url}`)
  }
  return subidas
}

async function main() {
  const [cursoSlug, nTexto, ...flags] = process.argv.slice(2)
  const soloValidar = flags.includes('--solo-validar')
  const entrada = REGISTRO[cursoSlug]
  const n = Number(nTexto)
  if (!entrada || !entrada.sesiones[n]) {
    console.error(`Uso: npx tsx scripts/cetemin/cargar.ts <curso> <n> [--solo-validar]\nCursos: ${Object.keys(REGISTRO).map((c) => `${c} (sesiones ${Object.keys(REGISTRO[c].sesiones).join(', ')})`).join(' · ')}`)
    process.exit(1)
  }
  const curso = entrada.curso
  const spec = entrada.sesiones[n]

  // Validación con imágenes de mentira: no toca nada
  const errores = validarSesion(spec, construirActividades(spec, subidasFalsas(spec)))
  for (const f of spec.imagenes) {
    if (!existsSync(join(FUENTE, f.archivo))) errores.push(`falta el archivo de ${f.id}: ${f.archivo}`)
  }
  if (errores.length) fallar(errores)
  console.log(`✅ ${curso.slug} S${n} «${spec.title}»: ${resumen(construirActividades(spec, subidasFalsas(spec)))}`)
  if (soloValidar) return

  const datosCurso = {
    title: curso.title,
    capacidad: curso.capacidad,
    instructor: curso.instructor,
    scope: 'SPECIALIZATION' as const,
    careerId: curso.carreraId,
    userId: curso.userId,
    careers: { connect: [{ id: curso.carreraId }] },
  }
  const c = await prisma.course.upsert({
    where: { slug: curso.slug },
    update: datosCurso,
    create: { ...datosCurso, slug: curso.slug, isPublished: false },
    select: { id: true },
  })

  console.log(`⬆ imágenes de la S${n} → banco del curso`)
  const subidas = await subirImagenes(curso, c.id, spec)
  const activities = construirActividades(spec, subidas)
  const contentJson: LessonContent = { context: spec.contexto, activities }
  const datos = {
    title: spec.title,
    objective: spec.objective,
    keyPoints: spec.keyPoints,
    contentJson: JSON.parse(JSON.stringify(contentJson)),
    order: spec.order,
  }
  const existente = await prisma.lesson.findUnique({ where: { slug: spec.slug }, select: { id: true } })
  if (existente) {
    await prisma.lesson.update({ where: { id: existente.id }, data: datos })
    console.log(`↻ S${n} actualizada: ${spec.slug} · id ${existente.id}`)
  } else {
    const l = await prisma.lesson.create({ data: { ...datos, slug: spec.slug, courseId: c.id, isPublished: false }, select: { id: true } })
    console.log(`＋ S${n} creada (sin publicar): ${spec.slug} · id ${l.id}`)
  }
  console.log('Siguiente: probar con el alumno simulado y correr `npx tsx scripts/cetemin/auditar-sesion.ts <sessionId>`.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
