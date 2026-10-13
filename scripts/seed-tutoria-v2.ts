/**
 * Plan de Tutoría v2 — las seis sesiones universales restantes, en borrador.
 *
 * Temas decididos el 5 oct 2026 a partir de los datos de Sophia (147 alumnos,
 * 5 085 mensajes; ver investigacion/tutoria-reporte-necesidades-2026-10-05.md).
 * La primera, EVA-NOTA, ya existe (scripts/eva-nota-v2.ts). Estas seis siguen
 * la misma plantilla: explicación y práctica abren con un paso cerrado que se
 * corrige en código y siguen con la justificación; reflexión y cierre son
 * abiertas; siete actividades para 30-45 minutos reales.
 *
 * Se crean SIN publicar (isPublished=false) en el curso plan-tutoria-induccion,
 * para revisarlas en el planner y probarlas con el alumno simulado antes de
 * abrirlas a estudiantes. Si una lección con el mismo slug ya existe, se
 * actualiza su contenido (no se duplica).
 *
 * Uso: npx tsx scripts/seed-tutoria-v2.ts            (valida y escribe)
 *      npx tsx scripts/seed-tutoria-v2.ts --solo-validar
 */
import { prisma } from '../lib/prisma'
import { GeneratedStructureSchema } from '../lib/planner/validation'
import type { Activity, LessonContent, SupportBlock } from '../types/lesson'

const COURSE_SLUG = 'plan-tutoria-induccion'

interface LessonSeed {
  slug: string
  order: number
  title: string
  objective: string
  keyPoints: string[]
  context: NonNullable<LessonContent['context']>
  activities: Activity[]
}

const normativa = (eje: string, semana: string) =>
  `Programa de Tutoría CETEMIN — eje ${eje} — primer ciclo presencial, ${semana}`

