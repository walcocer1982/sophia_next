import { prisma } from '../lib/prisma'
import type { LessonContent } from '../types/lesson'

// IDs de las carreras existentes
const CAREER_EXPLORACION = '83730b06-b6ad-47fd-a3e6-5ab4a52e101f'
const CAREER_METALURGICOS = '3af19490-f501-41e0-9fe0-27e12d4952f2'
// (Geología no tiene carrera específica, usamos Exploración Minera que es la más cercana)

const SUPERADMIN_USER_ID = '420e46c4-b9d1-4ce5-9652-01e9071da321' // WALTHER ALCOCER

const DEFAULT_INSTRUCTOR = `Eres Sophia, una instructora experta y paciente (mujer).
Usas analogías simples y ejemplos del mundo real.
Hablas de manera conversacional, como una mentora amigable.
Siempre te refieres a ti misma en género femenino.
Nunca usas emojis ni exclamaciones exageradas.`

// ============================================================
// LECCIÓN 1: Perforación Subterránea
// ============================================================
const lesson1Content: LessonContent = {
  context: {
    pais: 'Perú',
    normativa: 'DS 024-2016-EM, DS 023-2017-EM, DS 034-2023-EM',
    referencias: [
      'Reglamento de Seguridad y Salud Ocupacional en Minería Ed. 2024',
      'MINEM Boletín Estadístico Minero 2024-2025',
    ],
  },
  activities: [
    {
      id: 'act-1-1',
      type: 'explanation',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Explica brevemente qué es la perforación subterránea y por qué es la base de la voladura. Menciona los dos métodos principales en Perú: jumbos electrohidráulicos (Sandvik, Epiroc) en grandes minas y perforadoras manuales (jackleg, stoper) en pequeña minería. Da el ejemplo de Cerro Lindo (Nexa) que procesa 21,000 t/día con jumbos. Termina invitando a reflexionar.',
        target_length: '100-150 palabras',
      },
      verification: {
        question: '¿Por qué crees que en Perú se usan jumbos en grandes minas pero perforadoras manuales en pequeña minería?',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Tamaño de operación (volumen, tonelaje)',
            'Costo de inversión',
            'Espacio disponible o accesibilidad',
          ],
          min_completeness: 50,
          understanding_level: 'understood',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-1-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Presenta un caso: planificas una galería de avance de 4×4m en una mina subterránea del Perú. Explica brevemente la diferencia entre jumbos de desarrollo (DD322i, Boomer) que avanzan galerías, vs jumbos de producción (DL210, Simba) que perforan tiros largos para tajeos. Pregunta de selección.',
      },
      verification: {
        question: 'Para una galería de avance de 4×4m, ¿qué tipo de jumbo necesitas: de desarrollo o de producción? ¿Por qué?',
        success_criteria: {
          must_include: ['Jumbo de desarrollo', 'Avanzar galería o crucero o rampa'],
          min_completeness: 60,
          understanding_level: 'applied',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-1-3',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Explica la importancia del DS 024-2016-EM y DS 023-2017-EM en perforación subterránea. Menciona dos reglas críticas: (1) distancia mínima de retiro de personal en voladuras eléctricas (300m); (2) obligación de desatar rocas sueltas antes, durante y después de la perforación. Pregunta sobre el desatado.',
      },
      verification: {
        question: 'Antes de iniciar la perforación en un frente subterráneo, ¿qué peligro debes eliminar primero y por qué es obligatorio según la normativa peruana?',
        success_criteria: {
          must_include: [
            'Desatado de rocas sueltas',
            'Riesgo de caída de rocas o accidente',
            'Seguridad del personal',
          ],
          min_completeness: 60,
          understanding_level: 'applied',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-1-4',
      type: 'reflection',
      complexity: 'moderate',
      keyPointIndex: 3,
      teaching: {
        agent_instruction:
          'Comenta la tendencia 2024-2026: jumbos autónomos y tele-operados ya operativos en Perú. Buenaventura compró 36 unidades Sandvik en 2024, varios automatizados. Invita al estudiante a reflexionar sobre ventajas y riesgos.',
      },
      verification: {
        question: '¿Qué ventajas y qué riesgos ves en la automatización de la perforación subterránea?',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Ventaja en seguridad o productividad',
            'Riesgo (laboral, técnico o económico)',
          ],
          min_completeness: 50,
          understanding_level: 'analyzed',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-1-5',
      type: 'closing',
      complexity: 'simple',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Sintetiza brevemente: Perú es 3er productor mundial de cobre (2.74 Mt en 2024), 2do de zinc, 3ro de plata. La perforación subterránea sostiene esa producción. Recuerda los 3 pasos críticos de seguridad: desatar, perforar, retirar. Invita al estudiante a sintetizar.',
      },
      verification: {
        question: 'Explícame con tus propias palabras los 3 elementos esenciales que debe controlar un operador antes y durante la perforación subterránea.',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Desatado de rocas / control geomecánico',
            'Selección del equipo correcto / planificación',
            'Distancia de seguridad / retiro del personal',
          ],
          min_completeness: 60,
          understanding_level: 'understood',
        },
        max_attempts: 3,
      },
    },
  ],
}

