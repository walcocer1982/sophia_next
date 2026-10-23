/**
 * EOM-SOST · S2 · Sostenimiento pasivo: malla, shotcrete, cuadros y cimbras.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (cap. 3). Las láminas se miraron una por una.
 * El caso de la sesión («Cuatro tramos ya sostenidos», nivel 4) NO entra.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const ESQ = '04_Recursos-graficos/EOM/esquemas/sost/s2'
const PLANOS = '04_Recursos-graficos/EOM/planos'
const QUISPE =
  'Quispe Basurco, A. y Portal Calderón, M. (2021). Estudio del sostenimiento activo y pasivo en labores de avance temporales y permanentes en una mina de oro subterránea en La Libertad. UPN, Cajamarca'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-EOM-SOST-S2-FOTO-MALLA-SHOTCRETE', archivo: '04_Recursos-graficos/EOM/fotos/hercules_malla-shotcrete.jpg', kind: 'scene', license: TESIS,
    source: 'Gómez Roca, J. R. (2017). Reducción de costos de explotación… mina Huancapeti. UNSCH, anexos, foto 5',
    description: 'Fotografía del techo de una labor sostenida con malla metálica y shotcrete: el concreto gris cubre la malla en casi toda la superficie y, en el centro, hay una zona donde el shotcrete se desprendió y quedan a la vista la roca oscura y la malla suelta.',
  },
  {
    id: 'IMG-EOM-SOST-S2-MALLA', archivo: `${PLANOS}/sost_malla-instalada.png`, kind: 'diagram', license: TESIS,
    source: QUISPE,
    description: 'Plano «Malla electrosoldada Ø 1/8" × ◊ 4" × 4"», vista de perfil 1:50: la malla sobre los pernos, que van a 1,40 m en vertical y a 1,60–2,00 m en horizontal, con «0,40 m traslape» entre hojas. Debajo, detalle «Traslape de malla» 1:20: la platina del perno sobre el traslape de 0,40 m, con cocadas de 0,10 m; rótulo «Tipo de roca regular, RMR (51–60)».',
  },
  {
    id: 'IMG-EOM-SOST-S2-SHOTCRETE-DISTANCIA', archivo: `${PLANOS}/sost_shotcrete-distancia-boquilla.png`, kind: 'diagram', license: TESIS,
    source: QUISPE,
    description: 'Esquema del lanzado de shotcrete: a la izquierda, la boquilla frente a una pared con malla, con la cota «0,80 – 1,50 m» hasta la roca; a la derecha, un corte con el concreto pegado a la roca y el chorro saliendo de la boquilla, rotulados «Concreto» y «Roca».',
  },
  {
    id: 'IMG-EOM-SOST-S2-CIMBRA-PLANCHAS', archivo: `${PLANOS}/sost_cimbra-planchas-union.png`, kind: 'diagram', license: TESIS,
    source: QUISPE,
    description: 'Plano «V. Frontal» 1:20 de tres cimbras de viga WF 4×13 lb/pie unidas por planchas acanaladas de 2 mm de espesor, con «Traslape 20 cm», altura de 1,10 m, «1,50 m» entre arcos y «1,70 m» al borde de la plancha, y la flecha «Dirección de avance de instalación de cimbras». Especificaciones: planchas según norma ASTM A-36, de 2,0 mm × 55 o 110 mm × 1700 mm.',
  },
  {
    id: 'IMG-EOM-SOST-S2-CARTILLA-PREFIERE', archivo: `${ESQ}/sost-s2_cartilla-prefiere.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s2.py',
    description: 'Tabla «Condición de la roca / Soporte que aparece / Por qué»: Buena → poco o nada, la roca se sostiene casi sola; Regular → malla sobre el perno, retiene lo que se suelta entre pernos; Mala → shotcrete sumado al perno y la malla, sella la superficie ya fracturada; Muy mala → cuadro de madera o cimbra, la roca ya no se sostiene sola. Al pie: «El shotcrete se suma al perno y la malla, no los reemplaza».',
  },
]

export const S2: SesionSpec = {
  slug: 'eom-sost-s2-sostenimiento-pasivo-malla-shotcrete-cuadros-y-cimbras',
  order: 2,
  etiqueta: 'S2',
  idPrefijo: 'sost-s2',
  title: 'Sostenimiento pasivo: malla, shotcrete, cuadros y cimbras',
  objective:
    'Describe la malla electrosoldada, el shotcrete, el cuadro de madera y la cimbra metálica con su especificación técnica, su espaciamiento y su estándar de instalación, y señala en qué condición de labor la cartilla prefiere cada uno, según el procedimiento operativo.',
  keyPoints: ['La malla electrosoldada', 'El shotcrete', 'El cuadro de madera y la cimbra', 'Qué soporte prefiere la cartilla'],
  imagenes: IMAGENES,
  casosDelEquipo: ['cuatro tramos', 'nivel 4'],

  rutina: {
    imagenId: 'IMG-EOM-SOST-S2-FOTO-MALLA-SHOTCRETE',
    tituloImagen: 'Techo con malla y shotcrete',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // Las de la lámina 8: «Qué ven. Qué piensan que está pasando ahí. Qué se preguntan.»
    preguntas: {
      veo: '¿Qué ves en la fotografía?',
      pienso: '¿Qué piensas que está pasando ahí?',
      mePregunto: '¿Qué te falta saber de ese tramo?',
    },
    titulos: {
      veo: 'Observación de un techo con malla y shotcrete',
      pienso: 'Lo que está pasando en ese tramo',
      mePregunto: 'Lo que falta saber de ese tramo',
    },
    pistaVeo: 'qué cubre el techo y qué se ve en el centro de la foto',
    criterios: {
      pienso: ['Dice qué piensa que pasó en ese tramo', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le falta saber del tramo, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'malla',
      title: 'La malla electrosoldada',
      subtitle: 'Sujeta con la platina y traslapada',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-EOM-SOST-S2-MALLA', title: 'Malla sobre los pernos' },
      norma: {
        id: 'norma-malla',
        title: 'La malla electrosoldada',
        source: 'CV1, cap. 3.1 · estándar de sostenimiento de la unidad',
        body: [
          '- La malla **retiene los bloques que se sueltan entre perno y perno**.',
          '- Se especifica por el **diámetro del alambre** y el **tamaño de la cocada** (en la lámina, Ø 1/8" y cocada de 4" × 4").',
          '- Va **sujeta con la platina del perno**, nunca clavada aparte.',
          '- Las hojas **se traslapan** (0,40 m en la lámina); nunca se ponen borde con borde.',
        ].join('\n'),
      },
      regla: 'la malla retiene lo que se suelta entre pernos; se especifica por el alambre y la cocada, va sujeta con la platina del perno y las hojas se traslapan, nunca borde con borde.',
      ejemplo: 'dos hojas que terminan borde con borde, sin traslape: están colgadas, no instaladas; en la lámina el traslape es de 0,40 m.',
      ejemploClave: 'traslape',
      subrayar: { respalda: 'sujeta con la platina' },
      pregunta: 'El ayudante clava la malla a la roca con alcayatas entre los pernos, sin pasarla por la platina, «porque así queda más tensa». ¿Está bien instalada, y por qué?',
      criterios: [
        'Decide que no está bien instalada',
        'Da la razón: la malla va sujeta con la platina del perno, nunca clavada aparte; así trabaja con el perno y retiene lo que se suelta entre pernos',
      ],
      critical: [2],
      commonMistakes: ['Cree que la malla sirve con tal de que esté tensa', 'Cree que la malla sola, sin perno, sostiene la roca'],
    },
    {
      id: 'shotcrete',
      title: 'El shotcrete',
      subtitle: 'Espesor, fibra y distancia de lanzado',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-EOM-SOST-S2-SHOTCRETE-DISTANCIA', title: 'Distancia de lanzado' },
      norma: {
        id: 'norma-shotcrete',
        title: 'El shotcrete',
        source: 'CV1, cap. 3.2 · estándar de sostenimiento de la unidad',
        body: [
          '- El shotcrete es **concreto lanzado a presión** contra la roca; se especifica por su **espesor** y por llevar **fibra** o no.',
          '- Su resistencia normal es de **240 kg/cm²**.',
          '- La **distancia de lanzado va entre 0,80 y 1,50 m**; fuera de ese rango aumenta el rebote y se pierde material.',
          '- En vía húmeda el **rebote normal no pasa del 15 %**.',
        ].join('\n'),
      },
      regla: 'el shotcrete es concreto lanzado a presión; se especifica por espesor y fibra, se lanza a 0,80–1,50 m de la roca y, en vía húmeda, el rebote normal no pasa del 15 %.',
      ejemplo: 'un parte que dice «shotcrete de 3 pulgadas con fibra» está bien especificado: espesor y fibra; lanzado a un metro, dentro del rango.',
      ejemploClave: 'fibra',
      subrayar: { respalda: ['distancia de lanzado', 'rebote normal no pasa'] },
      pregunta: 'El operador lanza el shotcrete desde 3 m de la pared «para cubrir más rápido» y el piso se llena de material rebotado. ¿Está lanzando bien, y por qué?',
      criterios: [
        'Decide que no está lanzando bien',
        'Da la razón: la distancia de lanzado tiene un máximo de 1,50 m; a 3 m sube el rebote y se pierde concreto',
      ],
      critical: [2],
      commonMistakes: ['Cree que más lejos cubre más área sin perder nada', 'Cree que el rebote es normal a cualquier distancia'],
    },
    {
      id: 'cuadro-cimbra',
      title: 'El cuadro de madera y la cimbra',
      subtitle: 'Espaciamiento y guardacabeza',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-EOM-SOST-S2-CIMBRA-PLANCHAS', title: 'Cimbras con sus planchas de unión' },
      norma: {
        id: 'norma-cuadro-cimbra',
        title: 'El cuadro y la cimbra',
        source: 'CV1, cap. 3.3 · estándar de sostenimiento de la unidad',
        body: [
          '- **Cuadro de madera:** dos postes, un sombrero y su guardacabeza; recibe la carga, no cose la roca. Su espaciamiento se mide **a luz interna**, entre cuadro y cuadro.',
          '- **Cimbra metálica:** arco de acero de viga H en dos cuerpos, empalmados con planchas de unión y mantenidos a su distancia con tirantes de fierro corrugado.',
          '- El **espaciamiento entre cimbras va de 1,00 a 1,50 m**.',
          '- La cimbra pide **terreno preacondicionado** antes de armarla; y los dos llevan **guardacabeza**, que cubre el vacío del techo.',
        ].join('\n'),
      },
      // 22 oct 2026: el ejemplo «una galería con cimbras a 1,20 m cumple» se fundía con la
      // regla y Sophia lo saltaba; ahora es una situación con alguien que decide.
      regla: 'cuadro (postes, sombrero, guardacabeza) y cimbra (arco de viga H) reciben la carga; el cuadro se espacia a luz interna; la cimbra, de 1,00 a 1,50 m entre arcos.',
      ejemplo: 'en la galería 310 el turno de día dejó las cimbras a 1,20 m: el supervisor las recibe porque están entre 1,00 y 1,50 m.',
      ejemploClave: 'galería 310',
      subrayar: { respalda: 'espaciamiento entre cimbras' },
      pregunta: 'El turno de noche dejó las cimbras de una galería a 2,20 m entre arcos «porque la roca se ve firme». ¿Cumple el estándar, y por qué?',
      criterios: [
        'Decide que no cumple',
        'Da la razón: el espaciamiento máximo entre cimbras es 1,50 m; que la roca se vea firme no cambia el estándar',
      ],
      critical: [2],
      commonMistakes: ['Cree que el espaciamiento lo decide el que instala según cómo se ve la roca', 'Confunde el espaciamiento de la cimbra con el del cuadro de madera'],
    },
    {
      id: 'cartilla',
      title: 'Qué soporte prefiere la cartilla',
      subtitle: 'Según la condición de la roca',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-EOM-SOST-S2-CARTILLA-PREFIERE', title: 'Qué prefiere la cartilla' },
      norma: {
        id: 'norma-cartilla-prefiere',
        title: 'La cartilla y la recepción',
        source: 'CV1, caps. 3.4 y 3.5 · cartilla geomecánica GSI de la unidad',
        body: [
          '- **Roca buena:** poco o nada. **Regular:** malla sobre el perno, retiene lo que se suelta entre pernos.',
          '- **Roca mala:** shotcrete **sumado** al perno y la malla, sella la superficie fracturada; no los reemplaza.',
          '- **Roca muy mala:** cuadro de madera o cimbra, porque la roca ya no se sostiene sola.',
          '- Cada fila de la cartilla trae su elemento **y su espaciamiento juntos**: un elemento sin espaciamiento es media instrucción.',
          '- Un tramo se recibe comparando el parte con la fila: espaciamiento y especificación **anotados**; «quedó firme» no es criterio, y lo que no cumple se anota **no conforme**.',
        ].join('\n'),
      },
      regla: 'a mejor roca, soporte más liviano: buena, poco o nada; regular, malla sobre el perno; mala, shotcrete sumado a perno y malla; muy mala, cuadro o cimbra.',
      ejemplo: 'una galería en roca regular: la fila trae malla sobre el perno, porque retiene lo que se suelta entre pernos; el shotcrete recién entra con roca mala.',
      ejemploClave: 'regular',
      // 22 oct 2026, alumno flojo: tocó «el shotcrete… no los reemplaza», que también respalda.
      subrayar: { respalda: ['Roca muy mala', 'no los reemplaza'] },
      pregunta: 'En un tramo de roca muy mala, el capataz propone lanzar shotcrete grueso en vez de armar cuadros, «porque es más rápido». ¿Es lo que prefiere la cartilla, y por qué?',
      criterios: [
        'Decide que no: en roca muy mala la cartilla pone cuadro de madera o cimbra',
        'Da la razón: la roca ya no se sostiene sola; el shotcrete se suma al perno y la malla, no los reemplaza',
      ],
      critical: [1],
      commonMistakes: ['Cree que el shotcrete reemplaza al cuadro o a la cimbra', 'Elige el soporte por rapidez y no por la condición de la roca'],
    },
  ],

  // Gemelo del caso de los cuatro tramos: un solo tramo, una sola decisión (¿se recibe?).
  casoCorto: {
    id: 'caso-corto',
    title: 'Recepción de un tramo sostenido en un caso',
    subtitle: 'Caso del tramo de cuadros',
    keyPointIndex: 3,
    caso: {
      id: 'caso-tramo',
      title: 'Caso: el tramo de cuadros',
      referencia: 'el caso del tramo de cuadros',
      name: 'Contrata Andes, galería 520',
      source: 'Caso corto construido para Sophia sobre el CV1 y la cartilla GSI · pendiente de aprobación del instructor',
      facts: [
        'Tramo de galería de 3,50 × 3,50 m en roca muy mala; la fila de la cartilla manda cuadros de madera cada 1,50 m, con guardacabeza',
        'El contratista armó los cuadros y el parte dice «cuadros de madera, guardacabeza, OK»; no anota el espaciamiento',
        'El capataz dice que quedaron «durísimos» y pide que se reciba hoy para valorizar el lunes',
        'Al medir a luz interna, hay cuadros a 1,50 m y otros a 2,10 m',
      ],
      question: '¿Se recibe el tramo, y por qué?',
    },
    pistas: 'Si lo recibe porque «quedó firme», pregúntale qué compara la recepción y qué dice la fila. Si no lo recibe sin razón, pregúntale qué falta en el parte y qué dio la medición.',
    criterios: [
      'Decide que no se recibe',
      'Da la razón: la medición da cuadros a 2,10 m contra los 1,50 m de la fila, y el parte no anota el espaciamiento; sin espaciamiento anotado no se recibe',
      'Señala que «quedó firme» no es criterio de recepción: lo que no cumple se anota no conforme',
    ],
    critical: [1],
    commonMistakes: ['Recibe el tramo porque los cuadros se sienten firmes', 'Cree que el parte vale aunque no anote el espaciamiento', 'No compara lo medido con la fila de la cartilla'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 213 y 214) · Estándar de sostenimiento de la unidad · Cartilla geomecánica GSI',
    referencias: [
      'Sesión 2 de 12 del curso Sostenimiento de labores mineras (48 h, ciclo II). Indicador IND-EOM-SOST-1: describe los tipos de sostenimiento de las labores mineras de acuerdo con sus características y especificaciones técnicas. La sesión 1 enseñó el refuerzo (perno y cable); hoy entra el soporte, lo que queda por fuera y retiene el bloque que igual se soltó.',
      'Antes de esta sesión el estudiante trabajó el capítulo 3 del recurso autónomo CV1, «Malla, shotcrete, cuadros y cimbras». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Malla (punto clave 1): retiene los bloques que se sueltan entre perno y perno; se especifica por el diámetro del alambre y el tamaño de la cocada (en el plano, Ø 1/8" y cocada 4" × 4"); va sujeta con la platina del perno, nunca clavada aparte; las hojas se traslapan (0,40 m en el plano), nunca borde con borde.',
      'Shotcrete (punto clave 2): concreto lanzado a presión contra la roca; se especifica por su espesor y por llevar fibra o no; resistencia normal 240 kg/cm²; distancia de lanzado entre 0,80 y 1,50 m (fuera de ese rango sube el rebote y se pierde material); en vía húmeda el rebote normal no pasa del 15 %.',
      'Cuadro y cimbra (punto clave 3): el cuadro de madera es dos postes, un sombrero y su guardacabeza; trabaja recibiendo la carga; su espaciamiento se mide a luz interna. La cimbra es arco de acero de viga H en dos cuerpos (en el plano, WF 4×13 lb/pie), empalmados con planchas de unión (ASTM A-36, traslape 20 cm) y mantenidos con tirantes de fierro corrugado; espaciamiento de 1,00 a 1,50 m; pide terreno preacondicionado. Los dos llevan guardacabeza, que cubre el vacío del techo.',
      'La cartilla y la recepción (punto clave 4): a mejor roca, elementos más livianos y más espaciados; el cuadro aparece cuando la roca ya no se sostiene sola; la cimbra entra donde el cuadro se queda corto; el shotcrete se suma al perno y la malla, no los reemplaza; cada fila trae su elemento y su espaciamiento juntos; la labor permanente y la temporal no leen la misma fila. Firme hoy no dice nada de cómo estará dentro de un año: la recepción compara lo instalado con lo que manda la fila; lo que no cumple se anota no conforme; sin el espaciamiento anotado en el parte, el tramo no se recibe.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del tramo de cuadros, y los ejemplos que Sophia resuelve son propios (las hojas sin traslape, el parte de 3 pulgadas con fibra, la galería con cimbras a 1,20 m, la galería en roca regular).',
    ],
  },
}
