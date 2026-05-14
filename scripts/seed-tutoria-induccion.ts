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
  'Eres Sophia, instructora de tutoría académica del programa de inducción de CETEMIN. Tu rol es ayudar a estudiantes de primer ciclo a desarrollar hábitos concretos de estudio, trabajo colaborativo y organización. Hablas con cercanía pero con firmeza profesional. Usas siempre situaciones reales del internado de CETEMIN: el TC (Trabajo Colaborativo), las jornadas largas de 7:45 a 19:00, los grupos asignados, los exámenes parciales, los manuales técnicos de cada carrera. No usas teoría abstracta; cada sugerencia debe ser aplicable esta misma semana.'

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
    'Aplica los criterios de la rúbrica de evaluación para identificar los requisitos de un trabajo colaborativo de calidad, mediante el análisis comparativo de un TC aprobado y uno desaprobado de ciclos anteriores.',
  keyPoints: [
    'Anatomía de la rúbrica CETEMIN (criterios, pesos, niveles)',
    'Análisis de un TC aprobado vs. uno desaprobado',
    'Evaluación cruzada usando la rúbrica',
    'Lista de verificación personal antes de entregar',
    'Compromisos de calidad para el TC en curso',
  ],
  contentJson: {
    context: {
      ...LESSON_CONTEXT,
      referencias: [
        ...LESSON_CONTEXT.referencias!,
        'Problemática: el TC es percibido como el componente de mayor dificultad por el 63% de estudiantes encuestados',
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
            'Activa el conocimiento previo del estudiante sobre cómo se califica un TC. Hazle UNA sola pregunta exploratoria sobre cómo cree que el instructor decide la nota. NO expliques aún la rúbrica — solo escucha y valida.',
          target_length: '60-100 palabras',
          context:
            'En CETEMIN el TC vale ~50% de la nota. La mayoría de estudiantes nunca ha leído la rúbrica antes de entregar.',
        },
        verification: {
          question:
            '¿Cómo crees que el instructor decide si tu TC merece nota alta o baja? ¿Qué mira primero?',
          success_criteria: {
            must_include: ['Menciona al menos un criterio (presentación, contenido, sustento, ortografía…)'],
            min_completeness: 50,
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
            'Explica la anatomía de la rúbrica CETEMIN: criterios típicos (claridad del problema, sustento técnico, organización del entregable, presentación visual, citas/fuentes), pesos diferentes por criterio, y los 4 niveles (En Inicio / En Proceso / Logrado / Destacado). Recalca que un criterio con peso alto puede arrastrar toda la nota si está mal.',
          target_length: '150-200 palabras',
          context:
            'La rúbrica de CETEMIN suele dar más peso a sustento técnico que a presentación, pero los estudiantes invierten al revés.',
        },
        verification: {
          question:
            'Si tu TC tiene muy buena presentación pero el sustento técnico es débil, ¿en qué nivel quedaría según la rúbrica y por qué el peso del sustento técnico es crítico?',
          success_criteria: {
            must_include: [
              'Quedaría En Proceso o En Inicio',
              'El sustento técnico tiene mayor peso',
              'La presentación sola no compensa',
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
        keyPointIndex: 1,
        teaching: {
          agent_instruction:
            'Presenta UN caso concreto: dos TC del mismo tema, uno aprobado con 17 y otro desaprobado con 11. Describe brevemente al desaprobado: introducción copiada literal del manual, sin citas, conclusiones genéricas. Pide al estudiante que identifique los DOS errores principales que la rúbrica penaliza.',
          target_length: '120-180 palabras',
          context:
            'En CETEMIN el copy-paste de manuales y las conclusiones genéricas son las dos razones más comunes de desaprobación.',
        },
        verification: {
          question:
            'Te describo el caso: el TC desaprobado tiene una introducción copiada literal del manual, sin citar fuentes, y las conclusiones son genéricas ("este tema es muy importante para la minería"). ¿Cuáles son los dos errores que más le bajan la nota según los criterios de la rúbrica?',
          success_criteria: {
            must_include: [
              'Copia sin citar / sin paráfrasis propia',
              'Conclusiones genéricas o sin sustento técnico propio',
            ],
            min_completeness: 70,
            understanding_level: 'applied',
            hints: {
              accept_paraphrase: true,
              common_mistakes: ['Mencionar solo presentación', 'Confundir errores ortográficos con sustento'],
            },
          },
          max_attempts: 3,
        },
      },
      {
        id: 'act-1-4',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 3,
        teaching: {
          agent_instruction:
            'Pide al estudiante construir una lista de verificación personal de 3-5 ítems que va a revisar antes de entregar SU TC actual. Acepta cualquier checklist coherente con criterios de la rúbrica, no exijas formato exacto.',
          target_length: '100-150 palabras',
          context:
            'El checklist personal es el entregable de la sesión. Debe estar conectado al TC real del estudiante.',
        },
        verification: {
          question:
            'Si vas a entregar tu TC en 2 días, ¿qué 3 cosas concretas vas a revisar antes de hacer click en "Entregar"? Dame los puntos como si fuera un checklist.',
          success_criteria: {
            must_include: [
              'Revisar contra criterios de la rúbrica',
              'Verificar citas / evitar copia literal',
              'Revisar conclusión propia y/o presentación',
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
            'Cierra pidiendo un compromiso personal de calidad. Una o dos oraciones bastan. Reconoce el esfuerzo de la sesión y conecta con el TC real del ciclo.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'Resume en 1-2 oraciones qué vas a cambiar de tu forma de hacer TC desde hoy, basado en lo que aprendimos.',
          success_criteria: {
            must_include: ['Compromiso concreto', 'Conexión con la rúbrica o con el TC actual'],
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
    'Organiza el trabajo colaborativo de su equipo actual asignando roles, estableciendo acuerdos escritos y definiendo un plan de entrega, a partir de la simulación de situaciones reales de conflicto grupal.',
  keyPoints: [
    'Diagnóstico rápido del equipo actual',
    'Asignación de roles y responsabilidades',
    'Acuerdo de equipo escrito y firmado',
    'Manejo de conflictos típicos en TC',
    'Plan de entrega con fechas y responsables',
  ],
  contentJson: {
    context: {
      ...LESSON_CONTEXT,
      referencias: [
        ...LESSON_CONTEXT.referencias!,
        'Problemática: descoordinación y falta de compromiso en equipos. El TC vale 50% de la nota del ciclo.',
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
            'Activa el problema: pregunta cómo se decide en su equipo actual quién hace qué. Escucha sin juzgar. Si dice "lo decidimos al final" o "cada uno hace lo que puede", eso ya es el diagnóstico.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            '¿Cómo deciden en tu equipo actual quién hace qué parte del TC? ¿Es claro para todos desde el inicio o se decide a último momento?',
          success_criteria: {
            must_include: ['Describe cómo se organiza su equipo hoy'],
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
            'Explica los 4-5 roles clave en un TC: coordinador (calendariza y persigue), redactor (escribe el documento), investigador (busca fuentes), revisor/QA (revisa antes de entregar), presentador (sustenta). Enfatiza que SIN un revisor el TC se entrega con errores graves.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'Si nadie en tu equipo asume el rol de revisor/QA, ¿qué pasa con el TC final cuando lo entregan? Dame un ejemplo concreto del riesgo.',
          success_criteria: {
            must_include: [
              'Sin revisor el TC se entrega con errores',
              'Errores afectan la nota (formato, ortografía, datos, inconsistencias)',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
            hints: { accept_examples: true },
          },
          max_attempts: 3,
        },
      },
      {
        id: 'act-2-3',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 3,
        teaching: {
          agent_instruction:
            'Plantea un role play concreto: "Un compañero de tu equipo no entregó su parte y faltan 24h para la presentación". Pídele que explique paso a paso cómo resuelve sin pelear y sin hundir el TC.',
          target_length: '120-180 palabras',
          context:
            'Este es el conflicto más reportado por los estudiantes de primer ciclo. La respuesta correcta NO es cubrirlo en silencio ni reclamar agresivo.',
        },
        verification: {
          question:
            'Tu compañero no entregó su parte y faltan 24h para presentar. ¿Cuál es el primer paso? ¿Lo cubres en silencio asumiendo su parte, o hablas con él? Explica por qué.',
          success_criteria: {
            must_include: [
              'Comunicarse directamente primero (no cubrir en silencio)',
              'Tener un Plan B claro: redistribuir trabajo o asumir, pero con acuerdo',
            ],
            min_completeness: 60,
            understanding_level: 'applied',
          },
          max_attempts: 3,
          open_ended: true,
        },
        commonMistakes: [
          'Asumir la parte sin avisar (refuerza el comportamiento del otro)',
          'Reclamar agresivo en grupo (rompe la dinámica de equipo)',
        ],
      },
      {
        id: 'act-2-4',
        type: 'practice',
        complexity: 'moderate',
        keyPointIndex: 2,
        teaching: {
          agent_instruction:
            'Construye con el estudiante un acuerdo de equipo escrito. Debe incluir mínimo: roles asignados, fechas de entrega parcial, qué pasa si alguien falla, y canal de comunicación.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'Dame los 3 puntos mínimos que escribirías en el acuerdo de tu equipo actual para que el conflicto del que hablamos no se repita.',
          success_criteria: {
            must_include: [
              'Roles asignados a cada miembro',
              'Fechas de entrega parcial / hitos intermedios',
              'Plan B si alguien falla',
            ],
            min_completeness: 67,
            understanding_level: 'applied',
            hints: { accept_paraphrase: true },
          },
          max_attempts: 2,
        },
      },
      {
        id: 'act-2-5',
        type: 'closing',
        complexity: 'simple',
        keyPointIndex: 4,
        teaching: {
          agent_instruction:
            'Cierre con compromiso accionable. Pídele UNA acción concreta que va a hacer con su equipo esta semana.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            '¿Cuál es la siguiente acción concreta que vas a hacer con tu equipo esta semana para aplicar lo de hoy?',
          success_criteria: {
            must_include: ['Acción concreta', 'Esta semana / tiempo definido'],
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
    'Diseña un cronograma semanal de estudio realista que integre la jornada de clases, el descanso y los momentos de trabajo autónomo, a partir del análisis de su rutina diaria actual.',
  keyPoints: [
    'Mapeo de la jornada real (7:45 – 19:00)',
    'Identificación de "ladrones de tiempo" en el internado',
    'Técnica Pomodoro adaptada a sesiones de 20 minutos',
    'Construcción de cronograma semanal realista',
    'Simulación: planificar 3 días antes de un examen',
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
            'Activa con una pregunta concreta sobre el tiempo después de clase. NO des consejos aún. Escucha cuánto tiempo realmente cree que tiene libre y dónde se le va.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'Después de las 19:00, ¿cuánto tiempo realmente puedes dedicar a estudiar antes de dormir? ¿Y por qué a veces sientes que esas horas no rinden lo que esperabas?',
          success_criteria: {
            must_include: ['Indica horas aproximadas', 'Menciona al menos una causa de baja productividad'],
            min_completeness: 50,
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
            'Introduce el concepto de "ladrones de tiempo" en el contexto del internado: redes sociales, conversaciones largas, espera del comedor, descanso mal usado, dormir tarde. Pide identificar los suyos y estimar pérdida semanal.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'Identifica los 2 ladrones de tiempo más grandes que tienes hoy en tu día. ¿Cuántas horas a la semana estimas que te quitan?',
          success_criteria: {
            must_include: [
              'Identifica al menos 2 ladrones concretos',
              'Estima horas/semana de pérdida',
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
            'Explica Pomodoro adaptado a sesiones de 20 min con descanso de 5 min — más realista que los 25/5 clásicos cuando hay cansancio acumulado. 4 ciclos = ~1h40 efectiva. Pregunta luego por qué Pomodoro funciona mejor que estudiar 90 min seguidos en estado de cansancio.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            'Después de una jornada de 11 horas, ¿prefieres 1 sesión continua de 90 minutos o 4 pomodoros de 20 min con descansos? Justifica con lo que sabes del cansancio mental.',
          success_criteria: {
            must_include: [
              'Pomodoros son mejores cuando hay cansancio acumulado',
              'Los descansos cortos mantienen el foco',
              'El cerebro cansado no sostiene 90 min de calidad',
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
            'Plantea una simulación concreta: tiene examen de Matemáticas en 3 días, hoy está cansado. Pide diseñar plan hora por hora para hoy, mañana y pasado mañana. Acepta cualquier plan razonable; lo importante es la lógica (no estudiar temas nuevos el día previo al examen).',
          target_length: '150-220 palabras',
        },
        verification: {
          question:
            'Te describo tu situación: tienes examen de Matemáticas en 3 días, hoy estás cansado por la jornada. Diseña tu plan: hoy, mañana y pasado mañana, hora por hora ¿qué haces?',
          success_criteria: {
            must_include: [
              'Hoy: descanso o repaso ligero (no temas nuevos)',
              'Día intermedio: estudio profundo / temas más complejos',
              'Día del examen: solo repaso ligero, sin temas nuevos',
            ],
            min_completeness: 67,
            understanding_level: 'analyzed',
            hints: { accept_examples: true, accept_paraphrase: true },
          },
          max_attempts: 3,
          open_ended: true,
        },
        commonMistakes: [
          'Dejar todo el estudio para el último día',
          'Estudiar temas nuevos la noche antes del examen',
        ],
      },
      {
        id: 'act-3-5',
        type: 'closing',
        complexity: 'simple',
        keyPointIndex: 3,
        teaching: {
          agent_instruction:
            'Cierra pidiéndole nombrar SU "hora sagrada" de estudio: una franja fija de la semana que se va a respetar. Reconoce el esfuerzo de la sesión.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            '¿Cuál es tu nueva "hora sagrada" de estudio que vas a respetar esta semana? Dame el día y la hora concreta.',
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
    'Extrae las ideas principales de un material de estudio técnico aplicando técnicas de lectura activa, mediante la elaboración de un organizador visual sobre un contenido real de su carrera.',
  keyPoints: [
    'Diferencia entre lectura técnica y lectura superficial',
    'Subrayado estratégico en manuales',
    'Preguntas antes y después de leer',
    'Construcción de mapa conceptual o diagrama de flujo',
    'Glosario técnico propio',
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
            'Activa el problema: pregunta cómo aborda un manual técnico cuando se lo dejan de tarea. No le digas qué está bien o mal; solo registra su práctica actual.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            'Cuando te dejan leer un manual técnico en casa, ¿cómo lo abordas? ¿Lo lees de corrido de principio a fin o haces algo distinto?',
          success_criteria: {
            must_include: ['Describe su método actual de lectura'],
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
        keyPointIndex: 0,
        teaching: {
          agent_instruction:
            'Explica la diferencia entre lectura técnica y lectura superficial: la técnica tiene 3 momentos (preguntas iniciales, lectura activa con marcas, organización final). La superficial es lineal y se olvida en horas.',
          target_length: '120-180 palabras',
        },
        verification: {
          question:
            '¿Qué hace que la lectura técnica sea distinta a leer un cuento o un post en redes sociales? Dame 2 diferencias concretas en cómo te involucras como lector.',
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
        keyPointIndex: 1,
        teaching: {
          agent_instruction:
            'Enseña subrayado estratégico: SÍ subrayar — definiciones, datos numéricos, relaciones causa-efecto, palabras técnicas clave. NO subrayar — conectores ("además", "por lo tanto"), ejemplos secundarios, oraciones enteras. Da un ejemplo concreto y pide aplicarlo.',
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
            'Plantea un fragmento técnico corto: "La lixiviación con cianuro tiene 3 etapas: preparación de la solución, contacto con el mineral, recuperación del oro disuelto". Pide al estudiante describir en palabras (o lista) cómo lo organizaría visualmente: concepto central, ramas, secuencia.',
          target_length: '150-220 palabras',
        },
        verification: {
          question:
            'Te doy un fragmento corto: la lixiviación con cianuro tiene 3 etapas (preparación de la solución, contacto con el mineral, recuperación del oro disuelto). Descríbeme en palabras cómo lo organizarías en un mapa visual: ¿qué pondrías en el centro, qué en los costados, cómo muestras la secuencia?',
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
            'Cierra iniciando el glosario técnico propio del estudiante. Pídele UNA palabra técnica de su carrera + cómo la explicaría con sus propias palabras.',
          target_length: '60-100 palabras',
        },
        verification: {
          question:
            '¿Cuál es la primera palabra técnica de tu carrera que vas a agregar a tu glosario hoy, y cómo la explicarías con tus propias palabras?',
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