// ============================================================
// LECCIÓN 2: Tipos de Yacimientos del Perú
// ============================================================
const lesson2Content: LessonContent = {
  context: {
    pais: 'Perú',
    referencias: [
      'Memoria Mapa Metalogenético del Perú 2020 - Ingemmet',
      'Energiminas: Cinco cinturones aportan 85% producción minera (2024)',
    ],
  },
  activities: [
    {
      id: 'act-2-1',
      type: 'explanation',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Explica que un yacimiento mineral es una concentración natural económicamente explotable. Menciona que el Perú tiene 23 franjas metalogenéticas paralelas a los Andes (Mapa Ingemmet 2020) y que 5 cinturones aportan el 85% de la producción nacional. Invita a reflexionar sobre el origen geológico.',
      },
      verification: {
        question: '¿Por qué crees que los yacimientos minerales peruanos están alineados paralelamente a la Cordillera de los Andes?',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Subducción o tectónica de placas',
            'Magmatismo asociado a los Andes',
            'Procesos hidrotermales',
          ],
          min_completeness: 50,
          understanding_level: 'understood',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-2-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Explica qué es un pórfido de cobre: mineralización diseminada en intrusivos, gran tonelaje, baja ley, asociado a magmatismo calco-alcalino. Da ejemplos peruanos: Toromocho (1,526 Mt @ 0.48% Cu), Las Bambas, Cerro Verde (449,096 TMF Cu en 2024). Pregunta sobre rentabilidad.',
      },
      verification: {
        question: 'Si un yacimiento tiene gran tonelaje (más de 1,000 millones de toneladas) pero baja ley (~0.5% Cu), ¿qué tipo es y por qué es rentable explotarlo?',
        success_criteria: {
          must_include: [
            'Pórfido de cobre',
            'Volumen / economía de escala',
            'Tajo abierto / costos bajos por tonelada',
          ],
          min_completeness: 60,
          understanding_level: 'applied',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-2-3',
      type: 'practice',
      complexity: 'complex',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Explica los skarns: yacimientos formados por reemplazamiento metasomático de calizas por intrusivos. Altas leyes, polimetálicos. Antamina es EL skarn más grande del mundo: 2,370 Mt @ 0.87% Cu, 0.72% Zn, 10.6 g/t Ag. Formado por intrusivo cuarzo-monzonítico Mioceno + calizas Jumasha y Celendín. Aureola de skarn ~3 km × 1.5 km. Plantea un caso práctico.',
      },
      verification: {
        question: 'Un mapa geológico muestra una intrusión cuarzo-monzonítica del Mioceno en contacto con calizas, con desarrollo de granates y sulfuros (calcopirita, esfalerita). ¿Qué tipo de yacimiento es y a qué mina peruana de clase mundial corresponde?',
        success_criteria: {
          must_include: ['Skarn', 'Antamina', 'Polimetálico (Cu-Zn)'],
          min_completeness: 70,
          understanding_level: 'applied',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-2-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 3,
      teaching: {
        agent_instruction:
          'Explica los yacimientos epitermales: formados a poca profundidad (<1km), por fluidos hidrotermales superficiales. Dos tipos: alta sulfuración (HS) con sílice masiva, ej. Yanacocha y Lagunas Norte; baja sulfuración (LS) con vetas cuarzo-adularia. Yanacocha fue el mayor productor histórico de oro de Sudamérica. Pregunta de comparación.',
      },
      verification: {
        question: '¿Qué diferencia principal hay entre un pórfido de cobre y un yacimiento epitermal de oro en términos de profundidad de formación y tipo de mineralización?',
        success_criteria: {
          must_include: [
            'Profundidad: pórfido más profundo, epitermal más superficial',
            'Pórfido = diseminado / epitermal = vetas o sílice',
          ],
          min_completeness: 60,
          understanding_level: 'analyzed',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-2-5',
      type: 'closing',
      complexity: 'moderate',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Sintetiza los 4 tipos principales de yacimientos peruanos: pórfidos (Cu-Mo), skarns (Cu-Zn-Ag polimetálicos), epitermales (Au-Ag) y vetas hidrotermales. Recuerda los 5 cinturones que aportan el 85% de la producción. Pregunta abierta de aplicación.',
      },
      verification: {
        question: 'Si te piden explorar zonas con potencial de Pb-Zn-Ag polimetálico, ¿en qué cinturón metalogenético peruano te enfocarías y por qué?',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Cinturón Polimetálico del Perú Central',
            'Tipo de yacimiento (skarn, vetas, reemplazo)',
          ],
          min_completeness: 60,
          understanding_level: 'analyzed',
        },
        max_attempts: 3,
      },
    },
  ],
}

