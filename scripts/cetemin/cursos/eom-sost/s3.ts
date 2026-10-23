/**
 * EOM-SOST · S3 · Caracterización y zonificación: dónde cambia el macizo.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (cap. 4). Las láminas se miraron una por una.
 * El caso de la sesión («Cuatro celdas en ciento veinte metros», galería 340) NO entra.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const ESQ = '04_Recursos-graficos/EOM/esquemas/sost/s3'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-EOM-SOST-S3-FOTO-TEXTURA', archivo: '04_Recursos-graficos/EOM/fotos/gomez2021_ilus35_textura-roca.png', kind: 'scene', license: TESIS,
    source: 'Gómez Mendoza, S. A. (2021). Diseño y construcción de la rampa Yumpag… Buenaventura, Pasco. UNSAAC, ilustración 35, p. 79',
    description: 'Fotografía de la pared de roca de una labor: textura de bandas y vetillas claras y oscuras entrecruzadas, con tonos gris, marrón y verdoso, y un lápiz naranja apoyado abajo a la derecha para dar la escala. No hay rótulos ni cotas.',
  },
  {
    id: 'IMG-EOM-SOST-S3-PICOTA', archivo: `${ESQ}/sost-s3_picota.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s3.py',
    description: 'Tabla «Lo que hace la roca / Con la picota / Condición»: se rompe con tres o más golpes, BUENA; se rompe con uno o dos golpes, REGULAR; se indenta menos de cinco milímetros, POBRE; se indenta más de cinco milímetros, MUY POBRE. Al pie: «Uno o dos golpes es REGULAR, no pobre: ahí se confunde».',
  },
  {
    id: 'IMG-EOM-SOST-S3-LA-CELDA', archivo: `${ESQ}/sost-s3_la-celda.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s3.py',
    description: 'Esquema «se marca con tiza sobre la caja»: una cuadrícula de 1,00 m de lado y, al costado, los cuatro rangos de fracturamiento: LF 2 a 5, levemente fracturada; F 6 a 11, moderadamente fracturada; MF 12 a 20, muy fracturada; IF más de 20, intensamente fracturada. Al pie: «Se cuentan las fracturas que cruzan ese metro cuadrado».',
  },
  {
    id: 'IMG-EOM-SOST-S3-CARTILLA', archivo: '04_Recursos-graficos/EOM/planos/sost_cartilla-gsi_matriz.png', kind: 'diagram', license: 'Documento de la unidad, recurso oficial del curso; uso educativo con cita',
    source: 'CARTILLA-GEOMECANICA-GSI-REV-01, UEA Libertad – UEA La Poderosa de Trujillo (Poderosa)',
    description: 'Cartilla geomecánica GSI Rev. 01 de Poderosa, «Labores de explotación y avances». Columnas: condición superficial por golpes de picota, B buena (se rompe con 3 o más golpes), R regular (se rompe con 1 o 2), P pobre (se indenta menos de 5 mm), MP muy pobre (se indenta más de 5 mm). Filas: estructura por fracturas/m², LF 2 a 5, F 6 a 11, MF 12 a 20, IF más de 20. Casillas con su letra de calidad: LF/B = A, LF/R = B, F/B = B, F/R = B–C, F/P = C–D, MF/B = B–C, MF/R = C–D, MF/P = D–E, MF/MP = E–F, IF/R = D–E, IF/P = E–F, IF/MP = F. Las casillas LF/P, LF/MP, F/MP e IF/B no existen (guion).',
  },
  {
    id: 'IMG-EOM-SOST-S3-SIN-DOS-DATOS', archivo: `${ESQ}/sost-s3_sin-dos-datos.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s3.py',
    description: 'Tres filas: «Solo el conteo de fracturas → MF / ? → no hay casilla»; «Solo la prueba de picota → ? / P → no hay casilla»; «Los dos, en el mismo punto → MF / P → casilla completa». Al pie: «Sin los dos datos no hay casilla, y una casilla no se estima».',
  },
  {
    id: 'IMG-EOM-SOST-S3-MAPEO-POR-CELDAS', archivo: `${ESQ}/sost-s3_mapeo-por-celdas.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s3.py',
    description: 'Esquema «120 metros de galería»: una franja con cuatro celdas marcadas a 0 m, 40 m, 80 m y 110 m. Debajo: «Cada celda queda con su casilla y con su metraje» y «Una sola celda no describe ciento veinte metros».',
  },
  {
    id: 'IMG-EOM-SOST-S3-MAPEO-ENVEJECE', archivo: `${ESQ}/sost-s3_mapeo-envejece.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s3.py',
    description: 'Tres pasos: 1 «Se mapea la labor tal como está hoy» (la celda con su fecha); 2 «La labor avanza y cruza otra cosa» (una falla, un contacto, agua); 3 «El mapeo describe una labor que ya no existe» (y el pedido sale de él). Al pie: «El cuaderno de celdas es el registro que queda».',
  },
  {
    id: 'IMG-EOM-SOST-S3-LIMITES', archivo: `${ESQ}/sost-s3_limites.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s3.py',
    description: 'Tabla «Qué aparece / Qué le hace al macizo / ¿Parte la zona?»: una falla corta la roca de caja a caja, sí, aunque las celdas den lo mismo; un contacto litológico cambia la roca sin cambiar el conteo, sí; entrada de agua no mueve la casilla, condiciona el elemento, sí; más avance, nada por sí solo, no, hasta que cambie algo. Al pie: «El límite cae donde cambia algo que la roca acusa».',
  },
]

export const S3: SesionSpec = {
  slug: 'eom-sost-s3-caracterizacion-y-zonificacion-donde-cambia-el-macizo',
  order: 3,
  etiqueta: 'S3',
  idPrefijo: 'sost-s3',
  title: 'Caracterización y zonificación: dónde cambia el macizo',
  objective:
    'Levanta en una labor las fracturas por metro cuadrado, la condición superficial de las discontinuidades y la presencia de agua, ubica con esos tres datos la casilla que le corresponde en la cartilla GSI, y delimita hasta dónde llega la zona diciendo qué hace que el macizo cambie —una falla, un contacto litológico, la entrada de agua—, según la casuística planteada.',
  keyPoints: ['Los tres datos de la celda', 'La casilla de la cartilla GSI', 'Mapeo por celdas a lo largo de la labor', 'Dónde termina una zona'],
  imagenes: IMAGENES,
  casosDelEquipo: ['galería 340'],

  rutina: {
    imagenId: 'IMG-EOM-SOST-S3-FOTO-TEXTURA',
    tituloImagen: 'Pared de roca con un lápiz de escala',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // La de la lámina 8: «¿Cuántas fracturas contarían en un metro cuadrado de esa caja?»
    preguntas: {
      veo: '¿Qué ves en la fotografía?',
      pienso: '¿Cuántas fracturas contarías en un metro cuadrado de esa caja?',
      mePregunto: '¿Qué te falta saber para ubicar esa roca en la cartilla?',
    },
    titulos: {
      veo: 'Observación de una pared de roca',
      pienso: 'Fracturas en un metro cuadrado',
      mePregunto: 'Lo que falta saber para ubicar esa roca',
    },
    pistaVeo: 'qué formas y colores tiene la roca y para qué está el lápiz',
    criterios: {
      pienso: ['Da un número o un rango de fracturas', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le falta saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'celda',
      title: 'Los tres datos de la celda',
      subtitle: 'Fracturas, picota y agua',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-EOM-SOST-S3-PICOTA', title: 'Lo que dice la picota' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S3-LA-CELDA', title: 'La celda de un metro' }],
      norma: {
        id: 'norma-celda',
        title: 'La celda y sus tres datos',
        source: 'CV1, cap. 4.1 · cartilla geomecánica GSI de la unidad',
        body: [
          '- La **celda** es un cuadro de 1 m por lado marcado sobre la caja; se cuentan las fracturas que lo cruzan: **2 a 5 LF, 6 a 11 F, 12 a 20 MF, más de 20 IF**.',
          '- Condición con la picota: **se rompe con 3 o más golpes, buena (B); se rompe con 1 o 2 golpes, regular (R)**.',
          '- **Se indenta menos de 5 mm, pobre (P); se indenta más de 5 mm, muy pobre (MP)**.',
          '- El agua se anota como **seco, goteo o flujo**. Los tres datos se levantan en el mismo punto y la misma fecha.',
        ].join('\n'),
      },
      regla: 'la celda da tres datos: fracturas por metro cuadrado, condición con la picota y agua. Picota: 3 o más golpes, buena; 1 o 2, regular; se indenta menos de 5 mm, pobre; más, muy pobre.',
      ejemplo: 'una celda con 8 fracturas que se indenta 3 mm: F (6 a 11) y pobre (menos de 5 mm): F/P.',
      ejemploClave: 'indenta',
      subrayar: { respalda: 'se rompe con 1 o 2 golpes' },
      pregunta: 'En una celda la roca se rompe al segundo golpe de picota. ¿La condición es regular o pobre, y por qué?',
      criterios: [
        'Decide que es regular (R)',
        'Da la razón: romperse con uno o dos golpes es condición regular; pobre es cuando la roca no se rompe y solo se indenta',
      ],
      critical: [2],
      commonMistakes: ['Cree que romperse con pocos golpes es condición pobre', 'Confunde romperse con indentarse'],
    },
    {
      id: 'casilla',
      title: 'La casilla de la cartilla GSI',
      subtitle: 'Estructura sobre condición',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-EOM-SOST-S3-CARTILLA', title: 'Cartilla geomecánica GSI' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S3-SIN-DOS-DATOS', title: 'Sin los dos datos no hay casilla' }],
      norma: {
        id: 'norma-casilla',
        title: 'La casilla',
        source: 'CV1, cap. 4.2 · cartilla geomecánica GSI de la unidad',
        body: [
          '- La cartilla lleva la **estructura en filas** y la **condición en columnas**; el cruce da una casilla con nombre propio, escrita estructura sobre condición (MF/P).',
          '- **Sin los dos datos no hay casilla**: una casilla no se estima.',
          '- El agua **no mueve la casilla**: condiciona el elemento. La misma roca con más agua puede pedir otro sostenimiento.',
          '- Ubicar la casilla es el paso que todo lo demás usa.',
        ].join('\n'),
      },
      regla: 'la casilla es el cruce de la estructura (fila) con la condición (columna), escrita estructura sobre condición; sin los dos datos no hay casilla. El agua no la mueve: condiciona el elemento.',
      // 22 oct 2026: el ejemplo sin situación se fundía con la regla y Sophia lo saltaba.
      ejemplo: 'en la rampa 4 el geomecánico cuenta 4 fracturas y la roca se rompe al segundo golpe: anota LF/R, calidad B en la cartilla.',
      ejemploClave: 'rampa 4',
      subrayar: { respalda: ['Sin los dos datos no hay casilla', 'no mueve la casilla'] },
      pregunta: 'El asistente anotó «18 fracturas, goteo» y se olvidó de la prueba de picota. ¿Puedes ubicar la casilla, y por qué?',
      criterios: [
        'Decide que no se puede ubicar',
        'Da la razón: sin los dos datos (estructura y condición) no hay casilla, y una casilla no se estima; el agua no reemplaza la condición',
      ],
      critical: [2],
      commonMistakes: ['Estima la condición para completar la casilla', 'Cree que el agua sustituye a la prueba de picota'],
    },
    {
      id: 'mapeo',
      title: 'Mapeo por celdas de la labor',
      subtitle: 'Con su metraje y su fecha',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-EOM-SOST-S3-MAPEO-POR-CELDAS', title: 'Mapeo por celdas en una galería' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S3-MAPEO-ENVEJECE', title: 'Un mapeo también envejece' }],
      norma: {
        id: 'norma-mapeo',
        title: 'Mapear por celdas',
        source: 'CV1, caps. 4.3 y 4.4',
        body: [
          '- Una sola celda no describe una galería entera: **se mapea cada cierto avance** y cada celda queda con su casilla y su metraje.',
          '- Las celdas seguidas que dan lo mismo forman una **zona**.',
          '- El mapeo **se repite cuando la labor sigue avanzando**: un mapeo viejo describe una labor que ya no existe.',
          '- El **cuaderno de celdas** es el registro que queda.',
        ].join('\n'),
      },
      regla: 'una celda no describe una galería: se mapea cada cierto avance, con casilla y metraje; si la labor avanza se mapea de nuevo: un mapeo viejo describe una labor que ya no existe.',
      ejemplo: 'una galería de 60 m con una sola celda al inicio no está mapeada: faltan celdas a lo largo, con metraje y fecha.',
      ejemploClave: '60 m',
      subrayar: { respalda: 'mapeo viejo describe una labor que ya no existe' },
      pregunta: 'Para pedir el sostenimiento de un frente que avanzó 35 m más, el supervisor quiere usar el cuaderno de celdas de hace dos meses. ¿Sirve ese mapeo, y por qué?',
      criterios: [
        'Decide que no sirve',
        'Da la razón: un mapeo viejo describe una labor que ya no existe; el mapeo se repite cuando la labor sigue avanzando',
      ],
      critical: [2],
      commonMistakes: ['Cree que la roca no cambia con el avance', 'Usa el último mapeo disponible sin mirar su fecha ni su metraje'],
    },
    {
      id: 'zona',
      title: 'Dónde termina una zona',
      subtitle: 'Falla, contacto litológico y agua',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-EOM-SOST-S3-LIMITES', title: 'Qué mueve el límite' },
      norma: {
        id: 'norma-zona',
        title: 'Qué parte una zona',
        source: 'CV1, cap. 4.3 · cartilla geomecánica GSI de la unidad',
        body: [
          '- La **zona** es el tramo del macizo que se comporta igual; el sostenimiento se pide **por zona**, no por galería entera.',
          '- Una **falla** separa dos zonas aunque las celdas de los dos lados den lo mismo.',
          '- Un **contacto litológico** cambia el macizo sin cambiar el conteo: también parte la zona.',
          '- La **entrada de agua** también parte la zona en dos.',
          '- Más avance, por sí solo, no parte nada: el límite cae donde **cambia algo que la roca acusa**.',
        ].join('\n'),
      },
      regla: 'la zona es el tramo que se comporta igual y el sostenimiento se pide por zona; el límite cae donde cambia algo que la roca acusa (falla, contacto litológico, agua), aunque las celdas den lo mismo.',
      ejemplo: 'dos celdas F/B a 20 y 60 m con una falla a los 45 m: dos zonas, aunque el conteo sea el mismo.',
      ejemploClave: 'falla',
      subrayar: { respalda: 'entrada de agua' },
      pregunta: 'Dos celdas seguidas dan MF/R, a 50 m y a 90 m, y a los 70 m empieza a gotear agua. ¿Es una zona o dos, y por qué?',
      criterios: [
        'Decide que son dos zonas',
        'Da la razón: la entrada de agua parte la zona aunque las celdas den lo mismo; el agua no mueve la casilla, pero condiciona el elemento',
      ],
      critical: [2],
      commonMistakes: ['Cree que si las casillas son iguales es una sola zona', 'Cree que el agua cambia la casilla en vez de partir la zona'],
    },
  ],

  // Gemelo del caso de la galería: dos celdas iguales con un contacto en medio.
  casoCorto: {
    id: 'caso-corto',
    title: 'Delimitación de zonas en un caso',
    subtitle: 'Caso de la rampa 210',
    keyPointIndex: 3,
    caso: {
      id: 'caso-rampa-210',
      title: 'Caso: la rampa 210',
      referencia: 'el caso de la rampa',
      name: 'Unidad minera Pallca, rampa 210',
      source: 'Caso corto construido para Sophia sobre el CV1 y la cartilla GSI · pendiente de aprobación del instructor',
      facts: [
        'La rampa 210 lleva 80 m de avance y el cuaderno de celdas trae dos celdas',
        'Celda a los 10 m: 7 fracturas en el metro cuadrado, la roca se rompe al segundo golpe de picota, seca',
        'Celda a los 70 m: 7 fracturas, segundo golpe, seca',
        'El plano geológico marca a los 45 m el contacto entre la caliza y el intrusivo, de caja a caja',
        'El jefe de guardia quiere pedir un solo sostenimiento para toda la rampa «porque las dos celdas dieron igual»',
      ],
      question: '¿Cuántas zonas tiene la rampa, y por qué?',
    },
    pistas: 'Si dice una zona porque las casillas coinciden, pregúntale qué hay a los 45 m y qué le hace eso al macizo. Si dice dos sin razón, pídele qué del plano lo sostiene.',
    criterios: [
      'Decide que son dos zonas, con el límite en el contacto de los 45 m',
      'Da la razón: el contacto litológico cambia el macizo aunque las dos celdas den la misma casilla (F/R); el sostenimiento se pide por zona',
    ],
    critical: [1],
    commonMistakes: ['Pide para toda la rampa porque las celdas dieron igual', 'Cree que solo una falla parte una zona'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 213 y 214) · Cartilla geomecánica GSI de la unidad',
    referencias: [
      'Sesión 3 de 12 del curso Sostenimiento de labores mineras (48 h, ciclo II). Indicador IND-EOM-SOST-2: explica el tipo de sostenimiento seleccionado de acuerdo a la calidad del macizo rocoso y tipo de labor minera, utilizando la metodología del GSI. Las sesiones 1 y 2 enseñaron los elementos; hoy entra la roca, que decide cuál va.',
      'Antes de esta sesión el estudiante trabajó el capítulo 4 del recurso autónomo CV1, «Mapear la roca». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'La celda (punto clave 1): cuadro de 1 m por lado marcado con tiza sobre la caja. Fracturas por metro cuadrado: 2 a 5 LF (levemente fracturada), 6 a 11 F (moderadamente), 12 a 20 MF (muy fracturada), más de 20 IF (intensamente). Condición superficial con la picota: se rompe con 3 o más golpes, buena (B); con 1 o 2, regular (R); se indenta menos de 5 mm, pobre (P); más de 5 mm, muy pobre (MP). Agua: seco, goteo o flujo. Los tres datos se levantan en el mismo punto y la misma fecha. La confusión típica: uno o dos golpes es regular, no pobre.',
      'La casilla (punto clave 2): estructura en filas, condición en columnas; se escribe estructura sobre condición (MF/P). Calidades de la cartilla de Poderosa: LF/B A, LF/R B, F/B B, F/R B–C, F/P C–D, MF/B B–C, MF/R C–D, MF/P D–E, MF/MP E–F, IF/R D–E, IF/P E–F, IF/MP F; LF/P, LF/MP, F/MP e IF/B no existen. Sin los dos datos no hay casilla y no se estima. El agua no mueve la casilla, condiciona el elemento.',
      'Mapeo por celdas (punto clave 3): una celda no describe una galería; se mapea cada cierto avance y cada celda queda con casilla, metraje y fecha; las celdas seguidas que dan lo mismo forman una zona; el mapeo se repite cuando la labor avanza, porque un mapeo viejo describe una labor que ya no existe; el cuaderno de celdas es el registro que queda.',
      'Zonas (punto clave 4): la zona es el tramo del macizo que se comporta igual y el sostenimiento se pide por zona; el límite cae donde cambia algo que la roca acusa: una falla (aunque las celdas de ambos lados den lo mismo), un contacto litológico (cambia el macizo sin cambiar el conteo) o la entrada de agua; más avance por sí solo no parte nada. Pedir para una galería entera deja tramos sin lo que piden.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la rampa 210, y los ejemplos que Sophia resuelve son propios (la celda de 8 fracturas que se indenta 3 mm, la celda LF/R, la galería de 60 m con una sola celda, las dos celdas F/B con una falla a los 45 m).',
    ],
  },
}
