/**
 * SI-ALTORIESGO · S3 · Control de riesgos en escaleras y andamios.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * cuadernillo CV1 (cap. 6). Las láminas se miraron una por una.
 * Los casos A y B de la sesión (colegio de San Miguel, ferretería de Trujillo)
 * NO entran: son el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/SI/esquemas'
const FOTO = '04_Recursos-graficos/SI/fotos'
const SOBRE_NORMA = 'Elaboración propia sobre la norma verificada en el marco legal del curso (G.050, D.S. 024, Ley 29783 y OSHA)'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-SI-ALTORIESGO-S3-MURAL', archivo: `${ESQ}/altoriesgo_s3_mural-entrada.png`, kind: 'scene', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de la U.S. Navy, dominio público, Wikimedia Commons`,
    description: 'Fachada de un edificio cubierta por un andamio metálico de varios niveles, con plataformas de metal y tablones de madera; cuatro trabajadores con casco blanco suben por el centro en distintos niveles, dos con arnés y líneas amarillas, y el de abajo carga un tablón. Debajo de la foto, las tres preguntas de la rutina: VEO ¿Qué ves en este andamio? · PIENSO ¿Sobre qué está apoyado cada nivel? · ME PREGUNTO ¿Quién dijo que esto aguanta? Pie: Fotografías: U.S. Navy, dominio público.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-PLATAFORMA', archivo: `${ESQ}/altoriesgo_s3_plataforma.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de Kritzolina, CC BY-SA 4.0, Wikimedia Commons`,
    description: 'Arriba, foto de un andamio de fachada con plataformas metálicas, barandas tubulares y una escalera de acceso inclinada entre niveles. Debajo, tres filas: TABLONES, «5 cm de espesor y 25 a 30 cm de ancho» · «Sin nudos, sin rajaduras, sin pintar»; PROHIBIDO, «Tablones de pino» · «Tablas delgadas una sobre otra»; OSHA, «Plataforma entablada entera» · «Huecos de no más de 2,5 cm». Pie: Norma G.050, 21.2 · OSHA 1926.451(b)(1).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-FOTO-BASE', archivo: `${FOTO}/altura-s3-base.jpg`, kind: 'scene', license: 'CC BY-SA 3.0',
    source: 'Fotografía: Warburg · Wikimedia Commons, «Coupler 1.jpg»',
    description: 'Pie de un andamio tubular visto de cerca: el husillo roscado (gato de nivelación) con su placa base apoyada en un piso de tierra apisonada y, arriba, las abrazaderas que unen el tubo vertical con una diagonal y un tubo horizontal. Sin rótulos.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-BARANDAS', archivo: `${ESQ}/altoriesgo_s3_barandas.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tabla «La norma / Pasamanos / Intermedia / Rodapié»: G.050, 21.2: 1,05 m, 0,54 m, 10 cm sobre 1,80 m; OSHA 1926.451: 0,97 a 1,2 m, a media altura, 9 cm; D.S. 024, 372 h: 1,20 m; D.S. 024, 372 l: 0,90 a 1,00 m. Franja: «El D.S. 024 da dos alturas en el mismo artículo». Pie: «Acceso: por escalera; trepar por crucetas o barandas, prohibido [G.050 · OSHA 1926.451(e)(1)]».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-TIJERA', archivo: `${ESQ}/altoriesgo_s3_tijera.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tres filas: LA LLEGADA, «Sobresale 0,9 m del nivel al que se llega» · OSHA 1910.23(c)(11) · 1926.1053(b)(1); LA TIJERA, «El último peldaño y la tapa no se pisan» · OSHA 1910.23(c)(8); CON ALGUIEN ENCIMA, «No se mueve ni se extiende» · OSHA 1910.23(c)(6). Cierre: «Si no se alcanza, la escalera es corta: no se sube más».',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-SUBIR', archivo: `${ESQ}/altoriesgo_s3_subir.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Cuatro filas: DE FRENTE, «Mirando a la escalera, al subir y al bajar»; UNA MANO, «Siempre sujeta a la escalera»; SIN CARGA, «Nada que haga perder el equilibrio»; TENSIÓN, «Cerca de equipo energizado, largueros no conductores». Cierre: «Si hay que subir material, la escalera no es el medio». Pie: OSHA 1910.23(b)(11) a (13) · 1926.1053(b)(12) · D.S. 024, 372 d.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-TARJETAS', archivo: `${ESQ}/altoriesgo_s3_tarjetas.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tres filas de color: ROJA, «No se usa» · «Solo se arma, desarma o repara»; AMARILLA, «No cumple todos los requisitos» · «Se trabaja enganchado siempre»; VERDE, «Plataforma completa, baranda doble» · «Acceso seguro y arriostrado». Cierre: «Todo andamio en obra lleva una de las tres». Pie: Norma G.050, 21.4 y Anexo C.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S3-INSPECCION', archivo: `${ESQ}/altoriesgo_s3_inspeccion.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tabla «Equipo / Quién / Cuándo»: Andamio · G.050: el capataz; el prevencionista firma la lista · cada día, antes de usarlo. Andamio · OSHA: una persona competente · antes de cada turno y tras cualquier suceso. Escalera · OSHA 1910.23: el empleador se asegura de que se revise · antes de cada turno. Cierre: «Con defecto: “No usar” y fuera de servicio hasta repararla». Pie: G.050, 21.4 · OSHA 1926.451(f)(3) · 1910.23(b)(9) y (10).',
  },
]

export const S3: SesionSpec = {
  slug: 'si-altoriesgo-s3-control-de-riesgos-en-escaleras-y-andamios',
  order: 3,
  etiqueta: 'S3',
  idPrefijo: 'altoriesgo-s3',
  title: 'Control de riesgos en escaleras y andamios',
  objective:
    'Explica qué condiciones deben cumplir el apoyo, la plataforma y el acceso de un andamio o de una escalera, y cómo se verifica su estado antes de subir.',
  keyPoints: ['Apoyo y plataforma del andamio', 'Barandas y acceso del andamio', 'Condiciones de la escalera portátil', 'Verificación antes de subir'],
  imagenes: IMAGENES,
  casosDelEquipo: ['San Miguel', 'Trujillo', 'colegio', 'ferretería'],

  rutina: {
    imagenId: 'IMG-SI-ALTORIESGO-S3-MURAL',
    tituloImagen: 'Andamio de fachada con cuatro trabajadores',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del PPT de la sesión',
    // Tal como están escritas en la imagen
    preguntas: {
      veo: '¿Qué ves en este andamio?',
      pienso: '¿Sobre qué está apoyado cada nivel?',
      mePregunto: '¿Quién dijo que esto aguanta?',
    },
    titulos: {
      veo: 'Observación de un andamio de fachada',
      pienso: 'Sobre qué se apoya cada nivel',
      mePregunto: 'Quién garantiza que el andamio aguanta',
    },
    pistaVeo: 'cuántos niveles tiene el andamio y dónde está cada trabajador',
    criterios: {
      pienso: ['Dice sobre qué cree que se apoya cada nivel', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice quién o qué debería garantizar que aguanta, o qué le falta saber'],
    },
    enlaceMePregunto: 'Sobre los apoyos que señalaste:',
  },

  puntosClave: [
    {
      id: 'apoyo-plataforma',
      title: 'Apoyo y plataforma del andamio',
      subtitle: 'El andamio empieza a fallar por el suelo',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S3-PLATAFORMA', title: 'La plataforma del andamio' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S3-FOTO-BASE', title: 'El pie del andamio' }],
      norma: {
        id: 'norma-apoyo-plataforma',
        title: 'Apoyo y plataforma',
        source: 'Norma G.050, 21.2 · OSHA 1926.451(a)(1) y (b)(1)',
        body: [
          '- Suelo **nivelado y firme**: nunca directo sobre tierra, fango, césped o grava; sobre esos suelos, **madera de 10 a 12" por 2"** bajo dos patas o garruchas (G.050).',
          '- El andamio soporta **4 veces la carga máxima prevista** [G.050 · OSHA 1926.451(a)(1)].',
          '- Plataforma completa de tablones de **5 cm de espesor y 25 a 30 cm de ancho**, sin nudos ni rajaduras y sin pintar; los tablones de pino están prohibidos (G.050).',
          '- OSHA: plataforma entablada entera, **sin huecos de más de 2,5 cm** [1926.451(b)(1)].',
        ].join('\n'),
      },
      regla: 'el andamio va sobre suelo nivelado y firme, nunca directo sobre tierra, fango, césped o grava (si no, durmientes); la plataforma, completa, de tablones de 5 cm por 25 a 30 cm, sin pintar.',
      ejemplo: 'dos tablones de 4 cm con un hueco de 8 cm no son plataforma: 5 cm de espesor, entablada entera, huecos de 2,5 cm máximo.',
      ejemploClave: 'hueco',
      subrayar: { respalda: 'nunca directo sobre tierra' },
      pregunta: 'Un andamio de tres cuerpos está sobre grava compactada «porque está dura», con las patas directo sobre la grava. ¿Cumple la G.050, y por qué?',
      criterios: [
        'Decide que no cumple',
        'Da la razón: la G.050 prohíbe apoyar el andamio directo sobre tierra, fango, césped o grava; van durmientes de madera de 10 a 12" por 2" bajo las patas',
      ],
      critical: [2],
      commonMistakes: ['Cree que un suelo que se siente duro es suelo firme según la norma', 'Olvida los durmientes bajo las patas'],
    },
    {
      id: 'barandas-acceso',
      title: 'Barandas y acceso del andamio',
      subtitle: 'Pasamanos, intermedia, rodapié y escalera',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S3-BARANDAS', title: 'Barandas del andamio' },
      norma: {
        id: 'norma-barandas-acceso',
        title: 'Barandas y acceso',
        source: 'Norma G.050, 21.2 · OSHA 1926.451(e)(1) · D.S. 024, art. 372',
        body: [
          '- G.050, 21.2: pasamanos a **1,05 m**, baranda intermedia a **0,54 m** y **rodapié de 10 cm cuando la plataforma supera 1,80 m**.',
          '- OSHA 1926.451: pasamanos de 0,97 a 1,2 m, intermedia a media altura, rodapié de 9 cm. D.S. 024, art. 372: 1,20 m (h) y también 0,90 a 1,00 m (l).',
          '- El acceso es **por escalera**; trepar por crucetas o barandas está **prohibido** [G.050 · OSHA 1926.451(e)(1)].',
          '- **Arriostre** si la altura pasa de tres veces la base de apoyo (G.050, 21.2).',
        ].join('\n'),
      },
      regla: 'G.050: pasamanos a 1,05 m, intermedia a 0,54 m y rodapié si la plataforma supera 1,80 m; se sube por escalera, trepar por crucetas está prohibido; arriostre si la altura pasa tres veces la base.',
      ejemplo: 'un andamio de 5 m con pasamanos a 1,05 m, intermedia a 0,54 m, rodapié, escalera de acceso y arriostre cumple la G.050.',
      ejemploClave: 'arriostre',
      subrayar: { respalda: 'supera 1,80 m' },
      pregunta: 'Un andamio de obra con la plataforma a 1,50 m tiene pasamanos a 1,05 m e intermedia a 0,54 m, pero no tiene rodapié. ¿Cumple la G.050, y por qué?',
      criterios: [
        'Decide que sí cumple',
        'Da la razón: la G.050 exige el rodapié cuando la plataforma supera 1,80 m, y esta está a 1,50 m; pasamanos e intermedia están en los valores de la norma',
      ],
      critical: [2],
      commonMistakes: ['Cree que todo andamio lleva rodapié a cualquier altura', 'Confunde los valores de la G.050 con los de la OSHA o el D.S. 024'],
    },
    {
      id: 'escalera',
      title: 'Condiciones de la escalera portátil',
      subtitle: 'Apoyo, llegada y forma de subir',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S3-TIJERA', title: 'La escalera portátil' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S3-SUBIR', title: 'Cómo se sube por una escalera' }],
      norma: {
        id: 'norma-escalera',
        title: 'La escalera portátil',
        source: 'OSHA 1910.23 · OSHA 1926.1053 · D.S. 024, art. 372 d',
        body: [
          '- Solo sobre superficie **estable y nivelada**, o asegurada; nunca sobre cajas, barriles u otras bases inestables [1910.23(c)(4) y (13)].',
          '- En obra, inclinación **1 a 4** (el pie a un cuarto de la longitud) y **sobresale 0,9 m** del nivel al que se llega [1926.1053(b)(5) y (b)(1)].',
          '- El último peldaño y la tapa de la tijera **no se pisan**; no se mueve ni se extiende con alguien encima [1910.23(c)(8) y (6)].',
          '- Se sube **de frente, con una mano en la escalera y sin carga**; cerca de electricidad, **largueros no conductores** [1910.23(b)(11)-(13) · 1926.1053(b)(12) · D.S. 024, 372 d].',
        ].join('\n'),
      },
      regla: 'la escalera va sobre superficie estable; sobresale 0,9 m del nivel al que llega; el último peldaño no se pisa; se sube de frente, con una mano y sin carga; cerca de electricidad, largueros no conductores.',
      ejemplo: 'una escalera que llega a un techo de 3 m sobresale 0,9 m del borde, con el pie a un cuarto de su largo.',
      ejemploClave: '0,9',
      subrayar: { respalda: 'largueros no conductores' },
      pregunta: 'Un electricista apoya una escalera de mano de aluminio para revisar un tablero energizado en un poste. ¿Es la escalera adecuada, y por qué?',
      criterios: [
        'Decide que no es la escalera adecuada',
        'Da la razón: cerca de electricidad los largueros deben ser no conductores (fibra de vidrio), y el aluminio conduce [1926.1053(b)(12) · D.S. 024, 372 d]',
      ],
      critical: [2],
      commonMistakes: ['Cree que cualquier escalera sirve si está bien apoyada', 'No relaciona el material de la escalera con la electricidad'],
    },
    {
      id: 'verificacion',
      title: 'Verificación antes de subir',
      subtitle: 'Tarjetas, inspección y enganche',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S3-TARJETAS', title: 'Las tarjetas del andamio' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S3-INSPECCION', title: 'Quién inspecciona y cuándo' }],
      norma: {
        id: 'norma-verificacion',
        title: 'Verificación antes de subir',
        source: 'Norma G.050, 21.1, 21.4 y Anexo C · OSHA 1926.451(f)(3) · OSHA 1910.23(b)(9)-(10)',
        body: [
          '- G.050, Anexo C: todo andamio en obra lleva tarjeta. **Roja:** no se usa, solo se arma, desarma o repara. **Amarilla:** no cumple todo, se trabaja enganchado siempre. **Verde:** plataforma completa, baranda doble, acceso seguro y arriostrado.',
          '- Al andamio lo inspecciona **el capataz a diario** y **el prevencionista firma la lista** (G.050, 21.4); OSHA: una **persona competente antes de cada turno** y tras cualquier suceso [1926.451(f)(3)].',
          '- La escalera se revisa **cada turno**; con defecto, **«No usar»** y fuera de servicio hasta repararla [1910.23(b)(9)-(10)].',
          '- El arnés se engancha a una **línea de vida**; al andamio, solo arriostrado y con eslinga (G.050, 21.1).',
        ].join('\n'),
      },
      regla: 'el andamio lleva tarjeta (roja no se usa, amarilla enganchado siempre, verde completo y arriostrado), lo inspecciona el capataz a diario y el prevencionista firma; la escalera se revisa cada turno: con defecto, «No usar».',
      ejemplo: 'un andamio con tarjeta amarilla se usa, pero enganchado todo el tiempo a una línea de vida, no al andamio.',
      ejemploClave: 'amarilla',
      subrayar: { respalda: ['capataz a diario', 'persona competente antes de cada turno'] },
      pregunta: 'En una obra, el andamio lo revisa cada mañana el mismo operario que va a subir, y nadie firma nada. ¿Cumple la G.050, y por qué?',
      criterios: [
        'Decide que no cumple',
        'Da la razón: la G.050 pone la inspección diaria en el capataz y la firma de la lista en el prevencionista (21.4); la OSHA exige una persona competente antes de cada turno',
      ],
      critical: [2],
      commonMistakes: ['Cree que basta con que alguien lo mire antes de subir', 'Confunde la tarjeta con la inspección'],
    },
  ],

  // Gemelo de los casos A y B: una verificación dada por hecha, con una sola decisión.
  casoCorto: {
    id: 'caso-corto',
    title: 'Tarjeta que corresponde a un andamio',
    subtitle: 'Caso de la fachada',
    keyPointIndex: 3,
    caso: {
      id: 'caso-fachada',
      title: 'Caso: la fachada del mercado',
      referencia: 'el caso de la fachada',
      name: 'Mercado modelo de Chiclayo, fachada',
      source: 'Caso corto construido para Sophia sobre la G.050 (cap. 21 y Anexo C) · pendiente de aprobación del instructor',
      facts: [
        'Se pinta la fachada de un mercado en Chiclayo con un andamio de tres cuerpos (4,5 m)',
        'El andamio está sobre la vereda de concreto y arriostrado al muro',
        'La plataforma del tercer cuerpo es un solo tablón de 20 cm de ancho y 4 cm de espesor, pintado del color de la fachada',
        'Tiene baranda doble completa y se sube por la escalera del andamio',
        'Esa mañana el capataz le colgó la tarjeta verde',
      ],
      question: '¿Le corresponde la tarjeta verde a ese andamio, y por qué?',
    },
    pistas: 'Si dice que sí por la baranda y el arriostre, pregúntale qué exige la verde sobre la plataforma y qué mide el tablón. Si dice que no sin razón, pídele qué condición de la plataforma falla.',
    criterios: [
      'Decide que no le corresponde la verde: la plataforma no cumple (un solo tablón de 20 cm por 4 cm, pintado) y la verde exige plataforma completa',
      'Da la razón: la plataforma va completa, con tablones del espesor y ancho de la norma y sin pintar; un solo tablón angosto y pintado no cumple',
    ],
    critical: [1],
    commonMistakes: ['Da la verde porque tiene baranda y arriostre', 'Cree que un tablón pintado está mejor cuidado'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'Norma G.050 (cap. 21 y Anexo C) · D.S. 024-2016-EM (art. 372) · OSHA 1926.451, 1926.1053 y 1910.23',
    referencias: [
      'Sesión 3 de 12 del curso Trabajos de alto riesgo (48 h). Indicador IND-SI-ALTORIESGO-1: explica los riesgos laborales identificados, las medidas de control y los procedimientos de seguridad de los trabajos en altura, con escaleras y andamios, y en espacios confinados. La sesión 2 dejó el orden de los controles, el sistema de detención y lo que lo mantiene útil; hoy, el andamio y la escalera sobre los que se trabaja.',
      'Antes de esta sesión el estudiante trabajó el capítulo 6 del cuadernillo CV1, «Escaleras y andamios». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Apoyo y plataforma (punto clave 1): suelo nivelado y firme, nunca directo sobre tierra, fango, césped o grava; sobre esos suelos, durmientes de madera de 10 a 12" por 2" bajo dos patas o garruchas (G.050); el andamio soporta 4 veces la carga máxima prevista [G.050 · OSHA 1926.451(a)(1)]; plataforma completa de tablones de 5 cm de espesor y 25 a 30 cm de ancho, sin nudos ni rajaduras y sin pintar (la pintura tapa la falla que hay que ver); tablones de pino prohibidos; OSHA: plataforma entablada entera, sin huecos de más de 2,5 cm [1926.451(b)(1)].',
      'Barandas y acceso (punto clave 2): G.050, 21.2: pasamanos a 1,05 m, intermedia a 0,54 m y rodapié de 10 cm cuando la plataforma supera 1,80 m; OSHA 1926.451: pasamanos de 0,97 a 1,2 m, intermedia a media altura, rodapié de 9 cm; D.S. 024, art. 372: 1,20 m (inciso h) y también 0,90 a 1,00 m (inciso l), dos alturas en el mismo artículo. Acceso por escalera; trepar por crucetas o barandas está prohibido [G.050 · 1926.451(e)(1)]. Arriostre si la altura pasa de tres veces la base de apoyo (G.050, 21.2), en el 2.º, 4.º y 6.º cuerpo.',
      'Escalera portátil (punto clave 3): solo sobre superficie estable y nivelada o asegurada [1910.23(c)(4)]; nunca sobre cajas, barriles u otras bases inestables [(c)(13)]; en obra, inclinación 1 a 4 [1926.1053(b)(5)(i)]; sobresale 0,9 m del nivel al que se llega [1910.23(c)(11) · 1926.1053(b)(1)]; el último peldaño y la tapa de la tijera no se pisan [(c)(8)]; no se mueve ni se extiende con alguien encima [(c)(6)]; se sube de frente y con una mano en la escalera [(b)(11) y (12)], sin cargar objetos que hagan perder el equilibrio [(b)(13)]; cerca de electricidad, largueros no conductores [1926.1053(b)(12) · D.S. 024, 372 d].',
      'Verificación (punto clave 4): G.050, Anexo C: tarjeta roja (no se usa; solo se arma, desarma o repara), amarilla (no cumple todo; se trabaja enganchado de forma permanente), verde (plataforma completa, baranda doble, acceso seguro y arriostrado); el capataz inspecciona a diario y el prevencionista firma la lista (G.050, 21.4); OSHA: persona competente antes de cada turno y tras cualquier suceso [1926.451(f)(3)]; la escalera se revisa cada turno y con defecto va «No usar» y fuera de servicio [1910.23(b)(9)-(10)]; el arnés se engancha a una línea de vida y, al andamio, solo arriostrado y con eslinga o carabinero certificados (G.050, 21.1).',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala los dos casos de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la fachada del mercado, y los ejemplos que Sophia resuelve son propios (los tablones de 4 cm con hueco, el andamio de 5 m completo, la escalera que llega a un techo de 3 m, la tarjeta amarilla).',
    ],
  },
}
