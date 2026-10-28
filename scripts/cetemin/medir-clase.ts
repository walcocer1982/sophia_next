/**
 * Mide cómo les fue a los alumnos reales en una sesión, actividad por actividad.
 * Es el último paso del procedimiento (PROCEDIMIENTO.md, paso 9): lo que sale
 * aquí se lee junto con las conversaciones y lo nuevo va a APRENDIZAJES.md.
 *
 *   node --import tsx scripts/cetemin/medir-clase.ts <curso> <n>
 *
 * Solo lee. Cuenta alumnos reales: sin sesiones de prueba ni alumnos simulados.
 * Por actividad: cuántos llegaron, cuántos avanzaron POR LÍMITE (completaron sin
 * cumplir los criterios), cuántos se fueron ahí, las respuestas de 3 palabras o
 * menos (sin contar los «listo» del toque) y el criterio que más faltó, con citas.
 */
import { prisma } from '../../lib/prisma'
import type { Activity, LessonContent } from '../../types/lesson'
import { REGISTRO } from './cursos/registro'

const palabras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length

async function main() {
  const [curso, n] = [process.argv[2], Number(process.argv[3])]
  const spec = REGISTRO[curso]?.sesiones[n]
  if (!spec) throw new Error(`No existe ${curso} S${n} en cursos/registro.ts`)
  const leccion = await prisma.lesson.findFirst({ where: { slug: spec.slug }, select: { id: true, contentJson: true } })
  if (!leccion) throw new Error(`La sesión ${spec.slug} no está cargada`)
  const actividades = (leccion.contentJson as unknown as LessonContent).activities as Activity[]
  const sesiones = await prisma.lessonSession.findMany({
    where: { lessonId: leccion.id, isTest: false, user: { role: 'STUDENT', NOT: { email: { endsWith: '@simulado.local' } } } },
    select: {
      activityId: true,
      completedAt: true,
      startedAt: true,
      activities: { select: { activityId: true, status: true, passedCriteria: true, evidenceData: true } },
      messages: { select: { role: true, content: true, activityId: true } },
    },
  })
  const terminaron = sesiones.filter((s) => s.completedAt)
  const minutos = terminaron.map((s) => (s.completedAt!.getTime() - s.startedAt.getTime()) / 60000).sort((a, b) => a - b)
  console.log(`\n${curso} S${n} «${spec.title}» · ${sesiones.length} alumnos · terminaron ${terminaron.length} · mediana ${minutos.length ? Math.round(minutos[Math.floor(minutos.length / 2)]) : '-'} min\n`)

  for (const [i, a] of actividades.entries()) {
    const conNota = a.verification.is_evaluative !== false
    let llegaron = 0, porLimite = 0, seFueron = 0, cortas = 0, respuestas = 0
    const faltan = new Map<string, string[]>()
    for (const s of sesiones) {
      const ap = s.activities.find((x) => x.activityId === a.id)
      const delAlumno = s.messages.filter((m) => m.activityId === a.id && m.role === 'user' && m.content.trim().toLowerCase() !== 'listo')
      if (!ap && !delAlumno.length) continue
      llegaron++
      if (ap?.status === 'COMPLETED' && conNota && ap.passedCriteria === false) porLimite++
      if (ap?.status !== 'COMPLETED' && s.activityId === a.id && !s.completedAt) seFueron++
      respuestas += delAlumno.length
      cortas += delAlumno.filter((m) => palabras(m.content) <= 3).length
      // Lo que seguía faltando en su último intento.
      const intentos = ((ap?.evidenceData as { attempts?: { studentResponse?: string; analysis?: { criteriaMissing?: string[] } }[] })?.attempts) ?? []
      const ultimo = intentos.at(-1)
      for (const c of ultimo?.analysis?.criteriaMissing ?? []) {
        const citas = faltan.get(c) ?? []
        citas.push(String(ultimo?.studentResponse ?? '').replace(/\s+/g, ' ').slice(0, 140))
        faltan.set(c, citas)
      }
    }
    if (!llegaron) { console.log(`${i + 1}. ${a.title ?? a.id}: nadie llegó`); continue }
    const alarma = conNota && porLimite * 2 > llegaron ? '  ⚠️ más de la mitad por límite: revisar antes de volver a usarla' : ''
    console.log(`${i + 1}. [${a.rol ?? a.type}] ${a.title ?? a.id}: llegaron ${llegaron}${conNota ? ` · por límite ${porLimite}` : ''}${seFueron ? ` · se fueron aquí ${seFueron}` : ''} · respuestas cortas ${cortas}/${respuestas}${alarma}`)
    const [peor] = [...faltan].sort((x, y) => y[1].length - x[1].length)
    if (peor) {
      console.log(`   ✗ ${peor[1].length} sin: ${peor[0]}`)
      for (const cita of peor[1].slice(0, 3)) console.log(`      «${cita}»`)
    }
  }
}

main().finally(() => prisma.$disconnect())