// ============================================================
// LECCIÓN 3: Proceso de Flotación en el Perú
// ============================================================
const lesson3Content: LessonContent = {
  context: {
    pais: 'Perú',
    referencias: [
      'Congreso Flotación 2025 (Lima, +450 expertos)',
      'MINEM Boletín Estadístico Minero 2025',
      'Antamina, Cerro Verde, Cerro Lindo - operaciones publicadas 2024-2025',
    ],
  },
  activities: [
    {
      id: 'act-3-1',
      type: 'explanation',
      complexity: 'moderate',
      keyPointIndex: 0,
      teaching: {
        agent_instruction:
          'Explica brevemente el principio de la flotación: separación basada en hidrofobicidad (afinidad o repulsión al agua). Los sulfuros se vuelven hidrofóbicos por reactivos colectores, se adhieren a burbujas de aire y forman espuma mineralizada. Es el método más usado en el Perú para concentrar Cu, Pb, Zn, Mo. Invita a reflexionar sobre la propiedad clave.',
      },
      verification: {
        question: '¿Qué propiedad físico-química permite que ciertos minerales floten y otros se hundan en el proceso de flotación?',
        success_criteria: {
          must_include: [
            'Hidrofobicidad / afinidad o repulsión al agua',
            'Adherencia a burbujas de aire',
          ],
          min_completeness: 60,
          understanding_level: 'understood',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-3-2',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 1,
      teaching: {
        agent_instruction:
          'Explica las etapas del proceso: molienda (<150 µm) → acondicionamiento → rougher (primera flotación) → scavenger (recupera lo que escapa) → cleaner (limpieza, varias etapas). Pregunta práctica.',
      },
      verification: {
        question: 'Si la flotación rougher tiene baja recuperación de cobre, ¿qué etapa lo complementa para no perder mineral valioso y por qué?',
        success_criteria: {
          must_include: [
            'Scavenger',
            'Recupera el mineral que escapó del rougher',
          ],
          min_completeness: 60,
          understanding_level: 'applied',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-3-3',
      type: 'practice',
      complexity: 'complex',
      keyPointIndex: 2,
      teaching: {
        agent_instruction:
          'Explica los 3 tipos de reactivos: Colectores (xantatos Z-11, ditiofosfatos) hacen hidrofóbico al sulfuro. Espumantes (MIBC) estabilizan la espuma. Depresores (cal, sulfato de zinc) bloquean minerales no deseados. Plantea un caso real de Antamina con calcopirita, esfalerita y pirita.',
      },
      verification: {
        question: 'En Antamina llega pulpa con calcopirita (Cu), esfalerita (Zn) y pirita (Fe) como ganga. ¿Qué reactivos usarías para flotar SOLO la calcopirita y deprimir la pirita y esfalerita en el primer circuito?',
        success_criteria: {
          must_include: [
            'Cal (subir pH, deprimir pirita)',
            'Sulfato de zinc (deprimir esfalerita)',
            'Xantato (colector calcopirita)',
            'MIBC u otro espumante',
          ],
          min_completeness: 65,
          understanding_level: 'applied',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-3-4',
      type: 'practice',
      complexity: 'moderate',
      keyPointIndex: 3,
      teaching: {
        agent_instruction:
          'Compara dos casos peruanos: Cerro Verde (Arequipa) hace flotación bulk Cu-Mo (449,096 TMF Cu en 2024); Cerro Lindo (Nexa, Chincha) hace flotación selectiva polimetálica produciendo concentrados separados de Cu, Zn y Pb (87,100 t Zn, 27,100 t Cu, 10,300 t Pb en 2025). Pregunta de comparación.',
      },
      verification: {
        question: '¿Por qué Cerro Lindo necesita flotación diferencial (concentrados separados Cu, Zn, Pb) mientras que Cerro Verde solo hace flotación bulk Cu-Mo?',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Cerro Lindo es polimetálico (varios minerales valiosos)',
            'Cerro Verde tiene principalmente cobre con molibdeno asociado',
            'Necesidad de separar comercialmente',
          ],
          min_completeness: 55,
          understanding_level: 'analyzed',
        },
        max_attempts: 3,
      },
    },
    {
      id: 'act-3-5',
      type: 'closing',
      complexity: 'moderate',
      keyPointIndex: null,
      teaching: {
        agent_instruction:
          'Sintetiza: el Perú es líder mundial en flotación de polimetálicos Cu-Pb-Zn-Ag por la abundancia de skarns y vetas. Es 2do productor mundial de zinc, 3ro de plata. Cerro Verde + Antamina + Chinalco concentran más del 50% del procesamiento nacional. Pregunta abierta de cierre.',
      },
      verification: {
        question: 'Explica con tus propias palabras por qué el Perú es referente mundial en flotación de minerales polimetálicos.',
        open_ended: true,
        success_criteria: {
          must_include: [
            'Geología favorable (skarns, vetas polimetálicas)',
            'Experiencia y volumen de procesamiento',
            'Liderazgo mundial en producción',
          ],
          min_completeness: 50,
          understanding_level: 'analyzed',
        },
        max_attempts: 3,
      },
    },
  ],
}

// ============================================================
// SEED FUNCTION
// ============================================================
async function seed() {
  console.log('Iniciando seed de 3 lecciones de minería peruana...\n')

  // ----- CURSO 1: Perforación Subterránea -----
  const course1 = await prisma.course.create({
    data: {
      title: 'Operación Minera Subterránea: Perforación',
      slug: `operacion-minera-perforacion-${Date.now()}`,
      capacidad: 'Comprender los métodos modernos de perforación subterránea utilizados en minas peruanas, incluyendo equipos, normativa de seguridad y aplicaciones reales en operaciones de gran escala.',
      instructor: DEFAULT_INSTRUCTOR,
      userId: SUPERADMIN_USER_ID,
      careerId: CAREER_EXPLORACION,
      isPublished: false,
      lessons: {
        create: [
          {
            title: 'Perforación Subterránea en Minas del Perú',
            slug: `perforacion-subterranea-peru-${Date.now()}`,
            objective: 'Identificar los principales métodos de perforación subterránea, equipos utilizados en minas peruanas y la normativa de seguridad aplicable.',
            keyPoints: [
              'Métodos de perforación: jumbos vs perforadoras manuales',
              'Tipos de jumbos: desarrollo y producción',
              'Normativa peruana: DS 024-2016-EM y DS 023-2017-EM',
              'Tendencias 2024-2026: automatización en minería peruana',
            ],
            order: 1,
            isPublished: false,
            contentJson: lesson1Content as object,
          },
        ],
      },
    },
  })
  console.log(`Curso 1 creado: ${course1.title}`)

  // ----- CURSO 2: Geología -----
  const course2 = await prisma.course.create({
    data: {
      title: 'Geología de Yacimientos Minerales del Perú',
      slug: `geologia-yacimientos-peru-${Date.now()}`,
      capacidad: 'Identificar los principales tipos de yacimientos minerales del Perú, sus características geológicas y los cinturones metalogenéticos que aportan el 85% de la producción nacional.',
      instructor: DEFAULT_INSTRUCTOR,
      userId: SUPERADMIN_USER_ID,
      careerId: CAREER_EXPLORACION,
      isPublished: false,
      lessons: {
        create: [
          {
            title: 'Tipos de Yacimientos Minerales del Perú',
            slug: `yacimientos-minerales-peru-${Date.now()}`,
            objective: 'Distinguir los principales tipos de yacimientos minerales peruanos (pórfidos, skarns, epitermales) y reconocer ejemplos de minas reales en cada categoría.',
            keyPoints: [
              'Cinturones metalogenéticos del Perú',
              'Pórfidos de cobre (Toromocho, Las Bambas, Cerro Verde)',
              'Skarns polimetálicos (Antamina como caso mundial)',
              'Epitermales de oro (Yanacocha, Lagunas Norte)',
            ],
            order: 1,
            isPublished: false,
            contentJson: lesson2Content as object,
          },
        ],
      },
    },
  })
  console.log(`Curso 2 creado: ${course2.title}`)

  // ----- CURSO 3: Flotación -----
  const course3 = await prisma.course.create({
    data: {
      title: 'Procesos Metalúrgicos: Flotación de Minerales en el Perú',
      slug: `flotacion-minerales-peru-${Date.now()}`,
      capacidad: 'Comprender el proceso de flotación de minerales aplicado en plantas concentradoras peruanas, incluyendo principios físico-químicos, etapas, reactivos y casos reales de operaciones de clase mundial.',
      instructor: DEFAULT_INSTRUCTOR,
      userId: SUPERADMIN_USER_ID,
      careerId: CAREER_METALURGICOS,
      isPublished: false,
      lessons: {
        create: [
          {
            title: 'Proceso de Flotación en el Perú',
            slug: `proceso-flotacion-peru-${Date.now()}`,
            objective: 'Comprender el principio físico-químico de la flotación, sus etapas, los reactivos utilizados y aplicarlo a casos reales de minas peruanas.',
            keyPoints: [
              'Principio de hidrofobicidad y flotación',
              'Etapas del proceso: rougher, scavenger, cleaner',
              'Reactivos: colectores, espumantes, depresores',
              'Casos peruanos: Cerro Verde, Antamina, Cerro Lindo',
            ],
            order: 1,
            isPublished: false,
            contentJson: lesson3Content as object,
          },
        ],
      },
    },
  })
  console.log(`Curso 3 creado: ${course3.title}`)

  console.log('\nSeed completado exitosamente.')
  console.log(`Total: 3 cursos, 3 lecciones, ${3 * 5} actividades.`)
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
