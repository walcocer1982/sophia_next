/**
 * PM-FMPLANTA · S1 · Introducción al mantenimiento electromecánico.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (lectura 1). Las láminas se miraron una por una.
 * El caso de la sesión («La chancadora primaria que no llegó a su
 * disponibilidad», Diego Mamani) NO entra: es el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/PM/esquemas/fmplanta/s1'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_fmplanta_s1.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-PM-FMPLANTA-S1-FOTO-GIRATORIA', archivo: '04_Recursos-graficos/PM/fotos/chancadora-giratoria-camara-de-chancado.jpg', kind: 'scene', license: 'Dominio público (NARA, 1919)',
    source: 'National Archives and Records Administration (1919). Arthur Plant, Number 27, gyratory crusher, Salt Lake City, Utah. NARA 45487055 · Wikimedia Commons',
    description: 'Fotografía en blanco y negro (1919) de una chancadora giratoria vista desde la tolva: en el centro, la cabeza cónica del manto dentro de la cámara de chancado; arriba, la viga de la araña que la sostiene; alrededor, mineral grueso amontonado hasta los bordes; al fondo, la faja de alimentación y las paredes de madera de la nave. Sin rótulos.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-FUNCION-FALLA', archivo: `${ESQ}/fmplanta-s1_funcion-falla.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tres tarjetas unidas por flechas. FUNCIÓN, «lo que se espera»: reducir el mineral al tamaño y tonelaje pedidos. FALLA PARCIAL, «pierde rendimiento»: sigue girando, pero chanca menos o más grueso. FALLA TOTAL, «pierde la función»: se detiene, parada no programada.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-CUANDO-CONVIENE', archivo: `${ESQ}/fmplanta-s1_cuando-conviene.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Tipo / Conviene si / En una faja»: Preventivo, el desgaste avanza a ritmo conocido, cambio de polines por horas; Predictivo, la falla avisa antes de parar, termografía del motor; Correctivo aceptado, prevenir cuesta más que reparar, sensor de faja rota, al fallar.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-TRES-MOMENTOS', archivo: `${ESQ}/fmplanta-s1_tres-momentos.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Curva «condición del componente» contra «tiempo», que baja cada vez más rápido, con tres marcas: PREVENTIVO, «a fecha fija» (línea punteada antes de que la curva caiga); PREDICTIVO, «la medición avisa» (punto amarillo donde la curva empieza a caer); CORRECTIVO, «ya falló» (punto rojo al final).',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-TPPR', archivo: `${ESQ}/fmplanta-s1_tppr.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Equipo / Paradas / Horas / TPPR»: Equipo A, 10 paradas, 5,0 h, TPPR 0,5 h; Equipo B, 1 parada, 5,0 h, TPPR 5,0 h (resaltado). Debajo: «TPPR = horas de parada ÷ número de paradas» y «Las mismas 5 h restan la misma disponibilidad».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-DISPONIBILIDAD', archivo: `${ESQ}/fmplanta-s1_disponibilidad.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Barra «horas programadas» partida en «operación» (verde, la mayor parte) y «paradas» (rojo). Fórmula: D = (horas programadas − horas de parada) ÷ horas programadas. Abajo: «Una planta que opera las 24 h programa 8 760 h al año».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-OVERLAND-BARRAS', archivo: `${ESQ}/fmplanta-s1_overland-barras.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · datos: Escalante Luna, A. C. (2016), UCSM, anexo 8 (faja overland)',
    description: 'Barras de paradas (azul) y de horas de parada (amarillo) de cinco fallas de una faja overland: Variador dañado, 5 paradas, 13,12 h; Caída de elemento de desgaste, 11 paradas, 11,62 h; Faja dañada, 5 paradas, 7,20 h; Polines dañados, 10 paradas, 7,02 h; Sensor de faja rota, 16 paradas, 6,52 h. Pie: Faja overland · Escalante Luna (2016), UCSM, anexo 8.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S1-HISTORIAL-LECTURA', archivo: `${ESQ}/fmplanta-s1_historial-lectura.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Columna / Qué dice»: Componente, dónde ocurrió la falla; Modo de falla, cómo falló (rotura, caída, sensor dañado); Paradas, cuántas veces detuvo el equipo; Horas, cuánto tiempo estuvo detenido en total. Abajo: «Se ordena por horas perdidas, de mayor a menor».',
  },
]

export const S1: SesionSpec = {
  slug: 'pm-fmplanta-s1-introduccion-al-mantenimiento-electromecanico',
  order: 1,
  etiqueta: 'S1',
  idPrefijo: 'fmplanta-s1',
  title: 'Introducción al mantenimiento electromecánico',
  objective:
    'Explica los tipos de mantenimiento electromecánico según el momento en que se interviene el equipo y su efecto en la disponibilidad de la planta.',
  keyPoints: ['Función, falla y parada', 'Correctivo, preventivo y predictivo', 'Disponibilidad y tiempo promedio para reparar', 'Lectura de un historial de paradas'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Mamani', '6 650', 'excéntrica', 'cámara de compensación'],

  rutina: {
    imagenId: 'IMG-PM-FMPLANTA-S1-FOTO-GIRATORIA',
    tituloImagen: 'Chancadora giratoria vista desde arriba',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del PPT de la sesión',
    // Las de la lámina 9: «Veo: ¿qué hay en la imagen? Solo lo que se ve. Pienso: ¿qué creen que pasa ahí? Me pregunto: ¿qué les gustaría saber?»
    preguntas: {
      veo: '¿Qué hay en la imagen?',
      pienso: '¿Qué crees que pasa ahí?',
      mePregunto: '¿Qué te gustaría saber?',
    },
    titulos: {
      veo: 'Observación de una chancadora giratoria',
      pienso: 'Lo que pasa en la chancadora',
      mePregunto: 'Lo que falta saber de la chancadora',
    },
    pistaVeo: 'qué hay en el centro de la foto y qué la rodea',
    criterios: {
      pienso: ['Dice qué cree que pasa en la chancadora', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le gustaría saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'funcion-falla',
      title: 'Función, falla y parada',
      subtitle: 'Falla parcial y falla total',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S1-FUNCION-FALLA', title: 'Función y falla' },
      norma: {
        id: 'norma-funcion-falla',
        title: 'Función, falla y parada',
        source: 'CV1, lectura 1 · manuales de operación',
        body: [
          '- Todo equipo existe para cumplir una **función medible**: toneladas por hora, tamaño de producto.',
          '- **Falla** es perder esa función: **parcial**, sigue andando pero no cumple la medida; **total**, se detiene.',
          '- Una **parada no programada** es la que nadie decidió: el equipo se detiene cuando le toca fallar.',
          '- Lo **mecánico** se rompe, desgasta o afloja; lo **eléctrico** deja al motor sin energía o sin protección; la **instrumentación** manda una señal falsa y detiene todo aunque la máquina esté sana.',
        ].join('\n'),
      },
      regla: 'falla es perder la función medible del equipo: parcial si sigue andando sin cumplir la medida, total si se detiene; esa es la parada no programada.',
      ejemplo: 'una faja que debe llevar 1 200 t/h y lleva 900 tiene falla parcial: anda, pero no cumple la medida; si se detiene, falla total.',
      ejemploClave: '900',
      subrayar: { respalda: ['parcial', 'función medible'] },
      pregunta: 'Una chancadora sigue girando, pero entrega el producto más grueso que el tamaño pedido. ¿Es una falla, y por qué?',
      criterios: [
        'Decide que sí es una falla, parcial',
        'Da la razón: el equipo perdió la medida de su función (el tamaño pedido) aunque siga andando; pierde rendimiento sin detenerse',
      ],
      critical: [2],
      commonMistakes: ['Cree que solo hay falla cuando el equipo se detiene', 'Confunde la función con «que gire»'],
    },
    {
      id: 'tres-momentos',
      title: 'Correctivo, preventivo y predictivo',
      subtitle: 'Cuándo conviene cada uno',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S1-CUANDO-CONVIENE', title: 'Cuándo conviene cada mantenimiento' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S1-TRES-MOMENTOS', title: 'Los tres momentos de intervenir' }],
      norma: {
        id: 'norma-tres-momentos',
        title: 'Tres momentos para intervenir',
        source: 'CV1, lectura 1',
        body: [
          '- **Correctivo:** se interviene **después de la falla**, con el equipo parado. Conviene si prevenir cuesta más que reparar.',
          '- **Preventivo:** se interviene **a fecha o uso fijo**, antes de fallar. Conviene si el desgaste avanza a un ritmo conocido.',
          '- **Predictivo:** se interviene **cuando una medición anuncia la falla** (vibración, temperatura, aceite). Conviene si la falla avisa.',
          '- Ninguno es mejor que los otros: cada uno conviene en un caso distinto.',
        ].join('\n'),
      },
      regla: 'solo hay tres momentos para intervenir: correctivo, después de la falla; preventivo, a fecha o uso fijo, si el desgaste avanza a ritmo conocido; predictivo, cuando una medición avisa, si la falla avisa.',
      ejemplo: 'el aceite de un reductor se degrada a ritmo conocido: se cambia cada 500 horas, falle o no; eso es preventivo.',
      ejemploClave: '500',
      subrayar: { respalda: 'Predictivo:' },
      pregunta: 'El rodamiento del motor de una bomba de pulpa se calienta y vibra semanas antes de fallar, y la planta tiene termógrafo. ¿Qué mantenimiento le conviene, y por qué?',
      criterios: [
        'Decide que le conviene el predictivo',
        'Da la razón: la falla avisa (temperatura, vibración) y se interviene cuando la medición lo pide, antes de que pare',
      ],
      critical: [2],
      commonMistakes: ['Elige preventivo para todo porque «es antes de fallar»', 'Cree que el correctivo siempre es un error'],
    },
    {
      id: 'disponibilidad',
      title: 'Disponibilidad y tiempo promedio para reparar',
      subtitle: 'Horas de parada y número de paradas',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S1-TPPR', title: 'Dos equipos, mismas horas de parada' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S1-DISPONIBILIDAD', title: 'La fórmula de la disponibilidad' }],
      norma: {
        id: 'norma-disponibilidad',
        title: 'Disponibilidad y TPPR',
        source: 'CV1, lectura 1',
        body: [
          '- **Disponibilidad** = (horas programadas − horas de parada) ÷ horas programadas. Una planta que opera las 24 h programa 8 760 h al año.',
          '- Cada hora de parada correctiva **resta disponibilidad y producción**: si la chancadora primaria para, la molienda solo vive del stockpile.',
          '- **TPPR** = horas de parada ÷ número de paradas: cuánto dura cada reparación.',
          '- Un **TPPR alto señala una reparación larga y difícil**; muchas paradas cortas pueden restar menos que una sola larga.',
        ].join('\n'),
      },
      regla: 'disponibilidad = (horas programadas − horas de parada) ÷ horas programadas; TPPR = horas de parada ÷ número de paradas. Un TPPR alto señala una reparación larga y difícil.',
      ejemplo: 'una zaranda con 720 h programadas y 36 h de parada: (720 − 36) ÷ 720 = 95 % de disponibilidad.',
      ejemploClave: '95',
      // 22 oct 2026, alumno flojo: la respuesta «sí, la misma» la respalda la fórmula de la
      // disponibilidad (línea 1); el TPPR respalda el porqué. Las dos valen.
      subrayar: { respalda: ['Disponibilidad = (horas programadas', 'TPPR = horas de parada'] },
      pregunta: 'Dos bombas con 720 h programadas pierden 12 h cada una en el mes: una en 24 paradas de media hora, la otra en una sola parada de 12 h. ¿Tienen la misma disponibilidad, y por qué?',
      criterios: [
        'Decide que la disponibilidad es la misma',
        'Da la razón: la disponibilidad cuenta horas de parada sobre horas programadas, no el número de paradas; lo que las distingue es el TPPR, que señala la reparación larga',
      ],
      critical: [2],
      commonMistakes: ['Cree que más paradas es menos disponibilidad aunque sumen las mismas horas', 'Confunde disponibilidad con TPPR'],
    },
    {
      id: 'historial',
      title: 'Lectura de un historial de paradas',
      subtitle: 'La más frecuente no es la que más resta',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S1-OVERLAND-BARRAS', title: 'La faja overland' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S1-HISTORIAL-LECTURA', title: 'Qué dice cada columna' }],
      norma: {
        id: 'norma-historial',
        title: 'Cómo se lee un historial',
        source: 'CV1, lectura 1 · Escalante Luna (2016), anexo 8',
        body: [
          '- El historial registra **componente, modo de falla, paradas y horas**.',
          '- Se ordena por **horas perdidas, de mayor a menor**.',
          '- La falla **más frecuente no siempre es la que más resta**: en la faja overland, el sensor de faja rota paró 16 veces y sumó 6,52 h; el variador, 5 veces y 13,12 h.',
          '- Cada patrón de falla pide un tipo de mantenimiento distinto.',
        ].join('\n'),
      },
      regla: 'el historial trae componente, modo de falla, paradas y horas; se ordena por horas perdidas, de mayor a menor: la falla más frecuente no siempre es la que más resta.',
      ejemplo: 'en la faja de la lámina, el sensor de faja rota paró 16 veces y sumó 6,52 h; el variador, 5 veces y 13,12 h: el variador resta más.',
      ejemploClave: 'variador',
      // 22 oct 2026, alumno flojo: tocó «Se ordena por horas perdidas», que es la línea directa,
      // y el código la rechazó. Las dos valen.
      subrayar: { respalda: ['horas perdidas, de mayor a menor', 'más frecuente no siempre'] },
      pregunta: 'El supervisor ordena el historial de un molino por número de paradas, de mayor a menor, para decidir qué atiende primero el plan. ¿Está bien ordenado, y por qué?',
      criterios: [
        'Decide que no está bien ordenado',
        'Da la razón: el historial se ordena por horas perdidas, porque la falla más frecuente no siempre es la que más disponibilidad resta',
      ],
      critical: [2],
      commonMistakes: ['Cree que la falla que más se repite es la más grave', 'No distingue paradas de horas de parada'],
    },
  ],

  // Gemelo del caso de la chancadora: otro equipo, una sola decisión (¿es el sensor la prioridad?).
  casoCorto: {
    id: 'caso-corto',
    title: 'Prioridad del plan de mantenimiento en un caso',
    subtitle: 'Caso del molino de bolas',
    keyPointIndex: 3,
    caso: {
      id: 'caso-molino',
      title: 'Caso: el molino de bolas',
      referencia: 'el caso del molino de bolas',
      name: 'Concentradora Cerro Blanco, molienda',
      source: 'Caso corto construido para Sophia sobre el CV1 · pendiente de aprobación del instructor',
      facts: [
        'Molino de bolas que opera las 24 h: 8 760 h programadas en el año',
        'Historial del año, falla 1: reductor, rotura de rodamiento, 1 parada, 36 h',
        'Falla 2: sensor de temperatura de chumacera, señal falsa, 24 paradas, 6 h',
        'Falla 3: bomba de lubricación, fuga, 4 paradas, 8 h',
        // 22 oct 2026, alumno flojo: con «limpieza semanal con parada de 20 minutos» Sophia abría un
        // segundo pedido (cuántas horas al año) que se comía el cierre. Una sola decisión.
        'El jefe de guardia propone para el plan: «la prioridad es el sensor de temperatura: 24 paradas»',
        'Cada hora de molino detenido deja la flotación sin alimento',
      ],
      question: '¿Es el sensor la prioridad del plan, y por qué?',
    },
    pistas: 'Si elige el sensor por frecuencia, pregúntale por qué columna se ordena el historial y cuántas horas restó cada falla. Si elige el reductor sin razón, pídele el TPPR de cada falla. No agregues cálculos que la pregunta no pide.',
    criterios: [
      'Decide que no: la prioridad es el reductor, que con una sola parada restó 36 h (TPPR 36 h); el sensor restó 6 h',
      'Da la razón: el historial se ordena por horas perdidas, no por número de paradas',
    ],
    critical: [1],
    commonMistakes: ['Elige la falla más frecuente como prioridad', 'No calcula el TPPR del reductor'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 374 y 375: mantenimiento según el fabricante, programas de inspección) · manuales de operación de planta',
    referencias: [
      'Sesión 1 de 12 del curso Fundamentos mecánicos de planta (48 h, ciclo II). Indicador IND-PM-FMPLANTA-2: explica fallas comunes en equipos mecánicos, proponiendo soluciones de mantenimiento preventivo y correctivo en casos, aplicando protocolos de seguridad.',
      'Antes de esta sesión el estudiante trabajó la lectura 1 del recurso autónomo CV1, «Qué se mantiene, y cómo se mide» (función, falla y parada; los tres momentos; disponibilidad; TPPR). Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Función y falla (punto clave 1): todo equipo cumple una función medible (una faja no «lleva mineral»: lleva 1 200 t/h). Falla parcial: sigue andando sin cumplir la medida; falla total: se detiene (parada no programada, la que nadie decidió). Tres familias de componentes: lo mecánico se rompe, desgasta o afloja (rodamiento, banda, perno); lo eléctrico deja sin energía o sin protección (contactor, cable, relé); la instrumentación manda una señal falsa y detiene toda la línea aunque la máquina esté sana.',
      'Tres momentos (punto clave 2): correctivo, después de la falla, con el equipo parado (se acepta si prevenir cuesta más que reparar); preventivo, a fecha o uso fijo, antes de fallar (sirve si el desgaste avanza a ritmo conocido: cambio de polines por horas); predictivo, cuando una medición anuncia la falla (vibración, temperatura, aceite; termografía del motor). Ninguno es mejor que los otros.',
      'Disponibilidad y TPPR (punto clave 3): disponibilidad = (horas programadas − horas de parada) ÷ horas programadas; la base son las horas del calendario del equipo (24 h al día, 8 760 al año). TPPR = horas de parada ÷ número de paradas; un TPPR alto señala una reparación larga y difícil; diez paradas de media hora y una de cinco horas restan la misma disponibilidad.',
      'Historial (punto clave 4): columnas componente, modo de falla, paradas y horas; se ordena por horas perdidas, de mayor a menor; la falla más frecuente no siempre es la que más resta (faja overland de 7 km y 6 860 kW, Escalante Luna 2016, anexo 8: variador dañado 5 paradas y 13,12 h; caída de elemento de desgaste 11 y 11,62 h; faja dañada 5 y 7,20 h; polines dañados 10 y 7,02 h; sensor de faja rota 16 y 6,52 h). Cada patrón de falla pide un tipo de mantenimiento distinto.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del molino de bolas, y los ejemplos que Sophia resuelve son propios (la faja de 900 t/h, el aceite cada 500 horas, la zaranda al 95 %, la faja overland de la lámina).',
    ],
  },
}
