/**
 * SI-ALTORIESGO · S5 · Control de riesgos en espacios confinados.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * cuadernillo CV1 (cap. 7). Las láminas se miraron una por una (imagenes.csv
 * solo trae «S5 · medir» como descripción y imagen_texto.csv no tiene la S5).
 * Los casos A y B de la sesión (pozo de la textil de Ate, tanque de la bodega
 * de Ica) NO entran: son el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/SI/esquemas'
const FOTO = '04_Recursos-graficos/SI/fotos'
const SOBRE_NORMA = 'Elaboración propia sobre la G.050 (cap. 18), el D.S. 024 (art. 132) y la OSHA 1910.146, verificados en el marco legal del curso'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-SI-ALTORIESGO-S5-MURAL', archivo: `${ESQ}/altoriesgo_s5_mural-entrada.png`, kind: 'scene', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de la U.S. Air Force, dominio público, Wikimedia Commons`,
    description: 'Una fosa de concreto con piso de rejilla metálica y válvulas con etiquetas. Sobre una abertura del piso hay un trípode de aluminio con un malacate azul de manivela; un trabajador con chaleco amarillo, arnés rojo y guantes negros sostiene el malacate; detrás, las piernas de otras dos personas. Por la abertura baja una escalera y se ve un casco blanco abajo. Junto a la escalera, un letrero: «DANGER · PERMIT REQUIRED CONFINED SPACE · DO NOT ENTER». Debajo de la foto, las tres preguntas de la rutina: VEO ¿Qué está pasando en esta entrada? · PIENSO ¿Qué hace cada persona que está afuera? · ME PREGUNTO ¿Qué pasaría si el de adentro no responde? Pie: Fotografías: U.S. Air Force, dominio público.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-FOTO-AISLAR', archivo: `${FOTO}/confinado-s5-aislar.jpg`, kind: 'equipment', license: 'CC BY-SA 4.0',
    source: 'Fotografía: Mariojan photo · Wikimedia Commons, «Dont move the water valve.jpg»',
    description: 'El volante negro de una válvula grande, visto desde arriba, inmovilizado con cadenas cruzadas y abrazaderas atornilladas a sus rayos para que nadie pueda girarlo. En el volante se lee «SHUT», «OPEN» y «MOD. 500». Bloqueo físico de una válvula.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-MEDIR', archivo: `${ESQ}/altoriesgo_s5_medir.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de MTA Capital Construction, CC BY 2.0, Wikimedia Commons`,
    description: 'Arriba, foto de una boca en la vereda rodeada de una baranda amarilla, con un trípode y su malacate amarillo; un trabajador con chaleco naranja mete una manguera negra de ventilación por la boca. Debajo, tres filas: VENTILAR, «Elimina o controla la atmósfera peligrosa» · «Se hace antes de entrar»; MEDIR, «Antes de autorizar la entrada» · «y durante todo el trabajo»; EL ORDEN, «Primero oxígeno, luego inflamables» · «Al final, los tóxicos». Pie: OSHA 1910.146(d)(3)(iv) y (d)(5).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-INSTRUMENTOS', archivo: `${ESQ}/altoriesgo_s5_instrumentos.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de Thiemo Schuff, CC BY-SA 3.0, Wikimedia Commons`,
    description: 'Arriba, foto de la pantalla verde de un medidor de gases con botón OK: CO2 0.170 Vol%, CH4 0 %UEG, H2S 0 ppm, CO 0 ppm, O2 20.9 Vol%. Debajo, tres filas: G.050, «Oxímetro y medidor de gases» · «Explosímetro, según el caso»; D.S. 024, «Monitoreo con certificado» · «Y con calibración vigente»; REGLA, «Sin atmósfera segura confirmada» · «no se emite el permiso». Pie: Norma G.050, cap. 18 · D.S. 024, art. 132.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-EVACUAR', archivo: `${ESQ}/altoriesgo_s5_evacuar.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Cuatro filas: CONDICIÓN, «Aparece una condición prohibida»; SÍNTOMAS, «Señales de exposición en el que está dentro»; AFUERA, «Un peligro fuera del espacio»; EL VIGÍA, «Ya no puede vigilar bien». Franja amarilla: «Y no hace otra tarea que le impida vigilar». Pie: OSHA 1910.146(i)(6) y (i)(10).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-FOTO-VIGIA', archivo: `${FOTO}/confinado-s5-vigia.jpg`, kind: 'scene', license: 'Dominio público (U.S. Air Force)',
    source: 'Fotografía: U.S. Air Force · Wikimedia Commons, «379 EMXS and 379 ECES accomplish confined space refresher training (9384829).jpg»',
    description: 'Vista desde afuera por la boca ovalada de un tanque: en primer plano, el brazo del vigía con guante azul apoyado en el borde; adentro, en penumbra, un trabajador tendido de espaldas en el piso con una linterna en el casco y los brazos levantados (simulacro de desmayo). Sin rótulos.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-RECUPERACION', archivo: `${ESQ}/altoriesgo_s5_recuperacion.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de MTA Capital Construction, CC BY 2.0, Wikimedia Commons`,
    description: 'Arriba, foto de una boca abierta en un terreno de tierra, con un trípode de aluminio y su malacate encima, una manga amarilla de ventilación que entra por la boca y un generador rojo. Debajo, tres filas: SIEMPRE, «Cada vez que alguien entra» · «Salvo que aumente el riesgo»; LA LÍNEA, «En la espalda, a la altura de los hombros» · «O por encima de la cabeza»; AFUERA, «Dispositivo mecánico o punto fijo» · «Mecánico si es vertical y pasa 1,52 m». Pie: OSHA 1910.146(k)(3).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S5-FOTO-RESCATE', archivo: `${FOTO}/confinado-s5-rescate.jpg`, kind: 'scene', license: 'Dominio público (U.S. Navy)',
    source: 'Fotografía: U.S. Navy · Wikimedia Commons, «CNRJ Sasebo Fire and Emergency Services and SRF Conduct Confined Space Drilll (9459733).jpg»',
    description: 'Simulacro de rescate: dos bomberos con casco amarillo, equipo de respiración autónoma y arnés sacan a un maniquí con mameluco azul y arnés de cuerpo entero; uno sostiene un malacate de recuperación. Al fondo, otros bomberos preparan cuerdas junto a una baranda. Sin rótulos.',
  },
]

export const S5: SesionSpec = {
  slug: 'si-altoriesgo-s5-control-de-riesgos-en-espacios-confinados',
  order: 5,
  etiqueta: 'S5',
  idPrefijo: 'altoriesgo-s5',
  title: 'Control de riesgos en espacios confinados',
  // Aprendizaje esperado, literal de sesiones.csv
  objective:
    'Explica qué se hace antes de entrar a un espacio confinado, qué hace el vigía mientras hay alguien dentro y cómo se rescata al que queda adentro sin entrar por él.',
  keyPoints: ['Aislamiento del espacio confinado', 'Ventilación y medición de la atmósfera', 'Funciones del vigía', 'Rescate sin entrar'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Ate', 'Ica', 'textil', 'efluentes', 'teñido', 'pisco', 'bodega', 'fermentación'],

  rutina: {
    imagenId: 'IMG-SI-ALTORIESGO-S5-MURAL',
    tituloImagen: 'Trípode en una fosa de válvulas',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del PPT de la sesión',
    // Tal como están escritas en la imagen
    preguntas: {
      veo: '¿Qué está pasando en esta entrada?',
      pienso: '¿Qué hace cada persona que está afuera?',
      mePregunto: '¿Qué pasaría si el de adentro no responde?',
    },
    titulos: {
      veo: 'Observación de una entrada con trípode',
      pienso: 'Lo que hace cada persona de afuera',
      mePregunto: 'Si el de adentro no responde',
    },
    pistaVeo: 'qué hay sobre la abertura y dónde está cada persona',
    criterios: {
      pienso: ['Dice qué cree que hace alguien que está afuera', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué pasaría o qué habría que hacer si el de adentro no responde, o qué le falta saber'],
    },
    enlaceMePregunto: 'Sobre las personas de afuera que señalaste:',
  },

  puntosClave: [
    {
      id: 'aislar',
      title: 'Aislamiento del espacio confinado',
      subtitle: 'Que nada pueda entrar',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S5-FOTO-AISLAR', title: 'Válvula bloqueada' },
      norma: {
        id: 'norma-aislar',
        title: 'Aislar antes de entrar',
        source: 'OSHA 1910.146(b) · Norma G.050, cap. 18 · CV1, cap. 7',
        body: [
          '- Aislar es sacar el espacio de servicio: que **no pueda entrar energía ni material** mientras hay alguien dentro [1910.146(b)].',
          '- Se hace con **brida ciega, tramo desmontado, doble bloqueo y purga, o bloqueo y etiquetado**.',
          '- **Cerrar una válvula y colgar un cartel no es aislar** (CV1, cap. 7).',
          '- Si se suelda u oxicorta dentro, los cilindros y la máquina **se quedan afuera** (G.050, cap. 18).',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4): «parece aislado y no lo está» es la excepción;
      // el ejemplo la muestra con otro equipo (una bomba con cartel) y cómo se corrige.
      regla: 'aislar es impedir físicamente que entre energía o material: brida ciega, tramo desmontado, doble bloqueo y purga, o bloqueo y etiquetado; un cartel solo avisa.',
      ejemplo: 'un electricista apaga la bomba que llena una poza y le pega un cartel: alguien puede encenderla; recién la aísla con candado y etiqueta.',
      ejemploClave: 'poza',
      subrayar: { respalda: ['no es aislar', 'brida ciega, tramo desmontado'] },
      pregunta: 'Antes de entrar a un tanque de soda cáustica, el operador cierra la válvula de llenado y le cuelga un cartel de «No abrir». ¿Quedó aislado el tanque, y por qué?',
      criterios: [
        'Decide que no quedó aislado',
        'Da la razón: una válvula cerrada con cartel se puede abrir, no impide físicamente que entre material',
      ],
      critical: [2],
      commonMistakes: ['Cree que cerrar la válvula basta para aislar', 'Cree que el cartel de «No abrir» impide que la abran'],
    },
    {
      id: 'medir',
      title: 'Ventilación y medición de la atmósfera',
      subtitle: 'Antes de entrar y durante todo el trabajo',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S5-MEDIR', title: 'Ventilar, y medir en orden' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S5-INSTRUMENTOS', title: 'Instrumentos y atmósfera segura' }],
      norma: {
        id: 'norma-medir',
        title: 'Ventilar y medir',
        source: 'OSHA 1910.146(d)(3)(iv) y (d)(5) · Norma G.050, cap. 18 · D.S. 024, art. 132',
        body: [
          '- Se **ventila o purga** para eliminar o controlar la atmósfera peligrosa [(d)(3)(iv)].',
          '- Se mide **antes de autorizar la entrada y durante todo el trabajo** [(d)(5)].',
          '- En orden: **primero el oxígeno, después los inflamables y al final los tóxicos** [(d)(5)(iii)].',
          '- Sin atmósfera segura confirmada, no se emite el permiso; si el trabajo se suspende **más de 2 h, se vuelve a medir** (G.050, cap. 18).',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §1 y §4): el ejemplo era el orden de lectura, otra
      // regla; ahora muestra lo que la pregunta pide: medir también durante el trabajo.
      regla: 'se ventila antes de entrar y se mide antes de autorizar la entrada y durante todo el trabajo, porque la atmósfera cambia mientras se trabaja.',
      ejemplo: 'un soldador entra a una cámara que midió bien, con el monitor encendido al pecho: a la hora suena por oxígeno bajo y sale.',
      ejemploClave: 'soldador',
      subrayar: { respalda: 'durante todo el trabajo' },
      pregunta: 'Un tanque se ventiló y la medición de la mañana salió bien. Después, un operario entra a pintarlo por dentro y el medidor se queda guardado en la caseta. ¿Está controlada la atmósfera, y por qué?',
      criterios: [
        'Decide que no está controlada',
        'Da la razón: hay que medir durante todo el trabajo, porque la atmósfera cambia',
      ],
      critical: [2],
      commonMistakes: ['Cree que una buena medición al inicio vale para todo el trabajo', 'Cree que la ventilación previa reemplaza la medición durante el trabajo'],
    },
    {
      id: 'vigia',
      title: 'Funciones del vigía',
      subtitle: 'Se queda afuera, vigila y ordena salir',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S5-EVACUAR', title: 'Cuándo el vigía ordena salir' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S5-FOTO-VIGIA', title: 'El vigía en la boca' }],
      norma: {
        id: 'norma-vigia',
        title: 'El vigía',
        source: 'Norma G.050, cap. 18 · OSHA 1910.146(i)(4)-(10)',
        body: [
          '- G.050: en todo momento, **un trabajador fuera del espacio** para una emergencia. OSHA: el vigía se queda afuera hasta que otro vigía lo releve [(i)(4)].',
          '- Se comunica con los de adentro para saber cómo están [(i)(5)].',
          '- Ordena salir ante una condición prohibida, **señales de exposición** en el que está dentro, un peligro de afuera, o si ya no puede vigilar bien [(i)(6)].',
          '- **No hace otra tarea** que le impida vigilar y proteger a los de adentro [(i)(10)].',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4): «ordena salir aunque el medidor no suene» es la
      // excepción; el ejemplo era un peligro de afuera y ahora es otra señal de exposición.
      regla: 'el vigía se queda afuera y ordena salir ante señales de exposición en el de adentro, una condición prohibida, un peligro de afuera o si no puede vigilar.',
      ejemplo: 'el de adentro dice que se marea y el medidor no ha sonado: el vigía le ordena salir por esa señal de exposición.',
      ejemploClave: 'marea',
      subrayar: { respalda: 'señales de exposición' },
      pregunta: 'Mientras un operario limpia un tanque, el vigía lo oye hablar enredado y reírse sin motivo; el medidor no ha sonado. ¿Qué hace el vigía, y por qué?',
      criterios: [
        'Decide que el vigía le ordena salir de inmediato',
        'Da la razón: hablar enredado y reírse sin motivo son señales de exposición',
      ],
      critical: [2],
      commonMistakes: ['Espera a que suene el medidor para actuar', 'Cree que el vigía debe entrar a ver qué pasa'],
    },
    {
      id: 'rescate',
      title: 'Rescate sin entrar',
      subtitle: 'El sistema de recuperación',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S5-RECUPERACION', title: 'El sistema de recuperación' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S5-FOTO-RESCATE', title: 'Simulacro de rescate' }],
      norma: {
        id: 'norma-rescate',
        title: 'Rescate sin entrar',
        source: 'OSHA 1910.146(k)(1) y (k)(3) · OSHA 1910.146(i)(9) · Norma G.050, cap. 18',
        body: [
          '- Sistema de recuperación **siempre que alguien entra**, salvo que aumente el riesgo; la línea va en la espalda, a la altura de los hombros, o sobre la cabeza [(k)(3)].',
          '- El otro extremo, a un **dispositivo mecánico o a un punto fijo** afuera; en espacio vertical de **más de 1,52 m**, dispositivo mecánico [(k)(3)(ii)].',
          '- El vigía **rescata desde afuera**; entra solo si está entrenado, equipado y relevado [(i)(9) y nota de (i)(4)]. G.050: arnés, cuerda al exterior y respiración autónoma lista.',
          '- El servicio de rescate se elige por su **capacidad de llegar a tiempo** [(k)(1)(i)].',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4): el ejemplo era un ducto horizontal con punto fijo,
      // justo lo que el alumno no debe generalizar; ahora muestra el caso vertical con su
      // dispositivo mecánico. El criterio no lleva la cifra: la respuesta es el dispositivo.
      regla: 'la línea del arnés va afuera a un punto fijo o a un dispositivo mecánico; si el espacio es vertical y pasa 1,52 m, solo a un dispositivo mecánico.',
      ejemplo: 'en una cisterna vertical de 2 m, la supervisora exige trípode con malacate: así el vigía sube al de adentro sin entrar.',
      ejemploClave: 'cisterna',
      subrayar: { respalda: 'más de 1,52 m' },
      pregunta: 'Un operario baja por la escalera a un pozo vertical de 4 m con arnés, y la línea de recuperación va amarrada a la baranda de la boca; no hay trípode ni malacate. ¿Está listo el rescate, y por qué?',
      criterios: [
        'Decide que no está listo',
        'Da la razón: un espacio vertical de esa profundidad exige un dispositivo mecánico para sacarlo',
      ],
      critical: [2],
      commonMistakes: ['Cree que basta con que la línea esté amarrada a algo firme', 'Cree que el vigía puede bajar a sacarlo'],
    },
  ],

  // Gemelo de los casos A y B: una entrada preparada casi entera, con una sola
  // falla distinta de las de los equipos (el reingreso sin volver a medir).
  casoCorto: {
    id: 'caso-corto',
    title: 'Reingreso a un espacio confinado',
    subtitle: 'Caso del tanque de salmuera',
    keyPointIndex: 0,
    caso: {
      id: 'caso-salmuera',
      title: 'Caso: el tanque de salmuera',
      referencia: 'el caso del tanque de salmuera',
      name: 'Conservera del Sur, Ilo',
      source: 'Caso corto construido para Sophia sobre la G.050 (cap. 18) y la OSHA 1910.146 · pendiente de aprobación del instructor',
      // 27 oct 2026 (APRENDIZAJES §7): menos hechos; los que quedan descartan las otras
      // fallas para que la decisión sea una sola (la pausa de más de dos horas).
      facts: [
        'En una conservera hay que cambiar el empaque de la boca de un tanque de salmuera vacío, de 3 m de alto',
        'El tanque está aislado con bridas ciegas y ventilado; hay vigía en la boca y trípode con malacate',
        'A las 8:00 se midió la atmósfera, salió en rango y se firmó el permiso del turno',
        'A las 10:00 se paró el trabajo por una falla de la grúa y se reanudó a las 12:30',
        'El supervisor dice: «ya medimos en la mañana y el permiso vale todo el turno; entren»',
      ],
      question: '¿Puede el operario volver a entrar así, y por qué?',
    },
    pistas: 'Si dice que sí porque el permiso sigue vigente, señálale que mire cuánto tiempo estuvo parado el trabajo. Si dice que no sin razón, dile que falta el porqué.',
    criterios: [
      'Decide que no puede entrar sin volver a medir la atmósfera',
      'Da la razón: el trabajo estuvo parado más de dos horas, y entonces se vuelve a medir',
    ],
    critical: [1],
    commonMistakes: ['Cree que el permiso vigente del turno reemplaza la nueva medición', 'Cree que una medición de la mañana vale todo el día'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'OSHA 1910.146 (d), (e), (i) y (k) · Norma G.050 (cap. 18) · D.S. 024-2016-EM (art. 132)',
    referencias: [
      'Sesión 5 de 12 del curso Trabajos de alto riesgo (48 h). Indicador IND-SI-ALTORIESGO-1: explica los riesgos laborales identificados, las medidas de control y los procedimientos de seguridad de los trabajos en altura, con escaleras y andamios, y en espacios confinados. La sesión 4 dejó qué es un espacio confinado, cuándo exige permiso y sus peligros; hoy, cómo se controlan antes de entrar, mientras hay alguien dentro y si queda adentro.',
      'Antes de esta sesión el estudiante trabajó el capítulo 7 del cuadernillo CV1, «Espacios confinados». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Aislar (punto clave 1): sacarlo de servicio, sin que entre energía ni material [1910.146(b)]; con brida ciega, tramo desmontado, doble bloqueo y purga, o bloqueo y etiquetado. Cerrar una válvula y colgar un cartel no es aislar (CV1). Si se suelda u oxicorta dentro, cilindros y máquina se quedan afuera (G.050, cap. 18).',
      'Ventilar y medir (punto clave 2): ventilar o purgar para eliminar o controlar la atmósfera peligrosa [(d)(3)(iv)]; medir antes de autorizar la entrada y seguir midiendo durante el trabajo [(d)(5)]; primero el oxígeno, después los inflamables y al final los tóxicos [(d)(5)(iii)], porque sin saber el oxígeno las demás lecturas no son confiables. G.050: oxímetro, medidor de gases y explosímetro según el caso; sin atmósfera segura confirmada no se emite el permiso. En minería, monitoreo con certificado y calibración vigente (D.S. 024, art. 132). Permiso: visible a la entrada [G.050 · (e)(3)]; un turno como máximo (G.050) y nunca más que la tarea [(e)(4)]; se cancela al terminar o si aparece una condición no admitida [(e)(5)]; si se suspende más de 2 h, se vuelve a medir (G.050).',
      'El vigía (punto clave 3): G.050: en todo momento un trabajador fuera del espacio para una emergencia. OSHA: se queda afuera hasta que otro vigía lo releve [(i)(4)]; se comunica con los de adentro [(i)(5)]; ordena salir ante una condición prohibida, señales de exposición, un peligro de afuera o si ya no puede vigilar bien [(i)(6)]; no hace otra tarea que le impida vigilar y proteger a los de adentro [(i)(10)].',
      'Rescate sin entrar (punto clave 4): G.050: con riesgo de atmósfera peligrosa, arnés y cuerda de rescate al exterior y equipo de respiración autónoma listo. OSHA: sistema de recuperación siempre que alguien entre, salvo que aumente el riesgo [(k)(3)]; la línea en la espalda a la altura de los hombros o sobre la cabeza [(k)(3)(i)]; el otro extremo a un dispositivo mecánico o a un punto fijo afuera, y en espacio vertical de más de 1,52 m, dispositivo mecánico disponible [(k)(3)(ii)]. El vigía rescata desde afuera [(i)(9)]; entra solo si está entrenado, equipado y relevado [nota de (i)(4)]. El servicio de rescate se elige por su capacidad de llegar a tiempo [(k)(1)(i)].',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala los dos casos de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del tanque de salmuera, y los ejemplos que Sophia resuelve son propios (la bomba de la poza con cartel, el soldador con el monitor al pecho, el que dice que se marea, la cisterna vertical con trípode).',
    ],
  },
}
