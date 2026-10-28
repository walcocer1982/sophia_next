/**
 * SI-ALTORIESGO · S4 · Riesgos en espacios confinados.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * cuadernillo CV1 (cap. 7). Las láminas se miraron una por una (imagenes.csv
 * solo trae «S4 · tres» como descripción y imagen_texto.csv no tiene la S4).
 * Los casos A y B de la sesión (buzón de Chiclayo, silo de Arequipa) NO entran:
 * son el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/SI/esquemas'
const FOTO = '04_Recursos-graficos/SI/fotos'
const SOBRE_NORMA = 'Elaboración propia sobre la norma verificada en el marco legal del curso (G.050, D.S. 024, Ley 29783 y OSHA)'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-SI-ALTORIESGO-S4-MURAL', archivo: `${ESQ}/altoriesgo_s4_mural-entrada.png`, kind: 'scene', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de la U.S. Air Force, dominio público, Wikimedia Commons`,
    description: 'Patio de tierra con un cerco de malla y alambre de púas. Sobre una boca redonda en el suelo hay un trípode de patas verdes con un malacate negro y, alrededor de la boca, una baranda tubular amarilla con cadenas. Un trabajador con casco amarillo está agachado con la cabeza y los brazos metidos en la abertura; otros dos, de pie, manejan el malacate y sostienen la baranda. En el suelo, una escalera amarilla echada. Debajo de la foto, las tres preguntas de la rutina: VEO ¿Qué está pasando en esta boca? · PIENSO ¿Qué habrá del otro lado de la abertura? · ME PREGUNTO ¿Cómo sabría alguien si puede entrar? Pie: Fotografías: U.S. Air Force, dominio público.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S4-EJEMPLOS', archivo: `${ESQ}/altoriesgo_s4_ejemplos.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de Asurnipal, CC BY-SA 4.0, Wikimedia Commons`,
    description: 'Arriba, foto de una boca de inspección abierta vista desde arriba: el aro de fierro, las paredes de concreto manchadas y, abajo, oscuridad y unas tuberías. Debajo, tres filas: EJEMPLOS, «Buzones de desagüe, silos, tanques» · «Pozos, ductos, calderas»; EL INGRESO, «Cualquier parte del cuerpo cruza la abertura» · «Desde ahí ya se ingresó»; EN MINERÍA, «Chimeneas y piques en desarrollo» · «D.S. 024, art. 132». Pie: OSHA 1926.1201(a) · 1910.146(b).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S4-TRES', archivo: `${ESQ}/altoriesgo_s4_tres.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tres filas numeradas: 1 CABE, «El cuerpo entra y se puede trabajar dentro»; 2 ENTRADA, «Entrada o salida limitada o restringida»; 3 USO, «No está diseñado para ocupación continua». Franja amarilla: «Las tres a la vez: si falta una, no es espacio confinado». Pie: OSHA 1910.146(b) · la G.050 pide entrada limitada y uso no prolongado.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S4-PERMISO', archivo: `${ESQ}/altoriesgo_s4_permiso.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Cuatro filas: ATMÓSFERA, «Peligrosa, o que puede llegar a serlo»; MATERIAL, «Que puede sepultar al que entra»; FORMA, «Paredes que convergen o piso que se estrecha»; OTRO, «Cualquier otro peligro grave reconocido». Franja amarilla: «Basta una de las cuatro para exigir permiso». Pie: OSHA 1910.146(b), «permit-required confined space».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S4-FOTO-SENAL', archivo: `${FOTO}/altura-s4-senal.jpg`, kind: 'scene', license: 'CC BY-SA 3.0',
    source: 'Fotografía: Joe Mabel · Wikimedia Commons, «Confined space warning 01.jpg»',
    description: 'Tapa redonda y empernada de la boca de hombre de un tanque, pintada de blanco y descascarada, con dos asas. En el centro, un letrero: «DANGER · CONFINED SPACE · ENTER BY PERMIT ONLY» (peligro, espacio confinado, entrar solo con permiso). Debajo, pintado: «PAINTED SEPT. 1979». Abajo a la izquierda, el volante de una válvula.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S4-OXIGENO', archivo: `${ESQ}/altoriesgo_s4_oxigeno.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tabla con dos columnas, NORMA G.050 y OSHA 1910.146. Oxígeno mínimo: 19 % y 19,5 %. Oxígeno máximo: 22 % y 23,5 %. Inflamables: «0 % del LII, en caliente» y «10 % del LII». Polvo combustible: «Bajo el 10 % del LIE» y «En su LII». Franja amarilla: «Dos normas, dos rangos: se cumple el más exigente». Pie: «G.050: la atmósfera cambia al trabajar; el fuego consume oxígeno».',
  },
]

export const S4: SesionSpec = {
  slug: 'si-altoriesgo-s4-riesgos-en-espacios-confinados',
  order: 4,
  etiqueta: 'S4',
  idPrefijo: 'altoriesgo-s4',
  title: 'Riesgos en espacios confinados',
  // Aprendizaje esperado, literal de sesiones.csv
  objective:
    'Explica cuándo un recinto es espacio confinado según la norma, qué lo convierte en uno que exige permiso y qué peligros presentan su atmósfera y su interior.',
  keyPoints: ['Qué es un espacio confinado', 'Espacio confinado que exige permiso', 'Peligros de la atmósfera y del interior'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Chiclayo', 'Arequipa', 'alimento balanceado', 'colector', 'barreta', 'costra', 'huevo podrido'],

  rutina: {
    imagenId: 'IMG-SI-ALTORIESGO-S4-MURAL',
    tituloImagen: 'Trípode sobre una boca',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del PPT de la sesión',
    // Tal como están escritas en la imagen
    preguntas: {
      veo: '¿Qué está pasando en esta boca?',
      pienso: '¿Qué habrá del otro lado de la abertura?',
      mePregunto: '¿Cómo sabría alguien si puede entrar?',
    },
    titulos: {
      veo: 'Observación de una boca de acceso',
      pienso: 'Lo que hay tras la abertura',
      mePregunto: 'Cómo se sabe si se puede entrar',
    },
    pistaVeo: 'qué hay encima de la boca y qué hace cada persona',
    criterios: {
      pienso: ['Dice qué cree que hay del otro lado de la abertura', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice cómo se podría saber si se puede entrar, o qué le falta saber'],
    },
    enlaceMePregunto: 'Sobre lo que imaginaste del otro lado:',
  },

  puntosClave: [
    {
      id: 'definicion',
      title: 'Espacio confinado según la norma',
      subtitle: 'Cabe, entrada limitada, uso no continuo',
      keyPointIndex: 0,
      // La lámina trae «El ingreso», que es lo que decide la pregunta; las tres
      // condiciones quedan como apoyo, a pedido.
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S4-EJEMPLOS', title: 'Ejemplos y el ingreso' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S4-TRES', title: 'Las tres condiciones de la OSHA' }],
      norma: {
        id: 'norma-definicion',
        title: 'Qué es un espacio confinado',
        source: 'OSHA 1910.146(b) · OSHA 1926.1201 · Norma G.050, cap. 18 · D.S. 024, art. 132',
        body: [
          '- OSHA: tres condiciones **a la vez**: cabe el cuerpo y se trabaja dentro, **entrada o salida limitada** y **no diseñado para ocupación continua** [1910.146(b)].',
          '- G.050: tanques, cisternas, cámaras, recipientes y excavaciones profundas, con entrada y salida limitadas y no hechos para ocuparse por tiempo prolongado.',
          '- En minería también lo son las **chimeneas y los piques en desarrollo** (D.S. 024, art. 132).',
          '- Se ingresa cuando **cualquier parte del cuerpo cruza el plano de la abertura** [1910.146(b)].',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4): la respuesta («sí ingresó» sin bajar) va contra lo
      // que el alumno cree; el ejemplo muestra esa misma excepción con otra persona y otro recinto.
      regla: 'es espacio confinado si a la vez cabe el cuerpo, la entrada es limitada y no se hizo para ocuparse siempre; se ingresa apenas cualquier parte del cuerpo cruza la abertura.',
      ejemplo: 'una supervisora asoma la cabeza por la boca de un pozo para ver el agua, con los pies afuera: ya ingresó.',
      ejemploClave: 'supervisora',
      subrayar: { respalda: 'cualquier parte del cuerpo cruza' },
      pregunta: 'Un mecánico no baja al tanque: solo mete la cabeza y un brazo por la boca para alcanzar una válvula. ¿Ya ingresó al espacio confinado, y por qué?',
      criterios: [
        'Decide que sí ingresó',
        'Da la razón: se ingresa cuando cualquier parte del cuerpo cruza la abertura',
      ],
      critical: [2],
      commonMistakes: ['Cree que solo se ingresa cuando se baja con todo el cuerpo', 'Cree que asomarse para mirar o alcanzar algo no es entrar'],
    },
    {
      id: 'permiso',
      title: 'Espacio confinado que exige permiso',
      subtitle: 'Basta una de cuatro características',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S4-PERMISO', title: 'Las cuatro características' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S4-FOTO-SENAL', title: 'Señal de entrada con permiso' }],
      norma: {
        id: 'norma-permiso',
        title: 'Cuándo exige permiso',
        source: 'OSHA 1910.146(b) y (c) · Norma G.050, cap. 18 · D.S. 024, arts. 129, 130 y 132',
        body: [
          '- OSHA: exige permiso si tiene **una** de cuatro características [1910.146(b)].',
          '- **Atmósfera peligrosa, o que puede llegar a serlo.**',
          '- **Material que puede sepultar** al que entra; **forma interna que atrapa** (paredes que convergen, piso que se estrecha); o cualquier otro peligro grave reconocido.',
          '- El empleador evalúa qué espacios lo exigen y los **señaliza** [1910.146(c)]. G.050: todo trabajo en espacio confinado lleva permiso de entrada visible; en minería, PETAR por turno (D.S. 024).',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4): «aire normal y aun así exige permiso» es la
      // excepción; antes el ejemplo era una forma que atrapa y no la mostraba.
      regla: 'exige permiso si tiene una de cuatro: atmósfera peligrosa o que puede llegar a serlo, material que sepulta, forma que atrapa u otro peligro grave.',
      ejemplo: 'una cámara seca da aire normal, pero el mecánico va a soldar dentro: el aire puede llegar a ser peligroso, así que pide permiso.',
      ejemploClave: 'soldar',
      subrayar: { respalda: ['puede llegar a serlo', 'una de cuatro'] },
      pregunta: 'Un tanque de acero vacío, seco y con aire normal al medirlo se va a pintar por dentro con pintura a base de solvente. Según la OSHA, ¿es un espacio confinado que exige permiso, y por qué?',
      criterios: [
        'Decide que sí exige permiso',
        'Da la razón: su atmósfera puede llegar a ser peligrosa por los vapores del solvente',
      ],
      critical: [2],
      commonMistakes: ['Cree que si el aire está bien al medir, no exige permiso', 'Cree que hacen falta las cuatro características a la vez'],
    },
    {
      id: 'peligros',
      title: 'Peligros de la atmósfera y del interior',
      subtitle: 'Lo que el detector mide y lo que no',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S4-OXIGENO', title: 'Oxígeno: dos normas, dos rangos' },
      // 27 oct 2026: la lámina compara rangos de oxígeno y la pregunta es sobre lo que
      // el detector no mide; queda a pedido y en la pizarra solo el texto.
      laminaCuando: 'on_reference',
      norma: {
        id: 'norma-peligros',
        title: 'La atmósfera y el interior',
        source: 'OSHA 1910.146(b) · Norma G.050, cap. 18 · CV1, cap. 7',
        body: [
          '- Atmósfera peligrosa: oxígeno fuera de **19 a 22 %** (G.050), inflamables o tóxicos sobre su límite.',
          '- La atmósfera cambia al trabajar: el fuego consume oxígeno y la pintura la vuelve inflamable.',
          '- Peligros del interior: sepultamiento, **partes móviles**, descarga de fluidos y cables energizados (G.050, cap. 18).',
          '- **Los peligros del interior no los mide un detector de gases.**',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4 y §5): el ejemplo era el 22,8 % de oxígeno, otra
      // regla y otra cifra; ahora muestra la excepción («todo en rango y no se entra»).
      regla: 'el detector mide la atmósfera: oxígeno (G.050: 19 a 22 %), inflamables y tóxicos. No mide los peligros del interior: partes móviles, descarga de fluidos, cables energizados.',
      ejemplo: 'el detector de una cámara marca todo en rango, pero su tubería de vapor sigue abierta: la supervisora no deja entrar.',
      ejemploClave: 'vapor',
      subrayar: { respalda: ['no los mide un detector', 'partes móviles'] },
      pregunta: 'En un tanque de mezcla, el detector marca 20,9 % de oxígeno, cero inflamables y cero tóxicos, pero nadie ha desconectado el motor de las paletas agitadoras. ¿Es seguro entrar, y por qué?',
      criterios: [
        'Decide que no es seguro entrar',
        'Da la razón: las paletas son un peligro del interior que el detector de gases no mide',
      ],
      critical: [2],
      commonMistakes: ['Cree que una buena lectura del detector basta para entrar', 'Cree que el detector mide todos los peligros del espacio'],
    },
  ],

  // Gemelo de los casos A y B: un recinto al que se va a entrar sin preguntarse qué es,
  // con otra causa (vapores de combustible) y otro equipo (un camión cisterna).
  casoCorto: {
    id: 'caso-corto',
    title: 'Espacio confinado con permiso en un caso',
    subtitle: 'Caso de la cisterna',
    keyPointIndex: 1,
    caso: {
      id: 'caso-cisterna',
      title: 'Caso: el camión cisterna',
      referencia: 'el caso del camión cisterna',
      name: 'Transportes Ruta Andina, Huachipa',
      source: 'Caso corto construido para Sophia sobre la OSHA 1910.146(b) y la G.050 (cap. 18) · pendiente de aprobación del instructor',
      // 27 oct 2026 (APRENDIZAJES §7): solo los hechos que la decisión necesita.
      facts: [
        'En un taller hay que limpiar por dentro el tanque de un camión cisterna que transportaba gasolina',
        'El tanque mide 2 m de alto y solo se entra por una boca de 50 cm en el techo; un operario entrará a limpiar el fondo',
        'Se vació ayer y desde la boca todavía se siente olor a gasolina',
        'El jefe de taller dice que no es espacio confinado: «es un camión, no un tanque de planta»',
      ],
      question: '¿El tanque del camión es un espacio confinado que exige permiso, y por qué?',
    },
    pistas: 'Si dice que no porque es un camión, dile que la norma mira el recinto y no si tiene ruedas. Si decide bien sin razón, dile que falta el porqué, con lo que dice el caso.',
    criterios: [
      'Decide que sí es un espacio confinado que exige permiso',
      'Da la razón: los vapores de gasolina hacen que la atmósfera sea o pueda llegar a ser peligrosa',
    ],
    critical: [1],
    commonMistakes: ['Cree que un tanque de vehículo no puede ser espacio confinado', 'No relaciona el olor a gasolina con una atmósfera inflamable'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'OSHA 1910.146 y 1926.1201 · Norma G.050 (cap. 18) · D.S. 024-2016-EM (arts. 129, 130 y 132)',
    referencias: [
      'Sesión 4 de 12 del curso Trabajos de alto riesgo (48 h). Indicador IND-SI-ALTORIESGO-1: explica los riesgos laborales identificados, las medidas de control y los procedimientos de seguridad de los trabajos en altura, con escaleras y andamios, y en espacios confinados. Las sesiones 1 a 3 dejaron la altura; hoy, los recintos donde el peligro está adentro. La sesión 5 verá cómo se controlan antes de entrar.',
      'Antes de esta sesión el estudiante trabajó el capítulo 7 del cuadernillo CV1, «Espacios confinados». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Qué es (punto clave 1): OSHA 1910.146(b): cabe el cuerpo y se puede hacer el trabajo dentro; medios de entrada o salida limitados o restringidos; no diseñado para ocupación continua; las tres a la vez. G.050: tanques, cisternas, cámaras, recipientes y excavaciones profundas, con entrada y salida limitadas y no hechos para ocuparse por tiempo prolongado. D.S. 024: área reducida y abertura limitada, con condiciones que exigen PETAR; en minería también las chimeneas y los piques en desarrollo (art. 132). Ejemplos: buzones de desagüe, silos, tanques, pozos y ductos [OSHA 1926.1201]. Se ingresa cuando cualquier parte del cuerpo cruza el plano de la abertura: asomar la cabeza ya es entrar.',
      'Permiso (punto clave 2): OSHA: exige permiso si tiene una de cuatro: atmósfera peligrosa o que puede llegar a serlo; material que puede sepultar; forma interna que atrapa (paredes que convergen, piso que se estrecha); cualquier otro peligro grave reconocido [1910.146(b)]. El empleador evalúa qué espacios lo exigen y los señaliza [(c)]. G.050: todo trabajo en espacio confinado necesita permiso de entrada, visible; vale un turno, y si se suspende más de 2 h se vuelve a medir. En minería, PETAR firmado para cada turno (D.S. 024, arts. 129, 130 y 132).',
      'Peligros (punto clave 3): atmósfera peligrosa (OSHA): oxígeno bajo 19,5 % o sobre 23,5 %; inflamables sobre el 10 % del LII, o polvo combustible en su LII (se reconoce porque no deja ver a 1,5 m); tóxicos sobre su límite de exposición, o cualquier condición IDLH. G.050: oxígeno entre 19 y 22 %, más estricta por arriba; se cumple el rango más exigente. La atmósfera cambia: el fuego consume oxígeno y la pintura la vuelve inflamable. Interior: sepultamiento (atrapado en un líquido o un sólido que fluye), partes móviles, descarga de fluidos y cables energizados (G.050, cap. 18). Esos peligros no los mide un detector de gases.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala los dos casos de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del camión cisterna, y los ejemplos que Sophia resuelve son propios (la supervisora que se asoma a un pozo, la cámara donde se va a soldar, la tubería de vapor abierta).',
    ],
  },
}
