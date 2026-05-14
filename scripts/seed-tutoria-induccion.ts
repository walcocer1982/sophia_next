/**
 * Crea la carrera "Tutoría", el curso "Plan de Tutoría de Inducción Académica —
 * CETEMIN ABQ" propiedad de Walther Alcocer, y las 4 primeras lecciones del
 * plan (S1-S4) con sus actividades diseñadas para Sophia.
 *
 * Idempotente: detecta si el curso ya existe (por título), si las lecciones
 * existen (por slug), y solo crea lo que falta.
 */
import { prisma } from '../lib/prisma'
import type { LessonContent, Activity, LessonContext } from '../types/lesson'

const OWNER_EMAIL = 'walther.alcocer@cetemin.edu.pe'
const CAREER_OLD_NAME = 'Tutoría - módulo 01'
const CAREER_NEW_NAME = 'Tutoría'
const CAREER_NEW_SLUG = 'tutoria'

const COURSE_TITLE = 'Plan de Tutoría de Inducción Académica — CETEMIN ABQ'
const COURSE_SLUG = 'plan-tutoria-induccion-cetemin-abq'
const COURSE_CAPACITY =
  'Gestionar el proceso de aprendizaje técnico y la adaptación académica en el primer ciclo de CETEMIN, aplicando estrategias concretas de organización, trabajo colaborativo, lectura técnica y herramientas digitales, para superar las barreras que ponen en riesgo la aprobación del ciclo.'
const COURSE_INSTRUCTOR =
  'Eres Sophia, instructora de tutoría académica de CETEMIN. Hablas con cercanía pero con firmeza profesional, tratando al estudiante de "tú". Tu enfoque parte siempre de la experiencia concreta y reciente del estudiante — el curso que recién cerró, el TC que entregó hace días — para construir mejoras aplicables al próximo curso. No usas teoría abstracta. No felicitas en exceso; reconoces avances reales y nombras explícitamente lo que falta.'

const LESSON_CONTEXT: LessonContext = {
  pais: 'Perú',
  normativa:
    'Programa de Tutoría de Inducción Académica CETEMIN — sede ABQ — primer ciclo',
  referencias: [
    'Rúbrica institucional de TC (Trabajo Colaborativo)',
    'Reglamento académico CETEMIN',
  ],
}

