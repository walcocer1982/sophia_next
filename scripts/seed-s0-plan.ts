/**
 * S0 — "Construye tu plan"
 *
 * Sesión de diagnóstico indirecto para el Plan de Tutoría de Inducción Académica.
 * El estudiante cree que está ayudando a diagnosticar y armar el plan de OTRO
 * estudiante (Renzo, del ciclo pasado). Nunca se le pregunta por sus propias
 * debilidades: la señal sale de lo que proyecta (A2), de lo que efectivamente
 * puede explicar (A3) y de lo que elige llevarse (A4).
 *
 * Toda la sesión es no evaluativa vía is_evaluative:false. Los pesos quedan en
 * el default por tipo a propósito: con weight:0 en todas las actividades el
 * denominador del promedio ponderado es 0 y calculateGrade() devuelve 0
 * (lib/grading.ts) — o sea "nota 0", que se lee como reprobado.
 *
 * Uso: npx tsx scripts/seed-s0-plan.ts
 */
import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

const COURSE_SLUG = 'plan-tutoria-induccion'
const LESSON_SLUG = 's0-construye-tu-plan-abq'

const RENZO = [
  'faltó tres días en la segunda semana del curso',
  'estudió la noche anterior al examen',
  'dice que la carrera "está bien, pero no era lo que esperaba"',
  'entregó su parte del TC pero no supo explicarla cuando le preguntaron',
  'vive en el internado y se duerme tarde',
].join(' · ')

