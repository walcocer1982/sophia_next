/**
 * SI-ALTORIESGO · S7 · Control de riesgos en trabajos en caliente.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * cuadernillo CV2 (cap. 1). Las láminas se miraron una por una (imagenes.csv
 * solo trae «S7 · prohibido» como descripción y imagen_texto.csv no tiene la S7).
 * La S6 es la sustentación del TC1: no tiene sesión con Sophia.
 * Los casos A y B de la sesión (fábrica de muebles de Villa El Salvador, grifo
 * de Piura) NO entran: son el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const ESQ = '04_Recursos-graficos/SI/esquemas'
const FOTO = '04_Recursos-graficos/SI/fotos'
const SOBRE_NORMA = 'Elaboración propia sobre la OSHA 1910.252, 1926.350 y 1926.352, el D.S. 024 (arts. 84, 93 y 131) y la G.050 (caps. 19 y 24), verificados en el marco legal del curso'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-SI-ALTORIESGO-S7-MURAL', archivo: `${ESQ}/altoriesgo_s7_mural-entrada.png`, kind: 'scene', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de Kroisenbrunner, CC BY-SA 4.0, Wikimedia Commons`,
    description: 'Taller al aire libre con piso de tierra: un hombre agachado suelda con arco la pala de una hélice de barco de bronce, con una pantalla de mano frente a la cara; salen chispas. Detrás, de pie y sin protección, un joven de polo rojo mira el arco. Alrededor, otras hélices grandes, un eje largo sobre cadenas colgantes, barras de fierro, un cilindro negro y la entrada oscura de un taller. Debajo de la foto, las tres preguntas de la rutina: VEO ¿Qué está pasando en este trabajo? · PIENSO ¿Qué hay cerca que podría encenderse? · ME PREGUNTO ¿Quién se daría cuenta si algo prende? Pie: Fotografías: Kroisenbrunner, CC BY-SA 4.0.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-PROHIBIDO', archivo: `${ESQ}/altoriesgo_s7_prohibido.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de Ambadyanands, CC BY-SA 4.0, Wikimedia Commons`,
    description: 'Arriba, foto de una ruma de cilindros metálicos (bidones) oxidados, echados al costado de un camino. Debajo, tres filas: EL PISO, «Aserrín, papel o fibras: se barre» · «En un radio de 10,7 m»; EL AIRE, «Con atmósfera explosiva, no se trabaja» · «Tampoco con polvo combustible»; EL RECIPIENTE, «Si tuvo inflamables, se llena de agua» · «O se limpia a fondo antes». Pie: OSHA 1910.252(a)(2)(v) y (vi) · 1926.352(i).',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-FOTO-CHISPAS', archivo: `${FOTO}/caliente-s7-chispas.jpg`, kind: 'scene', license: 'CC BY-SA 3.0',
    source: 'Fotografía: Biswarup Ganguly · Wikimedia Commons, «Grinding Sparks - Kolkata 2011-11-26 7427.JPG»',
    description: 'Primer plano de una mano que esmerila con amoladora angular el borde de una pieza de acero sobre un tubo; un chorro largo de chispas naranjas sale hacia la izquierda y cruza toda la foto. Sin rótulos.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-PERMISO', archivo: `${ESQ}/altoriesgo_s7_permiso.png`, kind: 'diagram', license: PROPIA, source: SOBRE_NORMA,
    description: 'Tres filas: QUIÉN, «Quien autoriza inspecciona el área» · «Y fija las precauciones»; CÓMO, «De preferencia, en un permiso escrito» · «Visible en el lugar (D.S. 024)»; CON QUIÉN, «Personal con la capacitación» · «Que el trabajo exige (D.S. 024)». Franja amarilla: «El permiso se da después de mirar el área, no antes». Pie: OSHA 1910.252(a)(2)(iv) · D.S. 024, art. 131.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-FOTO-EXTINTOR', archivo: `${FOTO}/caliente-s7-extintor.jpg`, kind: 'scene', license: 'Dominio público (U.S. Navy)',
    source: 'Fotografía: U.S. Navy · Wikimedia Commons, «160803-N-FP878-012 (28160119544).jpg»',
    description: 'Pasillo estrecho de un buque: al fondo, un trabajador agachado corta metal y las chispas caen al piso azul. En primer plano, de espaldas, el vigía de fuego, con gafas azules y tapones de oído, sostiene un extintor rojo con la mano en la palanca y la manguera lista, con su tarjeta de revisión colgada. En la pared, un rótulo: «HATCH WRENCH STWG ENGR». Sin otros rótulos.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-FOTO-VIGIA', archivo: `${FOTO}/caliente-s7-vigia.jpg`, kind: 'scene', license: 'Dominio público (U.S. Navy)',
    source: 'Fotografía: U.S. Navy · Wikimedia Commons, «US Navy 070417-N-1317P-005 Airman Patrick Townsend stands a fire watch aboard the Nimitz-class aircraft carrier USS Carl Vinson»',
    description: 'Dentro de un buque en reparación: un trabajador con casco blanco, echado en el piso, corta junto a una pared amarilla descascarada y salta un chorro de chispas. De pie a su lado, un vigía de fuego con casco, lentes, capucha y guantes de cuero sostiene un extintor rojo. En la pared, un letrero en inglés: «Welding, burning, brazing and other hot work to the topside 03 level deck is prohibited unless authorized by the fire safety officer». Al fondo, un cilindro negro y mangueras en el piso.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-FOTO-CILINDROS', archivo: `${FOTO}/caliente-s7-cilindros.jpg`, kind: 'equipment', license: 'CC BY-SA 3.0',
    source: 'Fotografía: Gtturbocos · Wikimedia Commons, «Equipo de soldado por combustion.JPG»',
    description: 'En un taller, un equipo oxiacetilénico en su carro azul de dos ruedas: un cilindro gris de oxígeno con capuchón azul y uno rojo de acetileno con rombo de inflamable, los dos de pie y sujetos con cadena al carro, con sus reguladores y manómetros arriba y las mangueras roja y azul enrolladas. Atrás, un tablero con herramientas colgadas. Sin rótulos.',
  },
  {
    id: 'IMG-SI-ALTORIESGO-S7-EPP', archivo: `${ESQ}/altoriesgo_s7_epp.png`, kind: 'diagram', license: PROPIA,
    source: `${SOBRE_NORMA} · fotografía de la U.S. Navy, dominio público, Wikimedia Commons`,
    description: 'Arriba, foto de un trabajador con protector facial transparente y guantes de cuero que esmerila un tubo; las chispas vuelan hacia él. Debajo, tres filas: SOLDADOR, «Careta con filtro y respirador» · «Guantes y ropa para calor»; AYUDANTE, «La misma protección que el soldador» · «Área de arco aislada a la vista»; ESMERIL, «Respirador, lentes y protector facial» · «Y ropa en buenas condiciones». Pie: D.S. 024-2016-EM, arts. 84 y 93.',
  },
]

export const S7: SesionSpec = {
  slug: 'si-altoriesgo-s7-control-de-riesgos-en-trabajos-en-caliente',
  order: 7,
  etiqueta: 'S7',
  idPrefijo: 'altoriesgo-s7',
  title: 'Control de riesgos en trabajos en caliente',
  // Aprendizaje esperado, literal de sesiones.csv
  objective:
    'Explica qué condiciones debe tener el área antes de un trabajo en caliente, qué controles lo acompañan antes, durante y después.',
  keyPoints: ['El área antes del trabajo en caliente', 'El permiso de trabajo en caliente', 'El vigía de fuego', 'Protección de quien suelda y de los cilindros'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Villa El Salvador', 'Piura', 'muebles', 'grifo', 'marquesina', 'barniz', 'extractor', 'surtidores'],

  rutina: {
    imagenId: 'IMG-SI-ALTORIESGO-S7-MURAL',
    tituloImagen: 'Soldadura de una hélice',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 9 del PPT de la sesión',
    // Tal como están escritas en la imagen
    preguntas: {
      veo: '¿Qué está pasando en este trabajo?',
      pienso: '¿Qué hay cerca que podría encenderse?',
      mePregunto: '¿Quién se daría cuenta si algo prende?',
    },
    titulos: {
      veo: 'Observación de un trabajo con soldadura',
      pienso: 'Lo que podría encenderse cerca',
      mePregunto: 'Quién se daría cuenta de un fuego',
    },
    pistaVeo: 'qué hace el hombre agachado y quién está detrás de él',
    criterios: {
      pienso: ['Dice qué cree que podría encenderse cerca del trabajo, o que no ve nada', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice quién podría darse cuenta si algo prende, o qué le falta saber'],
    },
    enlaceMePregunto: 'Sobre lo que podría encenderse, que señalaste:',
  },

  puntosClave: [
    {
      id: 'area',
      title: 'El área antes del trabajo en caliente',
      subtitle: 'Retirar, confinar o no trabajar',
      keyPointIndex: 0,
      // La lámina muestra los recipientes, que es lo que decide la pregunta; las
      // chispas acompañan el ejemplo y salen a pedido.
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S7-PROHIBIDO', title: 'Dónde no se suelda' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S7-FOTO-CHISPAS', title: 'Hasta dónde llegan las chispas' }],
      norma: {
        id: 'norma-area',
        title: 'El área antes de empezar',
        source: 'OSHA 1926.352(a), (b) e (i) · OSHA 1910.252(a)(1)(iii) y (a)(2)(v)-(vi) · D.S. 024, art. 131 · G.050, cap. 19',
        body: [
          '- Si la pieza no se mueve, **se retiran los combustibles**; si no se pueden retirar, **se confinan el calor, las chispas y la escoria**; si no se puede ninguna de las dos, **no se suelda ni se corta** [1926.352(a)-(b) · 1910.252(a)(1)(iii)].',
          '- Aserrín, papel o fibras en el piso: se barre en un radio de **10,7 m**; con atmósfera explosiva o polvo combustible acumulado, **prohibido** [1910.252(a)(2)(v)-(vi)].',
          '- Un **recipiente que tuvo inflamables** se llena de agua o se limpia a fondo **antes** [1926.352(i)].',
          '- Mina: inspección previa, retiro de inflamables, áreas aledañas protegidas y ventilación (D.S. 024, art. 131). Obra: inflamables a **15 m** o más de fuentes de ignición (G.050, cap. 19).',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §4): «vacío y aun así no se suelda» es la excepción;
      // el ejemplo era retirar o cubrir cajas (otra regla) y ahora es otro recipiente.
      regla: 'se retiran los combustibles o se confinan las chispas; si no se puede, no se suelda. Un recipiente que tuvo inflamables se llena de agua o se limpia antes.',
      ejemplo: 'un mecánico va a cortar un tambor vacío de petróleo: primero lo llena de agua, porque sus vapores pueden encenderse.',
      ejemploClave: 'tambor',
      subrayar: { respalda: 'tuvo inflamables' },
      pregunta: 'Un soldador debe reparar con soldadura un bidón metálico vacío que contenía thinner; el dueño dice que «ya está vacío». ¿Puede soldarlo así, y por qué?',
      criterios: [
        'Decide que no puede soldarlo así',
        'Da la razón: un recipiente que tuvo inflamables se llena de agua o se limpia a fondo antes de soldar',
      ],
      critical: [2],
      commonMistakes: ['Cree que un recipiente vacío ya no tiene peligro, sin pensar en los vapores que quedan', 'Mira solo lo que hay alrededor y no lo que hubo dentro'],
    },
    {
      id: 'permiso',
      title: 'El permiso de trabajo en caliente',
      subtitle: 'Mirar el área antes de firmar',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S7-PERMISO', title: 'El permiso de trabajo en caliente' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S7-FOTO-EXTINTOR', title: 'El extintor a la mano' }],
      norma: {
        id: 'norma-permiso',
        title: 'Permiso y extintor',
        source: 'OSHA 1910.252(a)(2)(iv) · OSHA 1926.352(d) y (f) · D.S. 024, art. 131 · G.050, cap. 24',
        body: [
          '- **Quien autoriza inspecciona el área** y fija las precauciones; de preferencia, en un permiso escrito [1910.252(a)(2)(iv)].',
          '- D.S. 024: el permiso **colocado a la vista** y el personal con la capacitación respectiva.',
          '- Extintor adecuado **a la mano y listo para uso inmediato** [1926.352(d)]; G.050: revisado, identificado y con acceso libre (cap. 24).',
          '- **Al otro lado del muro o del piso**, las mismas precauciones [1926.352(f)].',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §1): el ejemplo era el extintor y la pregunta, la
      // inspección; ahora el ejemplo muestra a quien inspecciona antes de firmar.
      regla: 'quien autoriza inspecciona el área y fija las precauciones antes de firmar el permiso, que queda a la vista; el extintor, a la mano y listo.',
      ejemplo: 'antes de firmar, la supervisora va al taller, ve trapos con aceite junto a la prensa y ordena retirarlos: recién entonces firma.',
      ejemploClave: 'trapos',
      subrayar: { respalda: 'Quien autoriza inspecciona el área' },
      pregunta: 'El jefe de mantenimiento firma desde su oficina el permiso para esmerilar en el almacén, sin ir a verlo, porque «el soldador conoce el lugar». ¿Es válido ese permiso, y por qué?',
      criterios: [
        'Decide que no es válido',
        'Da la razón: quien autoriza tiene que inspeccionar el área antes de firmar',
      ],
      critical: [2],
      commonMistakes: ['Cree que el permiso es solo un papel firmado', 'Cree que basta con que el soldador conozca el lugar'],
    },
    {
      id: 'vigia',
      title: 'El vigía de fuego',
      subtitle: 'Antes, durante y media hora después',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S7-FOTO-VIGIA', title: 'Vigía de fuego con extintor' },
      norma: {
        id: 'norma-vigia',
        title: 'El vigía de fuego',
        source: 'OSHA 1910.252(a)(2)(iii)(A) y (B) · CV2, cap. 1',
        body: [
          '- Va vigía de fuego cuando hay **combustible apreciable a menos de 10,7 m** del punto de trabajo [1910.252(a)(2)(iii)(A)].',
          '- O más lejos, si lo que hay se enciende fácil con chispas [(a)(2)(iii)(A)].',
          '- Tiene el extintor a la mano, vigila y, si el fuego lo supera, da la alarma.',
          '- Se queda **al menos media hora después de terminar**: el fuego latente aparece cuando todos se fueron [(a)(2)(iii)(B)].',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §5): el ejemplo no repite la cuenta de la distancia con
      // otros números; muestra la otra mitad de la regla (la media hora).
      regla: 'va vigía de fuego si hay combustible apreciable a menos de 10,7 m del trabajo; con extintor a la mano, se queda media hora después de terminar.',
      ejemplo: 'un soldador termina a las 5 junto a cajas de cartón: el vigía se queda hasta las 5 y media por el fuego latente.',
      ejemploClave: 'cartón',
      subrayar: { respalda: 'menos de 10,7 m' },
      pregunta: 'Se esmerila una baranda en un depósito y a 6 m hay una ruma de pallets de madera que no se puede mover. ¿Hace falta vigía de fuego, y por qué?',
      criterios: [
        'Decide que sí hace falta vigía de fuego',
        'Da la razón: hay combustible apreciable, los pallets, a menos de 10,7 m del trabajo',
      ],
      critical: [2],
      commonMistakes: ['Cree que el vigía solo hace falta si hay líquidos inflamables', 'Cree que a 6 m el combustible ya está lejos'],
    },
    {
      id: 'proteccion',
      title: 'Protección de quien suelda y de los cilindros',
      subtitle: 'Careta, gafas y cilindros de pie',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-SI-ALTORIESGO-S7-FOTO-CILINDROS', title: 'Cilindros de pie y asegurados' },
      apoyo: [{ imagenId: 'IMG-SI-ALTORIESGO-S7-EPP', title: 'Soldador, ayudante y esmeril' }],
      norma: {
        id: 'norma-proteccion',
        title: 'Quien suelda y los cilindros',
        source: 'OSHA 1910.252(b)(2)(i) · OSHA 1926.350(a)(8)-(10) · D.S. 024, arts. 84 y 93',
        body: [
          '- Soldadura de arco: careta o pantalla de mano, **y también los ayudantes**; oxicorte: gafas con filtro [1910.252(b)(2)(i)].',
          '- D.S. 024: careta con filtro, respirador contra humos, guantes y ropa para calor, y el área de arco aislada a la vista (art. 84); esmeril: respirador, lentes y protector facial (art. 93).',
          '- Cilindros **siempre de pie y asegurados**, con la válvula cerrada al terminar o al moverlos [1926.350(a)(8)-(9)].',
          '- Almacenados: **oxígeno a 6,1 m del gas combustible**, o con una barrera entre ambos [1926.350(a)(10)].',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §1 y §5): el ejemplo era cerrar válvulas y la pregunta,
      // el almacenamiento; ahora el ejemplo es la barrera (la otra salida de la regla),
      // no la misma cuenta de distancia con otros números.
      regla: 'quien suelda y sus ayudantes usan careta con filtro; los cilindros van de pie y asegurados, y almacenados, el oxígeno a 6,1 m del gas combustible o con barrera.',
      ejemplo: 'en un almacén estrecho no caben 6,1 m entre oxígeno y acetileno: el almacenero pone una barrera entre ellos, y así cumple.',
      ejemploClave: 'almacenero',
      subrayar: { respalda: '6,1 m' },
      pregunta: 'En el almacén de un taller, los cilindros de oxígeno y de acetileno se guardan de pie y encadenados, a 2 m unos de otros, sin nada entre ellos. ¿Cumple la norma, y por qué?',
      criterios: [
        'Decide que no cumple',
        'Da la razón: almacenados, el oxígeno va a 6,1 m del gas combustible o con una barrera entre ambos',
      ],
      critical: [2],
      commonMistakes: ['Cree que basta con que estén de pie y encadenados', 'Confunde la regla de uso con la de almacenamiento'],
    },
  ],

  // Gemelo de los casos A y B: un trabajo en caliente fuera de obra y de mina,
  // casi todo en orden, con lo que puede encenderse al otro lado del piso.
  casoCorto: {
    id: 'caso-corto',
    title: 'Preparación del área en un caso',
    subtitle: 'Caso del entrepiso de la trastienda',
    keyPointIndex: 0,
    caso: {
      id: 'caso-trastienda',
      title: 'Caso: la trastienda del supermercado',
      referencia: 'el caso de la trastienda',
      name: 'Supermercado de Huancayo, trastienda',
      source: 'Caso corto construido para Sophia sobre la OSHA 1926.352 y 1910.252 · pendiente de aprobación del instructor',
      // 27 oct 2026 (APRENDIZAJES §7): solo los hechos que la decisión necesita.
      facts: [
        'Hay que soldar con arco una viga rota del entrepiso metálico de la trastienda de un supermercado',
        'Arriba se retiró todo, hay extintor a la mano, el permiso firmado está a la vista y un vigía de fuego se queda arriba',
        'El piso del entrepiso es de rejilla metálica',
        'Debajo, en el almacén, hay rumas de papel higiénico y cajas de cartón, sin cubrir y sin nadie',
      ],
      question: '¿Está lista el área para empezar a soldar, y por qué?',
    },
    pistas: 'Si dice que sí porque arriba todo está en orden, señálale que mire qué hay debajo de la rejilla. Si dice que no sin razón, dile que falta el porqué.',
    criterios: [
      'Decide que no está lista: falta controlar lo que está debajo del entrepiso',
      'Da la razón: lo que está debajo de la rejilla también se protege, porque las chispas caen al otro lado del piso',
    ],
    critical: [1],
    commonMistakes: ['Mira solo el lado donde se suelda', 'Cree que un vigía arriba alcanza para lo que pasa abajo', 'No sabe que al otro lado del muro o del piso se toman las mismas precauciones'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'OSHA 1910.252, 1926.350 y 1926.352 · D.S. 024-2016-EM (arts. 84, 93 y 131, y glosario) · Norma G.050 (caps. 19 y 24)',
    referencias: [
      'Sesión 7 de 12 del curso Trabajos de alto riesgo (48 h), primera del bloque 2. Indicador IND-SI-ALTORIESGO-2: explica los riesgos laborales identificados, las medidas de control y los procedimientos de seguridad de los trabajos en caliente, de excavaciones y zanjas, de izaje de cargas con grúa, con energía peligrosa y de los trabajos eléctricos. El bloque 1 (altura, escaleras y andamios, espacios confinados) se evaluó en la sesión 6.',
      'Antes de esta sesión el estudiante trabajó el capítulo 1 del cuadernillo CV2, «Trabajos en caliente». Sophia recuerda, muestra y hace aplicar; no parte de cero. Qué es: el D.S. 024 lo define en su glosario como llama abierta o chispas de soldar, cortar o esmerilar, actuando como fuente de ignición en un área con riesgo de incendio; la G.050 lo delimita por las tareas; la OSHA, por su permiso.',
      'El área (punto clave 1): si la pieza se puede mover, se lleva a un lugar sin combustibles; si no, se retiran los combustibles [1926.352(a)]; si tampoco, se confinan el calor, las chispas y la escoria [(b)]; si no se puede ni lo uno ni lo otro, no se suelda ni se corta [1910.252(a)(1)(iii)]. Aserrín, papel o fibras en el piso: se barre en un radio de 10,7 m (35 pies) [(a)(2)(v)]; prohibido con atmósfera explosiva o polvo combustible acumulado [(a)(2)(vi)]; recipiente que tuvo inflamables: con agua o limpio a fondo antes [1926.352(i)]. D.S. 024, art. 131: inspección previa del área, retiro de los inflamables, protección de las áreas aledañas y ventilación adecuada. G.050: inflamables a no menos de 15 m de fuentes de ignición (cap. 19).',
      'Permiso y extintor (punto clave 2): quien autoriza inspecciona el área y fija las precauciones, de preferencia en un permiso escrito [1910.252(a)(2)(iv)]; D.S. 024: el permiso colocado a la vista y la capacitación respectiva; extintor adecuado a la mano, listo para uso inmediato [1926.352(d)]; G.050: extintores revisados, identificados y con acceso libre (cap. 24); al otro lado del muro o del piso, las mismas precauciones [1926.352(f)].',
      'Vigía de fuego (punto clave 3): con combustible apreciable a menos de 10,7 m [1910.252(a)(2)(iii)(A)], o más lejos si se enciende fácil con chispas; extintor a la mano, vigila y, si no alcanza, da la alarma; se queda al menos media hora después de terminar [(a)(2)(iii)(B)]: el fuego latente aparece cuando todos se fueron. La cifra es 35 pies = 10,7 m (no «11 m» ni «10,5 m», como dice uno de los videos del CV2).',
      'Protección (punto clave 4): soldadura de arco, careta o pantalla de mano, también para los ayudantes [1910.252(b)(2)(i)(A)]; oxicorte, gafas u otra protección ocular con filtro [(b)(2)(i)(B)]; D.S. 024: careta con filtro, respirador contra humos, guantes y ropa para calor, y el área de arco aislada a la vista (art. 84); esmeril: respirador, lentes, protector facial y ropa adecuada (art. 93). Cilindros siempre de pie y asegurados [1926.350(a)(9)], con la válvula cerrada al terminar o al moverlos [(a)(8)]; almacenados, oxígeno a 6,1 m del gas combustible o con barrera [(a)(10)].',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala los dos casos de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la trastienda del supermercado, y los ejemplos que Sophia resuelve son propios (el tambor de petróleo lleno de agua, la supervisora que inspecciona antes de firmar, el vigía hasta las 5 y media, la barrera entre los cilindros del almacén estrecho).',
    ],
  },
}
