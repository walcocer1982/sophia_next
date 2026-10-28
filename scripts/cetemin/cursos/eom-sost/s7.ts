/**
 * EOM-SOST · S7 · Del mapeo geomecánico al sostenimiento estándar de la labor.
 * Primera sesión del bloque 2 (la S6 es la sustentación del TC1 y no pasa por Sophia).
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV2 (cap. 1). Las láminas se miraron una por una.
 * El caso de la sesión («La ficha de la que se parte», galería 480) NO entra; el
 * ejemplo de la ficha del CV2 (cap. 1.3) es esa misma galería y tampoco se usa.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const ESQ = '04_Recursos-graficos/EOM/esquemas/sost/s7'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_sost_s7.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-EOM-SOST-S7-FOTO-BOCAMINA', archivo: '04_Recursos-graficos/EOM/fotos/gomez2021_ilus38_bocamina-yumpag.png', kind: 'scene', license: TESIS,
    source: 'Gómez Mendoza, S. A. (2021). Diseño y construcción de la rampa Yumpag… Buenaventura, Pasco. UNSAAC, ilustración 38, p. 83',
    description: 'Dos fotografías de la rampa Yumpag. A la izquierda, dentro de la labor: un equipo amarillo con brazo y canastilla elevada, con dos trabajadores con casco frente al techo; la roca de las paredes y del techo es gris oscura y se ve fracturada. A la derecha, la bocamina desde afuera: el portal con franjas amarillas y negras, un cartel verde con una «B» y el rótulo «RAMPA YUMPAG», un ventilador con su manga naranja que entra a la labor, señales de PARE y de equipo de protección, y un murete de concreto al costado de la vía. No hay cotas ni otro texto legible.',
  },
  {
    id: 'IMG-EOM-SOST-S7-EL-PARTE-DE-MAPEO', archivo: `${ESQ}/sost-s7_el-parte-de-mapeo.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Encabezado «LO QUE TRAE EL PARTE DE MAPEO» y cuatro filas con de dónde sale cada dato: fracturas por metro cuadrado, del conteo en la celda; condición de picota, de la prueba en la caja; presencia de agua, de lo que se ve en el frente; casilla GSI y calidad, del cruce en la cartilla. Recuadro al pie: «Con esos tres datos sale la calidad, y no antes».',
  },
  {
    id: 'IMG-EOM-SOST-S7-LO-QUE-FALTA-DEL-PLANO', archivo: `${ESQ}/sost-s7_lo-que-falta-del-plano.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Encabezado «LO QUE NO TRAE EL PARTE, Y HAY QUE BUSCAR» y tres filas: tipo y sección de labor, del plano; avance por disparo, del plan de minado; longitud pendiente, de lo que falta hasta el nivel. Recuadro al pie: «Todo eso cabe en una hoja que se llena antes de pedir».',
  },
  {
    id: 'IMG-EOM-SOST-S7-QUE-ES-EL-ESTANDAR', archivo: `${ESQ}/sost-s7_que-es-el-estandar.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Cuatro puntos numerados: 1 «Es el documento propio de cada mina: no vale el de la mina de al lado»; 2 «Fija el espaciamiento y la longitud de perno: por tamaño de sección de labor»; 3 «La cartilla remite a él: cuando en la fila pone según estándar»; 4 «Dos minas, dos estándares: para la misma sección y la misma roca». Recuadro al pie: «La cartilla dice qué elemento; el estándar dice con qué medida».',
  },
  {
    id: 'IMG-EOM-SOST-S7-QUIEN-LO-APRUEBA', archivo: `${ESQ}/sost-s7_quien-lo-aprueba.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos recuadros: «LO APRUEBA GEOMECÁNICA: y lo actualiza cuando cambian las condiciones» y «LO LEE EL TÉCNICO: está publicado, no se recuerda de memoria». Recuadro al pie: «El técnico no escribe el estándar, lo aplica».',
  },
  {
    id: 'IMG-EOM-SOST-S7-FICHA-DE-PARTIDA', archivo: `${ESQ}/sost-s7_ficha-de-partida.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Encabezado «LOS SEIS DATOS DE LOS QUE SALE TODO EL PEDIDO», numerados: 1 casilla GSI; 2 calidad con su banda de RMR; 3 tipo y sección de labor; 4 sostenimiento que corresponde; 5 espaciamiento; 6 longitud de perno. Al pie: «Ninguno se deduce después: se registra ahora» y, en un recuadro, «La ficha se firma: alguien responde por lo que dice».',
  },
  {
    id: 'IMG-EOM-SOST-S7-UN-DATO-MAL-ESCRITO', archivo: `${ESQ}/sost-s7_un-dato-mal-escrito.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tres recuadros unidos por flechas: «EL ESPACIAMIENTO: un número en la ficha» → «LOS PERNOS DE UNA FILA: salen de dividir por él» → «EL TRAMO ENTERO: multiplica esa fila». Recuadro al pie: «Un dato mal escrito acá se multiplica en todo el pedido».',
  },
  {
    id: 'IMG-EOM-SOST-S7-NO-SE-ESTIRA', archivo: `${ESQ}/sost-s7_no-se-estira.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Cuatro motivos numerados: 1 «Sale del cálculo de geomecánica: no del avance ni del material que hay»; 2 «Ampliarlo deja bloques sin coser: el perno que falta no está en ningún lado»; 3 «El reglamento obliga a mantenerse dentro: art. 214 g) del D.S. 024-2016-EM»; 4 «Si el material no alcanza, se pide: no se estira». Recuadro al pie: «Cambiar el estándar es decisión de geomecánica, no de la guardia».',
  },
  {
    id: 'IMG-EOM-SOST-S7-LA-GUARDIA-SIGUIENTE', archivo: `${ESQ}/sost-s7_la-guardia-siguiente.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos recuadros: «Un espaciamiento cambiado en la labor no queda registrado en ninguna parte» y, resaltado, «La guardia siguiente hereda un tramo que cree sostenido».',
  },
]

export const S7: SesionSpec = {
  slug: 'eom-sost-s7-del-mapeo-geomecanico-al-sostenimiento-estandar-de-la-labor',
  order: 7,
  etiqueta: 'S7',
  idPrefijo: 'sost-s7',
  title: 'Del mapeo geomecánico al sostenimiento estándar',
  objective:
    'Caracteriza una labor de avance con los datos del mapeo geomecánico, obtiene su calidad en la cartilla y registra el sostenimiento estándar con su espaciamiento, que es el dato con el que después se calcula, según el procedimiento operativo.',
  keyPoints: ['Lo que trae el parte de mapeo', 'El estándar de sostenimiento', 'La ficha de partida', 'El espaciamiento no se estira'],
  imagenes: IMAGENES,
  casosDelEquipo: ['galería 480'],

  rutina: {
    imagenId: 'IMG-EOM-SOST-S7-FOTO-BOCAMINA',
    tituloImagen: 'Una rampa por dentro y su bocamina',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // La de la lámina 8: «Para pedir el material de esa labor, ¿qué necesitarían saber antes?»
    // (de «ustedes» a «tú» y con la pregunta al inicio, como en s1–s3).
    preguntas: {
      veo: '¿Qué ves en la fotografía?',
      pienso: '¿Qué necesitarías saber antes de pedir el material de esa labor?',
      mePregunto: '¿Cuál de esos datos no sabrías de dónde sacar?',
    },
    titulos: {
      veo: 'Observación de una rampa y su bocamina',
      pienso: 'Lo que se necesita saber antes de pedir',
      mePregunto: 'De dónde sale cada dato',
    },
    pistaVeo: 'qué hay dentro de la labor y qué se ve en la entrada',
    criterios: {
      pienso: ['Nombra algún dato que necesitaría antes de pedir el material', 'Dice qué de la fotografía le hace pensarlo'],
      mePregunto: ['Nombra un dato que no sabría de dónde sacar, o qué se pregunta'],
    },
    enlaceMePregunto: 'De los datos que nombraste:',
  },

  puntosClave: [
    {
      id: 'parte',
      title: 'Lo que trae el parte de mapeo',
      subtitle: 'Y lo que hay que buscar',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-EOM-SOST-S7-EL-PARTE-DE-MAPEO', title: 'Lo que trae el parte' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S7-LO-QUE-FALTA-DEL-PLANO', title: 'Lo que hay que buscar' }],
      norma: {
        id: 'norma-parte',
        title: 'El parte y lo que falta',
        source: 'CV2, cap. 1.1',
        body: [
          '- El **parte de mapeo** trae tres datos: **fracturas por metro cuadrado, condición de picota y agua**.',
          '- Fracturas en la celda: **2 a 5 LF, 6 a 11 F, 12 a 20 MF, más de 20 IF**.',
          '- Con esos tres se ubica la **casilla** en la cartilla y sale la **calidad**.',
          '- El **tipo y la sección** de la labor salen **del plano**.',
          '- El **avance por disparo** sale **del plan de minado**: dice cuánto se sostiene por vez.',
          '- La **longitud pendiente** sale de lo que falta sostener: dice cuánto tramo hay que pedir.',
        ].join('\n'),
      },
      // 27 oct 2026: el ejemplo traía tres cifras y una casilla que la pregunta no usa;
      // ahora muestra un dato que el parte NO trae (la sección), como pide la pregunta.
      regla: 'el parte de mapeo trae fracturas, picota y agua: de ahí sale la calidad. La sección sale del plano; el avance por disparo, del plan de minado.',
      ejemplo: 'en la rampa 9 el asistente saca la calidad del parte y la sección del plano, porque el parte no la trae.',
      ejemploClave: 'rampa 9',
      subrayar: { respalda: 'avance por disparo' },
      pregunta: 'Para la ficha de un crucero, el asistente busca en el parte de mapeo cuántos metros avanza cada disparo. ¿Lo va a encontrar ahí, y por qué?',
      criterios: [
        'Decide que no lo va a encontrar en el parte',
        'Da la razón: el avance por disparo sale del plan de minado',
      ],
      critical: [2],
      commonMistakes: ['Cree que el parte de mapeo trae todos los datos del pedido', 'Busca la sección o el avance en el parte y no en el plano o el plan de minado'],
    },
    {
      id: 'estandar',
      title: 'El estándar de sostenimiento',
      subtitle: 'Qué fija y quién lo aprueba',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-EOM-SOST-S7-QUE-ES-EL-ESTANDAR', title: 'Qué es el estándar' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S7-QUIEN-LO-APRUEBA', title: 'Quién lo aprueba' }],
      norma: {
        id: 'norma-estandar',
        title: 'El estándar de la unidad',
        source: 'CV2, cap. 1.2 · cartilla geomecánica GSI, nota 1',
        body: [
          '- El estándar es el **documento propio de cada mina**: no vale el de la mina de al lado.',
          '- **Fija el espaciamiento y la longitud del perno por sección** de labor; la cartilla remite a él cuando la fila dice «según estándar».',
          '- **Lo aprueba geomecánica** y lo actualiza cuando cambian las condiciones; el técnico lo lee, no lo recuerda de memoria.',
          '- **Dos minas tienen estándares distintos** para la misma sección.',
        ].join('\n'),
      },
      // 27 oct 2026: el ejemplo mostraba el caso común (abrir el estándar); la pregunta
      // pide lo que el alumno no espera: la misma sección lleva otra medida en otra mina.
      regla: 'la cartilla dice qué elemento; el estándar de la unidad, con qué medida: espaciamiento y largo del perno por sección. Es propio de cada mina.',
      ejemplo: 'dos unidades vecinas tienen la misma galería con pernos a distinto espaciamiento: cada capataz copia el de su propio estándar.',
      ejemploClave: 'unidades vecinas',
      subrayar: { respalda: ['documento propio de cada mina', 'Dos minas tienen estándares distintos'] },
      pregunta: 'Un técnico que llegó de otra mina anota para una rampa el espaciamiento de perno «que allá usábamos para esa misma sección». ¿Vale ese dato, y por qué?',
      criterios: [
        'Decide que no vale ese dato',
        'Da la razón: el estándar es propio de cada mina',
      ],
      critical: [2],
      commonMistakes: ['Cree que la misma sección lleva el mismo perno en cualquier mina', 'Usa el dato de memoria en vez de leer el estándar de la unidad'],
    },
    {
      id: 'ficha',
      title: 'La ficha de partida',
      subtitle: 'Los seis datos del pedido',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-EOM-SOST-S7-FICHA-DE-PARTIDA', title: 'Los seis datos de la ficha' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S7-UN-DATO-MAL-ESCRITO', title: 'Un dato mal escrito se multiplica' }],
      norma: {
        id: 'norma-ficha',
        title: 'La ficha de partida',
        source: 'CV2, cap. 1.3',
        body: [
          '- La ficha reúne seis datos: **casilla GSI, calidad con su banda de RMR, tipo y sección de labor, sostenimiento, espaciamiento y longitud de perno**.',
          '- **Ninguno se deduce después: se registra ahora.**',
          '- **El espaciamiento convierte metros de labor en número de pernos.**',
          '- Sin la longitud de perno, almacén despacha lo que tiene a mano.',
          '- **Un dato mal escrito en la ficha se multiplica en todo el pedido**, y la ficha se firma: alguien responde por lo que dice.',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES.md §5): el ejemplo era una cuenta con cuatro cifras y
      // la pregunta no pide ninguna. Ahora es otro dato que falta (la longitud de perno).
      regla: 'la ficha reúne seis datos y ninguno se deduce después; el espaciamiento es el que convierte metros de labor en número de pernos.',
      ejemplo: 'a la ficha del subnivel 9 le falta la longitud de perno: el planeador la devuelve, porque sin ella almacén despacha lo que tiene.',
      ejemploClave: 'subnivel 9',
      subrayar: { respalda: ['Ninguno se deduce después', 'El espaciamiento convierte metros'] },
      pregunta: 'La ficha de una rampa llega con casilla, calidad, tipo y sección y sostenimiento, pero en el espaciamiento dice «lo vemos en la labor». ¿Se puede armar el pedido con esa ficha, y por qué?',
      criterios: [
        'Decide que no se puede armar el pedido',
        'Da la razón: el espaciamiento es el dato que convierte los metros de labor en número de pernos',
      ],
      critical: [2],
      commonMistakes: ['Cree que el espaciamiento se decide en la labor', 'Cree que basta con el sostenimiento para pedir el material'],
    },
    {
      id: 'no-se-estira',
      title: 'El espaciamiento del estándar en la labor',
      subtitle: 'No se estira',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-EOM-SOST-S7-NO-SE-ESTIRA', title: 'El espaciamiento no se estira' },
      apoyo: [{ imagenId: 'IMG-EOM-SOST-S7-LA-GUARDIA-SIGUIENTE', title: 'Lo que hereda la guardia siguiente' }],
      norma: {
        id: 'norma-estira',
        title: 'El espaciamiento no se estira',
        source: 'CV2, cap. 1.4 · D.S. 024-2016-EM, art. 214 g)',
        body: [
          '- El espaciamiento sale del **cálculo de geomecánica**, no del avance ni del material que hay: ampliarlo deja bloques sin coser.',
          '- El **art. 214 g) del D.S. 024-2016-EM** obliga a mantenerse dentro de los parámetros que calcula geomecánica; cambiarlos es decisión de geomecánica, no de la guardia.',
          '- Si el material no alcanza, **se pide; no se estira**.',
          '- Un espaciamiento cambiado en la labor **no queda registrado**: la guardia siguiente hereda un tramo que cree sostenido.',
        ].join('\n'),
      },
      // 27 oct 2026: el ejemplo (geomecánica junta los pernos) era el caso inverso; ahora
      // alguien en la guardia tiene un motivo para estirar y no lo hace.
      regla: 'el espaciamiento sale del cálculo de geomecánica y el art. 214 g) obliga a mantenerse dentro: ampliarlo deja bloques sin coser. Cambiarlo es decisión de geomecánica.',
      ejemplo: 'en la galería 22 faltaron pernos a mitad del tramo: el capataz no los abrió, pidió más material.',
      ejemploClave: 'galería 22',
      subrayar: { respalda: ['cálculo de geomecánica', 'art. 214 g)'] },
      pregunta: 'A mitad de guardia, el perforista propone abrir los pernos de 1,5 a 2,0 m «porque la roca se ve sana y así terminamos antes». ¿Puede hacerlo, y por qué?',
      criterios: [
        'Decide que no puede hacerlo',
        'Da la razón: el espaciamiento lo fija el cálculo de geomecánica, no la guardia',
      ],
      critical: [2],
      commonMistakes: [
        'Cree que la guardia puede ajustar el espaciamiento según cómo se ve la roca',
        'Cree que terminar antes justifica abrir la malla de pernos',
      ],
    },
  ],

  // Gemelo del caso de la ficha: aquí el error de la ficha no es el espaciamiento
  // sino la casilla (8 fracturas anotadas como MF), en otra labor. Una sola decisión: ¿se firma?
  casoCorto: {
    id: 'caso-corto',
    title: 'Revisión de una ficha en un caso',
    subtitle: 'Caso del crucero 615',
    keyPointIndex: 2,
    caso: {
      id: 'caso-crucero-615',
      title: 'Caso: el crucero 615',
      referencia: 'el caso del crucero 615',
      name: 'Unidad minera Ccollpa, crucero 615',
      source: 'Caso corto construido para Sophia sobre el CV2 y la cartilla GSI · pendiente de aprobación del instructor',
      facts: [
        'Parte de mapeo del crucero 615: 8 fracturas en el metro cuadrado, la roca se indenta 3 mm con la picota, seca',
        'La ficha que dejó el asistente dice: casilla MF/P, calidad D–E',
        'El planeador quiere firmarla hoy para armar el pedido con esa calidad',
      ],
      question: '¿Se puede firmar la ficha del crucero 615 tal como está, y por qué?',
    },
    pistas: 'Si la firma, señálale que compare el conteo de fracturas del parte con la casilla de la ficha. Si dice que no sin razón, dile que falta el porqué.',
    usa: ['norma-parte', 'norma-ficha'],
    criterios: [
      'Decide que no se puede firmar así',
      'Da la razón: con 8 fracturas la estructura es F, no MF',
    ],
    critical: [1],
    commonMistakes: [
      'Firma la ficha sin comparar la casilla con el parte de mapeo',
      'Cree que un error en la casilla no cambia el pedido (la casilla correcta es F/P, calidad C–D)',
    ],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 213 y 214 g) · Cartilla geomecánica GSI de la unidad · Estándar de sostenimiento de la unidad',
    referencias: [
      'Sesión 7 de 12 del curso Sostenimiento de labores mineras (48 h, ciclo II), primera del bloque 2. Indicador IND-EOM-SOST-3: calcula los recursos a utilizar en el sostenimiento de las labores mineras de acuerdo a la información y parámetros obtenidos en el mapeo geomecánico. El bloque 1 terminó sabiendo qué elemento le toca a cada labor; este bloque responde cuánto material hay que pedir, y empieza por la hoja de la que sale todo.',
      'Antes de esta sesión el estudiante trabajó el capítulo 1 del recurso autónomo CV2, «La ficha de partida». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'El parte y lo que falta (punto clave 1): el parte de mapeo trae fracturas por metro cuadrado (2 a 5 LF, 6 a 11 F, 12 a 20 MF, más de 20 IF), condición de picota (se rompe con 3 o más golpes, B; con 1 o 2, R; se indenta menos de 5 mm, P; más de 5 mm, MP) y agua; con esos tres se ubica la casilla y sale la calidad (cartilla de Poderosa: LF/B A, LF/R B, F/B B, F/R B–C, F/P C–D, MF/B B–C, MF/R C–D, MF/P D–E, MF/MP E–F, IF/R D–E, IF/P E–F, IF/MP F). Tipo y sección de la labor salen del plano; el avance por disparo, del plan de minado (cuánto se sostiene por vez); la longitud pendiente, de lo que falta sostener (cuánto tramo hay que pedir).',
      'El estándar (punto clave 2): documento propio de cada mina; fija el espaciamiento y la longitud del perno por sección de labor; la cartilla remite a él cuando dice «según estándar» (nota 1: longitud del perno de acuerdo a estándar por tamaño de sección). Lo aprueba el área de geomecánica y lo actualiza cuando cambian las condiciones; está publicado y se lee, no se recuerda de memoria. Dos minas tienen estándares distintos para la misma sección. La cartilla dice qué elemento; el estándar, con qué medida.',
      'La ficha de partida (punto clave 3): seis datos — casilla GSI (dice de dónde salió la calidad), calidad con su banda de RMR (decide la fila), tipo y sección de labor (deciden la tabla y la columna), sostenimiento que corresponde (lo que se va a pedir), espaciamiento (convierte metros de labor en número de pernos) y longitud de perno (sin ella, almacén despacha lo que tiene a mano). Ninguno se deduce después; un dato mal escrito se multiplica en todo el pedido (las filas de un tramo salen de dividir su longitud por el espaciamiento). La ficha se firma: alguien responde por lo que dice.',
      'El espaciamiento no se estira (punto clave 4): sale del cálculo de geomecánica, no del avance ni del material; ampliarlo deja bloques sin coser; el D.S. 024-2016-EM, art. 214 g), obliga a mantenerse dentro de los parámetros que calcula geomecánica; si el material no alcanza, se pide; un espaciamiento cambiado en la labor no queda registrado y la guardia siguiente hereda un tramo que cree sostenido; cambiar el estándar es decisión de geomecánica, no de la guardia.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del crucero 615, y los ejemplos que Sophia resuelve son propios (la calidad y la sección de la rampa 9, las dos unidades vecinas con estándares distintos, la ficha del subnivel 9 sin longitud de perno, los pernos que faltaron en la galería 22).',
    ],
  },
}
