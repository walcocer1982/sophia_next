/**
 * SI-ALTORIESGO · S1 · Riesgos en trabajos en altura.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, actividades, imagenes.csv).
 * Los casos A y B de la sesión (Cayma y Chimbote) NO entran: son el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/SI/esquemas'
const FOTO = '04_Recursos-graficos/SI/fotos'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-SI-ALTORIESGO-S1-MURAL', archivo: `${ESQ}/altoriesgo_s1_mural-entrada.png`, kind: 'scene', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910 · fotografías de Wikimedia Commons',
    description: 'Losa de un edificio en obra, vista desde arriba: la parrilla de fierro de la losa con varillas de arranque hacia arriba, encofrados y tablas apiladas, seis trabajadores con chaleco y casco parados sobre el fierro y cerca de los bordes, cerco de malla al perímetro; afuera, una furgoneta y casas vecinas. Debajo de la foto, las tres preguntas de la rutina: VEO ¿Qué está pasando en esta obra? · PIENSO ¿Desde dónde se podría caer alguien, o algo? · ME PREGUNTO ¿Qué hay abajo de cada uno?',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-DEFINICION', archivo: `${ESQ}/altoriesgo_s1_definicion.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050, la OSHA, la Ley 29783, el D.S. 005 y la ISO 45001',
    description: 'Esquema en tres filas. LA ALTURA: desde 1,80 m sobre el nivel del piso (G.050 · D.S. 024, art. 134). EL RIESGO: caída a distinto nivel, o rodadura lateral. SIEMPRE: sobre punzocortantes, líquidos o electricidad (G.050, 20.1). Cierre: «Ninguna norma lo define: las que lo tratan, lo delimitan». Pie: G.050, permiso de trabajos en altura (Anexo J) y cap. 20 · D.S. 024, art. 134.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-COMPARATIVA', archivo: `${ESQ}/altoriesgo_s1_comparativa.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050, la OSHA, la Ley 29783, el D.S. 005 y la ISO 45001',
    description: 'Tabla: la norma, ¿define?, lo que dice. D.S. 024 (minería): no en su glosario; lo delimita el art. 134 desde 1,80 m. G.050 (obra): no, lo delimita; desde 1,80 m con riesgo de caída a distinto nivel (permiso, Anexo J). OSHA: no como término; fija umbrales de 6 pies en obra y 4 en industria. Ley 29783 y D.S. 005: no; la palabra «altura» no aparece. ISO 45001: no; lo alcanza el control operacional (8.1). Cierre: «Se delimita por la altura y por lo que hay abajo».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-FOTO-ALTURA', archivo: `${FOTO}/altura-trabajo-en-altura.jpg`, kind: 'scene', license: 'Dominio público',
    source: 'Fotografía: NIOSH · Wikimedia Commons, «Residential construction fall arrest (9253628909).jpg»',
    description: 'Trabajador de pie sobre el muro de una vivienda en obra, recibiendo una tijera de techo con la grúa, con línea de vida y arnés.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-G050', archivo: `${ESQ}/altoriesgo_s1_g050.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910 · fotografías de Wikimedia Commons',
    description: 'Cuatro fotos numeradas, cada una con el rótulo «a cualquier altura»: 1 sobre elementos punzocortantes (columnas con varillas de arranque), 2 sobre contenedores de líquidos (pozas de agua), 3 sobre instalaciones eléctricas activadas (subestación), 4 en tejados y taludes (dos techadores con arnés sobre tejas). Cierre: «Arnés desde 1,80 m y, en estos cuatro, a cualquier altura». Pie: Norma G.050, capítulo 20, rige en las actividades de construcción.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-RUBRO', archivo: `${ESQ}/altoriesgo_s1_rubro.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910',
    description: 'Tabla: el rubro, la norma, desde. Minería: D.S. 024, art. 134: 1,80 m. Construcción: G.050, cap. 20: 1,80 m. Construcción (EE. UU.): OSHA 1926.501: 1,8 m (6 pies). Industria (EE. UU.): OSHA 1910.28: 1,2 m (4 pies). Cierre: «El umbral depende del rubro y de lo que hay abajo». Nota: sobre equipo peligroso, la OSHA 1910 protege a menor altura.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-FOTO-BORDE', archivo: `${FOTO}/altura-borde-losa.jpg`, kind: 'scene', license: 'CC BY-SA 4.0',
    source: 'Fotografía: Patrick Oberdörfer · Wikimedia Commons, «PSA-Fallschutz SAP-Garden.jpg»',
    description: 'Trabajador en el borde de un encofrado de losa, sin baranda, enganchado a un anclaje portátil.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-ABERTURAS', archivo: `${ESQ}/altoriesgo_s1_aberturas.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910 · fotografías de Wikimedia Commons',
    description: 'Dos fotos: 1, una losa en obra con el hueco de la escalera abierto entre el fierro, con el rótulo «En el piso: todo hueco de 5 cm o más»; 2, una claraboya sobre un techo, con el rótulo «La claraboya también es abertura». Abajo: EN LA PARED, desde 76 cm de alto por 48 cm de ancho. Pie: OSHA 1926.500 · 1926.501(b)(4) · 1910.21 · 1910.28(b)(3).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-TEJADOS', archivo: `${ESQ}/altoriesgo_s1_tejados.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910',
    description: 'Esquema en tres filas. TEJADOS Y TALUDES: posición precaria a cualquier altura (Norma G.050, cap. 20). ABERTURA DEL PISO: en obra, protección desde 6 pies (OSHA 1926.501(b)(4)(i)). CUALQUIER ABERTURA: tapa contra el tropiezo o la pisada (OSHA 1926.501(b)(4)(ii)). Cierre: «Una abertura baja no es inofensiva: también se tapa».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-PELIGRO-RIESGO', archivo: `${ESQ}/altoriesgo_s1_peligro-riesgo.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910 · fotografías de Wikimedia Commons',
    description: 'Tres columnas con flechas. EL PELIGRO: foto de un borde de losa sin protección; «la condición capaz de dañar: el borde sin protección». EL RIESGO: «que caiga la persona, o un objeto»; la probabilidad de que se materialice. LA CONSECUENCIA: «concreto, fierro, líquido o electricidad»; el daño, que depende de lo que hay abajo. Cierre: «Un peligro de caída, dos riesgos: la persona o el objeto». Pie: glosario del D.S. 005-2012-TR y del D.S. 024-2016-EM.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-ABAJO', archivo: `${ESQ}/altoriesgo_s1_abajo.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre el D.S. 024, la G.050 y la OSHA 1926/1910',
    description: 'Tabla: a 1,20 m, sobre piso plano o sobre varillas. ¿La G.050 pide arnés? Piso plano: no, no pasa de 1,80 m. Varillas: sí, a cualquier altura. La severidad: menor sobre piso plano, mayor sobre varillas. Cierre: «La altura no es la única medida: cuenta lo que hay abajo». Pie: Norma G.050, cap. 20 · ISO 45001: riesgo es probabilidad y severidad (3.21).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S1-FOTO-OBJETOS', archivo: `${FOTO}/altura-malla-fachada.jpg`, kind: 'scene', license: 'CC0',
    source: 'Fotografía: El Surquillano · Wikimedia Commons, «Construcción Edificio Element Surquillo.jpg»',
    description: 'Edificio en obra en Surquillo, Lima, con la fachada cubierta de malla contra la caída de objetos.',
  },
]

export const S1: SesionSpec = {
  slug: 'si-altoriesgo-s1-riesgos-en-trabajos-en-altura',
  order: 1,
  etiqueta: 'S1',
  idPrefijo: 'altoriesgo-s1',
  title: 'Riesgos en trabajos en altura',
  // Aprendizaje esperado, literal de sesiones.csv
  objective:
    'Explica cuándo una tarea es trabajo en altura según la norma, qué peligros de caída presenta y cómo cada uno se convierte en la caída de una persona o de un objeto, con su consecuencia.',
  keyPoints: ['Cuándo una tarea es trabajo en altura', 'Peligros de caída: bordes, aberturas y techos', 'Caída de personas y caída de objetos'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Cayma', 'Chimbote', 'Sillar', 'Bahía Norte', 'Paredes', 'Ñique'],

  rutina: {
    imagenId: 'IMG-SI-ALTORIESGO-S1-MURAL',
    tituloImagen: 'Obra en losa',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del guion de la sesión',
    // Tal como están escritas en la imagen (no son las del guion)
    preguntas: {
      veo: '¿Qué está pasando en esta obra?',
      pienso: '¿Desde dónde se podría caer alguien, o algo?',
      mePregunto: '¿Qué hay abajo de cada uno?',
    },
    titulos: {
      veo: 'Observación de una obra en losa',
      pienso: 'Puntos de caída en la obra observada',
      mePregunto: 'Lo que hay abajo de cada punto',
    },
    pistaVeo: 'dónde está parada la gente de la foto',
  },

  puntosClave: [
    {
      id: 'definicion',
      title: 'Trabajo en altura según la norma',
      subtitle: 'La G.050 y el D.S. 024',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S1-DEFINICION', title: 'Qué es un trabajo en altura' },
      norma: {
        id: 'norma-umbral',
        title: 'Cuándo una tarea es trabajo en altura',
        source: 'D.S. 024-2016-EM, art. 134 · Norma G.050',
        body: [
          '- El **D.S. 024** pone el trabajo en altura entre los de alto riesgo «como mínimo».',
          '- En minería, protección contra caídas desde **1,80 m** (D.S. 024, art. 134).',
          '- Y para subir, **certificado de suficiencia médica anual** (art. 134).',
          '- En construcción, la **G.050**: arnés si la caída libre supera 1,80 m.',
          '- O a menos de 1,80 m del borde de techos, losas o aberturas sin baranda.',
          '- **A cualquier altura** sobre punzocortantes, líquidos o electricidad activa, y en tejados y taludes (G.050, 20.1).',
        ].join('\n'),
      },
      apoyo: [
        { imagenId: 'IMG-SI-ALTORIESGO-S1-G050', title: 'Los cuatro casos de la G.050' },
        { imagenId: 'IMG-SI-ALTORIESGO-S1-FOTO-ALTURA', title: 'Trabajo en altura con arnés' },
      ],
      regla: 'la G.050 cuenta como altura desde 1,80 m, o con riesgo de caída a distinto nivel, y a cualquier altura sobre punzocortantes, líquidos, electricidad activa, tejados y taludes.',
      ejemplo: 'un albañil tarrajea a 1,30 m sobre un banco junto a una cisterna destapada: no llega a 1,80 m, pero sobre líquido la G.050 exige protección.',
      ejemploClave: 'cisterna',
      // Prueba del subrayado (20 oct 2026): el alumno toca en la norma la línea que
      // respalda su respuesta. (El bloque «clasificar» se probó aquí y se retiró:
      // a todo el ancho desplazaba el resto de la pizarra.)
      subrayar: { respalda: 'A cualquier altura sobre punzocortantes' },
      pregunta: 'Un electricista instala luminarias parado en una plataforma de 1,50 m, en una obra, con el tablero energizado justo debajo: ¿es trabajo en altura según la G.050, y por qué?',
      criterios: [
        'Decide que sí es trabajo en altura',
        'Da la razón: la G.050 exige protección a cualquier altura sobre electricidad activa (como sobre punzocortantes o líquidos), aunque no llegue a 1,80 m',
      ],
      critical: [2],
      commonMistakes: ['Cree que por debajo de 1,80 m nunca es trabajo en altura', 'Confunde el EPP (casco, botas) con la protección contra caídas'],
    },
    {
      id: 'rubro',
      title: 'Umbral de altura según el rubro',
      subtitle: 'Mina, obra e industria',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S1-RUBRO', title: 'El umbral según el rubro' },
      norma: {
        id: 'norma-rubro',
        title: 'El umbral según el rubro',
        source: 'D.S. 024 · G.050 · OSHA 1926.501(b)(1) · OSHA 1910.28(b)(1)',
        body: [
          '- Ninguna norma lo define con todas sus letras: la G.050 y el D.S. 024 lo **delimitan desde 1,80 m**; la Ley 29783, el D.S. 005 y la ISO 45001 no lo nombran.',
          '- **OSHA en construcción:** desde 6 pies, 1,8 m [1926.501(b)(1)].',
          '- **OSHA en industria general:** desde 4 pies, 1,2 m [1910.28(b)(1)].',
          '- El umbral depende **del rubro y de lo que hay abajo**, no solo de la altura.',
        ].join('\n'),
      },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S1-COMPARATIVA', title: 'Qué dice cada norma' }],
      regla: 'el umbral cambia con el rubro: minería 1,80 m (D.S. 024), construcción 1,80 m (G.050 y OSHA 1926), industria general 1,20 m (OSHA 1910).',
      ejemplo: 'una tarea a 1,50 m sobre piso plano no obliga en una obra y sí en una fábrica, porque la industria general la pide desde 1,20 m.',
      ejemploClave: 'fábrica',
      // Dos mitades de la respuesta: la embotelladora sí (1,2 m) y la concentradora no (1,80 m).
      subrayar: { respalda: ['OSHA en industria general', 'delimitan desde 1,80 m'] },
      pregunta: 'La misma plataforma de 1,60 m en dos lugares: una concentradora de minerales y una planta embotelladora. ¿En cuál le exige la norma protección contra caídas, y por qué?',
      criterios: [
        'Decide: en la embotelladora sí (OSHA 1910, industria general, desde 1,20 m) y en la mina no por umbral (D.S. 024, desde 1,80 m)',
        'Concluye que el umbral depende del rubro, no solo de la altura',
      ],
      critical: [1],
      commonMistakes: ['Cree que 1,80 m es un umbral universal', 'Confunde OSHA construcción (1,8 m) con OSHA industria general (1,2 m)'],
    },
    {
      id: 'peligros',
      title: 'Bordes, aberturas y techos',
      subtitle: 'Dónde empieza el peligro de caída',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S1-FOTO-BORDE', title: 'Borde de losa sin baranda' },
      norma: {
        id: 'norma-peligros',
        title: 'Bordes, aberturas y techos',
        source: 'OSHA 1926.500-501 · OSHA 1910.28 · Norma G.050',
        body: [
          '- **Borde sin protección:** el que no tiene muro ni baranda de al menos 1,0 m (OSHA 1926.500, para pisos, techos, rampas y pasarelas). La G.050 ya cuenta como altura trabajar a menos de 1,80 m de ese borde.',
          '- **Abertura en el piso:** todo hueco de **5 cm o más** en su menor dimensión. Las claraboyas cuentan como abertura [1926.501(b)(4) · 1910.28(b)(3)].',
          '- **Abertura en pared:** desde 76 cm de alto por 48 cm de ancho [1926.500].',
          '- **Tejados inclinados y taludes:** posición precaria a cualquier altura (G.050).',
          '- En obra, protección desde 6 pies ante las aberturas del piso, y ante cualquier abertura, **tapas contra el tropiezo o la pisada** [1926.501(b)(4)].',
        ].join('\n'),
      },
      apoyo: [
        { imagenId: 'IMG-SI-ALTORIESGO-S1-ABERTURAS', title: 'Aberturas en piso y pared' },
        { imagenId: 'IMG-SI-ALTORIESGO-S1-TEJADOS', title: 'Tejados, taludes y tapas' },
      ],
      regla: 'borde sin protección: sin muro ni baranda de 1,0 m; abertura en el piso: todo hueco desde 5 cm, con tapa que resista la pisada; tejados y taludes: posición precaria a cualquier altura.',
      ejemplo: 'una canaleta de 20 cm sin tapa en una losa es abertura aunque nadie quepa: se pisa, y la norma pide tapa.',
      ejemploClave: 'canaleta',
      subrayar: { respalda: 'Borde sin protección' },
      pregunta: 'Un pintor avanza por una pasarela a 3 m del piso que tiene una baranda de 60 cm de alto: ¿es un borde sin protección, y por qué?',
      criterios: [
        'Decide que sí es un borde sin protección',
        'Da la razón: la baranda debe tener al menos 1,0 m de alto; con 60 cm no protege contra la caída',
      ],
      critical: [2],
      commonMistakes: ['Cree que cualquier baranda protege, sin importar su altura', 'Cree que una abertura solo cuenta si cabe una persona'],
    },
    {
      id: 'caidas',
      title: 'Caída de personas y de objetos',
      subtitle: 'Lo que hay abajo decide la consecuencia',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S1-PELIGRO-RIESGO', title: 'Peligro, riesgo y consecuencia' },
      norma: {
        id: 'norma-caidas',
        title: 'Caída de personas y caída de objetos',
        source: 'D.S. 005 y D.S. 024 (glosario) · G.050, cap. 20 · ISO 45001 (3.21) · OSHA 1926.501(c)',
        body: [
          '- **Peligro:** situación o característica capaz de ocasionar daño. **Riesgo:** probabilidad de que ese peligro se materialice (D.S. 005 y D.S. 024).',
          '- Cada peligro de caída tiene **dos riesgos**: cae la persona o cae un objeto.',
          '- La consecuencia depende de la altura **y de lo que hay abajo** (G.050, cap. 20): por eso la G.050 pide arnés sobre fierro o líquido aunque no haya 1,80 m.',
          '- La ISO 45001 define el riesgo como probabilidad y severidad (3.21).',
          '- La caída de objetos alcanza a quien **no** está trabajando en altura. G.050: nadie debajo del área, herramienta amarrada y mallas entre niveles. OSHA: casco y además rodapié, malla, baranda o cubierta [1926.501(c)].',
        ].join('\n'),
      },
      apoyo: [
        { imagenId: 'IMG-SI-ALTORIESGO-S1-ABAJO', title: 'Lo que hay abajo decide' },
        { imagenId: 'IMG-SI-ALTORIESGO-S1-FOTO-OBJETOS', title: 'Malla contra caída de objetos' },
      ],
      regla: 'peligro es lo que puede causar daño y riesgo, la probabilidad de que ocurra; cada peligro de caída tiene dos riesgos, la persona o el objeto, y la consecuencia la decide lo que hay abajo.',
      ejemplo: 'un soldador a 3 m con carretilleros debajo: si cae él, golpe sobre concreto; si cae la amoladora, le llega al carretillero.',
      ejemploClave: 'soldador',
      subrayar: { respalda: 'La caída de objetos alcanza a quien no está' },
      pregunta: 'Un albañil levanta un muro desde un andamio de 4 m, junto a la puerta por donde entran los camiones, con baldes de mezcla sobre la plataforma: si cae un balde, ¿quién está en riesgo, y por qué?',
      criterios: [
        'Identifica a quien pasa por la puerta (choferes, ayudantes) como quien recibe el objeto, aunque no trabaje en altura',
        // 19 oct 2026: antes también exigía las medidas de la G.050 (nadie debajo,
        // herramienta amarrada, malla), que la pregunta no pide. Sophia gastó un
        // turno extra preguntándolas. Van en la norma de la pizarra y, cuando
        // exista, en la pregunta de extensión del punto.
        'Da la razón: el balde cae sobre quien está abajo, aunque no trabaje en altura',
      ],
      critical: [2],
      commonMistakes: ['Cree que el riesgo de caída solo existe para quien está arriba', 'Cree que el casco basta contra la caída de objetos'],
    },
  ],

  // Gemelo del caso B (industria): alguien convencido de que «no pasa de la altura», y algo abajo.
  casoCorto: {
    id: 'caso-corto',
    title: 'Identificación de riesgos de caída en un caso',
    subtitle: 'Caso del entrepiso',
    keyPointIndex: 0,
    caso: {
      id: 'caso-lurin',
      title: 'Caso: el entrepiso de Lurín',
      referencia: 'el caso del entrepiso',
      name: 'Embotelladora Valle Sur S.A.C., Lurín',
      source: 'Caso corto construido para Sophia sobre la OSHA 1910.28 y la G.050 · pendiente de aprobación del instructor líder',
      facts: [
        'Almacén de producto terminado de una embotelladora (industria general)',
        'El supervisor manda a un operario a cambiar un fluorescente desde el entrepiso de carga, a 1,50 m del piso',
        'El entrepiso no tiene baranda por el lado del pasillo; el operario trabaja de espaldas al borde',
        'Por ese pasillo, debajo, el montacargas entra y sale con pallets cada pocos minutos',
        'Sobre el borde del entrepiso deja el tubo nuevo y la caja de herramientas, sueltos',
        'El supervisor dice que no hace falta arnés «porque es menos de uno ochenta»',
      ],
      question: '¿Está el operario en trabajo en altura, y por qué?',
    },
    pistas: 'Si decide solo por la altura, pregúntale de qué rubro es la planta y qué hay abajo. Si acierta pero no sigue la caída, pregúntale qué cae y a quién le llega.',
    criterios: [
      'Decide que sí: en industria general la OSHA 1910 exige protección desde 1,20 m, y 1,50 m lo supera',
      'Nombra el peligro: el borde del entrepiso sin baranda',
      'Sigue la caída hasta lo que hay abajo: el operario o las herramientas caen al pasillo del montacargas',
    ],
    critical: [1],
    commonMistakes: ['Decide solo por la altura («1,50 m no es nada»)', 'Aplica el umbral de 1,80 m de mina y obra a una planta industrial', 'No mira qué hay abajo del entrepiso'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 129 y 134) · Norma G.050 (campo de aplicación, caps. 14 y 20) · OSHA 1926.500-501 y 1910.21-28 · Ley 29783 · D.S. 005 · ISO 45001',
    referencias: [
      'Sesión 1 de 12 del curso Trabajos de alto riesgo (48 h). Indicador IND-SI-ALTORIESGO-1: explica los riesgos laborales identificados, las medidas de control y los procedimientos de seguridad de los trabajos en altura, con escaleras y andamios, y en espacios confinados, conforme a las normas nacionales e internacionales.',
      'Antes de esta sesión el estudiante trabajó el recurso autónomo CV1 (video de 19 min y cuadernillo); su capítulo 1 es «Cuándo una tarea es trabajo en altura». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Umbral (punto clave 1): el D.S. 024 pone el trabajo en altura entre los de alto riesgo «como mínimo»; en minería, protección contra caídas desde 1,80 m y certificado de suficiencia médica anual para subir (art. 134). La G.050: desde 1,80 m o con riesgo de caída a distinto nivel, y a cualquier altura sobre punzocortantes, líquidos o electricidad activa y en tejados y taludes (cap. 20). OSHA: 1,8 m en construcción [1926.501(b)(1)] y 1,2 m en industria general [1910.28(b)(1)]; sobre equipo peligroso, la OSHA 1910 protege a menor altura. El umbral depende del rubro y de lo que hay abajo, no solo de la altura.',
      'Peligros de caída (punto clave 2): borde sin protección = sin muro ni baranda de al menos 1,0 m (OSHA 1926.500); la G.050 ya cuenta como altura trabajar a menos de 1,80 m de ese borde. Abertura en el piso: todo hueco de 5 cm o más en su menor dimensión; las claraboyas cuentan [1926.501(b)(4) · 1910.28(b)(3)]. Abertura en pared: desde 76 cm de alto por 48 cm de ancho [1926.500]. Tejados inclinados y taludes: posición precaria a cualquier altura (G.050). Tapas contra el tropiezo o la pisada ante cualquier abertura [1926.501(b)(4)].',
      'Caída de personas y de objetos (punto clave 3): peligro = situación capaz de ocasionar daño; riesgo = probabilidad de que se materialice (D.S. 005 y D.S. 024). Cada peligro de caída tiene dos riesgos: cae la persona o cae un objeto. La consecuencia depende de la altura y de lo que hay abajo (G.050, cap. 20). ISO 45001: riesgo = probabilidad y severidad (3.21). La caída de objetos alcanza a quien no trabaja en altura: G.050, nadie debajo del área, herramienta amarrada y mallas entre niveles; OSHA, casco y además rodapié, malla, baranda o cubierta [1926.501(c)].',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala los dos casos de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del entrepiso de Lurín, y los ejemplos que Sophia resuelve son propios (la cisterna, la tarea a 1,50 m, la canaleta, el soldador).',
    ],
  },
}
