/**
 * Refactor de la lección "El ciclo de minado":
 * Recorta los 4 agent_instruction (1.500 chars c/u → 50-80 palabras) siguiendo
 * el principio: agent_instruction = SOLO EL TEMA. El guion pedagógico (flujo,
 * sub-preguntas, ejemplos) sale — Sophia usa verification.question + system
 * prompt para conducir la conversación.
 *
 * Causas que cierra: #6/10 (truncado a 80 chars perdía contexto).
 *
 * Uso: npx tsx scripts/refactor-ciclo-minado-lesson.ts [--dry-run]
 */
import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

const NEW_AGENT_INSTRUCTIONS: Record<string, string> = {
  mineria_act_1_hook: `El ciclo de minado subterráneo se repite avance tras avance. Cada vez que el túnel gana solo 3 a 5 metros, se ejecutan las 6 fases en orden: Perforación, Voladura, Ventilación, Desate y Limpieza, Carguío y Acarreo, y Sostenimiento. Después vuelve a empezar. Un túnel de 500 metros requiere repetir el ciclo unas 100 a 170 veces. El visitante debe entender que el túnel "avanza" por ciclos pequeños repetidos, no de un solo tiro.`,

  mineria_act_2_perforacion_voladura: `La roca se rompe en dos pasos consecutivos: PERFORACIÓN (mecánica — hace barrenos en un patrón diseñado con un jumbo) y VOLADURA (química — carga los barrenos con emulsión o ANFO y los detona en secuencia). El orden de detonación importa: primero el cuele en el centro, luego el alivio alrededor, luego el contorno en el borde. Esa secuencia controla a dónde van las rocas rotas y qué tan fragmentadas quedan.`,

  mineria_act_3_post_voladura: `Después de la voladura, antes de que entre personal a recoger el mineral, vienen 4 pasos en orden estricto: VENTILACIÓN (extraer gases tóxicos como CO y NOx), DESATE (botar con barretillas las rocas sueltas del techo y paredes), SOSTENIMIENTO (instalar pernos, malla o shotcrete para estabilizar la nueva apertura), y recién después CARGUÍO (un scoop entra a llevar el mineral). La seguridad está integrada al ciclo, no es un agregado opcional.`,

  mineria_act_4_cierre: `Cada ciclo de minado avanza 3-5 metros. Un turno de 8 horas completa 1 o 2 ciclos por frente. Las minas grandes operan varios frentes en paralelo. La pregunta de cierre invita al estudiante a elegir cuál de las 6 fases (perforación, voladura, ventilación, desate, carguío o sostenimiento) decide más la productividad de toda la operación, y a justificar su elección. No hay una respuesta única — lo importante es que sustente el porqué con un argumento razonado.`,
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const lesson = await prisma.lesson.findFirst({
    where: { title: { contains: 'ciclo de minado', mode: 'insensitive' } },
    select: { id: true, title: true, contentJson: true },
  })

  if (!lesson) {
    console.error('Lección no encontrada')
    process.exit(1)
  }

  const content = lesson.contentJson as unknown as LessonContent

  console.log(`\n📚 ${lesson.title} (${lesson.id})\n`)
  console.log(`Cambios propuestos:\n`)

  let changed = 0
  const newActivities = (content.activities ?? []).map((act) => {
    const newInstr = NEW_AGENT_INSTRUCTIONS[act.id]
    if (!newInstr) {
      console.log(`⚠️  ${act.id}: sin reemplazo definido, se mantiene como está`)
      return act
    }
    const oldWords = countWords(act.teaching?.agent_instruction ?? '')
    const newWords = countWords(newInstr)
    const newChars = newInstr.length

    console.log(`✏️  ${act.id}`)
    console.log(`    Antes: ${oldWords} palabras / ${act.teaching?.agent_instruction?.length ?? 0} chars`)
    console.log(`    Después: ${newWords} palabras / ${newChars} chars`)
    if (newWords > 80) {
      console.log(`    ⚠️  EXCEDE 80 palabras — revisar`)
    } else if (newWords < 50) {
      console.log(`    ⚠️  DEBAJO de 50 palabras — revisar`)
    } else {
      console.log(`    ✅ Dentro del rango 50-80 palabras`)
    }
    console.log()

    changed++
    return {
      ...act,
      teaching: {
        ...act.teaching,
        agent_instruction: newInstr,
      },
    }
  })

  if (dryRun) {
    console.log(`\n🧪 DRY RUN — sin cambios en DB. ${changed} actividades serían actualizadas.`)
    await prisma.$disconnect()
    return
  }

  const newContent: LessonContent = { ...content, activities: newActivities }
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { contentJson: newContent as object },
  })

  console.log(`\n✅ Lección actualizada en DB. ${changed} actividades refactorizadas.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
