/**
 * SI-ALTORIESGO · S2 · Control de riesgos en trabajos en altura.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * cuadernillo CV1 (caps. 3, 4 y 5). Las láminas se miraron una por una
 * (imagenes.csv solo trae «S2 · jerarquia» como descripción).
 * Los casos A y B de la sesión (Lurín y Ate) NO entran: son el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/SI/esquemas'
const FOTO = '04_Recursos-graficos/SI/fotos'
const SOBRE_NORMA = 'Elaboración propia sobre la norma verificada en el marco legal del curso (G.050, D.S. 024, Ley 29783 y OSHA)'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-SI-ALTORIESGO-S2-MURAL', archivo: `${ESQ}/altoriesgo_s2_mural-entrada.png`, kind: 'scene', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de NIOSH, dominio público, Wikimedia Commons`,
    description: 'Dos carpinteros sobre la estructura de madera de una casa en construcción: uno, agachado en el piso del segundo nivel, con casco blanco y arnés cuya línea sube a un retráctil que cuelga arriba, mide con una wincha; el otro, de pie, con arnés, sostiene un tablón inclinado. El borde no tiene baranda. Debajo de la foto, las tres preguntas de la rutina: VEO ¿Qué está pasando en este trabajo? · PIENSO ¿Qué protege a cada persona que está arriba? · ME PREGUNTO ¿Qué pasaría si alguien cae ahora? Pie: Fotografías: NIOSH, dominio público.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S2-JERARQUIA', archivo: `${ESQ}/altoriesgo_s2_jerarquia.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Cuatro filas numeradas: 1 EVITAR, «No subir: hacer el trabajo desde el suelo»; 2 EL BORDE, «Baranda, red o tapa: protegen a todos»; 3 ORGANIZAR, «Señalizar, acordonar debajo, capacitar»; 4 EL ARNÉS, «Protege solo a quien está bien enganchado». Cierre: «El arnés es la última barrera, no la primera». Pie: Ley 29783, art. 21 · Norma G.050, caps. 14 y 20.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S2-BARANDA', archivo: `${ESQ}/altoriesgo_s2_baranda.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tabla «La norma / Altura / Resiste»: OSHA 1926.502, obra: 42" ± 3, 1,1 m, 200 lb sin fallar; OSHA 1910.29, industria: 42" ± 3, 1,07 m, 200 lb sin fallar; D.S. 024, 372 h, minería: 1,20 m como mínimo. Cierre: «La cinta de peligro señaliza; no es baranda». Pie: «La red, la tapa y la línea de vida también son colectivas (G.050, cap. 14)».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S2-ANCLAJE', archivo: `${ESQ}/altoriesgo_s2_anclaje.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de Asurnipal, CC BY-SA 4.0, Wikimedia Commons`,
    description: 'Arriba, foto de un techo plano con una línea de vida horizontal de cable, tensada entre postes de anclaje fijados al techo. Debajo, tres filas: ANCLAJE, «2 265 kg-f como mínimo» · «Sobre la cabeza del trabajador»; OSHA, «5 000 lb por trabajador» · «O sistema con factor de seguridad dos»; LÍNEA DE VIDA, «Cable de ½" o soga de 5/8"» · «Sin nudos ni empates, tensada». Pie: Norma G.050, 20.1 · OSHA 1926.502(d)(15).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S2-CAIDA-LIBRE', archivo: `${ESQ}/altoriesgo_s2_caida-libre.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tres cifras grandes: «1,80 m, caída libre máxima»; «1 800 lb, fuerza máxima de detención»; «1,07 m, desaceleración máxima». Franja amarilla: «Y sin tocar el nivel inferior». Pie: «G.050: la caída libre se calcula con la elongación de la línea y los obstáculos · OSHA 1926.502(d)(16)».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S2-INSPECCION', archivo: `${ESQ}/altoriesgo_s2_inspeccion.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de la U.S. Navy, dominio público, Wikimedia Commons`,
    description: 'Arriba, foto de un instructor revisando con las manos el arnés puesto de un marinero. Debajo, tres filas: G.050, «Periódica, por persona competente» · «Con registro hasta el final de la obra»; OSHA, «Antes de cada uso» · «Desgaste, daño y deterioro»; SI HAY DAÑO, «Corte, abrasión o quemadura» · «Fuera de servicio de inmediato». Pie: Norma G.050, 20.1 · OSHA 1926.502(d)(21).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S2-FOTO-RESCATE', archivo: `${FOTO}/altura-s2-rescate.jpg`, kind: 'scene', license: 'Dominio público (U.S. Air Force)',
    source: 'Fotografía: U.S. Air Force · Wikimedia Commons, «Firefighters qualify on rescue techniques during rescue technician course»',
    description: 'Un bombero con traje rojo y negro, casco y arnés de cuerpo entero, colgado de cuerdas azules y rojas junto a una pared, de espaldas al vacío, con los brazos abiertos, esperando al rescatista durante un curso de técnicas de rescate. No hay rótulos.',
  },
]

export const S2: SesionSpec = {
  slug: 'si-altoriesgo-s2-control-de-riesgos-en-trabajos-en-altura',
  order: 2,
  etiqueta: 'S2',
  idPrefijo: 'altoriesgo-s2',
  title: 'Control de riesgos en trabajos en altura',
  objective:
    'Explica en qué orden se eligen los controles de un trabajo en altura, qué debe cumplir el sistema de detención de caídas y qué lo mantiene útil: inspección, retiro tras una caída y rescate.',
  keyPoints: ['Orden de los controles en trabajos en altura', 'El anclaje y la línea de vida', 'Caída libre y distancia de detención', 'Inspección, retiro y rescate'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Lurín', 'Ate', 'paneles solares', 'embotelladora'],

  rutina: {
    imagenId: 'IMG-SI-ALTORIESGO-S2-MURAL',
    tituloImagen: 'Carpinteros en el segundo nivel',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del PPT de la sesión',
    // Tal como están escritas en la imagen
    preguntas: {
      veo: '¿Qué está pasando en este trabajo?',
      pienso: '¿Qué protege a cada persona que está arriba?',
      mePregunto: '¿Qué pasaría si alguien cae ahora?',
    },
    titulos: {
      veo: 'Observación de un trabajo en altura',
      pienso: 'Lo que protege a cada persona',
      mePregunto: 'Lo que pasaría si alguien cae',
    },
    pistaVeo: 'dónde están parados los dos carpinteros y qué llevan puesto',
    criterios: {
      pienso: ['Dice qué protege a alguien de la foto, o que nada lo protege', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué pasaría si alguien cae, o qué le falta saber'],
    },
    enlaceMePregunto: 'Sobre las personas que señalaste:',
  },

  puntosClave: [
    {
      id: 'jerarquia',
      title: 'Orden de los controles en trabajos en altura',
      subtitle: 'Evitar, el borde, el arnés',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S2-JERARQUIA', title: 'La jerarquía de controles' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S2-BARANDA', title: 'La baranda según cada norma' }],
      norma: {
        id: 'norma-jerarquia',
        title: 'El orden de los controles',
        source: 'Ley 29783, art. 21 · Norma G.050, cap. 14 · OSHA 1926.502(b) · D.S. 024, art. 372 h',
        body: [
          '- Ley 29783, art. 21: **eliminar, aislar, trabajo seguro, sustituir y, al final, el EPP**.',
          '- En altura: primero **evitar subir**; después **proteger el borde** (baranda, red, tapa, línea de vida: protegen a todos); al final, el arnés.',
          '- El arnés es EPP: protege **solo a quien está bien enganchado**.',
          '- Baranda en obra e industria: **1,1 m y 200 lb sin fallar** (OSHA); en minería, **al menos 1,20 m** con pasamanos (D.S. 024, art. 372 h). Las colectivas van con memoria de cálculo firmada por ingeniero colegiado (G.050, cap. 14).',
        ].join('\n'),
      },
      regla: 'los controles van en orden (Ley 29783, art. 21): primero evitar subir; después proteger el borde (baranda, red, tapa: protegen a todos); al final el arnés, EPP que protege solo a quien está enganchado.',
      ejemplo: 'luminarias en un techo a 5 m: primero, desde el piso con pértiga; si hay que subir, baranda en el borde; el arnés, al final.',
      ejemploClave: 'pértiga',
      subrayar: { respalda: ['proteger el borde', 'solo a quien está bien enganchado', 'al final, el EPP'] },
      pregunta: 'En un tanque de 4 m de alto se revisa un sensor una vez por semana, y el supervisor entrega un arnés para cada subida y da por controlado el riesgo. ¿Qué control va antes del arnés, y por qué?',
      criterios: [
        'Nombra un control que va antes del arnés: evitar subir (lectura remota, hacerlo desde el suelo) o proteger el borde con baranda o línea de vida',
        'Da la razón: el arnés es EPP, el último de la jerarquía; protege solo a quien está enganchado, mientras que el borde protegido o no subir protegen a todos',
      ],
      critical: [2],
      commonMistakes: ['Cree que con arnés el riesgo ya está controlado', 'Salta de evitar al arnés sin pasar por el borde'],
    },
    {
      id: 'anclaje',
      title: 'El anclaje y la línea de vida',
      subtitle: 'Lo que debe cumplir el sistema de detención',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S2-ANCLAJE', title: 'Anclaje y línea de vida' },
      norma: {
        id: 'norma-anclaje',
        title: 'El sistema de detención de caídas',
        source: 'Norma G.050, 20.1 · OSHA 1926.502(d)(15) · OSHA 1910.140(c)(22)',
        body: [
          '- Arnés de cuerpo entero y línea con **amortiguador** y dos mosquetones; la línea va al **anillo dorsal** (G.050, 20.1).',
          '- Anclaje de **2 265 kg-f como mínimo**, ubicado **sobre la cabeza** (G.050, 20.1); OSHA: 5 000 lb por trabajador, o sistema con factor de seguridad dos.',
          '- Línea de vida horizontal: **cable de ½" o soga de 5/8", sin nudos ni empates**, tensada (G.050).',
          '- Lo instala una **persona competente**, certificada por entidad acreditada (G.050).',
        ].join('\n'),
      },
      regla: 'el anclaje resiste 2 265 kg-f como mínimo (G.050) o 5 000 lb (OSHA) y va sobre la cabeza; la línea de vida horizontal es cable de ½" o soga de 5/8", sin nudos.',
      ejemplo: 'un anclaje fijado a la estructura, certificado para 2 265 kg-f y sobre la cabeza, cumple la G.050; una soga con nudos, no.',
      ejemploClave: 'certificado',
      subrayar: { respalda: '2 265 kg-f' },
      pregunta: 'El supervisor manda enganchar la línea a una tubería de agua de 2" que pasa sobre la cabeza, «porque está alta». ¿Sirve como anclaje, y por qué?',
      criterios: [
        'Decide que no sirve',
        'Da la razón: el anclaje debe estar diseñado y certificado para la carga mínima de la norma, y una tubería de agua no lo está; estar sobre la cabeza es solo una de las condiciones',
      ],
      critical: [2],
      commonMistakes: ['Cree que cualquier punto firme y alto sirve de anclaje', 'Confunde la línea de enganche con la línea de vida'],
    },
    {
      id: 'caida-libre',
      title: 'Caída libre y distancia de detención',
      subtitle: 'Los metros que hacen falta bajo los pies',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S2-CAIDA-LIBRE', title: 'Caída libre y distancia' },
      norma: {
        id: 'norma-caida-libre',
        title: 'Caída libre y distancia de detención',
        source: 'Norma G.050, 20.1 · OSHA 1926.502(d)(16) · CV1, cap. 4',
        body: [
          '- Caída libre máxima de **1,80 m**, contando la elongación del amortiguador y los obstáculos (G.050); OSHA: 6 pies y **sin tocar el nivel inferior**.',
          '- Fuerza de detención máxima **1 800 lb** y desaceleración máxima **1,07 m** (3,5 pies): es el trabajo del amortiguador.',
          '- Distancia libre bajo los pies: línea (1,8 m) + amortiguador abierto (1,2 m) + altura del trabajador (1,8 m) + margen (0,5 m) = **5,3 m**.',
          '- Si esa distancia no existe, el amortiguador no alcanza a frenar: se cambia a un **retráctil**, que bloquea apenas detecta la aceleración.',
        ].join('\n'),
      },
      regla: 'caída libre máxima 1,80 m, fuerza de detención 1 800 lb y desaceleración 1,07 m, sin tocar el nivel inferior; con línea de 1,8 m hacen falta 5,3 m libres bajo los pies.',
      ejemplo: 'techo a 8 m, línea de 1,8 m: 1,8 + 1,2 de amortiguador + 1,8 del trabajador + 0,5 de margen = 5,3 m; alcanza.',
      ejemploClave: 'techo a 8 m',
      subrayar: { respalda: ['5,3 m', 'retráctil', 'sin tocar el nivel inferior'] },
      pregunta: 'Un pintor trabaja en una plataforma a 4 m del piso, con línea de 1,8 m con amortiguador anclada sobre la cabeza. Si cae, ¿el sistema lo frena antes del piso, y por qué?',
      criterios: [
        'Decide que no lo frena antes del piso',
        'Da la razón: hacen falta 5,3 m libres (1,8 + 1,2 + 1,8 + 0,5) y solo hay 4 m; tocaría el nivel inferior, así que corresponde un retráctil',
      ],
      critical: [2],
      commonMistakes: ['Cree que con el arnés puesto cualquier altura es segura', 'Olvida sumar la apertura del amortiguador y la altura del trabajador'],
    },
    {
      id: 'rescate',
      title: 'Inspección, retiro y rescate',
      subtitle: 'Lo que mantiene útil al sistema',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S2-FOTO-RESCATE', title: 'Rescate tras una caída' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S2-INSPECCION', title: 'Inspección del equipo contra caídas' }],
      norma: {
        id: 'norma-rescate',
        title: 'Inspección, retiro y rescate',
        source: 'Norma G.050, 20.1 · OSHA 1926.502(d)(19)-(21) · OSHA 1926.503',
        body: [
          '- G.050: inspección **periódica por persona competente**, con registro; OSHA: **antes de cada uso** [1926.502(d)(21)].',
          '- Corte, abrasión o quemadura: el equipo sale de servicio **de inmediato**.',
          '- El arnés y la línea que **detuvieron una caída** se descartan (G.050); OSHA no los devuelve sin visto bueno de una persona competente [(d)(19)].',
          '- El empleador dispone el **rescate inmediato** tras una caída [(d)(20)]: **planeado antes de subir**, no después de caer (quién rescata, con qué, desde dónde, en cuánto tiempo).',
        ].join('\n'),
      },
      regla: 'el equipo se inspecciona (G.050: periódica, con registro; OSHA: antes de cada uso); con corte, abrasión o quemadura o tras detener una caída, sale de servicio; y el rescate se planea antes de subir.',
      ejemplo: 'un arnés con una quemadura de soldadura en la cinta sale de servicio de inmediato, aunque se vea firme.',
      ejemploClave: 'quemadura',
      subrayar: { respalda: 'planeado antes de subir' },
      pregunta: 'En una obra, si alguien queda colgado del arnés a 7 m, el plan es «llamar a los bomberos». ¿Es un plan de rescate según la norma, y por qué?',
      criterios: [
        'Decide que no es un plan de rescate',
        'Da la razón: la OSHA exige rescate inmediato, planeado antes de subir (quién, con qué equipo, desde dónde, en cuánto tiempo); colgado del arnés, la sangre se acumula en las piernas y el trabajador pierde la conciencia',
      ],
      critical: [2],
      commonMistakes: ['Cree que detener la caída es todo el control', 'Confunde avisar a emergencias con tener un plan de rescate'],
    },
  ],

  // Gemelo de los casos A y B: un arnés dado por suficiente, con anclaje improvisado.
  casoCorto: {
    id: 'caso-corto',
    title: 'Suficiencia del arnés en un caso',
    subtitle: 'Caso del silo',
    keyPointIndex: 0,
    caso: {
      id: 'caso-silo',
      title: 'Caso: el techo del silo',
      referencia: 'el caso del silo',
      name: 'Molinos del Callao, silo 3',
      source: 'Caso corto construido para Sophia sobre la G.050 (20.1) y la OSHA 1926.502 · pendiente de aprobación del instructor',
      facts: [
        'Planta de harina (industria general) en el Callao; hay que limpiar el techo de un silo a 9 m, que no tiene baranda en el borde',
        'El supervisor entrega arnés con línea de 1,8 m con amortiguador',
        'Manda engancharse a la escalera marinera del silo, a la altura de la cintura',
        'Bajo el borde hay 9 m libres; el trabajo se hace en pareja',
        'La planta tiene una canastilla de rescate, pero nadie sabe quién la opera',
      ],
      question: '¿Alcanza con el arnés tal como lo entregaron, y por qué?',
    },
    pistas: 'Si dice que alcanza, pregúntale qué control va antes del arnés en el borde y qué resiste la escalera marinera. Si dice que no sin razón, pídele qué del sistema no cumple.',
    criterios: [
      'Decide que no alcanza',
      'Da la razón: antes del arnés va proteger el borde (baranda o línea de vida certificada), porque el arnés es EPP y va al final de la jerarquía',
      'Señala que el anclaje no cumple: la escalera marinera no es un anclaje certificado y queda a la cintura, no sobre la cabeza; y el rescate no está planeado',
    ],
    critical: [1],
    commonMistakes: ['Da el arnés por suficiente', 'Acepta cualquier punto firme como anclaje', 'No pregunta quién rescata'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'Ley 29783 (art. 21) · Norma G.050 (caps. 14 y 20) · D.S. 024-2016-EM (art. 372) · OSHA 1926.502-503, 1910.29 y 1910.140',
    referencias: [
      'Sesión 2 de 12 del curso Trabajos de alto riesgo (48 h). Indicador IND-SI-ALTORIESGO-1: explica los riesgos laborales identificados, las medidas de control y los procedimientos de seguridad de los trabajos en altura, con escaleras y andamios, y en espacios confinados, conforme a las normas nacionales e internacionales. La sesión 1 dejó cuándo una tarea es trabajo en altura, sus peligros de caída y lo que cae; hoy, con qué se controla cada uno y en qué orden.',
      'Antes de esta sesión el estudiante trabajó los capítulos 3, 4 y 5 del cuadernillo CV1 («El orden de los controles», «El sistema de detención de caídas», «Después de la caída: el rescate»). Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Orden de los controles (punto clave 1): Ley 29783, art. 21: eliminar, aislar, trabajo seguro, sustituir y al final el EPP. En altura: evitar subir, proteger el borde, organizar (señalizar, acordonar debajo, capacitar) y al final el arnés, que protege solo a quien está bien enganchado. G.050, cap. 14: señalización, redes, barandas perimetrales, tapas y líneas de vida, con memoria de cálculo refrendada por ingeniero colegiado, instaladas por personal competente y verificadas. Baranda en obra: 42" ± 3 (1,1 m) y 200 lb sin fallar [OSHA 1926.502(b)]; en industria, 1,07 m y la misma carga [1910.29(b)]; en minería, al menos 1,20 m con pasamanos (D.S. 024, art. 372 h). La cinta de peligro señaliza, no es baranda.',
      'Sistema de detención (puntos clave 2 y 3): arnés de cuerpo entero y línea con amortiguador y dos mosquetones, al anillo dorsal (G.050, 20.1; OSHA 1910.140). Anclaje de 2 265 kg-f como mínimo sobre la cabeza (G.050); OSHA: 5 000 lb por trabajador o factor de seguridad dos [1926.502(d)(15)]. Línea de vida horizontal: cable de ½" o soga de 5/8", sin nudos ni empates. Caída libre máxima 1,80 m contando elongación y obstáculos (G.050); OSHA: 6 pies sin tocar el nivel inferior; fuerza de detención 1 800 lb y desaceleración 3,5 pies (1,07 m) [(d)(16)]. Distancia libre bajo los pies: 1,8 + 1,2 + 1,8 + 0,5 = 5,3 m; si no existe, retráctil. Factor de caída: anclaje sobre la cabeza 0; a la altura del anillo dorsal 1; a los pies o más abajo 2, prohibido. Efecto péndulo: trabajar alineado al anclaje.',
      'Inspección, retiro y rescate (punto clave 4): G.050, inspección periódica por persona competente con registro; OSHA, antes de cada uso [(d)(21)]; corte, abrasión o quemadura: fuera de servicio de inmediato; el arnés y la línea que soportaron una caída se descartan (G.050) o no vuelven sin aprobación de persona competente [(d)(19)]; frenos y retráctiles los revisa el distribuidor. Rescate inmediato dispuesto por el empleador [(d)(20)], planeado antes de subir: síndrome del arnés (trauma por suspensión). Capacitación en los peligros de caída [1926.503(a)(1)].',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala los dos casos de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del silo, y los ejemplos que Sophia resuelve son propios (las luminarias con pértiga, el anclaje certificado, el techo a 8 m, el arnés quemado).',
    ],
  },
}
