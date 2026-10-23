/**
 * EOM-SOST · S1 · Sostenimiento activo: pernos y cable bolting.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (caps. 1 y 2). Las láminas se miraron una por una antes
 * de describirlas (DISENO-DE-CLASE.md §3).
 * El caso de la sesión («El vale de las tres labores», veta Rosario) NO entra:
 * es el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const ESQ = '04_Recursos-graficos/EOM/esquemas/sost/s1'
const PLANOS = '04_Recursos-graficos/EOM/planos'
const QUISPE =
  'Quispe Basurco, A. y Portal Calderón, M. (2021). Estudio del sostenimiento activo y pasivo en labores de avance temporales y permanentes en una mina de oro subterránea en La Libertad. UPN, Cajamarca'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-EOM-SOST-S1-RADIAL', archivo: `${PLANOS}/portilla2025_fig15_sostenimiento-radial.png`, kind: 'diagram', license: TESIS,
    source: 'Portilla León, K. (2025). Análisis de sostenimiento en labores temporales… Sierra Antapite. UNSAAC, figura 15, p. 56',
    description: 'Sección de una labor rotulada «Excavación», con los pernos en abanico alrededor del techo y los hastiales (rótulo «Pernos»). Por encima de los pernos, punteada, la «Zona aflojada»; entre perno y perno, círculos rojos de trazos con el rótulo «Zona de roca reforzada o zona de compresión». La roca se dibuja como una trama cruzada.',
  },
  {
    id: 'IMG-EOM-SOST-S1-DOS-COLUMNAS', archivo: `${ESQ}/sost-s1_dos-columnas.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s1.py',
    description: 'Dos columnas. REFUERZO: perno split set, perno helicoidal, hydrabolt, cable bolting. SOPORTE: malla electrosoldada, shotcrete, cuadro de madera, cimbra metálica. Al pie: «Entra al taladro → refuerzo. Queda por fuera → soporte».',
  },
  {
    id: 'IMG-EOM-SOST-S1-HELICOIDAL', archivo: `${PLANOS}/sost_perno-helicoidal_detalle.png`, kind: 'diagram', license: TESIS,
    source: QUISPE,
    description: 'Plano «Detalle de perno helicoidal», escala 1:10: la barra helicoidal de Ø 19 mm dentro del taladro, con su tramo de cemento y, al fondo, su tramo de resina; en la boca, la placa de sujeción de 20 × 20 cm y la tuerca. Debajo, detalle 1:5 con la tuerca de sujeción y los 5 cm de barra que sobresalen de la pared rocosa.',
  },
  {
    id: 'IMG-EOM-SOST-S1-SPLIT-SET', archivo: `${PLANOS}/sost_split-set_detalle.png`, kind: 'diagram', license: TESIS,
    source: QUISPE,
    description: 'Plano «Detalle de split set», escala 1:10: un split set de 7 pies y uno de 5 pies dentro del taladro; en la boca, la malla electrosoldada, el anillo de sujeción y la placa de sujeción de 15 × 15 cm. Abajo, «Detalle de split set y mini split set» (el mini split set del traslape) y dos vistas 3D, isométrica y frontal, del tubo ranurado.',
  },
  {
    id: 'IMG-EOM-SOST-S1-CABLE', archivo: `${ESQ}/sost-s1_cable-instalacion.png`, kind: 'diagram', license: TESIS,
    source: 'Conde Castelo, Y. (2019). Análisis del macizo rocoso y su aplicación de cables bolting… mina San Rafael. UNSAAC (rótulos traducidos al castellano)',
    description: 'Esquema de un taladro visto de «Fondo del taladro» a «Boca del taladro», en tres pasos numerados 1 → 2 → 3, con los rótulos «Cabezal», «Tubo de lechada», «Cable de acero trenzado» y «Cuña de la boca». Al pie: 1 Entra el cable con su tubo hasta el fondo. 2 Se inyecta la lechada, que retorna por el barreno. 3 El taladro queda lleno y el cable anclado.',
  },
  {
    id: 'IMG-EOM-SOST-S1-LARGO-POR-SECCION', archivo: `${ESQ}/sost-s1_largo-por-seccion.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s1.py',
    description: 'Tabla «Sección de la labor / Perno / Largo»: 2,50 × 2,50 a 2,70 × 2,70 → 6 pies, 1,83 m; 3,00 × 3,00 hasta 4,50 → 7 pies, 2,13 m; mayores de 5,00 × 5,00 → 8 pies, 2,44 m. Al pie: «Lo fija el estándar de la unidad, no la labor».',
  },
  {
    id: 'IMG-EOM-SOST-S1-CUNA', archivo: `${ESQ}/sost-s1_cuna.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s1.py',
    description: 'Tres labores de ancho creciente, «labor angosta», «labor media» y «labor ancha», cada una con su «cuña suelta» dibujada encima, más alta cuanto más ancha la labor. Arriba: «A más ancho de labor, más profunda la roca que se suelta». Abajo: «Por eso el estándar da más largo de perno a más sección». Sin cifras a propósito.',
  },
]

export const S1: SesionSpec = {
  slug: 'eom-sost-s1-sostenimiento-activo-pernos-y-cable-bolting',
  order: 1,
  etiqueta: 'S1',
  idPrefijo: 'sost-s1',
  title: 'Sostenimiento activo: pernos y cable bolting',
  // Aprendizaje esperado, literal de sesiones.csv
  objective:
    'Distingue el refuerzo del soporte, describe los tipos de perno —helicoidal, split set e hydrabolt— y el cable bolting con su especificación técnica y su estándar de instalación, y dice qué problema resuelve el cable que el perno no alcanza a resolver, según el procedimiento operativo.',
  keyPoints: ['Refuerzo y soporte', 'Tipos de perno según su anclaje', 'El cable bolting y su instalación', 'Largo de perno según la sección'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Rosario', 'vale de las tres labores'],

  rutina: {
    imagenId: 'IMG-EOM-SOST-S1-RADIAL',
    tituloImagen: 'Pernos en abanico',
    tipoImagen: 'figura',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // Las de la lámina 8: «¿Qué le hacen los pernos a la roca que los rodea? Que VES. Que PIENSAS. Que te PREGUNTAS.»
    preguntas: {
      veo: '¿Qué ves en la figura?',
      pienso: '¿Qué le hacen los pernos a la roca que los rodea?',
      mePregunto: '¿Qué te falta saber de esos pernos?',
    },
    titulos: {
      veo: 'Observación de una labor con pernos en abanico',
      pienso: 'Efecto de los pernos en la roca',
      mePregunto: 'Lo que falta saber de esos pernos',
    },
    pistaVeo: 'qué hay alrededor del hueco de la excavación',
    criterios: {
      pienso: ['Dice qué le hacen los pernos a la roca que los rodea', 'Dice qué de la figura le hace pensarlo'],
      mePregunto: ['Dice qué le falta saber de los pernos, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'refuerzo-soporte',
      title: 'Refuerzo y soporte',
      subtitle: 'Lo que entra al taladro y lo que queda por fuera',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-EOM-SOST-S1-DOS-COLUMNAS', title: 'Refuerzo y soporte' },
      norma: {
        id: 'norma-refuerzo-soporte',
        title: 'Dos maneras de sostener',
        source: 'CV1, cap. 1 · estándar de sostenimiento de la unidad',
        body: [
          '- **Refuerzo:** trabaja dentro del taladro y cose la roca; evita que el bloque se suelte (perno, hydrabolt, cable).',
          '- **Soporte:** trabaja por fuera y recibe la carga que ya se soltó (malla, shotcrete, cuadro, cimbra).',
          '- Casi toda labor lleva los dos, y en ese orden: **primero se refuerza, después se retiene**.',
          '- Pedir soporte sin refuerzo es **tapar la roca sin sujetarla**.',
        ].join('\n'),
      },
      regla: 'lo que entra al taladro y cose la roca es refuerzo; lo que queda por fuera y recibe la carga suelta es soporte. Primero se refuerza, después se retiene.',
      ejemplo: 'una galería con split set y malla: el split set entra al taladro y cose la roca, refuerzo; la malla queda afuera y retiene lo suelto entre pernos, soporte.',
      ejemploClave: 'malla',
      subrayar: { respalda: ['Soporte:', 'Pedir soporte sin refuerzo'] },
      pregunta: 'Un capataz manda lanzar shotcrete sobre una caja que todavía no tiene pernos, para «asegurarla rápido». Con eso, ¿la roca queda reforzada o solo soportada, y por qué?',
      criterios: [
        'Decide que solo queda soportada: el shotcrete trabaja por fuera y recibe lo que ya se soltó',
        'Da la razón: sin perno nadie cose la roca por dentro; pedir soporte sin refuerzo es tapar la roca sin sujetarla',
      ],
      critical: [2],
      commonMistakes: ['Cree que el shotcrete refuerza porque se pega a la roca', 'Cree que basta con tapar la roca para que no caiga'],
    },
    {
      id: 'pernos',
      title: 'Tipos de perno según su anclaje',
      subtitle: 'Split set, helicoidal e hydrabolt',
      keyPointIndex: 1,
      // La lámina es la del ejemplo (helicoidal); la del split set aparece cuando Sophia la cita en la pregunta.
      lamina: { imagenId: 'IMG-EOM-SOST-S1-HELICOIDAL', title: 'Detalle del perno helicoidal' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S1-SPLIT-SET', title: 'Detalle del split set' }],
      norma: {
        id: 'norma-pernos',
        title: 'Tres formas de anclar',
        source: 'CV1, cap. 2 · fichas técnicas del estándar de la unidad',
        body: [
          '- **Split set:** tubo ranurado que ancla **por fricción**; se golpea dentro del taladro y, como es más ancho que la broca, aprieta contra la roca. Viene de 5 y de 7 pies.',
          '- **Perno helicoidal:** barra de 19 mm que ancla **con resina o cemento** dentro del taladro. Va de 4 a 8 pies.',
          '- **Hydrabolt:** ancla **por expansión**, inflado con agua a presión contra las paredes del taladro.',
          '- La **platina y la tuerca** cierran todo perno contra la roca: sin ellas, el perno ancla pero no sujeta.',
        ].join('\n'),
      },
      regla: 'un perno se reconoce por cómo ancla: el split set por fricción, tubo ranurado golpeado dentro del taladro; el helicoidal con resina o cemento; el hydrabolt por expansión, con agua a presión.',
      // 22 oct 2026: el ejemplo era «barra con resina → helicoidal» y la pregunta «tubo sin resina»:
      // la misma tarea con datos opuestos. Sophia corregía la respuesta correcta contra el ejemplo
      // (3 de 4 veces en la prueba por API). El ejemplo ahora es otro perno y otra situación.
      ejemplo: 'en la rampa 2 el perforista llena un tubo cerrado con agua a presión y se hincha contra el taladro: es hydrabolt, ancla por expansión.',
      ejemploClave: 'perforista',
      subrayar: { respalda: 'Split set' },
      pregunta: 'En la labor encuentras un tubo ranurado que el ayudante mete a golpes dentro del taladro, sin resina ni agua. ¿Qué perno es, y por qué?',
      criterios: [
        'Decide que es un split set',
        'Da la razón: ancla por fricción, el tubo es más ancho que la broca y aprieta contra la roca al golpearlo; no usa resina, cemento ni agua',
      ],
      critical: [2],
      commonMistakes: ['Confunde el split set con el hydrabolt porque los dos son tubos'],
    },
    {
      id: 'cable',
      title: 'El cable bolting y su instalación',
      subtitle: 'Lechada desde el fondo',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-EOM-SOST-S1-CABLE', title: 'Instalación del cable' },
      norma: {
        id: 'norma-cable',
        title: 'El cable bolting',
        source: 'CV1, cap. 2.3 · procedimiento de instalación de la unidad',
        body: [
          '- El cable es **acero trenzado**, no barra: entra al taladro enrollado y llega más lejos que una barra rígida.',
          '- Se ancla con **lechada de cemento en todo el taladro**, inyectada desde el fondo para no dejar vacíos.',
          '- **Trabaja recién cuando la lechada ha fraguado**; su placa y su cuña reemplazan a la platina del perno.',
          '- Su ventaja no es aguantar más: es **llegar más lejos**.',
        ].join('\n'),
      },
      regla: 'el cable es acero trenzado: entra enrollado y llega más lejos que una barra. Se ancla con lechada desde el fondo y trabaja recién cuando la lechada fraguó.',
      ejemplo: 'un tajeo de 7 m donde ningún perno pasa la cuña: entra el cable enrollado, se llena el taladro con lechada desde el fondo y recién al fraguar sostiene.',
      ejemploClave: 'enrollado',
      subrayar: { respalda: ['Trabaja recién cuando la lechada ha fraguado', 'Se ancla con'] },
      pregunta: 'En un tajeo ancho instalan los cables a las siete de la mañana y a las ocho el supervisor quiere que el equipo entre a trabajar debajo, «porque ya están puestos». ¿Esos cables ya están sosteniendo, y por qué?',
      criterios: [
        'Decide que todavía no sostienen',
        'Da la razón: el cable trabaja recién cuando la lechada de cemento ha fraguado; lo ancla la lechada, no la platina',
      ],
      critical: [2],
      commonMistakes: ['Cree que el cable trabaja apenas se instala, como el split set', 'Cree que la cuña de la boca es lo que ancla el cable'],
    },
    {
      id: 'largo',
      title: 'Largo de perno según la sección',
      subtitle: 'Lo que manda el estándar',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-EOM-SOST-S1-LARGO-POR-SECCION', title: 'Largo de perno por sección' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S1-CUNA', title: 'La cuña que hay que pasar' }],
      norma: {
        id: 'norma-largo',
        title: 'Lo que manda el estándar',
        source: 'Estándar de sostenimiento de la unidad · D.S. 024-2016-EM, art. 214 g)',
        body: [
          '- La **cuña de roca** que se suelta crece con el ancho de la labor; el perno tiene que anclar **más allá de esa cuña**.',
          '- Sección de **2,50 × 2,50 a 2,70 × 2,70:** perno de **6 pies** (1,83 m).',
          '- De **3,00 × 3,00 hasta 4,50:** perno de **7 pies** (2,13 m).',
          '- **Mayores de 5,00 × 5,00:** perno de **8 pies** (2,44 m).',
          '- El estándar lo escribe y firma Geomecánica; el técnico lo ejecuta y calcula solo si su sección no figura (art. 214 g).',
        ].join('\n'),
      },
      regla: 'la cuña que se suelta crece con el ancho de la labor y el perno debe anclar más allá; por eso el estándar da más largo a más sección: 6, 7 u 8 pies.',
      ejemplo: 'una galería de 3,50 × 3,50 cae en la fila «3,00 × 3,00 hasta 4,50»: el estándar manda perno de 7 pies, 2,13 m.',
      ejemploClave: '3,50 × 3,50',
      subrayar: { respalda: ['Mayores de 5,00', 'cuña de roca'] },
      pregunta: 'Un by-pass se ensancha a 5,50 × 5,50 m para que crucen dos equipos, y el vale pide perno de 7 pies «porque es lo que siempre se usa». ¿Qué largo manda el estándar, y por qué?',
      criterios: [
        'Decide que manda perno de 8 pies: la sección es mayor de 5,00 × 5,00',
        'Da la razón: a más ancho, más grande la cuña que se suelta, y el perno tiene que anclar más allá de ella',
      ],
      critical: [1],
      commonMistakes: ['Cree que un solo largo de perno sirve para toda labor', 'Elige el largo por costumbre y no por la fila del estándar'],
    },
  ],

  // Gemelo del caso del vale: alguien pide cable donde el estándar manda perno.
  casoCorto: {
    id: 'caso-corto',
    title: 'Elección entre perno y cable en un caso',
    subtitle: 'Caso de la rampa',
    keyPointIndex: 3,
    caso: {
      id: 'caso-rampa',
      title: 'Caso: el vale de la rampa',
      referencia: 'el caso de la rampa',
      name: 'Unidad minera Santa Rosa, nivel 2340',
      source: 'Caso corto construido para Sophia sobre el estándar de sostenimiento y el CV1 · pendiente de aprobación del instructor',
      facts: [
        'Rampa de acceso de 4,00 × 4,00 m, en una roca que la cartilla ya tiene resuelta con perno y malla',
        'El supervisor de turno pide al almacén carretes de cable y lechada «porque el cable aguanta más que el perno»',
        'En almacén hay perno helicoidal de 7 pies con platina y tuerca, y malla electrosoldada',
        'El equipo de instalación de cable, con su bomba de lechada, recién se desocupa pasado mañana',
        'El vale sale a las cuatro con la firma del almacenero',
      ],
      question: '¿Qué se despacha para la rampa, cable o perno de 7 pies, y por qué?',
    },
    pistas: 'Si elige cable porque «aguanta más», pregúntale qué dice la tabla del estándar para 4,00 × 4,00 y para qué se reserva el cable. Si elige perno sin razón, pregúntale por qué el cable no hace falta ahí.',
    criterios: [
      'Decide perno helicoidal de 7 pies: la sección 4,00 × 4,00 está en la fila «3,00 × 3,00 hasta 4,50» del estándar',
      'Da la razón: el cable se reserva para luces que ningún perno alcanza; su ventaja es llegar más lejos, no aguantar más',
      'Señala que pedir cable donde el estándar manda perno retrasa la labor (lechada, fraguado, equipo)',
    ],
    critical: [1],
    commonMistakes: ['Cree que el cable es «más seguro» porque es más largo', 'Decide por lo que dice el supervisor y no por la fila del estándar', 'No mira la sección de la labor'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 213 y 214) · Estándar de sostenimiento de la unidad · Cartilla geomecánica GSI',
    referencias: [
      'Sesión 1 de 12 del curso Sostenimiento de labores mineras (48 h, ciclo II). Indicador IND-EOM-SOST-1: describe los tipos de sostenimiento de las labores mineras de acuerdo con sus características y especificaciones técnicas.',
      'Antes de esta sesión el estudiante trabajó el recurso autónomo CV1 (60 min de lectura y 30 de video): capítulo 1 «Sostener: reforzar y soportar» y capítulo 2 «Los pernos y el cable». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Refuerzo y soporte (punto clave 1): el refuerzo trabaja dentro del taladro y cose la roca (perno, hydrabolt, cable); el soporte trabaja por fuera y retiene el bloque que igual se soltó (malla, shotcrete, cuadro, cimbra). Casi toda labor lleva los dos y en ese orden: primero se refuerza, después se retiene. Pedir soporte sin refuerzo es tapar la roca sin sujetarla.',
      'Pernos (punto clave 2): el split set ancla por fricción (tubo ranurado, más ancho que la broca, se golpea dentro del taladro; 5 y 7 pies); el helicoidal con resina o cemento (barra de 19 mm con extremo biselado; 4 a 8 pies); el hydrabolt por expansión con agua a presión. La platina y la tuerca cierran el perno contra la roca. Detalle del CV1: el taladro del split set se perfora 100 mm más largo que el perno; el del helicoidal, 10 cm más corto que la barra.',
      'Cable bolting (punto clave 3): acero trenzado, entra enrollado y alcanza longitudes que una barra no puede meter; se ancla con lechada de cemento en todo el taladro, inyectada desde el fondo; trabaja cuando la lechada fraguó; su placa y su cuña reemplazan a la platina; se instala en malla sistemática según el estándar. Su ventaja no es aguantar más, es llegar más lejos.',
      'Largo por sección (punto clave 4): la cuña de roca que se suelta crece con el ancho de la labor y el perno debe anclar más allá de ella. Estándar de la unidad: 2,50 × 2,50 a 2,70 × 2,70 → 6 pies (1,83 m); 3,00 × 3,00 hasta 4,50 → 7 pies (2,13 m); mayores de 5,00 × 5,00 → 8 pies (2,44 m); el cable se reserva para luces que ningún perno alcanza. Calcular la cuña es de Geomecánica: escribe y firma el estándar y aprueba lo que se sale de él; el técnico lo ejecuta, calcula y somete si su sección no figura, y nunca lo cambia solo (D.S. 024, art. 214 g: ancho y altura de los tajeos dentro de los parámetros calculados). Pedir cable donde el estándar manda perno retrasa la labor.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del vale de la rampa, y los ejemplos que Sophia resuelve son propios (la galería con split set y malla, el vale con barra de 19 mm, el tajeo de 7 m con cable, la galería de 3,50 × 3,50).',
    ],
  },
}