const content: LessonContent = {
  context: {
    pais: 'Perú',
    normativa:
      'Programa de Tutoría de Inducción Académica CETEMIN — sede ABQ — estudiantes de segundo ciclo',
    referencias: [
      'Rúbrica institucional de TC (Trabajo Colaborativo)',
      'Reglamento académico CETEMIN',
      'Problemática: cansancio mental (40%) y falta de organización (21%) son las dos principales barreras de estudio reportadas.',
      `Caso Renzo (estudiante ficticio del ciclo pasado): ${RENZO}`,
    ],
  },
  activities: [
    {
      id: 'act-0-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        target_length: '80-120 palabras',
        agent_instruction:
          'Pide ayuda al estudiante: tienes el caso de un alumno del ciclo pasado que se cayó y quieres la opinión de alguien que ya vivió ese ciclo. Aclara que esto no lleva nota. Antes de mostrarle el caso, pregúntale por su propio ciclo cerrado: qué curso se le hizo fácil y cuál difícil. Escucha sin corregir ni moralizar.',
      },
      verification: {
        question:
          'De los cursos que ya cerraste el ciclo pasado, ¿cuál se te hizo más fácil y cuál más difícil? ¿Qué crees que hizo la diferencia entre uno y otro?',
        open_ended: true,
        is_evaluative: false,
        max_attempts: 2,
        success_criteria: {
          must_include: [
            'Menciona al menos un curso fácil y uno difícil',
            'Da alguna razón de la diferencia',
          ],
          min_completeness: 40,
          understanding_level: 'beginning',
          hints: { accept_examples: true },
        },
      },
    },
    {
      id: 'act-0-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        target_length: '150-220 palabras',
        agent_instruction:
          'Presenta el caso de Renzo con TODOS los hechos de context.referencias, en desorden y sin señalar ninguno como la causa principal. No opines ni insinúes cuál pesa más: son igual de plausibles a propósito. Pide su diagnóstico. Si elige una sola causa, pregúntale por qué esa y no las otras, sin corregirlo.',
        image_suggestions: [
          'Ficha o captura del "caso Renzo": nombre, ciclo, y los cinco hechos en viñetas, sin destacar ninguno',
        ],
      },
      verification: {
        question:
          '¿Qué le está pasando realmente a Renzo? De todo lo que te conté, ¿qué es lo que más le está costando y por qué?',
        open_ended: true,
        is_evaluative: false,
        max_attempts: 2,
        success_criteria: {
          must_include: [
            'Identifica al menos una causa concreta del caso',
            'Justifica por qué esa causa y no otra',
          ],
          min_completeness: 50,
          understanding_level: 'developing',
          hints: { accept_examples: true },
        },
      },
    },
    {
      id: 'act-0-3',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        target_length: '120-180 palabras',
        agent_instruction:
          'Muéstrale un fragmento del trabajo de Renzo: "El equipo falló porque el operador no tenía experiencia. Lo sé porque el reporte dice que el operador tenía dos meses en el puesto." Pídele que lo revise. NO le adelantes que hay un error ni cuál es. Lo que importa no es que lo detecte, sino que pueda explicar POR QUÉ el razonamiento no se sostiene.',
        image_suggestions: [
          'Foto del fragmento del trabajo de Renzo, formato de entrega real anonimizado',
        ],
      },
      verification: {
        question:
          'Lee lo que escribió Renzo. ¿Su conclusión se sostiene con lo que él mismo da como prueba? Explícame por qué sí o por qué no.',
        open_ended: true,
        is_evaluative: false,
        max_attempts: 3,
        success_criteria: {
          must_include: [
            'Detecta que el dato de los dos meses no prueba que la falta de experiencia causara la falla',
            'Explica la razón: coincidencia o dato aislado no equivale a causa',
            'Menciona que faltaría descartar otras causas posibles',
          ],
          min_completeness: 60,
          understanding_level: 'achieved',
          hints: {
            accept_paraphrase: true,
            common_mistakes: [
              'Dice que está mal pero no puede explicar por qué',
              'Corrige la redacción en vez del razonamiento',
              'Acepta la conclusión como válida',
            ],
          },
        },
      },
      commonMistakes: [
        'Repetir la frase de Renzo sin analizarla',
        'Afirmar que falta información sin decir cuál ni para qué',
      ],
    },
    {
      id: 'act-0-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 3,
      teaching: {
        target_length: '150-200 palabras',
        agent_instruction:
          'Dile que ya tienen el diagnóstico y toca el plan. Dale cuatro pasos posibles para Renzo: ponerse al día con lo que faltó; pedir ayuda con el tema que no entendió; reorganizar sus horas de estudio en el internado; hablar con alguien sobre si la carrera es lo suyo. Pídele ordenarlos por importancia y justificar el primero. No sugieras un orden correcto.',
      },
      verification: {
        question:
          'Ordena esos cuatro pasos del más importante al menos importante para Renzo, y explícame por qué pusiste primero el que pusiste. Y dime: ¿cuál de los cuatro te llevarías tú para el próximo curso?',
        open_ended: true,
        is_evaluative: false,
        max_attempts: 2,
        success_criteria: {
          must_include: [
            'Ordena los cuatro pasos',
            'Justifica cuál puso primero',
            'Elige uno para sí mismo',
          ],
          min_completeness: 60,
          understanding_level: 'developing',
          hints: { accept_examples: true },
        },
      },
    },
    {
      id: 'act-0-5',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        target_length: '100-140 palabras',
        agent_instruction:
          'Agradécele la ayuda con el caso. Devuélvele el plan cerrado de Renzo en dos o tres líneas y refuerza algo concreto y real que él haya dicho bien. Cierra con la escala del 1 al 10, en tono de despedida, no de examen. No lo diagnostiques ni le señales debilidades.',
      },
      verification: {
        question:
          'Del 1 al 10, ¿qué tan listo te sientes para el próximo curso? ¿Por qué ese número y no uno menos?',
        open_ended: true,
        is_evaluative: false,
        max_attempts: 1,
        success_criteria: {
          must_include: ['Da un número del 1 al 10', 'Explica qué lo sostiene en ese número'],
          min_completeness: 40,
          understanding_level: 'beginning',
          hints: { accept_examples: true },
        },
      },
    },
  ],
}

async function main() {
  const course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG } })
  if (!course) throw new Error(`Curso no encontrado: ${COURSE_SLUG}`)

  const data = {
    title: 'S0 — Construye tu plan',
    objective:
      'Que el estudiante construya el plan de recuperación de un caso real de primer ciclo, aplicando criterio de priorización y revisión de razonamiento, y se lleve un paso concreto para su próximo curso.',
    keyPoints: [
      'Su propia experiencia del ciclo cerrado y a qué la atribuye',
      'Diagnóstico de un caso con varias causas plausibles',
      'Revisión de un razonamiento: distinguir dato de causa',
      'Priorización de los pasos de un plan',
    ],
    contentJson: content as unknown as object,
    order: 0,
    courseId: course.id,
  }

  const lesson = await prisma.lesson.upsert({
    where: { slug: LESSON_SLUG },
    update: data,
    // isPublished solo al crear: reaplicar el script no debe despublicarla.
    create: { ...data, slug: LESSON_SLUG, isPublished: false },
  })

  console.log(`✅ ${lesson.title}`)
  console.log(`   id: ${lesson.id} · order: ${lesson.order} · publicada: ${lesson.isPublished}`)
  console.log(`   ${content.activities.length} actividades, todas is_evaluative:false (pesos por default)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