// ============================================================================
// SESIÓN 1 — Gana el TC: entiende la rúbrica antes de empezar
// ============================================================================
const LESSON_1: { title: string; slug: string; objective: string; keyPoints: string[]; contentJson: LessonContent } = {
  title: 'S1 — Gana el TC: entiende la rúbrica antes de empezar',
  slug: 's1-gana-el-tc-entiende-la-rubrica',
  objective:
    'Aplica los criterios de la rúbrica de evaluación para identificar los requisitos de un trabajo colaborativo de calidad, mediante el análisis del TC que el estudiante recién entregó y la construcción de un checklist para el TC del próximo curso.',
  keyPoints: [
    'Anatomía de la rúbrica CETEMIN (criterios, pesos, niveles)',
    'Análisis del TC reciente del estudiante contra la rúbrica',
    'Diagnóstico: dónde se perdieron puntos en el último TC',
    'Lista de verificación personal para el próximo TC',
    'Compromiso de calidad para el próximo curso (1-2 semanas)',
  ],
  contentJson: {
    context: {
      ...LESSON_CONTEXT,
      referencias: [
        ...LESSON_CONTEXT.referencias!,
        'Problemática: el TC es percibido como el componente de mayor dificultad por el 63% de estudiantes encuestados',
        'Los cursos en CETEMIN duran 1-2 semanas; el TC del próximo curso empieza en pocos días',
      ],
    },
    activities: [
      {
        id: 'act-1-1',
        type: 'explanation',
        complexity: 'simple',
        keyPointIndex: 0,
        teaching: {
          agent_instruction:
            'Pregunta al estudiante por el TC del CURSO QUE ACABA DE CERRAR (no el ciclo, el curso reciente de 1-2 semanas): ¿de qué trataba? ¿con qué nota lo entregaste? Si no recuerda o es su primer curso en CETEMIN, ofrécele trabajar con un ejemplo típico de su carrera y avanza con eso. NO expliques aún la rúbrica; primero escucha.',
          target_length: '60-100 palabras',
          context:
            'Esta es la pregunta de anclaje de toda la sesión: todo lo que sigue se construye sobre el TC que el estudiante recién entregó.',
        },
        verification: {
          question:
            'Cuéntame del TC del curso que acabas de cerrar: ¿de qué tema era y qué nota obtuviste? Si no recuerdas o es tu primer curso, dímelo y trabajamos con un ejemplo de tu carrera.',
          success_criteria: {
            must_include: ['Menciona tema o nota del último TC, o pide ejemplo de su carrera'],
            min_completeness: 40,
            understanding_level: 'memorized',
            hints: { accept_paraphrase: true },
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
      {
        id: 'act-1-2',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 0,
        teaching: {
          agent_instruction:
            'Ahora explica la anatomía de la rúbrica CETEMIN aplicada al TC que el estudiante mencionó: criterios típicos (claridad del problema, sustento técnico, organización del entregable, presentación visual, citas/fuentes), pesos diferentes por criterio, y los 4 niveles (En Inicio / En Proceso / Logrado / Destacado). Recalca que el sustento técnico suele pesar más que la presentación.',
          target_length: '150-200 palabras',
          context:
            'La rúbrica de CETEMIN suele dar más peso a sustento técnico que a presentación, pero los estudiantes invierten el esfuerzo.',
        },
        verification: {
          question:
            'En el TC que entregaste, ¿dónde pusiste más esfuerzo: en que se viera bonito (presentación, diapositivas, formato) o en el sustento técnico (datos, cálculos, fuentes)? ¿Y según la rúbrica, dónde debiste haber puesto el mayor esfuerzo?',
          success_criteria: {
            must_include: [
              'Identifica dónde puso más esfuerzo en su TC real',
              'Reconoce que el sustento técnico tiene mayor peso',
            ],
            min_completeness: 60,
            understanding_level: 'understood',
          },
          max_attempts: 3,
        },
        commonMistakes: [
          'Pensar que la presentación visual compensa contenido débil',
          'Asumir que todos los criterios pesan igual',
        ],
      },
      {
        id: 'act-1-3',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 2,
        teaching: {
          agent_instruction:
            'Pide al estudiante que mire su nota real del TC reciente y diagnostique: ¿en qué criterio sintió que perdió puntos? Acepta diagnósticos honestos (copia literal del manual, conclusiones genéricas, sustento débil, formato apurado, falta de citas). Si no tiene experiencia previa, usa el ejemplo de su carrera y discute los errores típicos en ese tipo de TC.',
          target_length: '120-180 palabras',
          context:
            'Esta es la activad de diagnóstico personal. NO es para regañar, es para que el estudiante nombre concretamente qué falló.',
        },
        verification: {
          question:
            'Mirando tu nota del TC reciente: ¿en qué criterio crees que perdiste más puntos y por qué? Por ejemplo: copia literal del manual, conclusiones genéricas, sustento técnico débil, falta de citas...',
          success_criteria: {
            must_include: [
              'Identifica un criterio específico donde perdió puntos',
              'Explica por qué (causa concreta, no excusa genérica)',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
            hints: {
              accept_paraphrase: true,
              accept_examples: true,
            },
          },
          max_attempts: 3,
          open_ended: true,
        },
      },
      {
        id: 'act-1-4',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 3,
        teaching: {
          agent_instruction:
            'Pide al estudiante construir una lista de verificación personal de 3-5 ítems que va a revisar antes de entregar el TC del PRÓXIMO curso (que empieza en días). El checklist debe atacar específicamente lo que falló en el TC anterior identificado en act-1-3. Acepta cualquier checklist coherente.',
          target_length: '100-150 palabras',
          context:
            'El checklist se construye en base al diagnóstico del TC anterior. NO es genérico — debe atacar los errores reales que el estudiante nombró.',
        },
        verification: {
          question:
            'En tu próximo curso (que empieza en pocos días) vas a tener un TC nuevo. Basándote en lo que falló esta vez, dame 3 cosas concretas que vas a revisar antes de hacer click en "Entregar".',
          success_criteria: {
            must_include: [
              'Cada ítem ataca un error real del TC anterior',
              'Verificación contra criterios de rúbrica',
              'Acción concreta, no genérica',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
            hints: { accept_examples: true, accept_paraphrase: true },
          },
          max_attempts: 2,
          open_ended: true,
        },
      },
      {
        id: 'act-1-5',
        type: 'closing',
        complexity: 'simple',
        keyPointIndex: 4,
        teaching: {
          agent_instruction:
            'Cierra pidiendo un compromiso concreto para el TC del PRÓXIMO curso. Una o dos oraciones bastan. Reconoce el avance del estudiante sin felicitaciones exageradas.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'En 1-2 oraciones, dame el compromiso concreto que vas a aplicar en el TC del próximo curso. Conéctalo con lo que aprendimos hoy.',
          success_criteria: {
            must_include: ['Compromiso concreto para el próximo TC', 'Conexión con la rúbrica o con lo aprendido'],
            min_completeness: 50,
            understanding_level: 'understood',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
    ] as Activity[],
  },
}

// ============================================================================
// SESIÓN 2 — Tu equipo trabaja contigo, no contra ti
// ============================================================================
const LESSON_2: typeof LESSON_1 = {
  title: 'S2 — Tu equipo trabaja contigo, no contra ti',
  slug: 's2-tu-equipo-trabaja-contigo',
  objective:
    'Organiza el trabajo colaborativo del próximo TC repartiendo sub-tareas técnicas (no roles administrativos) con responsabilidad compartida y revisión cruzada, a partir del análisis de qué falló en el TC que el estudiante recién entregó.',
  keyPoints: [
    'Diagnóstico del equipo del TC recién cerrado',
    'Sub-tareas técnicas derivadas del contenido del TC (no roles administrativos)',
    'Responsabilidad compartida: revisión cruzada y plan de respaldo',
    'Manejo de conflictos en retrospectiva',
    'Acuerdo de equipo para el TC del próximo curso',
  ],
  contentJson: {
    context: {
      ...LESSON_CONTEXT,
      referencias: [
        ...LESSON_CONTEXT.referencias!,
        'Problemática: descoordinación y falta de compromiso en equipos. El TC vale ~50% de la nota del curso.',
        'Modelo CETEMIN: los 5 miembros del equipo presentan, así que TODOS deben conocer todas las sub-tareas técnicas.',
      ],
    },
    activities: [
      {
        id: 'act-2-1',
        type: 'explanation',
        complexity: 'simple',
        keyPointIndex: 0,
        teaching: {
          agent_instruction:
            'Pregunta por el equipo del TC del curso que ACABA DE CERRAR. ¿De qué fue el TC? ¿Cómo se repartió el trabajo? Escucha sin juzgar. Si dice "lo decidimos al final" o "cada uno hizo lo que pudo", eso ya es el diagnóstico. Si no recuerda o es primer curso, pide ejemplo de su carrera.',
          target_length: '60-100 palabras',
          context:
            'El TC reciente es la materia prima de toda esta sesión.',
        },
        verification: {
          question:
            'En el TC que acabas de entregar, ¿cómo se repartió el trabajo en tu equipo? ¿Cada quien sabía qué hacer desde el inicio o se decidió a último momento?',
          success_criteria: {
            must_include: ['Describe cómo se organizó su equipo en el TC pasado'],
            min_completeness: 40,
            understanding_level: 'memorized',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
      {
        id: 'act-2-2',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 1,
        teaching: {
          agent_instruction:
            'Aquí está el aprendizaje central de la sesión. Explica el modelo CETEMIN: el TC no se reparte con roles administrativos (coordinador, redactor, revisor) — se reparte con SUB-TAREAS TÉCNICAS derivadas del contenido del TC. Ejemplos según la carrera: en minería puede ser el que arma el IPERC, el que investiga las características técnicas de los EPPs, el que diseña el PETS, el que hace el plan de voladura. En PM puede ser el que hace el balance de masa, el que diseña el diagrama de flujo, el que investiga los reactivos. Cada sub-tarea tiene un LÍDER, pero los 5 miembros la revisan y la entienden, porque los 5 presentan al final. Usa el tema del TC del estudiante para descomponerlo en sub-tareas reales.',
          target_length: '180-250 palabras',
          context:
            'Reemplaza el modelo de roles administrativos por sub-tareas técnicas concretas. Los ejemplos cambian según la carrera del estudiante.',
        },
        verification: {
          question:
            'Tomando el tema del TC que acabas de entregar (o un TC típico de tu carrera): ¿en qué 3-5 sub-tareas TÉCNICAS lo descompondrías para repartir entre los 5 miembros? Por ejemplo, no me digas "redactor" o "coordinador"; dime "el que arma el IPERC", "el que investiga los EPPs", "el que hace el balance"...',
          success_criteria: {
            must_include: [
              'Identifica 3+ sub-tareas técnicas reales (no roles administrativos)',
              'Las sub-tareas se derivan del contenido del TC',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
            hints: { accept_examples: true, accept_paraphrase: true },
          },
          max_attempts: 3,
          open_ended: true,
        },
        commonMistakes: [
          'Caer en roles administrativos (coordinador, redactor) en vez de sub-tareas técnicas',
          'Dejar sub-tareas demasiado vagas ("investigar el tema")',
        ],
      },
      {
        id: 'act-2-3',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 2,
        teaching: {
          agent_instruction:
            'Ahora introduce la RESPONSABILIDAD COMPARTIDA: cada sub-tarea técnica tiene un líder PERO también un revisor designado, y todos los miembros la leen antes de la entrega. Pregunta en retrospectiva: ¿qué falló en el TC recién entregado? ¿Hubo un compañero que no cumplió, una sección mal hecha, un cálculo equivocado? ¿Cómo se manejó realmente? Conecta con el modelo: si hubieran trabajado con revisión cruzada y todos hubieran conocido las sub-tareas, ¿se habría podido evitar?',
          target_length: '150-220 palabras',
          context:
            'La idea es que el estudiante vea, sobre su experiencia real, cómo el modelo de responsabilidad compartida habría cambiado el resultado.',
        },
        verification: {
          question:
            'En el TC que entregaste: ¿hubo algún miembro del equipo que no cumplió, alguna sección mal hecha o algo que se entregó con errores? ¿Cómo se manejó en el momento? Y mirándolo ahora: si hubieran trabajado con revisión cruzada desde el inicio (cada sub-tarea leída por 2 personas mínimo), ¿se habría podido evitar?',
          success_criteria: {
            must_include: [
              'Identifica un fallo real (o ausencia honesta de fallo)',
              'Reconoce el rol de la revisión cruzada como prevención',
            ],
            min_completeness: 60,
            understanding_level: 'analyzed',
          },
          max_attempts: 3,
          open_ended: true,
        },
        commonMistakes: [
          'Echar toda la culpa al compañero que falló sin ver la responsabilidad de equipo',
          'Pensar que cubrir en silencio era "lo correcto" cuando refuerza el problema',
        ],
      },
      {
        id: 'act-2-4',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 4,
        teaching: {
          agent_instruction:
            'Construye con el estudiante el acuerdo escrito PARA EL TC DEL PRÓXIMO CURSO (que empieza en días). El acuerdo NO asigna roles administrativos; asigna sub-tareas técnicas con líder + revisor, define hitos de revisión cruzada, y un plan de respaldo (cualquiera puede cerrar cualquier sub-tarea porque todos la conocen).',
          target_length: '150-220 palabras',
          context:
            'Este es el entregable concreto de la sesión: un acuerdo aplicable al próximo TC en pocos días.',
        },
        verification: {
          question:
            'Para el TC del próximo curso, dame los 3 puntos mínimos que tu equipo va a escribir en el acuerdo desde el día 1: (1) las sub-tareas técnicas y quién las lidera, (2) cómo se revisa cruzado, (3) qué pasa si alguien falla.',
          success_criteria: {
            must_include: [
              'Sub-tareas técnicas asignadas (líder + revisor)',
              'Regla de revisión cruzada (mínimo 2 personas por sub-tarea)',
              'Plan de respaldo: cualquiera puede cerrar cualquier sub-tarea',
            ],
            min_completeness: 67,
            understanding_level: 'applied',
            hints: { accept_paraphrase: true },
          },
          max_attempts: 3,
        },
      },
      {
        id: 'act-2-5',
        type: 'closing',
        complexity: 'simple',
        keyPointIndex: 4,
        teaching: {
          agent_instruction:
            'Cierre con compromiso accionable para el PRÓXIMO TC. Pídele UNA acción concreta que va a hacer con su equipo el primer día del próximo curso.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'El próximo curso empieza en pocos días. ¿Cuál es la primera acción concreta que vas a proponerle a tu equipo desde el día 1 para que el nuevo TC arranque bien?',
          success_criteria: {
            must_include: ['Acción concreta', 'Conexión con el modelo de sub-tareas + revisión cruzada'],
            min_completeness: 50,
            understanding_level: 'understood',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
    ] as Activity[],
  },
}

// ============================================================================
// SESIÓN 3 — Tu tiempo en el internado: un plan que sí funciona
// ============================================================================
const LESSON_3: typeof LESSON_1 = {
  title: 'S3 — Tu tiempo en el internado: un plan que sí funciona',
  slug: 's3-tu-tiempo-en-el-internado',
  objective:
    'Mapea la semana real del curso que el estudiante acaba de cerrar, identifica sus ladrones de tiempo reales y construye un cronograma para el próximo curso (1-2 semanas) que aplique los aprendizajes — no un plan abstracto.',
  keyPoints: [
    'Mapeo de la semana real del curso recién cerrado',
    'Identificación de "ladrones de tiempo" reales del internado',
    'Técnica Pomodoro adaptada (20 min) para cansancio acumulado',
    'Cronograma del próximo curso aplicando los aprendizajes',
    'Hora sagrada de estudio para el próximo curso',
  ],
  contentJson: {
    context: {
      ...LESSON_CONTEXT,
      referencias: [
        ...LESSON_CONTEXT.referencias!,
        'Problemática: cansancio mental (40%) y falta de organización (21%) son las dos principales barreras de estudio reportadas.',
      ],
    },
    activities: [
      {
        id: 'act-3-1',
        type: 'explanation',
        complexity: 'simple',
        keyPointIndex: 0,
        teaching: {
          agent_instruction:
            'Pregunta por la SEMANA REAL del curso que acaba de cerrar: ¿cuándo estudió de verdad? ¿llegó a dormir bien antes del examen? Escucha sin moralizar. Si dice "estudié el día antes" o "no dormí", eso ya es el diagnóstico.',
          target_length: '60-100 palabras',
          context:
            'Los cursos duran 1-2 semanas, así que la "semana real" es la del curso que recién cerró.',
        },
        verification: {
          question:
            'En la última semana del curso que acabas de cerrar: ¿cuándo estudiaste de verdad y cuándo creíste que estudiabas pero no rendía? ¿Llegaste a dormir bien antes del examen?',
          success_criteria: {
            must_include: ['Describe cuándo estudió en la semana real reciente'],
            min_completeness: 40,
            understanding_level: 'memorized',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
      {
        id: 'act-3-2',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 1,
        teaching: {
          agent_instruction:
            'Introduce el concepto de "ladrones de tiempo" en el internado: redes sociales, conversaciones largas, espera del comedor, descanso mal usado, dormir tarde. PERO aplícalo a la semana real que el estudiante acaba de describir, no en abstracto. Pide identificar los suyos concretamente y estimar pérdida.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'De esa semana que acabas de describirme, identifica los 2 ladrones de tiempo más grandes que tuviste. ¿Cuántas horas estimas que te quitaron en total esa semana?',
          success_criteria: {
            must_include: [
              'Identifica al menos 2 ladrones concretos de la semana real',
              'Estima horas perdidas',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
            hints: { accept_examples: true },
          },
          max_attempts: 2,
          open_ended: true,
        },
      },
      {
        id: 'act-3-3',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 2,
        teaching: {
          agent_instruction:
            'Explica Pomodoro adaptado a sesiones de 20 min con descanso de 5 min — más realista que los 25/5 clásicos cuando hay cansancio acumulado tras 11h de jornada. 4 ciclos = ~1h40 efectiva. Pregunta cómo se compara con lo que el estudiante hizo en la semana del curso recién cerrado.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'Después de la jornada de 11h que ya tuviste esta semana, ¿qué rinde más: 1 sesión continua de 90 min (como quizás intentaste) o 4 pomodoros de 20 min con descansos? Justifica con lo que pasó en tu última semana real.',
          success_criteria: {
            must_include: [
              'Pomodoros son mejores cuando hay cansancio acumulado',
              'Los descansos cortos mantienen el foco',
              'Conecta con su experiencia real de la semana pasada',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
          },
          max_attempts: 3,
        },
      },
      {
        id: 'act-3-4',
        type: 'practice',
        complexity: 'complex',
        keyPointIndex: 4,
        teaching: {
          agent_instruction:
            'Plantea la simulación del PRÓXIMO curso (que empieza en pocos días): tendrá examen en ~5 días al cierre del curso. Pide diseñar su plan partiendo de lo que aprendió de la semana anterior. Acepta cualquier plan razonable; lo crítico es que aplique los aprendizajes (no estudiar temas nuevos el día previo, dormir bien, evitar los ladrones identificados).',
          target_length: '150-220 palabras',
        },
        verification: {
          question:
            'El próximo curso empieza en pocos días y dura una semana, con examen al final. Diseña tu plan partiendo de lo que acabas de aprender de tu última semana: ¿qué vas a hacer distinto día por día?',
          success_criteria: {
            must_include: [
              'Cuida el sueño antes del examen final',
              'Distribuye estudio a lo largo de la semana (no todo al final)',
              'Evita los ladrones de tiempo identificados',
            ],
            min_completeness: 67,
            understanding_level: 'analyzed',
            hints: { accept_examples: true, accept_paraphrase: true },
          },
          max_attempts: 3,
          open_ended: true,
        },
        commonMistakes: [
          'Dejar todo el estudio para el día antes del examen',
          'Repetir los mismos ladrones de tiempo de la semana pasada',
        ],
      },
      {
        id: 'act-3-5',
        type: 'closing',
        complexity: 'simple',
        keyPointIndex: 3,
        teaching: {
          agent_instruction:
            'Cierra pidiéndole nombrar SU "hora sagrada" para el próximo curso: una franja fija de la semana que va a respetar. Reconoce el avance sin felicitaciones exageradas.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'En el próximo curso (que empieza en días), ¿cuál va a ser tu "hora sagrada" de estudio que vas a respetar todos los días? Dame día y hora concreta.',
          success_criteria: {
            must_include: ['Día concreto', 'Hora concreta'],
            min_completeness: 50,
            understanding_level: 'understood',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
    ] as Activity[],
  },
}

// ============================================================================
// SESIÓN 4 — Lee para entender, no solo para cumplir
// ============================================================================
const LESSON_4: typeof LESSON_1 = {
  title: 'S4 — Lee para entender, no solo para cumplir',
  slug: 's4-lee-para-entender',
  objective:
    'Reflexiona sobre cómo leyó el manual del curso recién cerrado, aprende subrayado estratégico y organizador visual, y los aplica al manual del próximo curso (que empieza en días) para aprovechar el material desde el primer día.',
  keyPoints: [
    'Reflexión sobre cómo leyó el manual del curso pasado',
    'Diferencia entre lectura técnica y lectura superficial',
    'Subrayado estratégico aplicado al manual del próximo curso',
    'Organizador visual (mapa conceptual o diagrama de flujo)',
    'Glosario técnico propio para el próximo curso',
  ],
  contentJson: {
    context: {
      ...LESSON_CONTEXT,
      referencias: [
        ...LESSON_CONTEXT.referencias!,
        'Problemática: 70% de los estudiantes comprende menos del 75% del material autónomo asignado.',
      ],
    },
    activities: [
      {
        id: 'act-4-1',
        type: 'explanation',
        complexity: 'simple',
        keyPointIndex: 0,
        teaching: {
          agent_instruction:
            'Pregunta por el manual técnico del CURSO QUE ACABA DE CERRAR (no en abstracto): ¿lo abrió? ¿lo entendió cuando lo leyó solo, o solo agarró cosas en clase? ¿subrayó o tomó notas, o lo dejó sin marcar? No juzgues; mapea la práctica real. Si no recuerda o es su primer curso, pide ejemplo de su carrera y trabaja con eso.',
          target_length: '60-100 palabras',
          context:
            'El manual del curso recién cerrado es el material de anclaje de la sesión. Si no lo recuerda, ofrece ejemplo de su carrera.',
        },
        verification: {
          question:
            'El manual del curso que acabas de cerrar: ¿lo abriste? ¿Lo entendiste cuando lo leíste solo o solo agarraste cosas en clase? ¿Subrayaste o tomaste notas, o quedó sin marcar?',
          success_criteria: {
            must_include: ['Describe su práctica real con el manual del curso pasado'],
            min_completeness: 40,
            understanding_level: 'memorized',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
      {
        id: 'act-4-2',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 1,
        teaching: {
          agent_instruction:
            'Explica la diferencia entre lectura técnica y lectura superficial: la técnica tiene 3 momentos (preguntas iniciales, lectura activa con marcas, organización final). Conéctalo con lo que el estudiante acaba de contar — si solo leyó por encima, esa fue lectura superficial y por eso quizás no rindió en el examen.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'Mirando cómo leíste el manual del curso pasado y cómo te fue en el examen: ¿qué hace que la lectura técnica sea distinta a leer un texto cualquiera? Dame 2 diferencias concretas en cómo te tienes que involucrar como lector.',
          success_criteria: {
            must_include: [
              'La lectura técnica requiere subrayar / tomar notas / marcar',
              'Hay que volver y conectar conceptos, no leer una sola vez',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
            hints: { accept_paraphrase: true },
          },
          max_attempts: 3,
        },
      },
      {
        id: 'act-4-3',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 2,
        teaching: {
          agent_instruction:
            'Enseña subrayado estratégico con ejemplo concreto. SÍ subrayar — definiciones, datos numéricos, relaciones causa-efecto, palabras técnicas clave. NO subrayar — conectores ("además", "por lo tanto"), ejemplos secundarios, oraciones enteras. Usa un ejemplo de la carrera del estudiante (acero al carbono, IPERC, balance, EPPs) según lo que mencionó antes.',
          target_length: '150-220 palabras',
        },
        verification: {
          question:
            'En esta oración del manual: "Los aceros al carbono se clasifican en bajo, medio y alto carbono según su porcentaje de C entre 0.08% y 2.1%" — ¿qué partes subrayarías y qué partes NO? Explica por qué.',
          success_criteria: {
            must_include: [
              'Subrayar la clasificación (bajo / medio / alto)',
              'Subrayar los rangos numéricos (0.08% – 2.1%)',
              'No subrayar conectores ni la oración completa',
            ],
            min_completeness: 67,
            understanding_level: 'applied',
          },
          max_attempts: 3,
        },
        commonMistakes: [
          'Subrayar todo (resaltar todo = no resaltar nada)',
          'Subrayar conectores y ejemplos en lugar de datos clave',
        ],
      },
      {
        id: 'act-4-4',
        type: 'practice',
        complexity: 'complex',
        keyPointIndex: 3,
        teaching: {
          agent_instruction:
            'Pivota al PRÓXIMO curso (que empieza en días). Aplica organizador visual al material del próximo curso. Plantea un fragmento técnico corto como ejemplo ("La lixiviación con cianuro tiene 3 etapas...") y pídele describir en palabras cómo lo organizaría: concepto central, ramas, secuencia. La idea es que esta semana, cuando abra el manual del próximo curso, ya tenga una técnica para usar.',
          target_length: '150-220 palabras',
        },
        verification: {
          question:
            'Para llevar al manual de tu próximo curso, te doy un fragmento de ejemplo: "La lixiviación con cianuro tiene 3 etapas (preparación de la solución, contacto con el mineral, recuperación del oro disuelto)". Descríbeme cómo lo organizarías en un mapa visual: ¿qué pondrías en el centro, qué en los costados, cómo muestras la secuencia?',
          success_criteria: {
            must_include: [
              'Concepto principal en el centro (lixiviación con cianuro)',
              'Las 3 etapas como ramas o nodos',
              'Mostrar la secuencia / orden entre etapas',
            ],
            min_completeness: 67,
            understanding_level: 'applied',
            hints: { accept_paraphrase: true, accept_examples: true },
          },
          max_attempts: 3,
          open_ended: true,
        },
      },
      {
        id: 'act-4-5',
        type: 'closing',
        complexity: 'simple',
        keyPointIndex: 4,
        teaching: {
          agent_instruction:
            'Cierra iniciando el glosario técnico del estudiante para el PRÓXIMO curso. Pídele UNA palabra técnica que sabe va a aparecer en el próximo manual + cómo la explicaría con sus propias palabras (no copiada).',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'Para el próximo curso, dame la primera palabra técnica que vas a agregar a tu glosario y explícala con tus propias palabras (no copiada del manual).',
          success_criteria: {
            must_include: ['Palabra técnica concreta', 'Definición propia (no copiada)'],
            min_completeness: 50,
            understanding_level: 'understood',
          },
          max_attempts: 2,
          open_ended: true,
          is_evaluative: false,
        },
      },
    ] as Activity[],
  },
}

const LESSONS = [LESSON_1, LESSON_2, LESSON_3, LESSON_4]

async function main() {
  // 1. Renombrar carrera
  const career = await prisma.career.findFirst({
    where: { name: CAREER_OLD_NAME },
  })
  if (career) {
    const updated = await prisma.career.update({
      where: { id: career.id },
      data: { name: CAREER_NEW_NAME, slug: CAREER_NEW_SLUG },
      select: { id: true, name: true, slug: true },
    })
    console.log(`✓ Carrera renombrada: "${CAREER_OLD_NAME}" → "${updated.name}" (${updated.id})`)
  }
  const targetCareer =
    career
      ? { id: career.id, name: CAREER_NEW_NAME }
      : await prisma.career.findFirst({ where: { name: CAREER_NEW_NAME } })
  if (!targetCareer) {
    throw new Error(`No se encontró ni "${CAREER_OLD_NAME}" ni "${CAREER_NEW_NAME}"`)
  }

  // 2. Walther como dueño
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } })
  if (!owner) throw new Error(`Owner no encontrado: ${OWNER_EMAIL}`)
  console.log(`✓ Owner: ${owner.name} (${owner.email}, ${owner.role})`)

  // 3. Curso (idempotente por slug)
  const course = await prisma.course.upsert({
    where: { slug: COURSE_SLUG },
    update: {
      title: COURSE_TITLE,
      capacidad: COURSE_CAPACITY,
      instructor: COURSE_INSTRUCTOR,
      userId: owner.id,
      careerId: targetCareer.id,
    },
    create: {
      title: COURSE_TITLE,
      slug: COURSE_SLUG,
      capacidad: COURSE_CAPACITY,
      instructor: COURSE_INSTRUCTOR,
      userId: owner.id,
      careerId: targetCareer.id,
      isPublished: false,
    },
    select: { id: true, title: true },
  })
  console.log(`✓ Curso: ${course.title} (${course.id})`)

  // 4. Lecciones
  for (let i = 0; i < LESSONS.length; i++) {
    const l = LESSONS[i]
    const lesson = await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: {
        title: l.title,
        objective: l.objective,
        keyPoints: l.keyPoints,
        contentJson: l.contentJson as unknown as object,
        order: i + 1,
        courseId: course.id,
      },
      create: {
        title: l.title,
        slug: l.slug,
        objective: l.objective,
        keyPoints: l.keyPoints,
        contentJson: l.contentJson as unknown as object,
        order: i + 1,
        courseId: course.id,
        isPublished: false,
      },
      select: { id: true, title: true, order: true },
    })
    console.log(`✓ Lección ${lesson.order}: ${lesson.title}`)
  }

  console.log('\n=== TERMINADO ===')
  console.log(`Carrera: ${targetCareer.name}`)
  console.log(`Curso:   ${course.title}`)
  console.log(`Lecciones: 4 (S1-S4)`)
  console.log(`Owner:   ${owner.email}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
