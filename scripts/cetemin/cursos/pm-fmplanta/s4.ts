/**
 * PM-FMPLANTA · S4 · Técnicas de diagnóstico y fallas comunes.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (lectura 3). Las láminas se miraron una por una.
 * El caso de la sesión («El informe de los tres primeros meses de monitoreo»,
 * Lucía Quispe, la contratista de vibraciones) NO entra: es el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const APAZA = 'Apaza Machaca, A. C. (2024). Plan de mantenimiento predictivo basado en análisis de vibraciones, planta concentradora polimetálica. UNSA'
const GULATI = 'Elaboración propia según Gulati, R. (2013). Maintenance and reliability best practices (2.ª ed.), cap. 8'
const ESQ = '04_Recursos-graficos/PM/esquemas/fmplanta/s4'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_fmplanta_s4.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-PM-FOTO-ALINEAMIENTO-LASER', archivo: '04_Recursos-graficos/PM/fotos/alineamiento-laser-molino.png', kind: 'scene', license: TESIS,
    source: `${APAZA}, fig. 84 (p. 95)`,
    description: 'Fotografía de la transmisión de un molino: al centro, un acople metálico de rejilla sobre su eje; a la derecha, una carcasa gris con aletas circulares y pernos; a la izquierda, una carcasa azul con una manguera. A cada lado del acople, abrazado al eje con una cadena, cuelga un aparato amarillo y negro. Arriba, una baranda amarilla y la mano de un trabajador con guante azul. Sin rótulos.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S4-FALLAS', archivo: `${ESQ}/fmplanta-s4_fallas.png`, kind: 'diagram', license: PROPIA, source: GULATI,
    description: 'Tabla «Falla / Qué es»: Desbalance, una masa descentrada gira fuera del eje; Desalineamiento, dos ejes acoplados fuera de línea; Soltura, un perno o un alojamiento con juego; Rodamiento, pistas o elementos dañados; Engranajes, dientes gastados o con juego. Pie: Según Gulati (2013), Maintenance and Reliability Best Practices, cap. 8.',
  },
  {
    id: 'IMG-PM-FOTO-CORREAS-ZARANDA', archivo: '04_Recursos-graficos/PM/fotos/correas-desalineadas-zaranda.png', kind: 'scene', license: TESIS,
    source: `${APAZA}, fig. 36 (p. 44)`,
    description: 'Cuatro fotografías de la transmisión por correas de una zaranda, marcadas a) a d). a) Las correas vistas de costado entre sus dos poleas, con dos flechas rojas que señalan que no van en línea. b) Un medidor de frecuencia de correas SKF («Belt Frequency Meter») con la pantalla en «0492» y su sensor en la mano. c) Un alineador láser montado en la polea, con la línea roja sobre las ranuras. d) El blanco del alineador con una regla en centímetros.',
  },
  {
    id: 'IMG-PM-FIG-ONDA-ESPECTRO', archivo: '04_Recursos-graficos/PM/fotos/onda-y-espectro.png', kind: 'diagram', license: TESIS,
    source: `${APAZA}, fig. 13 (p. 21)`,
    description: 'Figura en perspectiva. A la izquierda, una onda verde irregular: «LA VIBRACIÓN COMPLEJA = SUMA DE VIBRACIONES SIMPLES.», que se descompone en tres ondas azules simples, de distinta amplitud y ritmo, a lo largo del eje «DOMINIO DEL TIEMPO». A la derecha, sobre el eje «DOMINIO DE LA FRECUENCIA», cada onda simple se vuelve una barra roja de distinta altura: «ESPECTRO DE VIBRACIÓN».',
  },
  {
    id: 'IMG-PM-FIG-PUNTOS-MEDICION-MOLINO', archivo: '04_Recursos-graficos/PM/fotos/puntos-medicion-molino.png', kind: 'diagram', license: TESIS,
    source: `${APAZA}, fig. 46 (p. 56)`,
    description: 'Esquema de un molino visto desde arriba con su corona, el contraeje, el reductor y el motor, y diez puntos de medición de vibración numerados: 1 y 2 en el motor; 3, 4, 5 y 6 en el reductor; 7 y 8 en las chumaceras del contraeje; 9 y 10 en las chumaceras del molino. Rótulos: Molino, Contra eje, Reductor, Motor.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S4-TECNICAS', archivo: `${ESQ}/fmplanta-s4_tecnicas.png`, kind: 'diagram', license: PROPIA, source: GULATI,
    description: 'Tabla «Técnica / Qué detecta / Equipo»: Vibración, desbalance, holgura, rodamientos, en marcha; Termografía, puntos calientes, conexiones, en marcha; Aceite, desgaste y contaminación, muestra; Ultrasonido, fugas y roces, en marcha; Corriente, fallas del motor y su carga, en marcha; Megóhmetro, aislamiento del bobinado, detenido (resaltado en amarillo). Pie: Según Gulati (2013), cap. 8.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S4-TERMO-ACEITE', archivo: `${ESQ}/fmplanta-s4_termo-aceite.png`, kind: 'diagram', license: PROPIA,
    source: `Composición propia sobre ${APAZA}, figs. 3 y 4`,
    description: 'Dos paneles. «Termografía»: termograma de tres conexiones de un tablero, en las cajas Bx1, Bx2 y Bx3; la primera, en rojo y blanco, es la más caliente. Lecturas: Bx1 máx 94,4 °C; Bx2 máx 42,2 °C; Bx3 máx 44,9 °C; Bx1 − Bx3: 49,4 °C; Bx1 − Bx2: 52,2 °C. «Análisis de aceite»: gráfico «Contaminantes (ppm)» de agosto a noviembre de 2022; el silicio (Si, verde) va de 4 a 19 ppm y otras dos líneas quedan entre 0 y 2. Pie: Apaza Machaca (2024), UNSA, figs. 3 y 4.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S4-A-TIEMPO', archivo: `${ESQ}/fmplanta-s4_a-tiempo.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Dos columnas. FALLA IMPREVISTA (rojo): el equipo para solo; daña piezas vecinas; se espera el repuesto; parada larga. CORRECTIVO PROGRAMADO (verde): se para cuando se decide; se cambia solo la pieza; el repuesto ya está; parada corta.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S4-TPEF', archivo: `${ESQ}/fmplanta-s4_tpef.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Fórmula en amarillo: D = TPEF ÷ (TPEF + TPPR). Tabla «Dato / Ejemplo»: TPEF, 100 h entre fallas; TPPR, 5 h por reparación; Disponibilidad, 100 ÷ 105 = 95,2 %. Abajo: «Con equipo en espera, la falla no detiene el proceso».',
  },
]

export const S4: SesionSpec = {
  slug: 'pm-fmplanta-s4-tecnicas-de-diagnostico-y-fallas-comunes',
  order: 4,
  etiqueta: 'S4',
  idPrefijo: 'fmplanta-s4',
  title: 'Técnicas de diagnóstico y fallas comunes',
  objective:
    'Explica las fallas comunes de los equipos de planta según el síntoma que las delata y la técnica de diagnóstico que las detecta a tiempo.',
  keyPoints: ['Fallas comunes de los equipos rotativos', 'El análisis de vibraciones', 'Técnicas de diagnóstico según la señal', 'Del diagnóstico a la disponibilidad'],
  imagenes: IMAGENES,
  // Los diagnósticos del caso (CH3, CP1, MO3, BO42), la analista y el pedido del gerente.
  casosDelEquipo: ['Quispe', 'BO42', 'CH3', 'CP1', 'MO3', '30 700', 'espesadores', 'colector de polvo', 'acelerómetros en todo'],

  rutina: {
    imagenId: 'IMG-PM-FOTO-ALINEAMIENTO-LASER',
    tituloImagen: 'Transmisión de un molino con dos aparatos',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // Las de la lámina 8: «Veo: ¿qué hay en la imagen? Solo lo que se ve. Pienso: ¿qué creen que pasa ahí? Me pregunto: ¿qué les gustaría saber?»
    preguntas: {
      veo: '¿Qué hay en la imagen?',
      pienso: '¿Qué crees que pasa ahí?',
      mePregunto: '¿Qué te gustaría saber?',
    },
    titulos: {
      veo: 'Observación de una transmisión',
      pienso: 'Lo que pasa en la transmisión',
      mePregunto: 'Lo que falta saber de la transmisión',
    },
    pistaVeo: 'qué hay al centro de la foto y qué cuelga a cada lado',
    criterios: {
      pienso: ['Dice qué cree que pasa en la transmisión o qué hacen los aparatos amarillos', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le gustaría saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'fallas-rotativos',
      title: 'Fallas comunes de los equipos rotativos',
      subtitle: 'Desbalance, desalineamiento y soltura',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-PM-FOTO-CORREAS-ZARANDA', title: 'Correas de una zaranda' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S4-FALLAS', title: 'Las fallas que producen vibración' }],
      norma: {
        id: 'norma-fallas-rotativos',
        title: 'Fallas comunes de un equipo rotativo',
        source: 'CV1, lectura 3 · según Gulati (2013), cap. 8',
        body: [
          '- Casi toda falla mecánica de un equipo rotativo **produce vibración**.',
          '- **Desbalance:** una masa descentrada hace girar el rotor fuera de su eje.',
          '- **Desalineamiento:** dos ejes acoplados no quedan en la misma línea.',
          '- **Soltura:** un perno o un alojamiento flojo deja juego.',
          '- **Rodamiento:** se dañan sus pistas o sus elementos. **Engranajes:** los dientes pierden su perfil y su juego.',
        ].join('\n'),
      },
      // 27 oct 2026 (APRENDIZAJES §1): regla y ejemplo más cortos; el ejemplo, con alguien que decide.
      regla: 'casi toda falla de un equipo rotativo produce vibración. Desbalance: masa descentrada que gira fuera del eje. Desalineamiento: ejes acoplados fuera de línea. Soltura: un perno con juego.',
      ejemplo: 'un mecánico ve que las dos poleas de la zaranda no quedan en línea y las correas van torcidas: es desalineamiento.',
      ejemploClave: 'correas',
      subrayar: { respalda: 'Desbalance:' },
      pregunta: 'Al impulsor de una bomba de pulpa se le pegó una costra de mineral en un solo lado, y desde entonces la bomba vibra más. ¿Qué falla es, y por qué?',
      criterios: [
        'Decide que es desbalance',
        'Da la razón: la costra en un solo lado es una masa descentrada',
      ],
      critical: [2],
      commonMistakes: ['Lo llama desalineamiento porque «algo está fuera de lugar»', 'Lo llama soltura sin que haya un perno o un alojamiento flojo', 'Dice que vibra «por la costra» sin decir que es peso de un solo lado'],
    },
    {
      id: 'vibraciones',
      title: 'El análisis de vibraciones',
      subtitle: 'Valor general y espectro',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-PM-FIG-ONDA-ESPECTRO', title: 'Onda y espectro' },
      apoyo: [{ imagenId: 'IMG-PM-FIG-PUNTOS-MEDICION-MOLINO', title: 'Dónde se mide la vibración de un molino' }],
      norma: {
        id: 'norma-vibraciones',
        title: 'Qué mide un analizador',
        source: 'CV1, lectura 3 · Apaza Machaca (2024), figs. 13 y 46',
        body: [
          '- Un **acelerómetro** sobre la chumacera mide cuánto vibra el equipo, con el equipo **en marcha**.',
          '- La **amplitud** dice cuánto vibra; la **frecuencia**, a qué ritmo.',
          '- La **velocidad en mm/s RMS** mide la severidad general: se compara con la línea base y con los límites de la ISO 10816.',
          '- El **espectro separa la vibración por frecuencias**: cada falla deja su huella a una frecuencia propia.',
        ].join('\n'),
      },
      regla: 'el valor general en mm/s RMS dice cuánto vibra; el espectro separa la vibración por frecuencias, y cada falla deja su huella en la suya.',
      // El ejemplo se queda en la severidad: el espectro lo decide el alumno en la pregunta.
      ejemplo: 'un mecánico ve que un reductor subió de 2 a 6 mm/s y decide vigilarlo más seguido: sabe cuánto vibra, no qué falla es.',
      ejemploClave: 'reductor',
      subrayar: { respalda: 'espectro separa la vibración' },
      pregunta: 'Un técnico mide la vibración de un motor y el valor general en mm/s salió alto, pero no sabe si es desbalance o un rodamiento. ¿Qué tiene que mirar para distinguirlo, y por qué?',
      criterios: [
        'Decide que tiene que mirar el espectro, la vibración separada por frecuencias',
        'Da la razón: cada falla deja su huella a una frecuencia propia',
      ],
      critical: [2],
      commonMistakes: ['Cree que un valor general más alto ya dice qué falla es, cuando solo dice cuánto vibra', 'Propone medir otra vez el valor general en otro punto'],
    },
    {
      id: 'tecnicas',
      title: 'Técnicas de diagnóstico según la señal',
      subtitle: 'Termografía, aceite, ultrasonido y corriente',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S4-TECNICAS', title: 'Seis técnicas de diagnóstico' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S4-TERMO-ACEITE', title: 'Termografía y análisis de aceite' }],
      norma: {
        id: 'norma-tecnicas',
        title: 'Qué capta cada técnica',
        source: 'CV1, lectura 3 · según Gulati (2013), cap. 8',
        body: [
          '- **Termografía:** puntos calientes sin tocar el equipo: conexiones flojas, rodamientos calientes, roces.',
          '- **Análisis de aceite:** el desgaste, por las partículas que arrastra el aceite; se toma una muestra.',
          '- **Ultrasonido:** fugas y roces que el oído no oye. **Corriente del motor:** fallas del motor y de su carga.',
          '- **Megóhmetro:** el aislamiento del bobinado, con el equipo detenido; las demás se aplican en marcha.',
          '- **La técnica solo sirve si la falla da la señal que ella capta.**',
        ].join('\n'),
      },
      regla: 'cada técnica capta una señal: vibración, desbalance y rodamientos; termografía, puntos calientes; aceite, desgaste; ultrasonido, fugas y roces. Solo sirve si la falla da esa señal.',
      ejemplo: 'un electricista revisa con megóhmetro un motor guardado en almacén: el aislamiento no vibra, y un analizador de vibraciones no lo vería.',
      ejemploClave: 'almacén',
      subrayar: { respalda: ['Ultrasonido:', 'solo sirve si la falla'] },
      // Antes: «¿Es la técnica adecuada?», y el criterio exigía además nombrar el ultrasonido,
      // que la pregunta no pedía (APRENDIZAJES §3).
      pregunta: 'El supervisor quiere ubicar una fuga en la red de aire comprimido y pide un análisis de vibraciones. ¿Qué técnica corresponde, y por qué?',
      criterios: [
        'Decide que corresponde el ultrasonido, no la vibración',
        'Da la razón: el ultrasonido capta las fugas, y la vibración no',
      ],
      critical: [2],
      commonMistakes: ['Cree que el análisis de vibraciones sirve para todo, aunque solo capta desbalance, desalineamiento, soltura y rodamientos', 'Elige la termografía para una fuga de aire'],
    },
    {
      id: 'disponibilidad-inherente',
      title: 'Del diagnóstico a la disponibilidad',
      subtitle: 'TPEF, TPPR y disponibilidad inherente',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S4-TPEF', title: 'TPEF, TPPR y disponibilidad' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S4-A-TIEMPO', title: 'Falla imprevista y correctivo programado' }],
      norma: {
        id: 'norma-disponibilidad-inherente',
        title: 'Detectar a tiempo y disponibilidad',
        source: 'CV1, lectura 3',
        // 27 oct 2026 (APRENDIZAJES §4, §5 y §8: disponibilidad, 12 de 18 por límite en PM S1).
        // La respuesta es la excepción («no solo fallando menos»): el ejemplo la muestra con
        // otra máquina, y las dos cuentas van escritas aquí, una línea por paso.
        body: [
          '- Detectar a tiempo **convierte la falla en un correctivo programado**: el repuesto y la cuadrilla están listos, y la reparación dura menos.',
          '- **Disponibilidad inherente = TPEF ÷ (TPEF + TPPR)**. TPEF: horas de operación entre fallas. TPPR: horas que dura cada reparación.',
          '- Sube por dos lados: **fallando menos** (más TPEF) o **reparando más rápido** (menos TPPR).',
          '- TPEF de 100 h y TPPR de 5 h: 100 ÷ 105 = 95,2 %.',
          '- El mismo TPEF y TPPR de 2 h: 100 ÷ 102 = 98 %.',
        ].join('\n'),
      },
      regla: 'disponibilidad inherente = TPEF ÷ (TPEF + TPPR): sube fallando menos (más TPEF) o reparando más rápido (menos TPPR).',
      ejemplo: 'el jefe deja listo el repuesto de una bomba: sigue fallando cada 100 h, pero su TPPR baja de 5 a 2 h y la disponibilidad sube de 95,2 a 98 %.',
      ejemploClave: '98',
      subrayar: { respalda: ['Disponibilidad inherente =', 'reparando más rápido', 'TPPR de 2 h'] },
      // Antes la pregunta no traía situación y el ejemplo era solo la cuenta del 95,2 %.
      pregunta: 'Cada vez que una zaranda falla, su repuesto recién se pide a Lima y tarda días en volver a operar. El jefe dice que su disponibilidad solo sube si falla menos. ¿Tiene razón, y por qué?',
      criterios: [
        'Decide que no tiene razón',
        'Da la razón: la disponibilidad también sube reparando más rápido, con menos TPPR',
      ],
      critical: [2],
      commonMistakes: ['Solo mira el TPEF y olvida que el TPPR también está en la fórmula', 'Cree que detectar a tiempo evita la reparación, cuando la vuelve más corta', 'Propone solo atacar la causa de las fallas, sin mirar cuánto dura cada reparación'],
    },
  ],

  // Gemelo del caso del informe de monitoreo: otra área (eléctrica) y otra técnica, una sola decisión.
  casoCorto: {
    id: 'caso-corto',
    title: 'Elección de la técnica en un caso',
    subtitle: 'Caso de la sala eléctrica',
    keyPointIndex: 2,
    caso: {
      id: 'caso-sala-electrica',
      title: 'Caso: la sala eléctrica',
      referencia: 'el caso de la sala eléctrica',
      name: 'Cerro Blanco, sala eléctrica',
      source: 'Caso corto construido para Sophia sobre el CV1 · pendiente de aprobación del instructor',
      facts: [
        'En molienda, medir la vibración cada mes bajó las fallas imprevistas',
        'Las paradas del año en la sala eléctrica: contactores y bornes quemados por conexiones flojas',
        'Las conexiones se calentaron semanas antes de quemarse',
        'El jefe propone: «Pongamos sensores de vibración también en los tableros: en los molinos funcionó»',
      ],
      // Antes: «¿Conviene medir vibración?», y el criterio exigía además nombrar la termografía.
      question: '¿Con qué técnica conviene vigilar las conexiones de los tableros, y por qué?',
    },
    pistas: 'Si elige la vibración, señálale que relea el tercer hecho del caso. Si elige la termografía sin razón, dile que falta el porqué. No agregues cálculos ni otras técnicas.',
    usa: ['norma-tecnicas'],
    criterios: [
      'Decide que conviene la termografía, no la vibración',
      'Da la razón: una conexión floja no vibra, se calienta, y la termografía capta el calor',
    ],
    critical: [1],
    commonMistakes: ['Repite la técnica que funcionó en otra área sin mirar la señal de la falla', 'Elige el megóhmetro, que pide el equipo detenido y mide el aislamiento'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 374 y 375: mantenimiento según el fabricante) · ISO 10816 (severidad de vibración) · Gulati (2013), cap. 8',
    referencias: [
      'Sesión 4 de 12 del curso Fundamentos mecánicos de planta (48 h, ciclo II). Indicador IND-PM-FMPLANTA-2: explica fallas comunes en equipos mecánicos, proponiendo soluciones de mantenimiento preventivo y correctivo en casos, aplicando protocolos de seguridad. La sesión 3 mostró que la carga mecánica se ve en la corriente del motor; hoy, cómo se detecta una falla antes de que pare el equipo y qué técnica escucha cada una.',
      'Antes de esta sesión el estudiante trabajó la lectura 3 del recurso autónomo CV1, «Detectar antes de que pare». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Fallas comunes (punto clave 1): casi toda falla mecánica de un equipo rotativo produce vibración. Desbalance: una masa descentrada hace girar el rotor fuera de su eje. Desalineamiento: dos ejes acoplados no quedan en la misma línea (las correas de la zaranda de la lámina). Soltura: un perno o un alojamiento flojo deja juego. Rodamiento: se dañan sus pistas o sus elementos. Engranajes: los dientes pierden su perfil y su juego.',
      'Análisis de vibraciones (punto clave 2): un acelerómetro sobre la chumacera mide con el equipo en marcha; en un molino se mide en diez puntos (motor, reductor, contraeje y chumaceras del molino). La amplitud dice cuánto vibra; la frecuencia, a qué ritmo; la velocidad en mm/s RMS mide la severidad general y se compara con la línea base y con la ISO 10816. El espectro separa la vibración por frecuencias y cada falla deja su huella a una frecuencia propia.',
      'Técnicas (punto clave 3): vibración, desbalance, holgura y rodamientos (en marcha); termografía, puntos calientes y conexiones (en marcha); análisis de aceite, desgaste y contaminación (muestra); ultrasonido, fugas y roces (en marcha); corriente del motor, fallas del motor y de su carga (en marcha); megóhmetro, aislamiento del bobinado (detenido). La técnica solo sirve si la falla da la señal que ella capta: buscar con termografía un engranaje desalineado es perder el tiempo.',
      'Del diagnóstico a la disponibilidad (punto clave 4): detectar a tiempo no evita la reparación, la convierte en correctivo programado, que dura menos porque el repuesto, la cuadrilla y el permiso están listos. Disponibilidad inherente = TPEF ÷ (TPEF + TPPR), con TPEF las horas de operación entre fallas y TPPR las horas que dura cada reparación. Se sube por dos lados: fallando menos (corrigiendo la causa, más TPEF) o reparando más rápido (repuesto y procedimiento listos, menos TPPR). Las únicas cifras de este punto son las de la pizarra: TPEF de 100 h y TPPR de 5 h dan 100 ÷ 105 = 95,2 %; con el mismo TPEF y TPPR de 2 h, 100 ÷ 102 = 98 %. No hagas otras cuentas.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la sala eléctrica, y los ejemplos que Sophia resuelve son propios (las correas de la zaranda, el reductor de 2 a 6 mm/s, el motor del almacén, la bomba que pasa de 95,2 a 98 % con el repuesto listo).',
    ],
  },
}