// ─────────────────────────────────────────────────────────────────────────────
// 2. INV-ACAD · Estrategias de Investigación Académica
// ─────────────────────────────────────────────────────────────────────────────
const invAcad: LessonSeed = {
  slug: 'inv-acad-estrategias-de-investigacion-academica',
  order: 6,
  title: 'INV-ACAD · Estrategias de Investigación Académica',
  objective:
    'Interpreta la consigna de un trabajo académico (qué pide, cuántas partes, con qué evidencia) y construye la estructura del trabajo antes de redactar, aplicándolo a una consigna real de su carrera.',
  keyPoints: [
    'Leer la consigna: los verbos dicen cuántas cosas distintas se piden',
    'Estructura del trabajo: una sección por cada cosa que pide la consigna',
    'Evidencia: fuentes citadas, datos y extensión mínima no son adornos, son parte de la consigna',
  ],
  context: {
    pais: 'Perú',
    normativa: normativa('Investigación académica (INV-ACAD)', 'semana 2'),
    referencias: [
      'Consigna de ejemplo (TC típico): «Elabore un informe técnico que identifique las fallas más frecuentes del sistema hidráulico de un cargador frontal, explique sus causas y proponga un plan de mantenimiento preventivo con cronograma. Extensión: 1 200 a 1 500 palabras, con fuentes citadas.» Pide TRES cosas (identificar, explicar, proponer) y dos condiciones (extensión y fuentes).',
      'Párrafo de un estudiante: «El cargador frontal tiene fallas en las mangueras hidráulicas y en la bomba principal. También se ha visto que los cilindros pierden aceite. Estas son las fallas más comunes.» Solo IDENTIFICA; no explica causas ni propone nada.',
      'Lo que los instructores penalizan (datos de tutoría 2026): copiar del manual sin palabras propias, entregas de 300 a 600 palabras cuando se pedían 1 200, falta de fuentes, describir sin interpretar.',
      'Cita de fuente dentro del párrafo, forma mínima: (Autor o fabricante, año, sección o página). Ejemplo: (Caterpillar, 2021, sección 4.2).',
      'Fuentes confiables para un informe técnico: manual o ficha del fabricante, normas técnicas (NTP, ISO, DS), libros o informes de la especialidad. No cuentan: videos de redes sociales sin autor, «lo dijo un compañero», «mi experiencia» sin dato.',
    ],
  },
  activities: [
    {
      id: 'inv-acad-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Muestra textual la consigna de ejemplo de context.referencias. Di que antes de escribir una línea hay que saber cuántas cosas distintas pide. Plantea el paso cerrado y pide una letra. Cuando elija, pide que nombre cada cosa con su verbo. No las nombres tú.',
        target_length: '70-110 palabras',
      },
      choice: {
        prompt:
          'Consigna: «Elabore un informe técnico que identifique las fallas más frecuentes del sistema hidráulico de un cargador frontal, explique sus causas y proponga un plan de mantenimiento preventivo con cronograma. Extensión: 1 200 a 1 500 palabras, con fuentes citadas.» ¿Cuántas cosas distintas pide que hagas (sin contar la extensión ni las fuentes)?',
        options: ['Una', 'Dos', 'Tres', 'Cuatro'],
        answer: 2,
        max_attempts: 2,
      },
      verification: {
        question: 'Nómbralas una por una, con el verbo que usa la consigna para cada una.',
        success_criteria: {
          must_include: ['Nombra identificar, explicar y proponer (o equivalentes)', 'Reconoce que son partes separadas del trabajo'],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
    {
      id: 'inv-acad-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Muestra textual el párrafo del estudiante de context.referencias. Plantea el paso cerrado. Cuando elija, pide que escriba la oración que agregaría para cubrir «explicar las causas». No escribas la oración por él; si se traba, pregúntale por qué fallan las mangueras.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt:
          'Párrafo de un estudiante: «El cargador frontal tiene fallas en las mangueras hidráulicas y en la bomba principal. También se ha visto que los cilindros pierden aceite. Estas son las fallas más comunes.» ¿Qué parte de la consigna cubre este párrafo?',
        options: ['Solo identifica las fallas', 'Identifica y explica las causas', 'Cubre las tres partes', 'No cubre ninguna'],
        answer: 0,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué le falta para cubrir «explicar las causas»? Escribe la oración que agregarías.',
        success_criteria: {
          must_include: ['Señala que falta la causa de las fallas', 'Escribe una oración con una causa (porque, debido a, por)'],
          critical: [2],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
      commonMistakes: ['Agrega más fallas en vez de causas', 'Escribe una recomendación (plan) en lugar de la causa'],
    },
    {
      id: 'inv-acad-3',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Explica en dos oraciones que la estructura sale de la consigna: una sección por cada cosa que pide, en el orden en que una depende de la otra. Plantea el paso cerrado. Cuando elija, pide que justifique por qué el plan va al final y qué debe traer.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Para esta consigna, ¿cuál es el orden correcto de las secciones del informe?',
        options: [
          'Plan de mantenimiento → Fallas → Causas',
          'Fallas identificadas → Causas → Plan con cronograma',
          'Causas → Plan → Fallas',
          'Introducción larga → Plan → Conclusiones',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Por qué el plan va al final y qué dos cosas debe traer para cumplir la consigna?',
        success_criteria: {
          must_include: ['Explica que el plan depende de las causas identificadas antes', 'Nombra el cronograma y las fuentes como parte del plan'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'inv-acad-4',
      type: 'practice',
      complexity: 'simple',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Explica qué es una fuente citada con la forma mínima de context.referencias. Plantea el paso cerrado. Cuando elija, pide que escriba cómo la citaría dentro de un párrafo y por qué pesa más que un video.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: '¿Cuál de estas cuenta como fuente citada para el sustento técnico del informe?',
        options: [
          'Lo que dijo el instructor en clase',
          'El manual del fabricante Caterpillar, sección 4.2, 2021',
          'Un video de TikTok sobre cargadores frontales',
          'Mi experiencia en el taller',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Escribe una oración del informe con esa fuente citada dentro, y dime por qué pesa más que el video.',
        success_criteria: {
          must_include: ['Escribe la cita con autor o fabricante, año y sección', 'Da la razón: fuente verificable y con responsable, frente al video sin autor'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'inv-acad-5',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Plantea la situación: el equipo tiene 520 palabras y la consigna pide 1 200 a 1 500. Plantea el paso cerrado. Cuando elija, pide qué sección desarrollaría y con qué dato o fuente concreta. Recuérdale que copiar del manual o pegar texto de una IA se califica con cero.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Tu equipo tiene 520 palabras y la consigna pide entre 1 200 y 1 500. ¿Qué hacen?',
        options: [
          'Entregar así: lo importante es el contenido',
          'Rellenar con definiciones copiadas del manual',
          'Desarrollar la parte que falta (causas y plan) con datos propios',
          'Pedirle a una IA que lo alargue y pegarlo',
        ],
        answer: 2,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué sección desarrollarías primero y con qué dato o fuente concreta la llenarías?',
        success_criteria: {
          must_include: ['Elige una sección que falta (causas o plan)', 'Nombra un dato o una fuente concreta para desarrollarla'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
      commonMistakes: ['Cree que la extensión es un adorno y no parte de la consigna', 'Propone rellenar con definiciones'],
    },
    {
      id: 'inv-acad-6',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Pasa a su trabajo actual (TC, informe o proyecto). Pídele que cuente cuántas cosas pide su consigna y cuál no ha empezado. Si no la recuerda, que la reconstruya con lo que sabe; no inventes una por él.',
        target_length: '40-70 palabras',
      },
      verification: {
        question: 'Piensa en el trabajo que tienes ahora: ¿cuántas cosas distintas pide la consigna y cuál de ellas todavía no has empezado?',
        success_criteria: {
          must_include: ['Cuenta las partes de su consigna real', 'Identifica la parte que falta o va más atrasada'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: true,
      },
    },
    {
      id: 'inv-acad-7',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Cierra pidiendo una sola regla para su próximo trabajo: qué va a hacer con la consigna antes de escribir la primera línea. Reconoce algo concreto que hizo bien. Termina con «Gracias por participar».',
        target_length: '40-60 palabras',
      },
      verification: {
        question: 'Una regla para tu próximo trabajo: ¿qué vas a hacer con la consigna antes de escribir la primera línea?',
        success_criteria: {
          must_include: ['Da una acción concreta sobre la consigna (subrayar los verbos, listar las partes, armar el esquema)'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LEC-MAN · Lectura Comprensiva de Manuales
// ─────────────────────────────────────────────────────────────────────────────
// Material de apoyo: el fragmento vive en el panel (fijo durante las
// actividades 1 a 4) y Sophia lo cita, no lo reescribe en cada turno.
const FRAG_EXTINTORES: SupportBlock = {
  id: 'manual-extintores',
  type: 'text',
  title: 'Manual de uso de extintores',
  kind: 'fragment',
  pinned: true,
  forVerifier: true,
  source: 'NTP 350.043-1',
  body: [
    'Un extintor portátil es un equipo que contiene un agente extintor (polvo químico seco, CO2 o agua) a presión, para apagar fuegos incipientes.',
    '',
    'Los fuegos se clasifican por el material que arde: clase A (sólidos como madera o papel), clase B (líquidos inflamables) y clase C (equipos eléctricos energizados).',
    '',
    'Procedimiento de uso:',
    '1. Halar el seguro.',
    '2. Apuntar la boquilla a la base del fuego.',
    '3. Apretar la palanca.',
    '4. Barrer de lado a lado.',
    '',
    'La distancia recomendada es de 2 a 3 metros del fuego. Nunca use un extintor de agua en fuegos de equipos eléctricos: el agua conduce la electricidad.',
    '',
    'Los extintores son muy importantes para la seguridad de todos y deben estar siempre a la vista.',
  ].join('\n'),
}

const REGLA_SUBRAYADO: SupportBlock = {
  id: 'regla-subrayado',
  type: 'table',
  title: 'Qué se subraya',
  columns: ['Tipo de frase', '¿Se subraya?'],
  rows: [
    ['Definición', 'Sí'],
    ['Dato o número', 'Sí'],
    ['Paso de procedimiento', 'Sí'],
    ['Advertencia', 'Sí'],
    ['Relleno u opinión', 'No'],
  ],
  legend: 'Máximo el 30 % del texto.',
}

const FRAG_LOTO: SupportBlock = {
  id: 'manual-loto',
  type: 'text',
  title: 'Bloqueo y etiquetado (LOTO)',
  kind: 'fragment',
  forVerifier: true,
  body: [
    'El bloqueo y etiquetado es el procedimiento para aislar la energía de un equipo antes de intervenirlo.',
    '',
    'Pasos:',
    '1. Avisar al personal.',
    '2. Apagar el equipo.',
    '3. Aislar todas las fuentes de energía (eléctrica, hidráulica, neumática).',
    '4. Colocar candado y tarjeta con nombre.',
    '5. Verificar energía cero intentando arrancar.',
    '',
    '**Advertencia:** nunca retire el candado de otra persona. Un equipo con energía residual puede arrancar solo.',
  ].join('\n'),
}

const lecMan: LessonSeed = {
  slug: 'lec-man-lectura-comprensiva-de-manuales',
  order: 7,
  title: 'LEC-MAN · Lectura Comprensiva de Manuales',
  objective:
    'Aplica el subrayado estratégico y el glosario con palabras propias a un fragmento técnico común a todas las carreras, y los traslada al manual del curso que lleva esta semana.',
  keyPoints: [
    'Un manual tiene cuatro tipos de frase: definición, dato, paso de procedimiento y advertencia',
    'Subrayado estratégico: solo esos cuatro tipos, máximo el 30 % del texto',
    'Glosario: definir el término con palabras propias demuestra que se entendió',
  ],
  context: {
    pais: 'Perú',
    normativa: normativa('Lectura comprensiva (LEC-MAN)', 'semana 2'),
    referencias: [
      'Fragmento 1 — Manual de uso de extintores portátiles (lectura general, todas las carreras): «Un extintor portátil es un equipo que contiene un agente extintor (polvo químico seco, CO2 o agua) a presión, para apagar fuegos incipientes. Los fuegos se clasifican por el material que arde: clase A (sólidos como madera o papel), clase B (líquidos inflamables) y clase C (equipos eléctricos energizados). Procedimiento de uso: 1) halar el seguro; 2) apuntar la boquilla a la base del fuego; 3) apretar la palanca; 4) barrer de lado a lado. La distancia recomendada es de 2 a 3 metros del fuego. Nunca use un extintor de agua en fuegos de equipos eléctricos: el agua conduce la electricidad. Los extintores son muy importantes para la seguridad de todos y deben estar siempre a la vista. Fuente: NTP 350.043-1.»',
      'Fragmento 2 — Bloqueo y etiquetado (LOTO): «El bloqueo y etiquetado es el procedimiento para aislar la energía de un equipo antes de intervenirlo. Pasos: 1) avisar al personal; 2) apagar el equipo; 3) aislar todas las fuentes de energía (eléctrica, hidráulica, neumática); 4) colocar candado y tarjeta con nombre; 5) verificar energía cero intentando arrancar. Advertencia: nunca retire el candado de otra persona. Un equipo con energía residual puede arrancar solo.»',
      'Regla del subrayado estratégico: se subrayan solo definiciones, datos numéricos o fórmulas, pasos de procedimiento y advertencias. No se subrayan frases de relleno ni opiniones. Máximo el 30 % del texto.',
      'Glosario: cada término con una definición de una o dos líneas, en palabras propias, sin copiar del texto. Ejemplo válido para «agente extintor»: «lo que sale del extintor y apaga el fuego: polvo, CO2 o agua».',
    ],
  },
  activities: [
    {
      id: 'lec-man-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'El fragmento del manual de extintores está en el panel: pide que lo lea completo una vez (no lo copies en el chat). Explica en dos oraciones que un manual mezcla cuatro tipos de frase (definición, dato, paso, advertencia) y que leer bien es reconocerlos. Plantea el paso cerrado sobre la frase del extintor de agua. Cuando elija, pide la razón de por qué una advertencia se subraya siempre.',
        target_length: '80-120 palabras',
        blocks: [FRAG_EXTINTORES],
      },
      choice: {
        prompt: 'En el manual del panel, la frase «Nunca use un extintor de agua en fuegos de equipos eléctricos» es:',
        options: ['Una definición', 'Un paso del procedimiento', 'Una advertencia', 'Un dato numérico'],
        answer: 2,
        max_attempts: 2,
      },
      verification: {
        question: '¿Por qué una advertencia se subraya siempre y una frase como «los extintores son muy importantes» no?',
        success_criteria: {
          must_include: ['La advertencia evita un daño o accidente concreto', 'La otra frase no aporta información que cambie lo que hay que hacer (relleno)'],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
    {
      id: 'lec-man-2',
      type: 'practice',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Sigue con el manual de extintores, que está fijo en el panel (no lo repitas). Plantea el paso cerrado sobre el número de pasos. Cuando elija, pide que diga los pasos en orden con sus palabras, sin copiar.',
        target_length: '40-70 palabras',
      },
      choice: {
        prompt: '¿Cuántos pasos tiene el procedimiento de uso del extintor en el manual del panel?',
        options: ['3', '4', '5', '6'],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Dime los pasos en orden, con tus palabras, sin copiar el texto.',
        success_criteria: {
          must_include: ['Da los cuatro pasos en orden (seguro, apuntar a la base, apretar, barrer)', 'Los dice con palabras propias, no copiados'],
          critical: [1],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'lec-man-3',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Explica la regla del subrayado estratégico: está en el panel («Qué se subraya»). Plantea el paso cerrado. Cuando elija, pide que liste cuatro frases del fragmento 1 que sí subrayaría y clasifique cada una (definición, dato, paso o advertencia).',
        target_length: '60-100 palabras',
        blocks: [REGLA_SUBRAYADO],
      },
      choice: {
        prompt: 'Según la regla del subrayado estratégico, ¿cuál de estas frases del manual NO se subraya?',
        options: [
          '«La distancia recomendada es de 2 a 3 metros»',
          '«Los extintores son muy importantes para la seguridad de todos»',
          '«Halar el seguro»',
          '«Clase C: equipos eléctricos energizados»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Lista cuatro frases del fragmento que sí subrayarías y di de qué tipo es cada una: definición, dato, paso o advertencia.',
        success_criteria: {
          must_include: ['Lista cuatro frases que existen en el fragmento', 'Clasifica cada una correctamente en uno de los cuatro tipos', 'No incluye frases de relleno'],
          // Las cuatro frases tienen que estar en el manual del panel: el código
          // lo comprueba (lib/quote-check.ts); antes bastaba con inventarlas.
          quote_from: [{ criterion: 1, block: 'manual-extintores', min: 4 }],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
      commonMistakes: ['Subraya párrafos enteros', 'Clasifica un dato numérico como definición'],
    },
    {
      id: 'lec-man-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Explica el glosario con el ejemplo de context.referencias. Plantea el paso cerrado. Cuando elija, pide que escriba su propia definición de «fuego clase C» sin copiar del fragmento.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: '¿Cuál de estas definiciones de «agente extintor» está en palabras propias y es correcta?',
        options: [
          '«Un equipo que contiene un agente extintor a presión para apagar fuegos incipientes»',
          '«Lo que sale del extintor y apaga el fuego: polvo, CO2 o agua»',
          '«Un extintor»',
          '«El fuego que se apaga»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Escribe tu propia definición de «fuego clase C», en una o dos líneas, sin copiar el texto.',
        success_criteria: {
          must_include: ['Define fuego clase C como fuego en equipos eléctricos con energía', 'Lo dice con palabras propias (no la frase literal del fragmento)'],
          critical: [1],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'lec-man-5',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'El fragmento de bloqueo y etiquetado está en el panel: pide que lo lea completo (no lo copies en el chat). Plantea el paso cerrado sobre la idea principal. Cuando elija, pide que explique qué pasaría si se salta el paso de verificar energía cero, usando la advertencia del texto.',
        target_length: '60-100 palabras',
        blocks: [FRAG_LOTO],
      },
      choice: {
        prompt: '¿Cuál es la idea principal del fragmento de bloqueo y etiquetado del panel?',
        options: [
          'Los candados deben tener el nombre del trabajador',
          'Antes de intervenir un equipo hay que aislar toda su energía y comprobarlo',
          'Hay que avisar al personal cuando se apaga un equipo',
          'Los equipos hidráulicos son peligrosos',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué pasaría si alguien se salta el paso 5, verificar energía cero? Usa la advertencia del texto para explicarlo.',
        success_criteria: {
          must_include: ['Explica que el equipo podría arrancar con energía residual', 'Conecta la consecuencia con el daño a la persona que lo interviene'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'lec-man-6',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Pasa al manual o PPT del curso que lleva esta semana. Pídele tres términos que subrayaría y cuál definiría primero en su glosario, y por qué ese. Si no tiene el material a mano, que use lo que recuerde de la clase de hoy.',
        target_length: '40-70 palabras',
      },
      verification: {
        question: 'Del manual o PPT de tu curso de esta semana: ¿qué tres términos subrayarías y cuál definirías primero en tu glosario? ¿Por qué ese?',
        success_criteria: {
          must_include: ['Nombra tres términos de su curso actual', 'Elige uno para el glosario y da la razón'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: true,
      },
    },
    {
      id: 'lec-man-7',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Cierra pidiendo una sola regla de lectura para esta semana: qué va a hacer antes de leer un manual completo. Reconoce algo concreto que hizo bien. Termina con «Gracias por participar».',
        target_length: '40-60 palabras',
      },
      verification: {
        question: 'Tu regla de lectura para esta semana: ¿qué vas a hacer antes de leer un manual completo?',
        success_criteria: {
          must_include: ['Da una acción concreta de lectura (mirar títulos, buscar definiciones y pasos, subrayar con la regla, armar glosario)'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TIEMPO · Organización del Tiempo en el Internado
// ─────────────────────────────────────────────────────────────────────────────
const tiempo: LessonSeed = {
  slug: 'tiempo-organizacion-del-tiempo-en-el-internado',
  order: 8,
  title: 'TIEMPO · Organización del Tiempo en el Internado',
  objective:
    'Mapea su semana real en el internado (jornada, sueño, celular, comedor), identifica sus ladrones de tiempo y arma un plan de estudio en bloques cortos para la semana que empieza.',
  keyPoints: [
    'Las horas reales: entre la salida de clase y la hora de dormir quedan menos de las que parece',
    'Ladrones de tiempo: celular, redes y conversaciones largas se llevan entre 5 y 20 horas por semana',
    'Bloques de 20 minutos con descanso rinden más que 90 minutos seguidos tras 11 horas de jornada',
    'Dormir antes del examen vale más que estudiar la noche anterior',
  ],
  context: {
    pais: 'Perú',
    normativa: normativa('Organización del tiempo (TIEMPO)', 'semana 1'),
    referencias: [
      'Jornada típica del internado (datos de tutoría 2026): clases o taller de 7:45 a 19:00 con descansos cortos; cena en el comedor con cola de 30 a 60 minutos; la mayoría se duerme entre 23:00 y 1:00; varios duermen 3 a 6 horas la noche antes de un examen.',
      'Ladrones de tiempo que los propios estudiantes reportan: celular y redes (TikTok, WhatsApp, videojuegos) entre 5 y 20 horas por semana; conversaciones largas en el cuarto o el comedor; bulla en el cuarto; «sobre pensar»; estudiar cansado después del turno.',
      'Caso Jhon (estudiante ficticio): sale de clase a las 19:00, cena y hace cola hasta las 20:00, usa el celular hasta las 22:30 «para relajarse», estudia de 22:30 a 23:30 y se duerme a las 0:30. El jueves, antes del examen del viernes, estudia hasta las 2:00 y duerme 4 horas.',
      'Bloques cortos (Pomodoro adaptado): 20 minutos de estudio y 5 de descanso; cuatro bloques dan 1 h 40 min efectiva. Tras 11 horas de jornada, 90 minutos seguidos suelen terminar en distracción.',
      'Sueño y examen: con 4 horas de sueño la atención y la memoria de trabajo bajan; lo estudiado de madrugada se retiene menos que lo repasado 20 minutos cada día.',
    ],
  },
  activities: [
    {
      id: 'tiempo-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Presenta el caso Jhon de context.referencias con sus horas. Di que lo primero es saber cuánto tiempo real queda. Plantea el paso cerrado. Cuando elija, pide que diga en qué se le van a él sus propias horas de la noche, concreto.',
        target_length: '80-120 palabras',
      },
      choice: {
        prompt: 'Jhon sale de clase a las 19:00 y se duerme a las 0:30. Descontando 1 hora de comedor, ¿cuántas horas reales le quedan en la noche?',
        options: ['2 horas y media', '4 horas y media', '5 horas y media', '7 horas'],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Ahora tú: entre que sales de clase y te duermes, ¿cuántas horas te quedan y en qué se te van hoy? Sé concreto.',
        success_criteria: {
          must_include: ['Estima sus horas reales de la noche', 'Nombra en qué se le van, con actividades concretas'],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
    {
      id: 'tiempo-2',
      type: 'practice',
      complexity: 'simple',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Introduce los ladrones de tiempo con la lista de context.referencias, en dos oraciones. Plantea el paso cerrado con el cálculo del celular. Cuando elija, pide su ladrón más grande y cuántas horas estima por semana.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Jhon usa el celular 2 horas cada noche «para relajarse». En una semana de 5 días son:',
        options: ['5 horas', '10 horas', '14 horas', '20 horas'],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Cuál es tu ladrón de tiempo más grande y cuántas horas estimas que te quita por semana? Muestra la cuenta.',
        success_criteria: {
          must_include: ['Nombra un ladrón concreto de su semana', 'Estima horas por semana con una cuenta (por día × días)'],
          critical: [2],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'tiempo-3',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Explica los bloques cortos de context.referencias en dos oraciones. Plantea el paso cerrado. Cuando elija, pide que justifique con lo que le pasó a él en su última semana (cuándo se distrajo, cuánto duró).',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Después de una jornada de 11 horas, ¿qué rinde más para estudiar en la noche?',
        options: [
          'Una sesión seguida de 90 minutos',
          'Cuatro bloques de 20 minutos con 5 de descanso',
          'Estudiar de 23:00 a 1:00 cuando hay silencio',
          'Leer todo la noche antes del examen',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Por qué? Justifícalo con lo que te pasó a ti la última semana cuando intentaste estudiar de noche.',
        success_criteria: {
          must_include: ['Explica que con cansancio la atención cae y los descansos la recuperan', 'Lo conecta con una experiencia propia reciente'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'tiempo-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 3,
      teaching: {
        agent_instruction:
          'Vuelve al jueves de Jhon: estudió hasta las 2:00 y durmió 4 horas antes del examen. Plantea el paso cerrado. Cuando elija, pide que explique qué le conviene hacer el jueves en la noche y por qué, con lo de context.referencias sobre sueño.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Jhon estudia hasta las 2:00 y duerme 4 horas antes del examen del viernes. ¿Qué efecto tiene eso en el examen?',
        options: [
          'Llega con más contenido fresco y rinde mejor',
          'Baja su atención y recuerda menos de lo que estudió de madrugada',
          'No cambia nada: lo que importa es cuánto estudió',
          'Rinde igual si toma café',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué le conviene hacer a Jhon el jueves en la noche, y por qué?',
        success_criteria: {
          must_include: ['Propone repaso corto y dormir temprano (o similar)', 'Da la razón: el sueño consolida lo estudiado y la madrugada se retiene menos'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'tiempo-5',
      type: 'practice',
      complexity: 'complex',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Plantea la simulación: curso de una semana con examen el viernes. Plantea el paso cerrado sobre cómo distribuir el estudio. Cuando elija, pide que arme su plan real de esta semana, día por día, en bloques de 20 minutos, evitando el ladrón que nombró antes.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Tienes examen el viernes. ¿Cuál plan distribuye mejor el estudio?',
        options: [
          'Todo el jueves en la noche',
          'Un bloque corto de lunes a jueves y un repaso breve el jueves',
          'Solo el fin de semana anterior',
          'En los descansos de 15 minutos entre clases',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Arma tu plan de esta semana: qué día haces qué, en bloques de 20 minutos, y qué haces con tu ladrón de tiempo.',
        success_criteria: {
          must_include: ['Distribuye el estudio en varios días (no todo al final)', 'Usa bloques cortos con horario aproximado', 'Incluye una regla contra su ladrón de tiempo'],
          critical: [1],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'tiempo-6',
      type: 'reflection',
      complexity: 'simple',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Pregunta qué va a hacer con el celular durante sus bloques de estudio. Pide una regla concreta y realista (otro cuarto, modo avión, dárselo a un compañero), no una promesa general.',
        target_length: '30-60 palabras',
      },
      verification: {
        question: '¿Qué vas a hacer con el celular durante tus bloques de estudio? Dame una regla concreta, no una promesa.',
        success_criteria: {
          must_include: ['Da una regla concreta y verificable sobre el celular', 'Explica por qué cree que la va a cumplir'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: true,
      },
    },
    {
      id: 'tiempo-7',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Cierra pidiendo su regla de la semana en una sola oración (no pidas día ni hora). Reconoce algo concreto que haya hecho bien. Termina con «Gracias por participar».',
        target_length: '40-60 palabras',
      },
      verification: {
        question: 'Tu regla de la semana, en una oración.',
        success_criteria: {
          must_include: ['Da una regla concreta y propia para la semana'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXPL-CON · Explicación de Conceptos
// ─────────────────────────────────────────────────────────────────────────────
const explCon: LessonSeed = {
  slug: 'expl-con-explicacion-de-conceptos',
  order: 9,
  title: 'EXPL-CON · Explicación de Conceptos',
  objective:
    'Explica un concepto técnico con palabras propias, con la estructura definición → ejemplo → para qué sirve, y responde una repregunta del instructor sin recurrir al texto copiado.',
  keyPoints: [
    'Explicar con palabras propias: lo que no puedes decir sin el manual, no lo entendiste',
    'Estructura de una explicación: definición, ejemplo, para qué sirve',
    'La repregunta del instructor («¿y por qué?») se responde con la causa, no con «así dice el manual»',
  ],
  context: {
    pais: 'Perú',
    normativa: normativa('Explicación de conceptos (EXPL-CON)', 'semana 3'),
    referencias: [
      'Concepto 1 — Mantenimiento preventivo. Definición de manual: «Conjunto de actividades programadas de inspección, ajuste y reemplazo que se ejecutan en intervalos predeterminados con el fin de reducir la probabilidad de falla del equipo.» En palabras propias: «revisar y cambiar piezas antes de que fallen, según un calendario, para que la máquina no pare».',
      'Concepto 2 — Peligro y riesgo (común a todas las carreras, SST). Peligro: algo que puede causar daño (una faja sin guarda, un cable pelado). Riesgo: la probabilidad de que ese daño ocurra y su gravedad (alta si alguien pasa cerca de la faja cada hora). Control: lo que se hace para bajar el riesgo (poner la guarda).',
      'Estructura esperada por los instructores cuando piden «explícame qué es X»: 1) definición en una oración propia; 2) un ejemplo concreto de la carrera; 3) para qué sirve o qué pasa si no se hace.',
      'Repregunta típica del instructor: «¿y por qué se hace cada 250 horas?» Respuesta que demuestra comprensión: «porque el fabricante calculó que a esas horas el aceite pierde propiedades, y lo indica en la ficha». Respuesta que no: «porque así dice el manual».',
      'Fragmento de exposición copiado: «El sistema de lubricación forzada garantiza la formación de una película hidrodinámica entre superficies en movimiento relativo, minimizando el desgaste adhesivo.» Señales de copia: vocabulario que el expositor no usa, frase sin ejemplo, no puede responder «¿qué es desgaste adhesivo?».',
      'Lo que reportan los estudiantes (tutoría 2026): «el instructor me preguntó y no pude responder», «copié del manual sin mis palabras», «no dominamos la terminología».',
    ],
  },
  activities: [
    {
      id: 'expl-con-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Di que en la exposición individual del PI el instructor mide si entendiste, y que la prueba es poder decirlo sin el manual. Muestra la definición de manual de «mantenimiento preventivo» de context.referencias. Plantea el paso cerrado. Cuando elija, pide dos cosas que tiene la buena y no tiene la literal.',
        target_length: '80-120 palabras',
      },
      choice: {
        prompt: '¿Cuál de estas explicaciones de «mantenimiento preventivo» está en palabras propias y es correcta?',
        options: [
          '«Conjunto de actividades programadas de inspección, ajuste y reemplazo que se ejecutan en intervalos predeterminados»',
          '«Revisar y cambiar piezas antes de que fallen, según un calendario, para que la máquina no pare»',
          '«Es un tipo de mantenimiento»',
          '«Es cuando la máquina ya falló y la arreglas»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué dos cosas tiene esa explicación que la definición literal del manual no tiene?',
        success_criteria: {
          must_include: ['Palabras simples o propias (no el vocabulario del manual)', 'Dice para qué sirve o qué evita (que la máquina no pare)'],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
    {
      id: 'expl-con-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Presenta la estructura de tres partes de context.referencias. Plantea el paso cerrado. Cuando elija, pide que explique «peligro» con esa estructura, en tres oraciones, con un ejemplo de su carrera. No le des el ejemplo.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Cuando el instructor dice «explícame qué es X», ¿qué orden espera?',
        options: [
          'Definición → ejemplo → para qué sirve',
          'Un ejemplo y nada más',
          'La definición copiada del manual',
          'Una anécdota del taller',
        ],
        answer: 0,
        max_attempts: 2,
      },
      verification: {
        question: 'Explica «peligro» con esa estructura, en tres oraciones: definición, un ejemplo de tu carrera y para qué sirve identificarlo.',
        success_criteria: {
          must_include: ['Define peligro como algo que puede causar daño', 'Da un ejemplo concreto de su carrera', 'Dice para qué sirve identificarlo (ponerle un control, evitar el accidente)'],
          critical: [1],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'expl-con-3',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Presenta la diferencia entre peligro, riesgo y control de context.referencias. Plantea el paso cerrado sobre la faja sin guarda. Cuando elija, pide que explique la diferencia entre peligro y riesgo con sus palabras y un ejemplo propio.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: '«Una faja transportadora sin guarda» es:',
        options: ['Un peligro', 'Un riesgo', 'Un accidente', 'Un control'],
        answer: 0,
        max_attempts: 2,
      },
      verification: {
        question: 'Explica con tus palabras la diferencia entre peligro y riesgo, con un ejemplo de tu carrera.',
        success_criteria: {
          must_include: ['Peligro: la fuente de daño; riesgo: la probabilidad y gravedad de que ocurra', 'Ejemplo propio donde se ven los dos'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
      commonMistakes: ['Usa peligro y riesgo como sinónimos', 'Confunde el control con el riesgo'],
    },
    {
      id: 'expl-con-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Plantea la repregunta típica del instructor de context.referencias («¿y por qué cada 250 horas?»). Plantea el paso cerrado. Cuando elija, pide que responda él a una repregunta así sobre un concepto de su curso actual (que elija el concepto).',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'El instructor pregunta: «¿y por qué el aceite se cambia cada 250 horas?». ¿Cuál respuesta demuestra comprensión?',
        options: [
          '«Porque así dice el manual»',
          '«Porque el fabricante calculó que a esas horas el aceite pierde propiedades, y lo indica en la ficha»',
          '«No sé, lo copié»',
          '«Porque siempre se ha hecho así»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Elige un concepto de tu curso actual e imagina que el instructor te pregunta «¿y por qué?». Escribe tu respuesta.',
        success_criteria: {
          must_include: ['Nombra un concepto real de su curso', 'Responde con una causa o fundamento, no con «así dice el manual»'],
          critical: [2],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'expl-con-5',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Muestra textual el fragmento de exposición copiado de context.referencias. Plantea el paso cerrado sobre la señal de copia. Cuando elija, pide que lo reescriba en dos oraciones propias que él sí pueda defender.',
        target_length: '80-120 palabras',
      },
      choice: {
        prompt:
          'Fragmento de una exposición: «El sistema de lubricación forzada garantiza la formación de una película hidrodinámica entre superficies en movimiento relativo, minimizando el desgaste adhesivo.» ¿Cuál es la señal más clara de que fue copiado y no entendido?',
        options: [
          'Es demasiado corto',
          'Usa vocabulario que el expositor no puede explicar si le repreguntan',
          'No tiene errores de ortografía',
          'Habla de lubricación',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Reescribe ese fragmento en dos oraciones propias que puedas defender si te repreguntan.',
        success_criteria: {
          must_include: ['Mantiene la idea (el aceite forma una capa que separa las piezas y evita el desgaste)', 'Usa palabras simples que podría explicar'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'expl-con-6',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Pide que elija un concepto de su curso de esta semana y lo explique con la estructura completa: definición, ejemplo y para qué sirve. Si copia vocabulario de manual, repregunta «¿qué significa eso?» una vez.',
        target_length: '40-70 palabras',
      },
      verification: {
        question: 'Elige un concepto de tu curso de esta semana y explícamelo: definición con tus palabras, un ejemplo y para qué sirve.',
        success_criteria: {
          must_include: ['Definición con palabras propias', 'Ejemplo concreto', 'Para qué sirve o qué pasa si no se aplica'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: true,
      },
    },
    {
      id: 'expl-con-7',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Cierra pidiendo cómo va a preparar la explicación de un concepto antes de la próxima exposición (una acción). Reconoce algo concreto que hizo bien. Termina con «Gracias por participar».',
        target_length: '40-60 palabras',
      },
      verification: {
        question: 'Antes de tu próxima exposición, ¿cómo vas a preparar la explicación de cada concepto? Una acción concreta.',
        success_criteria: {
          must_include: ['Da una acción concreta (explicárselo a un compañero, escribirlo sin el manual, preparar la respuesta al «¿por qué?»)'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. SUST-CRIT · Sustentación de Criterios
// ─────────────────────────────────────────────────────────────────────────────
const sustCrit: LessonSeed = {
  slug: 'sust-crit-sustentacion-de-criterios',
  order: 10,
  title: 'SUST-CRIT · Sustentación de Criterios',
  objective:
    'Sostiene una afirmación técnica con un dato, una fuente o un cálculo, y responde preguntas del tipo que hace el instructor en la sustentación («¿de dónde sacaste ese dato?», «¿por qué esa opción?»).',
  keyPoints: [
    'Una afirmación sustentada trae un dato, una fuente o un cálculo; las demás son opiniones',
    'El sustento que pesa: ficha del fabricante, norma, medición propia; no «lo dijo alguien»',
    'Cuando no sabes, se dice qué no sabes y qué sí, y dónde lo verificarías',
  ],
  context: {
    pais: 'Perú',
    normativa: normativa('Sustentación (SUST-CRIT)', 'semana 3'),
    referencias: [
      'Cuatro versiones de una afirmación: (a) «El motor se calienta mucho». (b) «El motor trabaja a 95 °C, 10 °C por encima del rango del fabricante (ficha técnica, p. 12)». (c) «El motor está mal». (d) «Creo que el motor falla». Solo (b) está sustentada: dato con unidades, comparación con un valor de referencia y fuente.',
      'Preguntas que hace el instructor en la sustentación: «¿de dónde sacaste ese dato?», «¿por qué esa opción y no otra?», «¿qué pasaría si cambias ese valor?», «¿qué es X?».',
      'Jerarquía del sustento para un informe técnico: 1) medición propia con instrumento y unidades; 2) ficha o manual del fabricante; 3) norma técnica; 4) libro o informe de la especialidad. No sostienen: opinión de un compañero, video sin autor, «siempre se hizo así».',
      'Cálculo como sustento: «la cola del comedor nos quita mucho tiempo» → «30 minutos por día × 5 días = 2 h 30 min a la semana».',
      'Respuesta cuando no se sabe: «No tengo ese dato. Lo que sí sé es que el rango del fabricante es 80 a 85 °C; el valor exacto lo verificaría en la ficha técnica.» Inventar un dato se califica como falta grave.',
      'Fragmento sin sustento: «La faja transportadora falló porque estaba en mal estado. Es importante hacer mantenimiento para que no vuelva a pasar.»',
      'Rúbrica del TC (presentación pública del producto): 5 criterios iguales de 0 a 4, nota = suma. Criterio 2, Desarrollo técnico, Destacado: «el sustento es verificable: la norma con su artículo, el parámetro técnico o la consecuencia específica». Criterio 5, Sustentación oral, Destacado: «cualquier integrante responde consultas sobre una parte que no expuso».',
    ],
  },
  activities: [
    {
      id: 'sust-crit-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Di que en la sustentación el instructor no mide cuánto hablas sino qué sostiene cada cosa que dices: en la rúbrica del TC, el nivel Destacado de Desarrollo técnico exige sustento verificable y el de Sustentación oral que cualquiera del equipo responda por una parte que no expuso (context.referencias). Muestra las cuatro versiones de la afirmación de context.referencias. Plantea el paso cerrado. Cuando elija, pide las tres cosas que tiene la sustentada y no tienen las otras.',
        target_length: '80-120 palabras',
      },
      choice: {
        prompt: '¿Cuál de las cuatro afirmaciones sobre el motor está sustentada?',
        options: [
          '«El motor se calienta mucho»',
          '«El motor trabaja a 95 °C, 10 °C por encima del rango del fabricante (ficha técnica, p. 12)»',
          '«El motor está mal»',
          '«Creo que el motor falla»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué tres cosas tiene esa afirmación que las otras tres no tienen?',
        success_criteria: {
          must_include: ['Un dato con unidades', 'Una comparación con un valor de referencia', 'Una fuente citada'],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
    {
      id: 'sust-crit-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Presenta la pregunta del instructor «¿de dónde sacaste ese dato?» para la afirmación sustentada. Plantea el paso cerrado. Cuando elija, pide que tome una afirmación de su último TC y la reescriba con dato y fuente.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'El instructor pregunta «¿de dónde sacaste que el motor trabaja a 95 °C?». ¿Qué respuesta sostiene la afirmación?',
        options: [
          '«Lo vi en internet»',
          '«Lo medimos con el pirómetro en el taller el martes; la ficha del fabricante da 80 a 85 °C»',
          '«Me lo dijo un compañero de otro grupo»',
          '«Es un valor aproximado que puse para el ejemplo»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Toma una afirmación de tu último TC (o de tu curso actual) y reescríbela con su dato y su fuente.',
        success_criteria: {
          must_include: ['Parte de una afirmación propia', 'Le agrega un dato (con unidades si aplica)', 'Le agrega una fuente o la forma en que lo midió'],
          critical: [3],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'sust-crit-3',
      type: 'practice',
      complexity: 'simple',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Presenta la jerarquía del sustento de context.referencias. Plantea el paso cerrado. Cuando elija, pide que ordene los cuatro sustentos de más a menos peso y justifique el primero.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Para sostener «el aceite se cambia cada 250 horas», ¿qué sustento pesa más?',
        options: ['La ficha del fabricante', 'La opinión de un compañero', 'Un video de TikTok', '«Siempre se hizo así»'],
        answer: 0,
        max_attempts: 2,
      },
      verification: {
        question: 'Ordena los cuatro de más a menos peso y explica por qué pusiste primero el que pusiste.',
        success_criteria: {
          must_include: ['Ordena los cuatro con la ficha primero', 'Justifica: fuente con responsable y verificable, frente a opinión o costumbre'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'sust-crit-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Muestra el ejemplo del cálculo como sustento de context.referencias (la cola del comedor). Plantea el paso cerrado. Cuando elija, pide que sustente con un cálculo una afirmación de su propia última semana.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: '¿Cuál versión de «la cola del comedor nos quita mucho tiempo» está sustentada con un cálculo?',
        options: [
          '«La cola del comedor es eterna»',
          '«30 minutos por día × 5 días = 2 h 30 min a la semana»',
          '«Todos se quejan de la cola»',
          '«La cola nos quita como mucho tiempo»',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Sustenta con un cálculo una afirmación de tu última semana (tiempo, faltas, notas, lo que quieras). Muestra la cuenta.',
        success_criteria: {
          must_include: ['Afirmación propia', 'Cálculo con los números y la operación', 'Resultado con unidad'],
          critical: [2],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'sust-crit-5',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Plantea la situación: el instructor pregunta algo que no sabes. Plantea el paso cerrado. Cuando elija, pide que escriba esa respuesta para una pregunta de su curso que no sabría responder hoy. Recuerda que inventar un dato se califica como falta grave.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'El instructor te pregunta un dato que no sabes. ¿Qué respuesta sostiene tu credibilidad?',
        options: [
          'Inventar un número que suene razonable',
          '«No sé»',
          '«No tengo ese dato; lo que sí sé es X y lo verificaría en Y»',
          'Cambiar de tema a algo que sí sabes',
        ],
        answer: 2,
        max_attempts: 2,
      },
      verification: {
        question: 'Escribe esa respuesta para una pregunta de tu curso actual que hoy no sabrías responder.',
        success_criteria: {
          must_include: ['Reconoce lo que no sabe sin inventar', 'Dice lo que sí sabe relacionado', 'Nombra dónde lo verificaría'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'sust-crit-6',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Muestra el fragmento sin sustento de la faja de context.referencias. Pide que lo reescriba con un dato, una fuente o un cálculo verosímil. Acepta cualquier dato razonable: lo que importa es que agregue sustento.',
        target_length: '50-80 palabras',
      },
      verification: {
        question: 'Reescribe el fragmento de la faja para que cada afirmación tenga un dato, una fuente o un cálculo.',
        success_criteria: {
          must_include: ['Agrega un dato numérico o fuente a la causa de la falla', 'Agrega un dato o fuente al plan de mantenimiento'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: true,
      },
    },
    {
      id: 'sust-crit-7',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Cierra pidiendo su regla para la próxima exposición: qué va a tener listo por cada afirmación que diga. Reconoce algo concreto que hizo bien. Termina con «Gracias por participar».',
        target_length: '40-60 palabras',
      },
      verification: {
        question: 'Tu regla para la próxima exposición: ¿qué vas a tener listo por cada afirmación que digas?',
        success_criteria: {
          must_include: ['Nombra el sustento que tendrá listo (dato, fuente o cálculo) por afirmación'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DIFIC · Detección de Dificultades de Aprendizaje
// ─────────────────────────────────────────────────────────────────────────────
const dific: LessonSeed = {
  slug: 'dific-deteccion-de-dificultades-de-aprendizaje',
  order: 11,
  title: 'DIFIC · Detección de Dificultades de Aprendizaje',
  objective:
    'Ubica en qué evento (CV, EP, EF, TC o asistencia) está perdiendo puntos y qué causa lo explica, distinguiendo dato de causa, y fija una meta de nota con evento y fecha.',
  keyPoints: [
    'Dónde se pierden los puntos: leer las notas por evento, no el promedio',
    'Dato no es causa: «estudia la noche anterior» es un dato; la causa hay que comprobarla',
    'Cada causa pide una ayuda distinta: tiempo, lectura, comprensión, motivación o asistencia',
    'Meta en una oración: nota, evento y fecha',
  ],
  context: {
    pais: 'Perú',
    normativa: normativa('Detección de dificultades (DIFIC)', 'mitad de ciclo'),
    referencias: [
      'Caso Renzo (estudiante ficticio, mitad de ciclo): CV1 09, CV2 11, TC1 15, EP pendiente, 1 falta de 10 sesiones. Estudia la noche anterior a cada cuestionario. Dice que «la carrera no es lo que esperaba».',
      'Estructura de la nota (Reglamento Interno v03 y diseño instruccional): conocimiento 50 % = CV (10 % entre todos) + EP (20 %) + EF (20 %); habilidades 50 % = TC1 (25 %) + TC2 (25 %). Se aprueba con 13. Los CV pesan poco en la nota, pero anuncian cómo se llega al EP y al EF, que salen de las mismas clases.',
      'Asistencia (Art. 40): llegar al 30 % de inasistencias desaprueba por DPI con nota 00. En 10 sesiones, la tercera falta desaprueba. Renzo lleva 1: le queda 1.',
      'Cálculo para Renzo: si sus evaluaciones (CV, EP y EF juntos) terminan en 11 y tiene 15 en el TC1, para que la final sea 13 el promedio de TC debe ser 15 ((11 + 15) / 2 = 13), así que necesita 15 en el TC2 ((15 + 15) / 2 = 15). Si las evaluaciones terminan en 10, necesitaría 17 en el TC2.',
      'Dato y causa: un dato es algo que pasó y se puede comprobar (faltó dos veces, estudia la noche anterior, sacó 09). Una causa es lo que explica el dato y hay que verificar preguntando (no entiende los textos, no tiene tiempo, no duerme, no le interesa).',
      'Causas y ayudas (Plan de Tutoría CETEMIN): no entiende los textos → Lectura Comprensiva de Manuales; no organiza el tiempo o no duerme → Organización del Tiempo; no puede explicar o sustentar → Explicación de Conceptos y Sustentación; faltas → reglas de asistencia y aviso al líder; desmotivación o problemas personales → conversación con bienestar.',
      'Señal temprana de riesgo: desaprobar el primer cuestionario o no entregar a tiempo en la primera semana. La nota final llega cuando ya no se puede corregir.',
      'Meta en una oración, formato: «Subir de [nota] a [nota] en el [evento] del [fecha]». Ejemplo: «Subir de 09 a 14 en el CV3 del 20 de octubre».',
    ],
  },
  activities: [
    {
      id: 'dific-1',
      type: 'explanation',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Presenta el caso Renzo de context.referencias con todas sus notas y datos, en orden, sin interpretar, y la estructura de la nota con sus pesos. Plantea el paso cerrado. Cuando elija, pide qué datos se lo dicen y por qué los CV importan más de lo que pesan.',
        target_length: '80-120 palabras',
      },
      choice: {
        prompt:
          'Renzo, a mitad de ciclo: CV1 09, CV2 11, TC1 15, EP pendiente, 1 falta de 10 sesiones. Estudia la noche anterior a cada cuestionario y dice que «la carrera no es lo que esperaba». Los CV pesan 10 % entre todos, el EP y el EF 20 % cada uno, y cada TC 25 %. ¿Qué dicen sus notas?',
        options: [
          'Va bien: el TC pesa 50 % y tiene 15',
          'Los CV bajos pesan poco, pero anuncian que llegará mal al EP y al EF, que pesan 40 %',
          'Ya desaprobó el curso',
          'El problema es la asistencia',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué datos te lo dicen, y por qué los CV importan más de lo que pesan?',
        success_criteria: {
          must_include: ['Cita los CV de 09 y 11 como lo más bajo y el TC de 15 como lo que va bien', 'Explica que el EP y el EF evalúan lo mismo que los CV y pesan 40 %'],
          min_completeness: 60,
          understanding_level: 'developing',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
    {
      id: 'dific-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Explica la diferencia entre dato y causa de context.referencias en dos oraciones. Plantea el paso cerrado. Cuando elija, pide una causa posible que explique ese dato y cómo la comprobaría preguntándole a Renzo. No le des la causa.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: '«Renzo estudia la noche anterior a cada cuestionario» es:',
        options: ['Un dato', 'Una causa', 'Una excusa', 'Una nota'],
        answer: 0,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué causa podría explicar ese dato, y qué le preguntarías a Renzo para comprobarla?',
        success_criteria: {
          must_include: ['Propone una causa plausible (no tiene tiempo, no entiende, no duerme, no le interesa)', 'Formula una pregunta concreta para comprobarla'],
          critical: [2],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
      commonMistakes: ['Toma el dato como causa («la causa es que estudia tarde»)', 'Da un consejo antes de comprobar la causa'],
    },
    {
      id: 'dific-3',
      type: 'practice',
      complexity: 'complex',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Plantea el cálculo de context.referencias: si las evaluaciones de Renzo (CV, EP y EF juntos) terminan en 11 y tiene 15 en el TC1, qué necesita en el TC2 para aprobar con 13. Plantea el paso cerrado. Cuando elija, pide el despeje y si le parece alcanzable; y qué cambia si las evaluaciones terminan en 10. No resuelvas por él.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Si las evaluaciones de Renzo (CV, EP y EF juntos) terminan en 11 y tiene 15 en el TC1, ¿qué nota necesita en el TC2 para aprobar con 13?',
        options: ['13', '15', '17', '19'],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: 'Muéstrame el despeje. ¿Es alcanzable? ¿Y si las evaluaciones terminan en 10, qué pasa con el TC2?',
        success_criteria: {
          must_include: ['Despeja: promedio de TC debe ser 15 → (15 + TC2) / 2 = 15 → TC2 = 15', 'Juzga si es alcanzable y qué le conviene hacer (asegurar el TC2, subir el EF)', 'Calcula que con evaluaciones en 10 necesita 17 en el TC2'],
          critical: [1],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'dific-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Presenta la tabla de causas y ayudas de context.referencias. Plantea el paso cerrado. Cuando elija, pide que explique qué cambiaría si la causa fuera otra (que no duerme), para que vea que la ayuda depende de la causa.',
        target_length: '60-100 palabras',
      },
      choice: {
        prompt: 'Si la causa de Renzo es que no entiende los textos de los cuestionarios, ¿qué ayuda le sirve?',
        options: [
          'Lectura Comprensiva de Manuales',
          'Organización del Tiempo',
          'Una charla motivacional',
          'Cambiar de carrera',
        ],
        answer: 0,
        max_attempts: 2,
      },
      verification: {
        question: '¿Y si la causa fuera que no duerme? ¿Qué cambia en la ayuda, y por qué no sirve la misma?',
        success_criteria: {
          must_include: ['Cambia a Organización del Tiempo (o sueño)', 'Explica que la ayuda depende de la causa, no del síntoma'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'dific-5',
      type: 'practice',
      complexity: 'simple',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Plantea el paso cerrado sobre la señal temprana de riesgo. Cuando elija, pide qué haría la misma semana en que pasa, concreto (a quién acude, qué revisa).',
        target_length: '50-80 palabras',
      },
      choice: {
        prompt: '¿Cuál es la señal más temprana de que te estás cayendo en un curso?',
        options: [
          'La nota final',
          'Desaprobar el primer cuestionario o no entregar a tiempo',
          'Que el instructor te llame la atención',
          'Que tus compañeros te lo digan',
        ],
        answer: 1,
        max_attempts: 2,
      },
      verification: {
        question: '¿Qué harías la misma semana en que te pasa eso? Dos acciones concretas.',
        success_criteria: {
          must_include: ['Acción con alguien (instructor, líder, tutoría)', 'Acción propia (revisar en qué falló, pedir el cuestionario corregido, cambiar cómo estudia)'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: false,
      },
    },
    {
      id: 'dific-6',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Pasa a su situación real. Pide que diga en qué curso y en qué evento (CV, EP, EF, TC o asistencia) está perdiendo puntos, y cuál cree que es la causa, separando dato de causa. Si dice «en todo», pídele el evento con la nota más baja.',
        target_length: '40-70 palabras',
      },
      verification: {
        question: 'Tu situación: ¿en qué curso y en qué evento estás perdiendo puntos, y cuál crees que es la causa? Separa el dato de la causa.',
        success_criteria: {
          must_include: ['Nombra curso y evento con la nota o faltas', 'Da un dato y una causa posible, separados'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 3,
        open_ended: true,
      },
    },
    {
      id: 'dific-7',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Cierra pidiendo su meta en una oración con el formato de context.referencias: nota, evento y fecha. Si no sabe la fecha, que estime la semana. Reconoce algo concreto que hizo bien. Termina con «Gracias por participar».',
        target_length: '40-60 palabras',
      },
      verification: {
        question: 'Tu meta en una oración: «Subir de [nota] a [nota] en el [evento] del [fecha]».',
        success_criteria: {
          must_include: ['Nota de partida y nota meta', 'Evento (CV, EP, EF o TC)', 'Fecha o semana'],
          min_completeness: 60,
          understanding_level: 'achieved',
        },
        max_attempts: 2,
        open_ended: true,
      },
    },
  ],
}

const LESSONS: LessonSeed[] = [invAcad, lecMan, tiempo, explCon, sustCrit, dific]

async function main() {
  const soloValidar = process.argv.includes('--solo-validar')
  let errores = 0
  for (const l of LESSONS) {
    const parsed = GeneratedStructureSchema.safeParse({ activities: l.activities })
    if (!parsed.success) {
      errores++
      console.error(`❌ ${l.title}:\n`, JSON.stringify(parsed.error.issues, null, 2))
      continue
    }
    const conChoice = l.activities.filter((a) => a.choice).length
    console.log(`✅ ${l.title}: ${l.activities.length} actividades (${conChoice} con paso cerrado)`)
  }
  if (errores > 0) process.exit(1)
  if (soloValidar) return

  const course = await prisma.course.findUnique({ where: { slug: COURSE_SLUG }, select: { id: true } })
  if (!course) throw new Error(`No existe el curso ${COURSE_SLUG}`)

  for (const l of LESSONS) {
    const contentJson: LessonContent = { context: l.context, activities: l.activities }
    const data = {
      title: l.title,
      objective: l.objective,
      keyPoints: l.keyPoints,
      contentJson: JSON.parse(JSON.stringify(contentJson)),
      order: l.order,
    }
    const existing = await prisma.lesson.findUnique({ where: { slug: l.slug }, select: { id: true } })
    if (existing) {
      await prisma.lesson.update({ where: { id: existing.id }, data })
      console.log(`↻ actualizada ${l.slug}`)
    } else {
      await prisma.lesson.create({ data: { ...data, slug: l.slug, courseId: course.id, isPublished: false } })
      console.log(`＋ creada ${l.slug} (sin publicar)`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
