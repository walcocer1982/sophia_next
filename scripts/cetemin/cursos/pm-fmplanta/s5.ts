/**
 * PM-FMPLANTA · S5 · Mantenimiento preventivo y correctivo, y el bloqueo en una parada programada.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (lectura 4 y anexo B). Las láminas se miraron una por una.
 * El caso de la sesión («La ventana de la faja alimentadora del molino 1»,
 * Jorge Ramos) NO entra: es el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
// La tesis nombra la planta; aquí no, porque es la planta del caso del equipo.
const RAVELO = 'Ravelo Chávez, F. L. (2019). Matriz de aislamiento y bloqueo para reducir accidentes en mantenimiento de una planta concentradora. UNCP'
const ESQ = '04_Recursos-graficos/PM/esquemas/fmplanta/s5'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_fmplanta_s5.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-PM-FOTO-CAJA-GRUPAL-BLOQUEO', archivo: '04_Recursos-graficos/PM/fotos/caja-grupal-bloqueo.png', kind: 'scene', license: TESIS,
    source: `${RAVELO}, fig. 4.5.1.3 (p. 80)`,
    description: 'Fotografía tomada desde arriba de una caja metálica roja apoyada sobre una rejilla de piso. De sus ranuras cuelgan varios candados rojos y una pinza metálica con varios agujeros. Alrededor, tarjetas blancas con una franja naranja que dice «PROHIBICIÓN», la foto carné de un trabajador y el sello «V.P»; el resto de lo escrito en las tarjetas no se lee.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-PLANIFICAR', archivo: `${ESQ}/fmplanta-s5_planificar.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tres tarjetas unidas por flechas. PLANIFICAR, «antes»: qué se hace, con qué repuesto y cuánto dura. PROGRAMAR, «la fecha»: cuándo y con quién, en qué parada. EJECUTAR, «después»: con bloqueo, y queda escrito en la orden.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-ORDEN-TRABAJO', archivo: `${ESQ}/fmplanta-s5_orden-trabajo.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Campo / Qué dice»: Tarea, qué se hace y en qué equipo; Tipo, preventivo o correctivo; Frecuencia, cada cuánto, según el fabricante; Duración, horas de trabajo estimadas; Bloqueo, qué puntos se bloquean; Responsable, quién ejecuta y quién verifica.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-PRIORIDAD', archivo: `${ESQ}/fmplanta-s5_prioridad.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Prioridad / La falla… / Se atiende»: 1 · Seguridad, puede herir a alguien, ya (en rojo); 2 · Producción, detiene o reduce la planta, en la ventana; 3 · Daño mayor, crece si se deja, en la ventana; 4 · Lo demás, puede esperar sin riesgo, se difiere.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-DIFERIDA', archivo: `${ESQ}/fmplanta-s5_diferida.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Se anota / Ejemplo»: Fecha de la nueva ventana, la parada del próximo mes; Vigilancia mientras espera, nivel de aceite en cada guardia; Límite para intervenir ya, si el nivel baja de la marca; Responsable, el supervisor de turno. Abajo: «Diferir no es olvidar: es decidir cuándo, con condiciones».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-SEIS-ENERGIAS', archivo: `${ESQ}/fmplanta-s5_seis-energias.png`, kind: 'diagram', license: PROPIA,
    source: `Elaboración propia · D.S. 024-2016-EM, art. 346 · ejemplos de ${RAVELO}, 4.4.3`,
    description: 'Tabla «Energía / Ejemplo en planta»: Eléctrica, motores, tableros, 440 V y 4 160 V; Mecánica, contrapesos, compuertas, poleas; Hidráulica, cilindros de chancadoras cónicas; Neumática, válvulas y cortadores de muestra; Química, reactivos en líneas y tanques; Térmica, pulpa y aceite calientes. Pie: Art. 346 del DS 024-2016-EM · ejemplos de Ravelo Chávez (2019), UNCP, 4.4.3.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-TIEMPO-BLOQUEO', archivo: `${ESQ}/fmplanta-s5_tiempo-bloqueo.png`, kind: 'diagram', license: PROPIA,
    source: `Elaboración propia · datos: ${RAVELO}, tabla 4.4.4.1 y p. 74`,
    description: 'Tabla «Paso, por cada fuente / Min»: Tarjeta de solicitud y trabamiento, 2; Aislamiento y bloqueo de la fuente, 3; Bloqueo de la caja grupal, 1; Prueba de energía cero, 1; Total por fuente, 7 (resaltado). Abajo: «Molino N.º 5: 12 fuentes × 7 + 25 min de gestión = 109 min». Pie: Ravelo Chávez (2019), UNCP, tabla 4.4.4.1 y p. 74.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S5-VENTANA', archivo: `${ESQ}/fmplanta-s5_ventana.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Barra «ventana que concede operaciones» partida en tres: bloqueo (rojo), tareas, en orden (verde, la parte mayor) y holgura (gris). Debajo: «Ventana útil = ventana concedida − tiempo de bloqueo» y, en amarillo, «Si las tareas no caben, se difiere la de menor riesgo».',
  },
]

export const S5: SesionSpec = {
  slug: 'pm-fmplanta-s5-mantenimiento-preventivo-y-correctivo-y-bloqueo-en-una-parada',
  order: 5,
  etiqueta: 'S5',
  idPrefijo: 'fmplanta-s5',
  // El nombre oficial («Mantenimiento preventivo y correctivo, y el bloqueo en una parada programada») pasa de 8 palabras.
  title: 'Preventivo, correctivo y bloqueo en una parada',
  objective:
    'Explica cómo se organiza una parada programada, en qué orden y qué energías se bloquean para ejecutarla.',
  keyPoints: ['Planificación y programación del preventivo', 'Prioridad del correctivo', 'Aislamiento y bloqueo de energías', 'El tiempo de una parada'],
  imagenes: IMAGENES,
  // El técnico del caso, la faja y su vecina, la balanza y la nota del supervisor.
  casosDelEquipo: ['Ramos', 'molino 1', 'faja 9', 'faja 8', 'FT10', '32 minutos', 'celda de carga', 'Atacocha'],

  rutina: {
    imagenId: 'IMG-PM-FOTO-CAJA-GRUPAL-BLOQUEO',
    tituloImagen: 'Caja con candados y tarjetas',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // Las de la lámina 8: «Veo: ¿qué hay en la imagen? Solo lo que se ve. Pienso: ¿qué creen que pasa ahí? Me pregunto: ¿qué les gustaría saber?»
    preguntas: {
      veo: '¿Qué hay en la imagen?',
      pienso: '¿Qué crees que pasa ahí?',
      mePregunto: '¿Qué te gustaría saber?',
    },
    titulos: {
      veo: 'Observación de una caja de candados',
      pienso: 'Lo que pasa con los candados',
      mePregunto: 'Lo que falta saber de los candados',
    },
    pistaVeo: 'qué cuelga de la caja roja y qué dicen las tarjetas',
    criterios: {
      pienso: ['Dice qué cree que pasa con la caja, los candados o las tarjetas', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le gustaría saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'planificar',
      title: 'Planificación y programación del preventivo',
      subtitle: 'Planificar, programar, ejecutar y registrar',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S5-PLANIFICAR', title: 'Planificar, programar, ejecutar' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S5-ORDEN-TRABAJO', title: 'Los campos de una orden de trabajo' }],
      norma: {
        id: 'norma-planificar',
        title: 'Los tres pasos del trabajo',
        source: 'CV1, lectura 4 · según Gulati (2013) · D.S. 024-2016-EM, art. 374',
        body: [
          '- **Planificar** es decidir **qué** se hace, **con qué repuesto** y **cuánto dura**. Va antes.',
          '- **Programar** es decidir **cuándo** y **con quién**, dentro de la ventana que concede operaciones.',
          '- **Ejecutar y registrar** es hacerlo con bloqueo y dejar escrito en la orden qué se hizo y qué se midió.',
          '- La **orden de trabajo** lleva tarea, tipo, frecuencia, duración, bloqueo y responsable; el preventivo sigue la frecuencia del fabricante (art. 374).',
        ].join('\n'),
      },
      regla: 'planificar es decidir antes qué se hace, con qué repuesto y cuánto dura; programar, cuándo y con quién; ejecutar, hacerlo con bloqueo y registrarlo.',
      ejemplo: 'el planner define primero los paneles de una zaranda, su repuesto y 2 horas; recién después fija la parada del jueves con dos mecánicos.',
      ejemploClave: 'jueves',
      subrayar: { respalda: 'Planificar es decidir' },
      pregunta: 'El planner ya fijó para el sábado el cambio de revestimientos de un molino, con su cuadrilla, pero nadie confirmó si el repuesto está en almacén ni cuánto dura el trabajo. ¿Qué paso del trabajo se saltó, y por qué?',
      criterios: [
        'Decide que se saltó la planificación',
        'Da la razón: planificar es decidir antes qué se hace, con qué repuesto y cuánto dura',
      ],
      critical: [2],
      commonMistakes: ['Confunde planificar con programar («ya está en el calendario»): se fijó el cuándo y el con quién sin planificar', 'Dice que falta ejecutar o registrar'],
    },
    {
      id: 'prioridad',
      title: 'Prioridad del correctivo',
      subtitle: 'Seguridad, producción, daño mayor y lo demás',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S5-PRIORIDAD', title: 'Prioridad de un correctivo' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S5-DIFERIDA', title: 'Una tarea diferida' }],
      norma: {
        id: 'norma-prioridad',
        title: 'El correctivo y su prioridad',
        source: 'CV1, lectura 4',
        body: [
          '- El **correctivo** atiende una falla ocurrida o ya detectada; el **correctivo programado** se hace en una ventana, no a la carrera.',
          '- Se prioriza por riesgo: **1 seguridad** (puede herir a alguien: se atiende ya), **2 producción**, **3 daño mayor** (en la ventana), **4 lo demás** (se difiere).',
          '- Lo que se **difiere** lleva fecha de la nueva ventana, vigilancia mientras espera, límite para intervenir ya y responsable.',
          '- Diferir no es olvidar: es decidir cuándo, con condiciones.',
        ].join('\n'),
      },
      regla: 'el correctivo se prioriza por riesgo: primero seguridad, que puede herir a alguien; luego producción; luego daño mayor. Lo demás se difiere, con fecha y vigilancia.',
      ejemplo: 'el supervisor mete en la ventana un rodamiento de zaranda que, si se deja, daña el eje, y difiere pintar una baranda.',
      ejemploClave: 'baranda',
      subrayar: { respalda: ['Se prioriza por riesgo', 'Lo que se difiere lleva'] },
      pregunta: 'En la ventana del sábado cabe una sola de dos tareas: cambiar la guarda rota del acople de una bomba, junto a un pasillo, o el sello que gotea agua limpia sin dañar nada. ¿Cuál entra, y por qué?',
      criterios: [
        'Decide que entra la guarda del acople',
        'Da la razón: la guarda rota puede herir a alguien, y la seguridad va primero',
      ],
      critical: [2],
      commonMistakes: ['Elige el sello porque «gotea», aunque puede esperar sin riesgo', 'Elige la tarea más rápida o la más barata', 'Cree que diferir el sello es dejarlo sin fecha ni vigilancia'],
    },
    {
      id: 'energias',
      title: 'Aislamiento y bloqueo de energías',
      subtitle: 'Las seis energías y la energía cero',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S5-SEIS-ENERGIAS', title: 'Las seis energías' },
      // Sin la figura de los doce puntos del molino: marca la faja alimentadora como punto de bloqueo, la trampa del caso del equipo (27 oct 2026).
      norma: {
        id: 'norma-energias',
        title: 'Bloquear toda fuente de energía',
        source: 'D.S. 024-2016-EM, art. 346 · CV1, lectura 4 y anexo B',
        body: [
          '- El **D.S. 024-2016-EM, art. 346**, manda identificar y bloquear **toda fuente de energía**: eléctrica, mecánica, hidráulica, neumática, química y térmica.',
          '- **Apagar no es bloquear:** bloquear es aislar cada fuente, poner candado y tarjeta, y comprobar que el equipo ya no puede moverse.',
          '- La **matriz de bloqueo** lista cada punto del equipo y su energía.',
          '- La **energía residual** se disipa antes de entrar: presión, gravedad, resortes e inercia. La **prueba de energía cero** lo confirma.',
        ].join('\n'),
      },
      regla: 'el art. 346 manda bloquear toda fuente: eléctrica, mecánica, hidráulica, neumática, química y térmica. Apagar no es bloquear: se aísla cada fuente y se disipa la energía residual.',
      // Antes: la compuerta de una tolva con contrapeso, casi igual al caso corto (tolva, motor y compuerta).
      ejemplo: 'con el motor de una chancadora de quijadas bloqueado, el volante aún gira por inercia: el mecánico espera que pare y lo traba.',
      ejemploClave: 'volante',
      subrayar: { respalda: ['toda fuente de energía', 'Apagar no es bloquear', 'energía residual se disipa'] },
      pregunta: 'Un mecánico va a cambiar una manguera del sistema hidráulico de una chancadora cónica. Ya bloqueó el motor eléctrico y dice que el equipo «ya no tiene energía». ¿Puede empezar, y por qué?',
      criterios: [
        'Decide que todavía no puede empezar',
        'Da la razón: queda la energía hidráulica sin bloquear, con el aceite a presión',
      ],
      critical: [2],
      commonMistakes: ['Cree que bloquear el motor deja el equipo sin energía, cuando solo aísla la eléctrica', 'Olvida la presión residual del aceite, que se disipa y se comprueba con la prueba de energía cero'],
    },
    {
      id: 'ventana',
      title: 'El tiempo de una parada',
      subtitle: 'Bloqueo, tareas y holgura',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S5-TIEMPO-BLOQUEO', title: 'Cuánto cuesta bloquear' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S5-VENTANA', title: 'La ventana de una parada' }],
      norma: {
        id: 'norma-ventana',
        title: 'El bloqueo entra en la ventana',
        source: 'CV1, lectura 4 · Ravelo Chávez (2019), tabla 4.4.4.1',
        // 27 oct 2026 (APRENDIZAJES §5): la cuenta va aquí, una línea por paso, con las
        // cifras de la lámina. La pregunta ya no es la misma cuenta con otros números.
        body: [
          '- Cada fuente bloqueada toma unos **7 min**. El molino de la lámina: 12 fuentes × 7 min + 25 min de gestión = **109 min** de bloqueo.',
          '- **Ventana útil = ventana concedida − tiempo de bloqueo.**',
          '- En una ventana de 5 h (300 min): 300 − 109 = **191 min** para tareas.',
          '- Lo que entra en una parada son las tareas **más** su bloqueo **más** una holgura: un plan que solo suma las tareas no entra nunca.',
          '- Si las tareas no caben, **se difiere la de menor riesgo**, con fecha y vigilancia.',
        ].join('\n'),
      },
      regla: 'el bloqueo ocupa parte de la ventana. Ventana útil = ventana concedida − tiempo de bloqueo; si las tareas no caben, se difiere la de menor riesgo.',
      ejemplo: 'en una ventana de 5 h, el planner resta los 109 min de bloqueo del molino de la lámina: le quedan 191 min para tareas.',
      ejemploClave: '191',
      subrayar: { respalda: ['Ventana útil =', 'solo suma las tareas'] },
      pregunta: 'Operaciones concede 3 h de parada a una zaranda, y el planner programa tareas que suman justo 3 h. ¿Entran las tareas, y por qué?',
      criterios: [
        'Decide que no entran',
        'Da la razón: el bloqueo ocupa parte de la ventana, y a las tareas solo les queda la ventana útil',
      ],
      critical: [2],
      commonMistakes: ['Compara las tareas con la ventana concedida y olvida el bloqueo', 'Cree que el bloqueo se hace antes de la parada, fuera de la ventana', 'Intenta calcular el bloqueo de la zaranda: no hace falta, basta con que tome algún tiempo'],
    },
  ],

  // Gemelo del caso de la ventana de la faja: otro equipo y otra energía olvidada (neumática), una sola decisión.
  casoCorto: {
    id: 'caso-corto',
    title: 'Puntos de bloqueo en un caso',
    subtitle: 'Caso de la tolva de finos',
    keyPointIndex: 2,
    caso: {
      id: 'caso-tolva',
      title: 'Caso: el chute de la tolva de finos',
      referencia: 'el caso de la tolva de finos',
      name: 'Cerro Blanco, tolva de finos',
      source: 'Caso corto construido para Sophia sobre el CV1 · pendiente de aprobación del instructor',
      facts: [
        'Tarea: cambiar el revestimiento gastado del chute bajo la tolva de finos; el mecánico entra al chute',
        'Punto 1 de la matriz: motor del alimentador que saca mineral de la tolva (eléctrica)',
        'Punto 2: válvula de aire del cilindro que abre la compuerta de la tolva (neumática)',
        'Si el cilindro recibe aire, la compuerta abre y el mineral de la tolva cae al chute',
        'El supervisor: «Bloqueen solo el motor del alimentador: con un punto basta y ganamos tiempo»',
      ],
      question: '¿Basta con bloquear el motor del alimentador para que el mecánico entre al chute, y por qué?',
    },
    pistas: 'Si dice que basta, señálale que relea los puntos 1 y 2 de la matriz. Si dice que no sin razón, dile que falta el porqué. No agregues cálculos de tiempo.',
    usa: ['norma-energias'],
    criterios: [
      'Decide que no basta con el motor del alimentador',
      'Da la razón: falta bloquear la válvula de aire del cilindro: con aire, la compuerta abre y el mineral cae al chute',
    ],
    critical: [1],
    commonMistakes: ['Cree que con el motor bloqueado la compuerta no puede moverse', 'Decide por el tiempo que se gana y no por las fuentes de la matriz', 'Bloquea la válvula pero olvida purgar el aire que queda en el cilindro y confirmar con la prueba de energía cero'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (art. 346: bloqueo de toda fuente de energía; arts. 374 y 375: programa de mantenimiento según el fabricante)',
    referencias: [
      'Sesión 5 de 12 del curso Fundamentos mecánicos de planta (48 h, ciclo II), la última antes del TC1. Indicador IND-PM-FMPLANTA-2: explica fallas comunes en equipos mecánicos, proponiendo soluciones de mantenimiento preventivo y correctivo en casos, aplicando protocolos de seguridad. La sesión 4 enseñó a detectar una falla a tiempo; hoy, qué se hace con ella: en qué parada entra, en qué orden y con qué bloqueo.',
      'Antes de esta sesión el estudiante trabajó la lectura 4 del recurso autónomo CV1, «La parada programada y el bloqueo», y el video 3 (bloqueo y etiquetado). Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Planificar y programar (punto clave 1): planificar es decidir antes qué se hace, con qué repuesto y cuánto dura; programar, cuándo y con quién, dentro de la ventana que concede operaciones; ejecutar y registrar, hacerlo con bloqueo y dejar escrito en la orden lo que se hizo y lo que se midió. La orden de trabajo lleva tarea, tipo, frecuencia (según el fabricante), duración, bloqueo y responsable. El reglamento minero manda cumplir el programa del preventivo (art. 374). Las tareas se juntan en una parada para no parar dos veces.',
      'Prioridad del correctivo (punto clave 2): el correctivo atiende una falla ocurrida o ya detectada; el programado se hace en una ventana. Orden: 1 seguridad (puede herir a alguien: ya), 2 producción (detiene o reduce la planta: en la ventana), 3 daño mayor (crece si se deja: en la ventana), 4 lo demás (puede esperar sin riesgo: se difiere). Lo diferido lleva fecha de la nueva ventana, vigilancia, límite para intervenir ya y responsable. El reemplazo sigue el procedimiento del fabricante y deja registro.',
      'Bloqueo (punto clave 3): el art. 346 del D.S. 024-2016-EM manda identificar y bloquear toda fuente de energía: eléctrica (motores, tableros), mecánica (contrapesos, compuertas, poleas), hidráulica (cilindros de chancadoras cónicas), neumática (válvulas), química (reactivos) y térmica (pulpa y aceite calientes). Apagar no es bloquear: aislar cada fuente, candado y tarjeta por persona, liberar la energía almacenada (presión, gravedad, resortes, inercia) y verificar con la prueba de energía cero. La matriz de bloqueo lista cada punto y su energía.',
      'Tiempo de una parada (punto clave 4): cada fuente cuesta unos 7 min (tarjeta 2, aislamiento 3, caja grupal 1, prueba de energía cero 1), más el tiempo de gestión; el molino de la lámina, con 12 fuentes, lleva 12 × 7 + 25 = 109 min. Ventana útil = ventana concedida − tiempo de bloqueo; en una ventana de 5 h (300 min), 300 − 109 = 191 min para tareas. Las tareas se comparan con la ventana útil y, si no caben, se difiere la de menor riesgo. No hagas otras cuentas: la pregunta se responde sin calcular el bloqueo de la zaranda.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la tolva de finos, y los ejemplos que Sophia resuelve son propios (los paneles de la zaranda el jueves, el rodamiento antes que la baranda, el volante de la chancadora de quijadas, el molino de 109 min de bloqueo que deja 191 min en una ventana de 5 h).',
    ],
  },
}
