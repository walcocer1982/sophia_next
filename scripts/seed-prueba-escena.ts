/**
 * Lección de PRUEBA del panel de apoyo (etapa 2): escena con señalamientos y
 * material a pedido. No es una clase: existe para recorrer con el alumno
 * simulado lo que ninguna lección real tiene todavía.
 *
 * - Actividad 1: una escena de caso con cuatro señalamientos ocultos. El 3 (el
 *   protector auditivo en el cuello) solo puede aparecer DESPUÉS de que el
 *   alumno responda; el servidor descarta cualquier señalamiento de otra
 *   actividad.
 * - Actividad 2: una tabla `on_demand` que aparece con el botón «Ver material
 *   disponible» del panel.
 *
 * La foto es la de la actividad epp_activity_001 de la lección publicada
 * «EPPs básicos vs específicos» (ya la ven alumnos); aquí no se toca esa lección.
 * Se crea SIN publicar en el curso plan-tutoria-induccion.
 *
 * Uso: npx tsx scripts/seed-prueba-escena.ts            (valida y escribe)
 *      npx tsx scripts/seed-prueba-escena.ts --solo-validar
 */
import { prisma } from '../lib/prisma'
import { GeneratedStructureSchema } from '../lib/planner/validation'
import type { Activity, LessonContent, SupportBlock } from '../types/lesson'

const COURSE_SLUG = 'plan-tutoria-induccion'
const SLUG = 'prueba-panel-escena-con-senalamientos'

const ESCENA: SupportBlock = {
  id: 'escena-epp-taller',
  type: 'image',
  title: 'Escena: trabajo en la planta',
  kind: 'scene',
  url: 'https://res.cloudinary.com/dprc0tz2d/image/upload/v1782232933/sophia/cmqq1zn7c0001uxbcfh3yd8lx/cmqq1zne40003uxbcwktvenwq/v5e5ippy7wive4pzfuud.webp',
  description:
    'Un trabajador de mameluco gris con cintas reflectivas trabaja agachado junto a una máquina en una planta industrial, con andamios y equipos al fondo. Lleva casco blanco, gafas de seguridad transparentes y guantes amarillos en ambas manos. Tiene un protector auditivo de copa colgado en el cuello: no le cubre los oídos.',
  // La licencia original no está registrada en la lección de origen.
  license: 'sin registrar',
  source: 'Banco de Sophia, lección EPPs básicos vs específicos',
  validated: true,
  // Sin showWhen: en una escena, cada señalamiento aparece cuando Sophia lo cita.
  markers: [
    { n: 1, x: 42, y: 15, label: 'Casco con la copa bien puesta' },
    { n: 2, x: 45, y: 28, label: 'Gafas de seguridad puestas' },
    { n: 3, x: 40, y: 42, label: 'Protector auditivo en el cuello: no protege del ruido' },
    { n: 4, x: 80, y: 43, label: 'Guantes en las dos manos' },
  ],
}

const TABLA_EPP: SupportBlock = {
  id: 'tabla-epp-basico',
  type: 'table',
  title: 'EPP básico y de qué protege',
  showWhen: 'on_demand',
  columns: ['EPP', 'Protege de'],
  rows: [
    ['Casco', 'Golpes y caída de objetos'],
    ['Gafas de seguridad', 'Partículas y salpicaduras'],
    ['Protector auditivo', 'Ruido sobre 85 dB'],
    ['Guantes', 'Cortes y abrasión'],
  ],
}

// Etapa 4: los tres trazados de diagrama, para mirarlos en 280 px y ampliados.
const FLUJO_LOTO: SupportBlock = {
  id: 'flujo-loto',
  type: 'diagram',
  title: 'Bloqueo y etiquetado, paso a paso',
  kind: 'flow',
  nodes: [
    { id: 'n1', label: 'Avisar al personal del área' },
    { id: 'n2', label: 'Apagar el equipo con su mando normal' },
    { id: 'n3', label: 'Aislar todas las fuentes de energía', note: 'Eléctrica, hidráulica y neumática' },
    { id: 'n4', label: 'Colocar candado y tarjeta con nombre' },
    { id: 'n5', label: 'Verificar energía cero', note: 'Intentar arrancar con el mando normal' },
    { id: 'n6', label: 'Intervenir el equipo' },
  ],
  edges: [{ from: 'n5', to: 'n6', label: 'si no arranca' }],
}

const CICLO_EPP: SupportBlock = {
  id: 'ciclo-epp',
  type: 'diagram',
  title: 'Ciclo de cuidado del EPP',
  kind: 'cycle',
  showWhen: 'on_demand',
  nodes: [
    { id: 'n1', label: 'Inspeccionar antes de usar' },
    { id: 'n2', label: 'Usar bien puesto toda la tarea' },
    { id: 'n3', label: 'Limpiar y guardar' },
    { id: 'n4', label: 'Reportar daños y reemplazar' },
  ],
}

