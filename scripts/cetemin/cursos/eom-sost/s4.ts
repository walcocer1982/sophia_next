/**
 * EOM-SOST · S4 · De la casilla GSI a la calidad del macizo y su banda RMR.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv,
 * observaciones OBS-EOM-SOST-19) y el recurso autónomo CV1 (cap. 5). Las láminas
 * se miraron una por una.
 * El caso de la sesión («El informe está firmado», subnivel 720) NO entra.
 * El título de la lección se acorta a 8 palabras (regla de nombres); el tema
 * literal de sesiones.csv va en el slug.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const ESQ = '04_Recursos-graficos/EOM/esquemas/sost/s4'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s4.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-EOM-SOST-S4-FOTO-TESTIGOS', archivo: '04_Recursos-graficos/EOM/fotos/gomez2021_ilus36_caja-testigos.png', kind: 'scene', license: TESIS,
    source: 'Gómez Mendoza, S. A. (2021). Diseño y construcción de la rampa Yumpag… Buenaventura, Pasco. UNSAAC, ilustración 36, p. 80',
    description: 'Fotografía de una caja de testigos de perforación con el rótulo «SD YUM-21» arriba a la izquierda: cinco filas de testigos cilíndricos de roca. Las de arriba son claras, grises y verdosas, en tramos largos y casi enteros; la de abajo es oscura, casi negra, y está partida en trozos angulosos. Sobre los tramos hay líneas de color (rosada y verdes) y unos trazos rojos; no hay más texto.',
  },
  {
    id: 'IMG-EOM-SOST-S4-CARTILLA', archivo: '04_Recursos-graficos/EOM/planos/sost_cartilla-gsi_matriz.png', kind: 'diagram', license: 'Documento de la unidad, recurso oficial del curso; uso educativo con cita',
    source: 'CARTILLA-GEOMECANICA-GSI-REV-01, UEA Libertad – UEA La Poderosa de Trujillo (Poderosa)',
    description: 'Cartilla geomecánica GSI Rev. 01 de Poderosa, «Labores de explotación y avances». Columnas: condición superficial por golpes de picota, B buena (se rompe con 3 o más golpes), R regular (se rompe con 1 o 2), P pobre (se indenta superficialmente, menos de 5 mm), MP muy pobre (se indenta más de 5 mm). Filas: estructura por fracturas/m², LF 2 a 5, F 6 a 11, MF 12 a 20, IF más de 20. Casillas con su letra de calidad: LF/B = A, LF/R = B, F/B = B, F/R = B–C, F/P = C–D, MF/B = B–C, MF/R = C–D, MF/P = D–E, MF/MP = E–F, IF/R = D–E, IF/P = E–F, IF/MP = F. Las casillas partidas en diagonal llevan dos letras. LF/P y F/MP llevan un guion; en LF/MP hay el dibujo de una picota y en IF/B el de una wincha: esas casillas no existen.',
  },
  {
    id: 'IMG-EOM-SOST-S4-LETRAS-Y-BANDAS', archivo: `${ESQ}/sost-s4_letras-y-bandas.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «CALIDAD DEL MACIZO · BANDA DE RMR» con seis filas: A, RMR 81 a 100; B, RMR 61 a 80; C, RMR 51 a 60; D, RMR 41 a 50; E, RMR 21 a 40; F, RMR menos de 20. Al pie: «A es la mejor roca y F la peor: la letra es lo que se lleva a la tabla».',
  },
  {
    id: 'IMG-EOM-SOST-S4-CLASES-VS-LETRAS', archivo: `${ESQ}/sost-s4_clases-vs-letras.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos barras sobre la misma escala de RMR, de 0 a 100. Arriba, «CLASES DEL RMR»: V (0 a 20), IV (20 a 40), III (40 a 60), II (60 a 80) e I (80 a 100). Abajo, «LETRAS DE LA CARTILLA»: F, E, D, C, B y A; la Clase III queda encima de dos letras, D (40 a 50) y C (50 a 60), entre dos líneas punteadas en 40 y 60. Recuadro al pie: «La Clase III se parte en dos letras: C la mitad buena, D la mala».',
  },
  {
    id: 'IMG-EOM-SOST-S4-VIGENCIA', archivo: `${ESQ}/sost-s4_vigencia.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «QUÉ PASA / QUÉ LE HACE AL MAPEO / ¿SIGUE VALIENDO?»: la labor avanza, describe un tramo que quedó atrás, no para el frente nuevo; cruza una falla o un contacto, el macizo de hoy no es el de entonces, no; entra agua, cambia la condición sin cambiar la roca, no del todo; pasan meses sin avanzar, nada por sí solo, sí, mientras nada cambie. Recuadro al pie: «Un mapeo describe la labor el día en que se hizo».',
  },
  {
    id: 'IMG-EOM-SOST-S4-FIRMADO-NO-ES-VIGENTE', archivo: `${ESQ}/sost-s4_firmado-no-es-vigente.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos recuadros: «FIRMADO: dice quién responde por lo que ahí pone» y «VIGENTE: dice que todavía describe la labor». Recuadro al pie: «La fecha del mapeo pesa tanto como la firma».',
  },
  {
    id: 'IMG-EOM-SOST-S4-DOS-FUENTES', archivo: `${ESQ}/sost-s4_dos-fuentes.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Cuatro pasos numerados: 1 «Se elige, no se promedia: el promedio de dos calidades no es una calidad»; 2 «Gana la que describe la labor de hoy: no la que tiene mejor firma»; 3 «La elección se escribe y se sustenta: con una línea, en el mismo papel»; 4 «Lo descartado también se anota: con su motivo, para que quede el rastro». Recuadro al pie: «Quien firma el pedido responde por el dato que usó».',
  },
  {
    id: 'IMG-EOM-SOST-S4-MIENTRAS-TANTO', archivo: `${ESQ}/sost-s4_mientras-tanto.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos recuadros: «Se sostiene por lo más desfavorable de las dos» y «El reglamento manda sostener de inmediato, no esperar el papel». Al pie: «D.S. 024-2016-EM, art. 213».',
  },
]

export const S4: SesionSpec = {
  slug: 'eom-sost-s4-de-la-casilla-gsi-a-la-calidad-del-macizo-y-su-banda-rmr',
  order: 4,
  etiqueta: 'S4',
  idPrefijo: 'sost-s4',
  title: 'Casilla GSI, calidad del macizo y banda RMR',
  objective:
    'Obtiene de la casilla GSI la calidad A–F del macizo con su banda de RMR, y la contrasta con la que declara un informe de zonificación anterior, diciendo con cuál se queda y por qué, según la casuística planteada.',
  keyPoints: ['De la casilla a la letra y su banda', 'Las clases del RMR y las letras', 'La vigencia de un mapeo', 'Dos fuentes que no coinciden'],
  imagenes: IMAGENES,
  casosDelEquipo: ['subnivel 720', '715'],

  rutina: {
    imagenId: 'IMG-EOM-SOST-S4-FOTO-TESTIGOS',
    tituloImagen: 'Caja de testigos de un sondaje',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // La de la lámina 8: «Si tuvieran que decir de qué calidad es esa roca, ¿en qué se fijarían?»
    // (de «ustedes» a «tú» y con la pregunta al inicio, como en s1–s3).
    preguntas: {
      veo: '¿Qué ves en la fotografía?',
      pienso: '¿En qué te fijarías para decir de qué calidad es esa roca?',
      mePregunto: '¿Qué te falta saber para ponerle una calidad con la cartilla?',
    },
    titulos: {
      veo: 'Observación de una caja de testigos',
      pienso: 'Lo que dice la calidad de una roca',
      mePregunto: 'Lo que falta saber para calificar la roca',
    },
    pistaVeo: 'cómo se ve la roca de las filas de arriba y la de la fila de abajo',
    criterios: {
      pienso: ['Dice en qué se fijaría para decir la calidad de la roca', 'Dice qué de la fotografía le hace pensarlo'],
      mePregunto: ['Dice qué le falta saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'letra',
      title: 'La letra de calidad y su banda',
      subtitle: 'De la casilla al RMR',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-EOM-SOST-S4-CARTILLA', title: 'Cartilla geomecánica GSI' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S4-LETRAS-Y-BANDAS', title: 'Las seis letras y sus bandas' }],
      norma: {
        id: 'norma-letra',
        title: 'La letra y su banda de RMR',
        source: 'CV1, cap. 5.1 · cartilla geomecánica GSI de la unidad',
        body: [
          '- Cada casilla de la cartilla trae su **letra de calidad**, de la A (la mejor) a la F (la peor); no es la letra de la picota (B, R, P, MP).',
          '- **A: RMR 81 a 100 · B: 61 a 80 · C: 51 a 60**.',
          '- **D: 41 a 50 · E: 21 a 40 · F: menos de 20**.',
          // 27 oct 2026 (APRENDIZAJES.md §10): la letra de cada casilla solo estaba en la
          // imagen de la cartilla y el alumno no hallaba la celda. La fila IF va en texto.
          '- Fila IF (más de 20 fracturas): IF/R da D–E · IF/P da E–F · IF/MP da F.',
          '- Una casilla partida trae dos letras y su banda junta las dos: MF/R da C–D, RMR 41 a 60.',
          '- La letra es lo que se lleva a la tabla de sostenimiento.',
        ].join('\n'),
      },
      // 27 oct 2026: el ejemplo era F/B → B, y la B de la letra coincidía con la B
      // de la picota; en clase respondieron «muy pobre» (leyeron MP como la calidad).
      // LF/R → B muestra que la letra se lee en la cartilla, no en el código.
      regla: 'la casilla de la cartilla da la letra de calidad, de la A, la mejor, a la F, la peor; cada letra tiene su banda de RMR.',
      ejemplo: 'en el crucero 5 la celda dio LF/R: el capataz anota B, no R, porque eso dice la cartilla; B es RMR 61 a 80.',
      ejemploClave: 'crucero 5',
      subrayar: { respalda: ['IF/MP da F', 'F: menos de 20'] },
      pregunta: 'La celda de un tajeo dio IF/MP. ¿En qué banda de RMR cae esa roca, y por qué?',
      criterios: [
        'Decide que cae en la banda de RMR menos de 20',
        'Da la razón: en la cartilla, la casilla IF/MP es calidad F',
      ],
      critical: [2],
      commonMistakes: [
        'Responde «muy pobre»: toma la condición de la picota (MP) como si fuera la calidad',
        'Da la letra F pero no dice la banda de RMR',
        'Lee la banda de la E (21 a 40) en vez de la de la F',
      ],
    },
    {
      id: 'clases',
      title: 'Las clases del RMR y las letras',
      subtitle: 'La Clase III se parte en dos',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-EOM-SOST-S4-CLASES-VS-LETRAS', title: 'Clases del RMR y letras' },
      norma: {
        id: 'norma-clases',
        title: 'Clases y letras',
        source: 'CV1, cap. 5.2',
        body: [
          '- El RMR clásico agrupa la roca en **cinco clases romanas**, de la I (la mejor) a la V.',
          '- La **Clase III cubre RMR de 41 a 60**, y la cartilla **parte ese rango en dos letras**: C es su mitad buena y D su mitad mala.',
          '- Con C y con D la fila pide sostenimientos distintos.',
          '- Por eso un informe escrito en clases **no se lleva directo** a la fila: hay que saber en qué mitad cae la roca.',
        ].join('\n'),
      },
      // 27 oct 2026: la respuesta es la excepción (sin el número no se elige) y el
      // ejemplo ahora la dice. En clase, «C y D, no sé cómo elegirlo» era la razón.
      regla: 'la Clase III cubre RMR de 41 a 60 y la cartilla la parte en C, su mitad buena, y D, su mitad mala.',
      ejemplo: 'en la rampa 6 el informe dice Clase III con RMR 45: el asistente anota D; sin ese 45, no podría elegir entre C y D.',
      ejemploClave: 'rampa 6',
      subrayar: { respalda: ['parte ese rango en dos letras', 'no se lleva directo'] },
      pregunta: 'Un informe dice «Clase III» para una galería y no trae el número de RMR. El asistente anota calidad C para pedir el material. ¿Está bien, y por qué?',
      criterios: [
        'Decide que no está bien anotar C',
        'Da la razón: la Clase III abarca dos letras, C y D',
      ],
      critical: [2],
      commonMistakes: [
        'Cree que cada clase romana es una sola letra',
        'Elige la letra más favorable cuando no sabe en qué mitad cae',
        'Dice que no sabe si es C o D sin ver que esa es justamente la razón',
      ],
    },
    {
      id: 'vigencia',
      title: 'La vigencia de un mapeo',
      subtitle: 'Qué lo envejece y qué no',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-EOM-SOST-S4-VIGENCIA', title: '¿Sigue valiendo el mapeo?' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S4-FIRMADO-NO-ES-VIGENTE', title: 'Firmado no es vigente' }],
      norma: {
        id: 'norma-vigencia',
        title: 'Lo que envejece un mapeo',
        source: 'CV1, cap. 5.3',
        body: [
          '- Un mapeo describe la labor **el día en que se hizo**.',
          '- Si la labor **avanzó**, describe un tramo que quedó atrás: no vale para el frente nuevo.',
          '- Si cruzó **una falla o un contacto**, lo mapeado antes ya no vale: el macizo de hoy no es el de entonces.',
          '- Si **entra agua**, cambia la condición sin cambiar la roca.',
          '- **El tiempo solo no lo envejece**: si pasan meses sin avanzar, sin falla y sin agua, el mapeo sigue valiendo.',
          '- **Firmado** dice quién responde; **vigente** dice que todavía describe la labor.',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES.md §4): «sí sigue valiendo» es la excepción a lo que
      // el alumno cree, y el ejemplo mostraba lo contrario (una falla). Ahora muestra
      // la excepción con otros datos.
      regla: 'un mapeo describe la labor el día en que se hizo: lo envejecen el avance, una falla o un contacto y el agua; el tiempo solo, no.',
      ejemplo: 'la galería 4 lleva ocho meses parada, seca y sin avanzar: el capataz usa su mapeo de entonces, porque el tiempo solo no lo envejece.',
      ejemploClave: 'galería 4',
      subrayar: { respalda: 'El tiempo solo no lo envejece' },
      pregunta: 'Un subnivel quedó parado cinco meses por falta de equipo: no avanzó, no cruzó nada y sigue seco. Para reforzar el tramo ya abierto, ¿sigue valiendo su mapeo de hace cinco meses, y por qué?',
      criterios: [
        'Decide que sí sigue valiendo',
        'Da la razón: el tiempo solo no envejece un mapeo',
      ],
      critical: [2],
      commonMistakes: [
        'Cree que un mapeo vence solo por tener meses y responde que hay que volver a mapear',
        'Cree que un mapeo reciente vale aunque la labor haya cruzado una falla',
      ],
    },
    {
      id: 'dos-fuentes',
      title: 'Dos fuentes que no coinciden',
      subtitle: 'Se elige, no se promedia',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-EOM-SOST-S4-DOS-FUENTES', title: 'Cuando dos fuentes discrepan' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S4-MIENTRAS-TANTO', title: 'Mientras se regulariza la firma' }],
      norma: {
        id: 'norma-dos-fuentes',
        title: 'Cuando dos fuentes no coinciden',
        source: 'CV1, cap. 5.4 · D.S. 024-2016-EM, art. 213',
        body: [
          '- Dos fuentes que no coinciden obligan a **elegir, no a promediar**: el promedio de dos calidades no es una calidad.',
          '- **Gana la que describe la labor de hoy**, no la que tiene mejor firma.',
          '- La elección **se escribe y se sustenta**; lo descartado también se anota, con su motivo.',
          '- Mientras se regulariza la firma, se sostiene **por lo más desfavorable**: el art. 213 manda sostener de inmediato, no esperar el papel.',
        ].join('\n'),
      },
      regla: 'dos fuentes que no coinciden obligan a elegir, no a promediar: el promedio de dos calidades no es una calidad, y gana la de hoy.',
      ejemplo: 'en el crucero 12 el informe da B y el mapeo de esta semana, D: el capataz pide con D y anota por qué descartó B.',
      ejemploClave: 'crucero 12',
      subrayar: { respalda: ['elegir, no a promediar', 'Gana la que describe la labor de hoy'] },
      pregunta: 'En una rampa, el informe da calidad A y el mapeo de ayer da C. Para no discutir, el asistente pide con B, «que queda al medio». ¿Está bien, y por qué?',
      criterios: [
        'Decide que no está bien pedir con B',
        'Da la razón: cuando dos fuentes no coinciden se elige una, no se promedian',
      ],
      critical: [2],
      commonMistakes: ['Cree que promediar las dos calidades es una salida prudente', 'Elige la fuente por la firma y no por la fecha'],
    },
  ],

  // Gemelo del caso del informe firmado: aquí la causa es una falla (no el avance
  // ni un contacto), las dos fuentes ya vienen en letras (no hay clase que
  // convertir) y la presión es el material separado en almacén. Una sola decisión.
  casoCorto: {
    id: 'caso-corto',
    title: 'Elección de la fuente en un caso',
    subtitle: 'Caso del crucero 260',
    keyPointIndex: 3,
    caso: {
      id: 'caso-crucero-260',
      title: 'Caso: el crucero 260',
      referencia: 'el caso del crucero 260',
      name: 'Unidad minera Huaylla, crucero 260',
      source: 'Caso corto construido para Sophia sobre el CV1 y la cartilla GSI · pendiente de aprobación del instructor',
      facts: [
        'El informe de zonificación, firmado hace cuatro meses, da al crucero 260 calidad B',
        'El jueves el frente cruzó una falla de caja a caja',
        'El mapeo de ayer, pasada la falla, da calidad F',
        'El jefe de guardia quiere usar el material de calidad B que el almacén ya separó',
      ],
      question: '¿El sostenimiento del frente se pide con la B del informe o con la F del mapeo de ayer, y por qué?',
    },
    pistas: 'Si elige el informe porque está firmado o porque el material ya está separado, señálale que mire lo que pasó el jueves en el frente. Si elige el mapeo sin razón, dile que falta el porqué.',
    usa: ['norma-vigencia', 'norma-dos-fuentes'],
    criterios: [
      'Decide que se pide con la calidad F del mapeo de ayer',
      'Da la razón: el frente cruzó una falla, y eso deja sin vigencia el informe anterior',
    ],
    critical: [1],
    commonMistakes: [
      'Se queda con el informe porque está firmado, aunque ya no esté vigente',
      'Deja que el material ya separado decida la calidad',
      'Promedia las dos calidades',
    ],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 213 y 214) · Cartilla geomecánica GSI de la unidad',
    referencias: [
      'Sesión 4 de 12 del curso Sostenimiento de labores mineras (48 h, ciclo II). Indicador IND-EOM-SOST-2: explica el tipo de sostenimiento seleccionado de acuerdo a la calidad del macizo rocoso y tipo de labor minera, utilizando la metodología del GSI. La sesión 3 enseñó a levantar la celda y ubicar la casilla; hoy se lee qué sale de esa casilla y qué se hace cuando dos papeles no dicen lo mismo.',
      'Antes de esta sesión el estudiante trabajó el capítulo 5 del recurso autónomo CV1, «La calidad y su banda de RMR». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'La letra y su banda (punto clave 1): cada casilla trae su letra de calidad, de la A (la mejor) a la F (la peor). Bandas de RMR: A 81 a 100, B 61 a 80, C 51 a 60, D 41 a 50, E 21 a 40, F menos de 20. Calidades de la cartilla de Poderosa: LF/B A, LF/R B, F/B B, F/R B–C, F/P C–D, MF/B B–C, MF/R C–D, MF/P D–E, MF/MP E–F, IF/R D–E, IF/P E–F, IF/MP F; LF/P, LF/MP, F/MP e IF/B no existen. Una casilla partida trae dos letras y su banda junta las dos (MF/R, C–D, RMR 41 a 60). La letra es lo que se lleva a la tabla de sostenimiento.',
      'Clases y letras (punto clave 2): el RMR clásico agrupa la roca en cinco clases romanas, de la I (la mejor) a la V (la peor); en la lámina, la Clase III queda entre las líneas de 40 y 60. La Clase III (RMR 41 a 60) la cartilla la parte en dos letras: C es su mitad buena y D su mitad mala, y cada una da otra fila (en avance permanente, C pide perno helicoidal sistemático y D, perno helicoidal sistemático más malla). Un informe en clases no se lleva directo a la fila: hay que saber en qué mitad cae, y sin el número de RMR no se puede elegir.',
      'Vigencia (punto clave 3): un mapeo describe la labor el día en que se hizo. La labor avanza: describe un tramo que quedó atrás. Cruza una falla o un contacto: lo mapeado antes ya no vale. Entra agua: cambia la condición sin cambiar la roca. Pasan meses sin avanzar, sin falla y sin agua: el tiempo solo no lo envejece, sigue valiendo. Firmado dice quién responde; vigente, que todavía describe la labor: la fecha pesa tanto como la firma. Ante la duda se vuelve a medir en el frente.',
      'Dos fuentes (punto clave 4): se elige, no se promedia; gana la que describe la labor de hoy, no la de mejor firma; la elección se escribe y se sustenta y lo descartado se anota con su motivo; mientras se regulariza la firma se sostiene por lo más desfavorable, porque el D.S. 024-2016-EM, art. 213, manda el sostenimiento sistemático inmediato («labor avanzada, labor sostenida»); quien firma el pedido responde por el dato que usó.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del crucero 260, y los ejemplos que Sophia resuelve son propios (la celda LF/R del crucero 5, el RMR 45 de la rampa 6, la galería 4 parada ocho meses, el crucero 12 con B y D).',
    ],
  },
}
