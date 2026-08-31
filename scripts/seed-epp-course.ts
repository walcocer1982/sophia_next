/**
 * Seed: curso EPPs (Equipos de Protección Personal)
 *
 * Una sola sesión, 15 minutos, 4 actividades socráticas.
 * Track CONTINUA + Scope TRANSVERSAL (kiosko, sin sección/período).
 * Imágenes locales en /public/cursos/epps/.
 *
 * Ejecutar:  npx tsx scripts/seed-epp-course.ts
 *
 * Idempotente — usa upsert por slug para que se pueda re-correr sin duplicar.
 */

import { prisma } from '../lib/prisma'

const COURSE_SLUG = 'epps-basicos-vs-especificos'
const LESSON_SLUG = 'epps-basicos-vs-especificos-leccion-1'

// Acceso del kiosko CONTINUA
const KIOSKO_CODE = 'EPPS' // código corto que el alumno tipea para entrar
const CAMPAIGN_NAME = 'Inducción CETEMIN 2026'
const ASSESSMENT_TITLE = 'Inducción de EPPs — CETEMIN'
const KIOSKO_TIME_LIMIT_MIN = 20 // 15 min de clase + 5 min de buffer
// Vigencia del kiosko: desde HOY hasta 6 meses adelante
const KIOSKO_START = new Date()
const KIOSKO_END = new Date(KIOSKO_START.getTime() + 1000 * 60 * 60 * 24 * 30 * 6)

const INSTRUCTOR_PROMPT = `Eres Sophia, instructora de seguridad industrial en CETEMIN. Hablas español peruano neutro, con calidez, como una colega joven que acompaña al estudiante en su primera clase sobre Equipos de Protección Personal (EPPs).

Tu rol en este curso es UNO solo: que el estudiante aprenda a distinguir entre EPPs básicos (uso general en cualquier área de trabajo) y EPPs específicos (según el riesgo de la tarea). Nada más. No introduces normativa legal, no enumeras listados exhaustivos, no entras en marcas ni modelos.

REGLAS DE INTERACCIÓN
1. Eres socrática: NO das la definición primero. Muestras imagen, haces pregunta, escuchas, y guías con más preguntas hasta que el estudiante descubra la diferencia.
2. Una idea por turno. Nunca listas largas. Máximo 2-3 frases por respuesta.
3. Si el estudiante se equivoca, no dices "no". Dices: "Mira otra vez, ¿qué pasaría si...?".
4. Si el estudiante acierta, lo confirmas con energía breve: "Exacto." "Eso es." "Justamente."
5. Si el estudiante se queda en blanco, le ofreces una pista mínima (no la respuesta).
6. Nunca terminas una respuesta sin una pregunta de vuelta — el estudiante tiene que pensar todo el tiempo.

QUÉ ASUMIR DEL ESTUDIANTE
Es alguien que entró a CETEMIN hace poco. Probablemente ya vio EPPs en una mina o construcción pero nunca tuvo que clasificarlos. No tiene vocabulario técnico todavía. Aceptas palabras coloquiales ("la careta", "el arnés", "los lentes") y solo después introduces el término formal si la actividad lo requiere.

ESTILO DE VOZ
Ritmo pausado. Frases cortas. Hablas como peruana de Lima — siempre usando "tú" (nunca "vos"), sin acento de España. Tono cálido pero no infantil — tratas al estudiante como adulto que está empezando, no como niño.

VOCABULARIO TÉCNICO EXACTO (importante)
Cuando refieres al protector de oídos, dices "tapón auditivo" o "protector auditivo". NUNCA "audífonos" (los audífonos son para escuchar música — no son EPP).

CIERRE NATURAL
Cuando una actividad se complete, no anuncias "siguiente actividad". Haces una transición suave: "Bien, ahora piensa esto..." o "Mira esta otra foto...".`