const JERARQUIA_EPP: SupportBlock = {
  id: 'jerarquia-epp',
  type: 'diagram',
  title: 'Tipos de EPP',
  kind: 'hierarchy',
  showWhen: 'on_demand',
  nodes: [
    { id: 'epp', label: 'Equipo de protección personal' },
    { id: 'basico', label: 'Básico (todas las áreas)' },
    { id: 'especifico', label: 'Específico (según el riesgo)' },
    { id: 'casco', label: 'Casco, lentes, zapatos' },
    { id: 'auditivo', label: 'Protector auditivo (sobre 85 dB)' },
    { id: 'respirador', label: 'Respirador (polvo, gases)' },
  ],
  parent: { basico: 'epp', especifico: 'epp', casco: 'basico', auditivo: 'especifico', respirador: 'especifico' },
}

const activities: Activity[] = [
  {
    id: 'prueba-escena-1',
    type: 'practice',
    complexity: 'simple',
    keyPointIndex: 0,
    teaching: {
      agent_instruction:
        'La escena está en el panel. Pide que la mire con calma, sin decir qué muestra ni qué está mal. Plantea el paso cerrado. Cuando el estudiante haya elegido, señala en la foto el equipo del que hablan.',
      target_length: '40-70 palabras',
      blocks: [ESCENA],
    },
    choice: {
      prompt: 'En la escena del panel, ¿qué equipo de protección está mal usado?',
      options: ['El casco', 'Las gafas de seguridad', 'El protector auditivo', 'Los guantes'],
      answer: 2,
      max_attempts: 2,
    },
    verification: {
      question: '¿Por qué está mal usado y qué le puede pasar al trabajador?',
      success_criteria: {
        must_include: [
          'Dice que el protector auditivo está en el cuello y no le cubre los oídos',
          'Lo relaciona con el ruido de la planta y el daño al oído',
        ],
        min_completeness: 60,
        understanding_level: 'developing',
      },
      max_attempts: 2,
      open_ended: false,
    },
  },
  {
    id: 'prueba-escena-2',
    type: 'reflection',
    complexity: 'simple',
    keyPointIndex: 1,
    teaching: {
      agent_instruction:
        'Pregunta qué EPP usa el estudiante en el taller de su carrera y si alguna vez lo vio mal puesto. Si no recuerda de qué protege cada uno, la tabla está disponible en el panel.',
      target_length: '30-60 palabras',
      blocks: [FLUJO_LOTO, TABLA_EPP, CICLO_EPP, JERARQUIA_EPP],
    },
    verification: {
      question: '¿Qué EPP usas en tu taller y alguna vez viste a alguien usarlo mal?',
      success_criteria: {
        must_include: ['Nombra al menos un EPP que usa', 'Cuenta un caso propio o dice que no lo ha visto'],
        min_completeness: 50,
        understanding_level: 'developing',
      },
      max_attempts: 2,
      open_ended: true,
    },
  },
]

const context: NonNullable<LessonContent['context']> = {
  pais: 'Perú',
  normativa: 'Lección de prueba del panel de apoyo — no se publica',
  referencias: ['El protector auditivo protege solo si cubre los oídos; colgado en el cuello no reduce el ruido.'],
}

async function main() {
  const parsed = GeneratedStructureSchema.safeParse({ activities })
  if (!parsed.success) {
    console.error('❌ La estructura no valida:\n', JSON.stringify(parsed.error.issues, null, 2))
    process.exit(1)
  }
  console.log(`✅ ${activities.length} actividades válidas`)
  if (process.argv.includes('--solo-validar')) return

  const course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true } })
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`)
  const data = {
    title: 'PRUEBA · Panel: escena con señalamientos',
    objective: 'Probar la escena con señalamientos y el material a pedido del panel de apoyo.',
    keyPoints: ['Un EPP protege solo si está bien puesto', 'Cada EPP protege de un riesgo distinto'],
    contentJson: JSON.parse(JSON.stringify({ context, activities } satisfies LessonContent)),
    order: 99,
  }
  const existing = await prisma.lesson.findUnique({ where: { slug: SLUG }, select: { id: true } })
  if (existing) {
    await prisma.lesson.update({ where: { id: existing.id }, data })
    console.log(`↻ actualizada ${SLUG} (${existing.id})`)
  } else {
    const l = await prisma.lesson.create({ data: { ...data, slug: SLUG, courseId: course.id, isPublished: false } })
    console.log(`＋ creada ${SLUG} sin publicar (${l.id})`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
