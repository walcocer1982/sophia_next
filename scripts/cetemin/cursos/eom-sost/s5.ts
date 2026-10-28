/**
 * EOM-SOST · S5 · Selección del sostenimiento: la roca y la labor deciden juntas.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (cap. 6, con las dos tablas de la cartilla de 6.4). Las
 * láminas se miraron una por una.
 * El caso de la sesión («La misma roca, cuatro labores», nivel 12) NO entra.
 * El título se acorta a 8 palabras (regla de nombres); el tema literal va en el slug.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const ESQ = '04_Recursos-graficos/EOM/esquemas/sost/s5'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s5.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-EOM-SOST-S5-FIG-CARTILLA-ANTAPITE', archivo: '04_Recursos-graficos/EOM/planos/portilla2025_fig28_cartilla-antapite.png', kind: 'diagram', license: TESIS,
    source: 'Portilla León, K. (2025). Análisis de sostenimiento en labores temporales… unidad minera Sierra Antapite, Huancavelica. UNSAAC, figura 28, p. 96',
    description: 'Cartilla geomecánica de la unidad Sierra Antapite (logo «Sierra Sun Group»): «Clasificación GSI/RMR · Sostenimiento inmediato · Metro avanzado, metro sostenido». A la izquierda, una matriz de colores: filas de estructura LF levemente fracturada (2 a 6 fracturas por metro), F moderadamente (7 a 12), MF muy fracturada (13 a 20), IF intensamente (más de 20) y T triturada o relleno; columnas de condición superficial B buena, R regular, P pobre y MP muy pobre; y un cuadro «Tipo roca / RMR»: I más de 81, II 61–80, III-A 51–60, III-B 41–50, IV-A 31–40, IV-B 21–30, V 0–20. A la derecha, DOS tablas de sostenimiento: «Labor permanente, más de 1 año, excavaciones hasta 6,0 m», con los códigos P1 a P6 y «NO EXCAVAR» para la roca V; y «Labor temporal, hasta 1 año, excavaciones hasta 9,0 m», con los códigos T1 a T6. Debajo, «Tipo de sostenimiento»: P1 y T1, perno de anclaje ocasional; P2 y T2, perno sistemático a 1,50 × 1,50 m más malla electrosoldada; P3, a 1,20 × 1,20 m más malla; T3, a 1,30 × 1,30 m más malla; T4, a 1,10 × 1,10 m más malla; P4, shotcrete de 2" más perno a 1,50 × 1,50 m; T5, shotcrete de 2" más perno a 1,20 × 1,20 m; P5 y T6, shotcrete de 2" más P3 o T3 más shotcrete de 1" cubriendo la malla; P6, shotcrete de 2" más cimbra metálica espaciada a 1,20 m. Al pie: «La longitud de los pernos está en función a la recomendación geomecánica de acuerdo a la sección de cada labor» y «el sostenimiento de intersecciones es de acuerdo al estándar».',
  },
  {
    id: 'IMG-EOM-SOST-S5-TEMPORAL-VS-PERMANENTE', archivo: `${ESQ}/sost-s5_temporal-vs-permanente.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos recuadros: «TEMPORAL: se cierra antes del año · un crucero que muere con su bloque» y «PERMANENTE: se queda mientras la mina opere · la galería principal, la cámara de bombeo». Recuadro al pie: «La misma roca pide más sostenimiento si la labor se queda».',
  },
  {
    id: 'IMG-EOM-SOST-S5-AVANCE-VS-EXPLOTACION', archivo: `${ESQ}/sost-s5_avance-vs-explotacion.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos recuadros: «LABORES DE AVANCE: abren camino · crucero · galería · rampa · subnivel» y «LABORES DE EXPLOTACIÓN: sacan mineral · el tajeo». Recuadro al pie: «Cada familia lee su propia tabla en la cartilla».',
  },
  {
    id: 'IMG-EOM-SOST-S5-CUATRO-LLAVES', archivo: `${ESQ}/sost-s5_cuatro-llaves.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Cuatro llaves numeradas: 1 «CALIDAD DEL MACIZO: la letra que trae la casilla»; 2 «TIPO DE LABOR: avance o explotación»; 3 «ANCHO DE MINADO: por encima o por debajo de 2,40 m»; 4 «TEMPORALIDAD: temporal o permanente». Recuadro al pie: «Las cuatro se anotan antes de buscar el sostenimiento».',
  },
  {
    id: 'IMG-EOM-SOST-S5-DONDE-ENTRA-CADA-LLAVE', archivo: `${ESQ}/sost-s5_donde-entra-cada-llave.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «LA LLAVE / QUÉ DECIDE EN LA CARTILLA / SI FALTA»: tipo de labor, cuál de las tablas se usa, se lee la tabla de otra familia; ancho de minado, qué columna dentro de esa tabla, se lee la columna vecina; temporalidad, separa las de avance en dos grupos, se pide de menos en la permanente; buzamiento, solo cuando la labor es un tajeo, no aplica en avance. Recuadro al pie: «Faltando una llave, la fila que se lee es otra».',
  },
  {
    id: 'IMG-EOM-SOST-S5-FILA-DEVUELVE', archivo: `${ESQ}/sost-s5_fila-devuelve.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Encabezado «LO QUE SE COPIA DE LA FILA» y tres recuadros: «ELEMENTO: cuadro de madera», «ESPACIAMIENTO: cada 1,50 m» y «REFUERZO: con guardacabeza». Debajo: «El espaciamiento de puntales y cuadros se mide a luz interna; el del perno lo fija el estándar de la unidad». Recuadro al pie: «Un sostenimiento sin espaciamiento no se pide ni se instala».',
  },
  {
    id: 'IMG-EOM-SOST-S5-ESPACIAMIENTO-SE-COPIA', archivo: `${ESQ}/sost-s5_espaciamiento-se-copia.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tres pasos numerados: 1 «La fila da el espaciamiento: y ese número no es del que instala»; 2 «Se copia tal como está: sin redondear y sin ajustar en la labor»; 3 «De ahí salen las cantidades: es lo que convierte metros en pernos». Recuadro al pie: «Ese número es el que después convierte metros en cantidades».',
  },
  {
    id: 'IMG-EOM-SOST-S5-FUERA-DE-LA-TABLA', archivo: `${ESQ}/sost-s5_fuera-de-la-tabla.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Cuatro pasos numerados: 1 «La cartilla no cubre todas las labores: cubre avance y explotación»; 2 «En una intersección remite a otro estándar: ahí se cruzan dos secciones y la luz crece»; 3 «Reconocerlo es parte del trabajo: no es un fallo de la tabla»; 4 «Lo que no resuelve se consulta: no se inventa una fila parecida». Recuadro al pie: «La cartilla dice cuándo no alcanza: eso también es leerla».',
  },
  {
    id: 'IMG-EOM-SOST-S5-INFRAESTRUCTURA', archivo: `${ESQ}/sost-s5_infraestructura.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Encabezado «LLEVAN ESTÁNDAR PROPIO, NO FILA DE LA CARTILLA» y seis recuadros: polvorines, refugios mineros, comedores, cámara de bombeo, subestaciones y cámaras de izaje. Debajo: «No son de avance ni de explotación: son infraestructura». Recuadro al pie: «Notas 6 y 7 de la cartilla: se sostienen según estudio geomecánico».',
  },
]

export const S5: SesionSpec = {
  slug: 'eom-sost-s5-seleccion-del-sostenimiento-la-roca-y-la-labor-deciden-juntas',
  order: 5,
  etiqueta: 'S5',
  idPrefijo: 'sost-s5',
  title: 'Selección del sostenimiento: roca y labor deciden juntas',
  objective:
    'Selecciona en la cartilla el sostenimiento que corresponde a una labor cruzando la calidad del macizo con el tipo de labor, el ancho de minado y su temporalidad, registra el espaciamiento que la cartilla le fija, y señala la labor cuya condición la cartilla no resuelve sola, según la casuística planteada.',
  keyPoints: ['Tipo de labor y temporalidad', 'Las cuatro llaves de la cartilla', 'La fila y su espaciamiento', 'Lo que la cartilla no cubre'],
  imagenes: IMAGENES,
  casosDelEquipo: ['nivel 12', 'cuatro labores'],

  rutina: {
    imagenId: 'IMG-EOM-SOST-S5-FIG-CARTILLA-ANTAPITE',
    tituloImagen: 'Cartilla geomecánica de otra mina',
    tipoImagen: 'figura',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // La de la lámina 8: «¿Por qué trae dos tablas de sostenimiento, y no una sola?»
    preguntas: {
      veo: '¿Qué ves en la figura?',
      pienso: '¿Por qué trae dos tablas de sostenimiento, y no una sola?',
      mePregunto: '¿Qué te falta saber de una labor para leer esa cartilla?',
    },
    titulos: {
      veo: 'Observación de la cartilla de otra mina',
      pienso: 'Las dos tablas de sostenimiento',
      mePregunto: 'Lo que falta saber de una labor',
    },
    pistaVeo: 'qué títulos tienen las dos tablas de la derecha y qué hay en el cuadro de colores de la izquierda',
    criterios: {
      pienso: ['Da una razón de por qué la cartilla trae dos tablas', 'Dice qué de la figura le hace pensarlo'],
      mePregunto: ['Dice qué le falta saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'temporalidad',
      title: 'Tipo de labor y temporalidad',
      subtitle: 'La que se queda y la que se cierra',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-EOM-SOST-S5-TEMPORAL-VS-PERMANENTE', title: 'Temporal y permanente' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S5-AVANCE-VS-EXPLOTACION', title: 'Avance y explotación' }],
      norma: {
        id: 'norma-temporalidad',
        title: 'Las familias de labores',
        source: 'CV1, cap. 6.1',
        body: [
          '- Las labores de **avance** abren camino: el crucero, la galería, la rampa, el subnivel. Las de **explotación** sacan mineral: el tajeo.',
          '- **Temporal** es la labor que **se cierra antes del año**.',
          '- **Permanente** es la que **se queda mientras la mina opere**, como la galería principal.',
          '- Lo decide **el tiempo que se queda**, no el tamaño ni el tránsito.',
          '- **La misma roca pide más sostenimiento si la labor se queda.**',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES.md §4): la respuesta va contra la apariencia (ancha y
      // con volquetes, pero temporal); el ejemplo muestra que lo decide el tiempo.
      regla: 'temporal es la labor que se cierra antes del año; permanente, la que se queda mientras la mina opere. Lo decide el tiempo, no el tamaño.',
      ejemplo: 'la galería de drenaje es angosta, pero servirá mientras la mina opere: el jefe de mina la anota permanente.',
      ejemploClave: 'galería de drenaje',
      subrayar: { respalda: ['se cierra antes del año', 'no el tamaño'] },
      pregunta: 'Un by pass ancho, por donde pasan volquetes, se abre para servir un bloque que se agota en diez meses; después se tapa. ¿Es una labor temporal o permanente, y por qué?',
      criterios: [
        'Decide que es temporal',
        'Da la razón: el by pass se cierra antes del año',
      ],
      critical: [2],
      commonMistakes: ['Cree que una labor ancha o con mucho tránsito es permanente', 'Decide la temporalidad por el tamaño y no por cuánto tiempo se queda'],
    },
    {
      id: 'llaves',
      title: 'Las cuatro llaves de la cartilla',
      subtitle: 'Antes de buscar la fila',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-EOM-SOST-S5-CUATRO-LLAVES', title: 'Las cuatro llaves' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S5-DONDE-ENTRA-CADA-LLAVE', title: 'Qué decide cada llave' }],
      norma: {
        id: 'norma-llaves',
        title: 'Las cuatro llaves',
        source: 'CV1, cap. 6.2 · cartilla geomecánica GSI de la unidad',
        body: [
          '- Para entrar a la tabla hacen falta **cuatro llaves**, y se anotan **antes** de buscar.',
          '- **La calidad** de la roca, con su letra, y **el tipo de labor**, que decide cuál de las tablas se usa.',
          '- **El ancho de minado** separa las columnas: el corte de la cartilla es **2,40 m**.',
          '- **La temporalidad** separa las labores de avance en dos grupos.',
          '- El buzamiento entra solo cuando la labor es un tajeo. **Faltando una llave, la fila que se lee es otra.**',
        ].join('\n'),
      },
      // 27 oct 2026: el ejemplo tenía las cuatro llaves y la pregunta es la que falta
      // una; ahora el ejemplo muestra una llave que falta (otra: el ancho), sin cifras.
      regla: 'antes de buscar la fila se anotan cuatro llaves: calidad, tipo de labor, ancho de minado y temporalidad. Faltando una, la fila que se lee es otra.',
      ejemplo: 'en el crucero 8 el asistente tiene la roca D, el tipo y la temporalidad, pero no el ancho: lo mide antes de buscar la fila.',
      ejemploClave: 'crucero 8',
      subrayar: { respalda: ['separa las labores de avance en dos grupos', 'Faltando una llave'] },
      pregunta: 'El asistente sabe que una rampa es de calidad C y mide 3,5 m de ancho, pero nadie le dijo cuánto tiempo se va a quedar. ¿Puede ya leer la fila de la cartilla, y por qué?',
      criterios: [
        'Decide que todavía no puede leer la fila',
        'Da la razón: le falta la temporalidad, una de las cuatro llaves',
      ],
      critical: [2],
      commonMistakes: [
        'Cree que con la calidad y el ancho basta para leer el sostenimiento',
        'Supone la temporalidad en vez de averiguarla',
      ],
    },
    {
      id: 'fila',
      title: 'La fila y su espaciamiento',
      subtitle: 'Se copia, no se supone',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-EOM-SOST-S5-FILA-DEVUELVE', title: 'Lo que se copia de la fila' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S5-ESPACIAMIENTO-SE-COPIA', title: 'El espaciamiento se copia' }],
      norma: {
        id: 'norma-fila',
        title: 'Lo que devuelve la fila',
        source: 'CV1, cap. 6.3 · cartilla geomecánica GSI, nota 3',
        body: [
          '- Cada fila devuelve **el elemento y su espaciamiento juntos**; el refuerzo, si lo hay, va en la misma línea.',
          '- El espaciamiento de **puntales y cuadros** se mide a **luz interna**.',
          '- **El del perno lo fija el estándar de la unidad**: la fila dice «según estándar».',
          '- Se **copia tal como está**, sin ajustarlo en la labor: de ese número salen las cantidades.',
        ].join('\n'),
      },
      // 27 oct 2026: el ejemplo copiaba un cuadro «a 1,5 m» de la fila y la pregunta
      // trae un perno «a 1,5 m» mal anotado: la misma cifra con la respuesta opuesta.
      // Ahora el ejemplo es la excepción (fila «según estándar»), con otro elemento.
      regla: 'la fila da el elemento y su espaciamiento, y se copia tal cual; si dice «según estándar», el espaciamiento se lee en el estándar de la unidad.',
      ejemplo: 'en un subnivel en roca B la fila dice «split set sistemático, según estándar»: el asistente copia el espaciamiento del estándar.',
      ejemploClave: 'roca B',
      subrayar: { respalda: 'El del perno lo fija el estándar' },
      pregunta: 'La fila de una galería dice «perno helicoidal sistemático, según estándar». El asistente anota 1,5 m de espaciamiento «porque es lo de siempre». ¿Está bien registrado, y por qué?',
      criterios: [
        'Decide que no está bien registrado',
        'Da la razón: el espaciamiento del perno lo fija el estándar de la unidad',
      ],
      critical: [2],
      commonMistakes: ['Pone el espaciamiento de costumbre en vez de leerlo en el estándar', 'Cree que la cartilla trae el espaciamiento del perno'],
    },
    {
      id: 'fuera',
      title: 'Lo que la cartilla no cubre',
      subtitle: 'Intersecciones e infraestructura',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-EOM-SOST-S5-FUERA-DE-LA-TABLA', title: 'Cuando la tabla no alcanza' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S5-INFRAESTRUCTURA', title: 'Las labores de infraestructura' }],
      norma: {
        id: 'norma-fuera',
        title: 'Lo que la cartilla no cubre',
        source: 'CV1, cap. 6.5 · notas de la cartilla geomecánica GSI',
        body: [
          '- La cartilla **no cubre todas las labores** de una mina, y reconocerlo es parte del trabajo.',
          '- En una **intersección** remite al estándar de intersecciones: ahí se cruzan dos secciones y la luz crece.',
          '- Los **polvorines, refugios y comedores**, la cámara de bombeo, las subestaciones y las cámaras de izaje son **infraestructura** y llevan **estándar propio**.',
          '- Lo que la tabla no resuelve **se consulta, no se inventa**.',
        ].join('\n'),
      },
      regla: 'la cartilla no cubre todas las labores: la intersección va por su propio estándar y la infraestructura, como un polvorín o un comedor, lleva estándar propio.',
      ejemplo: 'donde la rampa 2 cruza una galería, la luz crece: el asistente aplica el estándar de intersecciones, no la fila de la rampa.',
      ejemploClave: 'rampa 2',
      subrayar: { respalda: ['refugios', 'se consulta, no se inventa'] },
      pregunta: 'Se va a abrir un refugio minero fijo al costado de una galería en roca C. El asistente quiere ponerle lo que dice la fila C de la galería. ¿Es correcto, y por qué?',
      criterios: [
        'Decide que no es correcto',
        'Da la razón: el refugio es infraestructura y lleva estándar propio',
      ],
      critical: [2],
      commonMistakes: ['Usa la fila de la labor vecina para una labor de infraestructura', 'Cree que la cartilla tiene fila para toda labor'],
    },
  ],

  // Gemelo del caso de las cuatro labores: una sola labor y una sola decisión.
  // La trampa va al revés: una labor PERMANENTE a la que quieren copiarle lo de
  // una temporal que «aguantó bien». La fila C sale de las tablas de la cartilla (CV1, 6.4).
  casoCorto: {
    id: 'caso-corto',
    title: 'Selección del sostenimiento en un caso',
    subtitle: 'Caso de la rampa 5',
    keyPointIndex: 0,
    caso: {
      id: 'caso-rampa-5',
      title: 'Caso: la rampa 5',
      referencia: 'el caso de la rampa 5',
      name: 'Unidad minera Chuspi, rampa 5',
      source: 'Caso corto construido para Sophia sobre el CV1 y la cartilla GSI · pendiente de aprobación del instructor',
      facts: [
        'La rampa 5 une dos niveles, va a quedarse mientras la mina opere y el mapeo dio calidad C',
        'Fila C de la cartilla: avance permanente, perno helicoidal sistemático; avance temporal, split set más malla electrosoldada',
        'En un subnivel vecino, temporal y en la misma roca C, se puso split set con malla y aguantó bien ocho meses',
        'El capataz quiere poner en la rampa lo mismo que en el subnivel',
      ],
      question: '¿A la rampa 5 le corresponde perno helicoidal sistemático o split set con malla, y por qué?',
    },
    pistas: 'Si elige split set con malla porque en el subnivel aguantó, señálale que mire cuánto tiempo se queda cada labor. Si elige bien sin razón, dile que falta el porqué.',
    usa: ['norma-temporalidad', 'norma-llaves'],
    criterios: [
      'Decide que le corresponde perno helicoidal sistemático, no split set con malla',
      'Da la razón: la rampa es avance permanente y el subnivel era temporal',
    ],
    critical: [1],
    commonMistakes: ['Copia el sostenimiento de la labor vecina porque la roca es la misma', 'Toma «aguantó bien» como criterio para una labor que se queda'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 213 y 214) · Cartilla geomecánica GSI de la unidad · Estándar de sostenimiento de la unidad',
    referencias: [
      'Sesión 5 de 12 del curso Sostenimiento de labores mineras (48 h, ciclo II). Indicador IND-EOM-SOST-2: explica el tipo de sostenimiento seleccionado de acuerdo a la calidad del macizo rocoso y tipo de labor minera, utilizando la metodología del GSI. Las sesiones 1 a 4 dieron los elementos, la casilla y la calidad; hoy entra lo que falta: la labor también vota. Cierra el bloque 1; la sesión 6 es la sustentación del trabajo colaborativo.',
      'Antes de esta sesión el estudiante trabajó el capítulo 6 del recurso autónomo CV1, «Elegir el sostenimiento». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Familias de labores (punto clave 1): avance abre camino (crucero, galería, rampa, subnivel); explotación saca mineral (el tajeo). Temporal: se cierra antes del año (un crucero que muere con su bloque). Permanente: se queda mientras la mina opere (la galería principal, la cámara de bombeo). La misma roca pide más sostenimiento si la labor se queda.',
      'Las cuatro llaves (punto clave 2): calidad (la letra), tipo de labor (decide la tabla), ancho de minado (separa las columnas; corte de la cartilla, 2,40 m) y temporalidad (separa las labores de avance en dos grupos). El buzamiento entra solo en un tajeo. Faltando una llave, la fila que se lee es otra. Se anotan antes de buscar.',
      'Las dos tablas de avance de la cartilla (CV1, 6.4). Avance permanente (más de un año; cruceros, by pass, rampas y galerías de 2,5 × 2,7 m a 4,5 × 4,5 m): A y B, perno helicoidal ocasional; C, perno helicoidal sistemático según estándar; D, perno helicoidal sistemático más malla electrosoldada; E, shotcrete de 2" a 4" con fibra más perno y malla, o cimbras a 1,5 m; F, cimbras de 0,8 a 1,0 m con guardacabeza. Avance temporal (menos de un año; subniveles, by pass, rampas y chimeneas de 1,2 × 1,8 m a 3,0 × 3,0 m): A, split set ocasional; B, split set sistemático según estándar; C, split set más malla electrosoldada según estándar; D, perno helicoidal sistemático más malla electrosoldada; E, cuadro de madera a 1,5 m con guardacabeza; F, cuadro de madera a 1,0 m con guardacabeza. El split set se emplea en sostenimientos provisionales y el perno cementado en excavaciones permanentes (guía de Osinergmin, citada en el CV1).',
      'La fila (punto clave 3): devuelve el elemento y su espaciamiento juntos, con el refuerzo en la misma línea; un elemento sin espaciamiento no se puede pedir ni instalar. El espaciamiento de puntales y cuadros se mide a luz interna (nota 3 de la cartilla); el del perno lo fija el estándar de la unidad («según estándar por sección de labor»). Se copia tal como está, sin ajustarlo en la labor: ese número es el que después convierte metros en cantidades.',
      'Lo que la cartilla no cubre (punto clave 4): intersecciones, según el estándar de sostenimiento en intersecciones (se cruzan dos secciones y la luz crece); polvorines, refugios fijos y comedores, shotcrete más pernos sistemáticos o según estudio geomecánico; cámara de bombeo, subestaciones y cámaras de izaje, pernos sistemáticos más malla electrosoldada; chimeneas RC y RB, según estudio geomecánico; zonas con eventos de relajamiento, perno más malla hasta el tope. Lo que la tabla no resuelve se consulta, no se inventa.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la rampa 5, y los ejemplos que Sophia resuelve son propios (la galería de drenaje angosta y permanente, el crucero 8 al que le falta el ancho, el subnivel en roca B con su fila «según estándar», el cruce de la rampa 2).',
    ],
  },
}