const LESSON_CONTENT = {
  activities: [
    // ──────────────────────────────────────────────────────────
    // ACTIVIDAD 1 · Activación visual (2-3 min)
    // ──────────────────────────────────────────────────────────
    {
      id: 'epp_activity_001',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      weight: 1, // activación — solo identificar lo que ve
      teaching: {
        agent_instruction:
          "Muestra la imagen del operario en planta con casco blanco, lentes claros, guantes amarillos y tapón auditivo (protector de orejas colgado en el cuello). Pregunta: \"¿Qué EPPs reconoces en esta foto?\". Acepta vocabulario coloquial (\"el casco\", \"los lentes\"). Si menciona menos de tres, haz una pregunta pista señalando una parte específica de la foto. No clasifiques nada todavía — solo consigue que enumere lo que ve.",
        target_length: '40-80 palabras',
        context:
          'Primera actividad. El estudiante recién entra a la clase. Bajamos la barrera mostrando una imagen concreta y pidiendo solo identificación.',
        images: [
          {
            url: '/cursos/epps/epp-taller.png',
            description:
              'Trabajador operario industrial sentado en planta, usando casco blanco, lentes claros de seguridad, tapón auditivo (protector de orejas) colgado en el cuello, guantes amarillos. Uniforme gris con bandas reflectivas. Realiza tarea de mantenimiento. Maquinaria al fondo. Esta es la imagen del trabajador en taller.',
            showWhen: 'on_start',
          },
        ],
      },
      verification: {
        question:
          '¿Qué Equipos de Protección Personal (EPPs) reconocés en la foto que te muestro?',
        success_criteria: {
          must_include: [
            'Identifica el casco como uno de los EPPs visibles en la foto',
            'Identifica los lentes o gafas de seguridad',
            'Identifica los guantes',
            'Identifica el tapón auditivo o protector auditivo (orejeras)',
          ],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 3,
      },
      commonMistakes: [
        'Confundir EPP con vestimenta común (mameluco, ropa)',
        'Omitir el tapón auditivo porque está colgado, no puesto',
        'Llamarlo "audífonos" (audífonos son para escuchar música, no son EPP)',
      ],
    },

    // ──────────────────────────────────────────────────────────
    // ACTIVIDAD 2 · Categorización (3-4 min)
    // ──────────────────────────────────────────────────────────
    {
      id: 'epp_activity_002',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 1,
      weight: 2, // categorización — comprende sin aplicar todavía
      teaching: {
        agent_instruction:
          "Toma los EPPs que el estudiante listó antes. Pregunta: \"De esos que dijiste, ¿cuáles usarías SIEMPRE en cualquier área de trabajo, y cuáles dependen de la tarea específica?\". Espera que separe en dos grupos. Si confunde alguno (ej: pone tapón auditivo como 'siempre'), pregunta: \"¿Tú usas tapón auditivo en una oficina tranquila?\". Busca que descubra solo la idea de generales vs según la tarea, sin que tú digas la palabra \"específico\" primero.",
        target_length: '50-90 palabras',
        context:
          'El estudiante ya tiene una lista de EPPs (act. 1). Ahora le pedimos que los categorice mentalmente antes de darle las palabras formales.',
      },
      verification: {
        question:
          'De los EPPs que mencionaste, ¿cuáles usarías SIEMPRE, en cualquier área de trabajo, y cuáles DEPENDEN de la tarea específica?',
        success_criteria: {
          must_include: [
            'Reconoce que algunos EPPs se usan siempre o en cualquier área de trabajo (base general)',
            'Reconoce que otros EPPs dependen de la tarea o del riesgo específico',
            'Clasifica al menos un EPP correctamente como general (ej: casco, lentes, guantes)',
            'Clasifica al menos un EPP correctamente como dependiente de la tarea (ej: tapón auditivo solo en zonas ruidosas)',
          ],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
      },
      commonMistakes: [
        'Clasificar todos los EPPs como "siempre" sin distinguir riesgo',
        'Confundir la frecuencia de uso con la categoría (un EPP puede usarse mucho pero seguir siendo específico)',
      ],
    },

    // ──────────────────────────────────────────────────────────
    // ACTIVIDAD 3 · Aplicación con casos (4-5 min)
    // ──────────────────────────────────────────────────────────
    {
      id: 'epp_activity_003',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      weight: 3, // aplicación a casos — donde se ve si entendió
      teaching: {
        agent_instruction:
          'Muestra primero la imagen del trabajador con careta full-face (respirador). Pregunta: "Si este trabajador se quita la careta y solo usa los básicos (casco, lentes, guantes), ¿podría hacer su tarea? ¿Por qué no?". Cuando responda, muestra la imagen del trabajador en altura con arnés y repite el ejercicio. Guía al estudiante a nombrar el RIESGO específico de cada caso: gases o aire contaminado en la primera, caída en la segunda.',
        target_length: '60-100 palabras',
        context:
          'Aplicación. El estudiante ya entiende la diferencia conceptual; ahora la testea contra dos casos extremos donde el EPP específico es indispensable.',
        images: [
          {
            url: '/cursos/epps/epp-respirador.png',
            description:
              'Trabajador joven con careta full-face Scott (respirador completo cubriendo nariz y boca) y camisa de jean azul con bandera peruana en el bolsillo. Estructura metálica detrás.',
            showWhen: 'on_reference',
          },
          {
            url: '/cursos/epps/epp-arnes.png',
            description:
              'Trabajador en altura subiendo por estructura metálica de techo, con arnés de seguridad naranja y línea de vida, mameluco azul, casco con barbiquejo. Cielo despejado al fondo.',
            showWhen: 'on_reference',
          },
        ],
      },
      verification: {
        question:
          'Si los trabajadores de las fotos se quitan su equipo específico (la careta, el arnés) y solo usan los EPPs básicos, ¿podrían hacer su tarea? ¿Por qué no?',
        success_criteria: {
          must_include: [
            'Para el caso del respirador, identifica el riesgo de respirar gases, polvo, químicos o aire contaminado',
            'Para el caso del arnés, identifica el riesgo de caída desde altura',
            'Explica que los EPPs básicos NO protegen contra esos riesgos específicos',
            'Concluye que cada riesgo específico requiere un EPP específico adicional a los básicos',
          ],
          min_completeness: 65,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
      },
      commonMistakes: [
        'Decir solo "se haría daño" sin nombrar el riesgo específico',
        'Pensar que un casco protege contra gases o que los lentes protegen de una caída',
      ],
    },

    // ──────────────────────────────────────────────────────────
    // ACTIVIDAD 4 · Cierre con regla propia (2-3 min)
    // ──────────────────────────────────────────────────────────
    {
      id: 'epp_activity_004',
      type: 'closing',
      complexity: 'moderate',
      keyPointIndex: 3,
      weight: 4, // síntesis final — integra todo
      teaching: {
        agent_instruction:
          'Pide al estudiante que cierre con UNA sola frase: "Si tuvieras que explicarle a un compañero nuevo la diferencia entre EPPs básicos y específicos, ¿qué le dirías en una frase?". Espera una oración corta con palabras propias. Si solo describe los básicos (o solo los específicos), pide que complete el otro lado. Cuando integre ambas ideas en una frase coherente, confirma con energía: "Eso es. Esa es la diferencia."',
        target_length: '40-80 palabras',
        context:
          'Síntesis final. El estudiante debe formular la regla con palabras propias. Es el momento de mayor exigencia cognitiva: integrar ambos lados en una sola oración coherente.',
      },
      verification: {
        question:
          'Si tuvieras que explicarle a un compañero nuevo la diferencia entre EPPs básicos y EPPs específicos en UNA sola frase, ¿qué le dirías?',
        success_criteria: {
          must_include: [
            'Define que los EPPs básicos son los de uso general en cualquier área de trabajo',
            'Define que los EPPs específicos dependen del riesgo o la tarea particular',
            'La respuesta es UNA frase única que integra ambas ideas (no las separa en dos oraciones)',
          ],
          min_completeness: 70,
          understanding_level: 'outstanding',
        },
        max_attempts: 3,
      },
      commonMistakes: [
        'Definir solo un lado de la diferencia (solo básicos o solo específicos)',
        'Dar una lista en vez de una regla conceptual',
      ],
    },
  ],
}

async function main() {
  console.log('🌱 Seed curso EPPs')

  // Owner: primer SUPERADMIN o ADMIN encontrado
  const owner = await prisma.user.findFirst({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true },
  })
  if (!owner) throw new Error('No hay SUPERADMIN/ADMIN en la DB — no puedo asignar owner del curso')
  console.log(`   owner: ${owner.name} (${owner.email})`)

  // Curso (upsert por slug)
  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    update: {
      title: 'EPPs',
      capacidad:
        'Distinguir EPPs básicos (uso general) de EPPs específicos (según riesgo de tarea) en 15 minutos.',
      instructor: INSTRUCTOR_PROMPT,
      voiceEnabled: true,
      track: 'CONTINUA',
      scope: 'TRANSVERSAL',
      methodology: 'REFLECTIVE',
      allowPaste: false,
      allowImagePaste: false,
      isPublished: true,
      deletedAt: null,
    },
    create: {
      title: 'EPPs',
      slug: COURSE_SLUG,
      capacidad:
        'Distinguir EPPs básicos (uso general) de EPPs específicos (según riesgo de tarea) en 15 minutos.',
      instructor: INSTRUCTOR_PROMPT,
      voiceEnabled: true,
      track: 'CONTINUA',
      scope: 'TRANSVERSAL',
      methodology: 'REFLECTIVE',
      allowPaste: false,
      allowImagePaste: false,
      isPublished: true,
      userId: owner.id,
    },
  })
  console.log(`   ✅ curso: ${course.title} [${course.id}]`)

  // Lesson (upsert por slug)
  const lesson = await prisma.lesson.upsert({
    where: { slug: LESSON_SLUG },
    update: {
      title: 'EPPs básicos vs específicos',
      objective:
        'El estudiante reconoce la diferencia entre EPPs básicos (uso general) y EPPs específicos (según el riesgo de la tarea), y puede aplicar la distinción a casos reales.',
      keyPoints: [
        'Identificación visual de EPPs comunes en un escenario industrial',
        'Categorización en EPPs de uso general vs EPPs según tarea',
        'Aplicación de la categorización a casos de riesgo específico (gases, altura)',
        'Síntesis: regla propia que integre ambas categorías',
      ],
      contentJson: LESSON_CONTENT,
      isPublished: true,
      order: 1,
    },
    create: {
      title: 'EPPs básicos vs específicos',
      slug: LESSON_SLUG,
      objective:
        'El estudiante reconoce la diferencia entre EPPs básicos (uso general) y EPPs específicos (según el riesgo de la tarea), y puede aplicar la distinción a casos reales.',
      keyPoints: [
        'Identificación visual de EPPs comunes en un escenario industrial',
        'Categorización en EPPs de uso general vs EPPs según tarea',
        'Aplicación de la categorización a casos de riesgo específico (gases, altura)',
        'Síntesis: regla propia que integre ambas categorías',
      ],
      contentJson: LESSON_CONTENT,
      isPublished: true,
      order: 1,
      courseId: course.id,
    },
  })
  console.log(`   ✅ lección: ${lesson.title} [${lesson.id}]`)
  console.log(`      ${LESSON_CONTENT.activities.length} actividades`)

  // EventCampaign (upsert por nombre — el modelo no tiene unique en name, así
  // que usamos findFirst + create/update manual).
  let campaign = await prisma.eventCampaign.findFirst({
    where: { name: CAMPAIGN_NAME },
    select: { id: true, name: true },
  })
  if (!campaign) {
    campaign = await prisma.eventCampaign.create({
      data: {
        name: CAMPAIGN_NAME,
        shortName: 'Inducción 2026',
        startDate: KIOSKO_START,
        endDate: KIOSKO_END,
        location: 'CETEMIN (todas las sedes)',
        isArchived: false,
      },
      select: { id: true, name: true },
    })
  }
  console.log(`   ✅ campaña: ${campaign.name} [${campaign.id}]`)

  // Assessment (upsert por code unique). El "code" es lo que el alumno tipea
  // en /eval para entrar al kiosko.
  const assessment = await prisma.assessment.upsert({
    where: { code: KIOSKO_CODE },
    update: {
      title: ASSESSMENT_TITLE,
      lessonId: lesson.id,
      isActive: true,
      timeLimitMin: KIOSKO_TIME_LIMIT_MIN,
      collectEmail: false,
      collectDni: true,
      campaignId: campaign.id,
      closedAt: null,
      expiresAt: KIOSKO_END,
    },
    create: {
      code: KIOSKO_CODE,
      title: ASSESSMENT_TITLE,
      lessonId: lesson.id,
      createdById: owner.id,
      isActive: true,
      timeLimitMin: KIOSKO_TIME_LIMIT_MIN,
      collectEmail: false,
      collectDni: true,
      campaignId: campaign.id,
      expiresAt: KIOSKO_END,
    },
  })
  console.log(`   ✅ kiosko: ${assessment.title} [${assessment.id}]`)
  console.log(`      código de acceso: ${KIOSKO_CODE}`)
  console.log(
    `      vigencia: ${KIOSKO_START.toISOString().slice(0, 10)} → ${KIOSKO_END.toISOString().slice(0, 10)}`,
  )
  console.log(`      tiempo límite: ${KIOSKO_TIME_LIMIT_MIN} min`)

  console.log('\n✅ Seed completado')
  console.log(`   courseId:     ${course.id}`)
  console.log(`   lessonId:     ${lesson.id}`)
  console.log(`   campaignId:   ${campaign.id}`)
  console.log(`   assessmentId: ${assessment.id}`)
  console.log(`\n👉 Para probar el kiosko: /eval/${KIOSKO_CODE}`)
}

main()
  .catch((e) => {
    console.error('❌', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
