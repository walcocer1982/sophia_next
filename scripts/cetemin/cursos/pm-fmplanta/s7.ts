/**
 * PM-FMPLANTA · S7 · Modos de falla, efecto y causa.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV2 (lectura 1). Las láminas se miraron una por una.
 * El caso de la sesión («La hoja de modos de falla de la faja de 2,8 km»,
 * Marco Llanos) NO entra: es el trabajo del equipo. Por eso tampoco entra la
 * lámina «Una causa, varios modos» (IMG-PM-FMPLANTA-S7-UNA-VARIAS): trae
 * resuelta la causa común de la banda y la guardilla, que es la respuesta del caso.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const TESIS = 'Uso educativo con cita (figura de tesis en repositorio universitario)'
const MANUAL = 'Figura de manual de operación; uso autorizado por el instructor líder de PM (Harley Pereyra, 21 set 2026)'
const TAMBOMAYO = 'Compañía de Minas Buenaventura y TECSUP (s. f.). Manual de Operaciones, Planta de Procesos Metalúrgicos, Proyecto Tambomayo'
const ESQ = '04_Recursos-graficos/PM/esquemas/fmplanta/s7'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_fmplanta_s7.py'
const FAJA = '04_Recursos-graficos/PM/equipos/faja-transportadora-comeco'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-PM-FOTO-POLINES-TUNEL', archivo: '04_Recursos-graficos/PM/fotos/polines-de-carga-tunel.png', kind: 'scene', license: TESIS,
    source: 'Ayllon Pérez, A. (2023). Aplicar la metodología del AMEF en los mecanismos de la faja transportadora. UNCP, fig. 4.3 (p. 33)',
    description: 'Fotografía del túnel de una faja transportadora: en primer plano, la banda cargada de mineral fino color arena corre sobre sus rodillos; arriba, un chute con una cortina oscura de goma descarga sobre la banda, y tuberías grandes pasan por el techo; a la derecha, una malla blanca de protección y un pasillo de grava con lámparas al fondo. Todo está cubierto de polvo y hay polvo en el aire. Sin rótulos.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S7-CADENA', archivo: `${ESQ}/fmplanta-s7_cadena.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Cuatro tarjetas unidas por flechas. FUNCIÓN, «lo esperado»: lo que debe hacer, con su medida. MODO, «cómo falla»: cómo deja de cumplirla. EFECTO, «qué pasa»: lo que le hace al equipo y al proceso. CAUSA, «de dónde viene»: por qué ocurre.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S7-BO42', archivo: `${ESQ}/fmplanta-s7_bo42.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia con el caso de la S4 (Apaza Machaca, 2024, UNSA, 4.9.4)',
    description: 'Tabla «El rodamiento de la bomba BO42 (S4)»: Función, sostener el eje del motor girando sin juego; Modo de falla, pista externa erosionada; Efecto, vibración y parada de la bomba de relaves; Causa, corriente del variador que pasa por el rodamiento. Abajo: «Cambiar el rodamiento sin aislarlo repite la falla».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S7-SINTOMA-CAUSA', archivo: `${ESQ}/fmplanta-s7_sintoma-causa.png`, kind: 'diagram', license: PROPIA,
    source: `Elaboración propia con las partes de la zaranda del ${TAMBOMAYO}, sección 5`,
    description: 'Tabla «Síntoma / Causas posibles / Se descarta con»: vibra más que antes, resorte roto o contrapeso suelto, inspección visual de resortes; el fino sale grueso, panel roto o abertura gastada, revisión de paneles con la zaranda parada; la correa chilla, correa floja o poleas desalineadas, tensión y alineamiento láser. Pie: Partes de la zaranda Tyler XL: manual de Tambomayo, sección 5.',
  },
  {
    id: 'IMG-PM-EQ-FAJA-PARTES', archivo: `${FAJA}/faja_partes_leyenda.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 410 Chancado, faja transportadora N.° 1, figura 5.1 (COMECO)`,
    description: 'Faja transportadora inclinada, en elevación, con dos ampliaciones (el motor junto a la polea de cabeza; los rodillos bajo la banda) y ocho partes numeradas: 1 Polea motriz (arriba, en la cabeza), 2 Motor eléctrico, 3 Polines de carga, 4 Polines de impacto (en la zona de carga, cerca de la cola), 5 Polines de retorno (bajo la banda), 6 Faja transportadora, 7 Polea de cola (abajo, en el otro extremo), 8 Limpiadores (en la cabeza).',
  },
  {
    id: 'IMG-PM-EQ-FAJA-TENSADO', archivo: `${FAJA}/faja_tensado_leyenda.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 410 Chancado, faja transportadora N.° 1, figura 5.8 (COMECO)`,
    description: 'Extremo de cola de la faja, en elevación, con una ampliación del sistema de tensado: la polea de cola aparece dibujada en dos posiciones sobre su base, que se corre a lo largo del bastidor. Partes numeradas: 1 Polea de cola, 2 Faja transportadora, 3 Espárrago, 4 Carril guía.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S7-CORRECCION', archivo: `${ESQ}/fmplanta-s7_correccion.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Si la causa es… / La corrección es…»: desgaste en el tiempo, un preventivo con su frecuencia; una práctica de operación, corregir la práctica y capacitar; un ajuste perdido, ajustar y fijar el punto; que se repite pese a todo, cambiar el diseño o el material.',
  },
]

export const S7: SesionSpec = {
  slug: 'pm-fmplanta-s7-modos-de-falla-efecto-y-causa',
  order: 7,
  etiqueta: 'S7',
  idPrefijo: 'fmplanta-s7',
  title: 'Modos de falla, efecto y causa',
  objective:
    'Explica los modos de falla de los componentes de un equipo de planta, con el efecto que producen y la causa que los origina.',
  keyPoints: ['Función, modo de falla y efecto', 'Del síntoma a la causa', 'Los componentes de una faja transportadora', 'De la causa a la corrección'],
  imagenes: IMAGENES,
  // El técnico, la faja larga, las paradas empatadas y la frase del jefe de guardia.
  casosDelEquipo: ['Llanos', '2,8 km', '227 m', '4 400 kW', '183 h', '52', 'guardilla', 'Sumac Rumi', 'superintendente'],

  rutina: {
    imagenId: 'IMG-PM-FOTO-POLINES-TUNEL',
    tituloImagen: 'Túnel de una faja transportadora',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    // Las de la lámina 8: «Veo: ¿qué hay en la imagen? Solo lo que se ve. Pienso: ¿qué creen que pasa ahí? Me pregunto: ¿qué les gustaría saber?»
    preguntas: {
      veo: '¿Qué hay en la imagen?',
      pienso: '¿Qué crees que pasa ahí?',
      mePregunto: '¿Qué te gustaría saber?',
    },
    titulos: {
      veo: 'Observación del túnel de una faja',
      pienso: 'Lo que pasa en el túnel',
      mePregunto: 'Lo que falta saber de la faja',
    },
    pistaVeo: 'qué hay en primer plano y qué hay encima de la banda',
    criterios: {
      pienso: ['Dice qué cree que pasa en la faja o en el túnel', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le gustaría saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'modo-efecto',
      title: 'Función, modo de falla y efecto',
      subtitle: 'La cadena de una falla',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S7-BO42', title: 'La bomba BO42' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S7-CADENA', title: 'Función, modo, efecto y causa' }],
      norma: {
        id: 'norma-modo-efecto',
        title: 'La cadena de una falla',
        source: 'CV2, lectura 1',
        body: [
          '- La **función** es lo que el componente debe hacer, **con su medida**.',
          '- El **modo de falla** es **cómo deja de cumplirla**; un mismo componente puede fallar de varios modos.',
          '- El **efecto** es **lo que ese modo le hace al equipo y al proceso**: horas de parada, producción, seguridad.',
          '- La **causa** es por qué ocurre el modo.',
        ].join('\n'),
      },
      regla: 'la función es lo que el componente debe hacer; el modo de falla, cómo deja de cumplirla; el efecto, lo que el modo le hace al equipo y al proceso.',
      ejemplo: 'en la hoja de la BO42, el analista anota como modo «pista externa erosionada» y como efecto «la bomba paró».',
      ejemploClave: 'BO42',
      subrayar: { respalda: ['lo que ese modo le hace', 'cómo deja de cumplirla'] },
      pregunta: 'En la hoja de fallas de una faja, un técnico anota como modo de falla de un polín de carga: «la faja paró 6 horas». ¿Está bien anotado, y por qué?',
      criterios: [
        'Decide que no está bien anotado',
        'Da la razón: las horas de parada son el efecto, lo que el modo le hace al equipo y al proceso',
      ],
      critical: [2],
      commonMistakes: ['Confunde el modo de falla con el efecto: el modo sería cómo el polín deja de cumplir su función (se traba y no gira)', 'Anota la causa como modo de falla'],
    },
    {
      id: 'sintoma-causa',
      title: 'Del síntoma a la causa',
      subtitle: 'Causas posibles e inspección',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S7-SINTOMA-CAUSA', title: 'Síntomas de una zaranda' },
      norma: {
        id: 'norma-sintoma-causa',
        title: 'Del síntoma a la causa',
        source: 'CV2, lectura 1',
        body: [
          '- El **síntoma** es lo que se ve o se mide; la **causa**, por qué ocurre.',
          '- **Un síntoma admite varias causas posibles.**',
          '- Las causas **se descartan con una inspección**, de la más probable a la menos; no se adivinan.',
          '- **Corregir el síntoma sin la causa hace que la falla vuelva**; la causa se registra en la orden.',
        ].join('\n'),
      },
      regla: 'un síntoma admite varias causas posibles, que se descartan con una inspección antes de corregir; corregir el síntoma sin la causa hace que la falla vuelva.',
      ejemplo: 'una zaranda vibra más: puede ser un resorte roto o el contrapeso suelto, y el mecánico revisa los resortes antes de cambiar nada.',
      ejemploClave: 'resorte',
      subrayar: { respalda: ['varias causas posibles', 'se descartan con una inspección', 'sin la causa hace que la falla vuelva'] },
      pregunta: 'La correa de una zaranda chilla, y el mecánico propone cambiar las correas de inmediato, sin revisar nada más. ¿Es lo correcto, y por qué?',
      criterios: [
        'Decide que no es lo correcto',
        'Da la razón: el chillido admite varias causas, que se descartan con una inspección antes de corregir',
      ],
      critical: [2],
      commonMistakes: ['Cambia la pieza que muestra el síntoma sin buscar la causa: si son las poleas desalineadas, la correa nueva vuelve a chillar', 'Da una sola causa como segura sin inspección'],
    },
    {
      id: 'faja',
      title: 'Los componentes de una faja transportadora',
      subtitle: 'Poleas, polines, tensor y limpiadores',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-PM-EQ-FAJA-PARTES', title: 'Las partes de una faja' },
      apoyo: [{ imagenId: 'IMG-PM-EQ-FAJA-TENSADO', title: 'El tensado en la cola de la faja' }],
      norma: {
        id: 'norma-faja',
        title: 'Qué hace cada parte de la faja',
        source: 'Manual de Tambomayo, figuras 5.1 y 5.8 · CV2, lectura 1',
        body: [
          '- El **motor** gira la **polea motriz** (de cabeza), y esta **arrastra la banda**; la **polea de cola** la devuelve.',
          '- El **tensor** mantiene la banda tensa: la polea de cola se corre por su carril guía con un espárrago.',
          '- Los **polines de impacto amortiguan la caída del mineral** en la zona de carga.',
          '- Los **polines de carga** sostienen la banda cargada y los **de retorno** la guían de vuelta; los **limpiadores** retiran el mineral pegado.',
        ].join('\n'),
      },
      regla: 'la polea motriz arrastra la banda; los polines de impacto amortiguan la caída del mineral; los de carga y de retorno sostienen y guían la banda.',
      // El ejemplo muestra con otra pieza lo que pide la pregunta: se decide por la función (APRENDIZAJES §4).
      ejemplo: 'un técnico propone sacar los limpiadores «porque no mueven nada»: no conviene, retiran el mineral pegado a la banda.',
      ejemploClave: 'limpiadores',
      subrayar: { respalda: ['amortiguan la caída', 'polines de carga'] },
      pregunta: 'Al cambiar los polines de la zona de carga de una faja, el almacén solo tiene polines de carga comunes, y el técnico propone ponerlos en lugar de los de impacto. ¿Conviene, y por qué?',
      criterios: [
        'Decide que no conviene',
        'Da la razón: los polines de impacto amortiguan la caída del mineral en la zona de carga',
      ],
      critical: [2],
      commonMistakes: ['Cree que todos los polines cumplen la misma función: los de carga solo sostienen la banda, y el golpe lo recibiría la banda', 'Decide por lo que hay en almacén y no por la función'],
    },
    {
      id: 'correccion',
      title: 'De la causa a la corrección',
      subtitle: 'Cada causa pide su corrección',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S7-CORRECCION', title: 'Causa y corrección' },
      norma: {
        id: 'norma-correccion',
        title: 'La corrección que pide cada causa',
        source: 'CV2, lectura 1',
        body: [
          '- **Desgaste en el tiempo:** un **preventivo** con su frecuencia.',
          '- **Una práctica de operación:** **corregir la práctica y capacitar**.',
          '- **Un ajuste perdido:** ajustar y fijar el punto. **Se repite pese a todo:** cambiar el diseño o el material.',
          '- **Atender el modo sin la causa repite la falla**; una sola corrección de la causa puede eliminar varios modos de falla.',
          '- Tras corregir, **se verifica que el modo no vuelva**.',
        ].join('\n'),
      },
      regla: 'cada causa pide su corrección: desgaste en el tiempo, un preventivo; práctica de operación, corregirla y capacitar; ajuste perdido, ajustar y fijar; se repite pese a todo, otro diseño o material.',
      // El ejemplo muestra que cambiar la pieza más seguido no siempre es la corrección (APRENDIZAJES §4).
      ejemplo: 'un panel de zaranda se rompe cada pocas semanas aunque se instala bien: el jefe cambia su material, no la frecuencia.',
      ejemploClave: 'panel',
      subrayar: { respalda: ['Una práctica de operación', 'Atender el modo sin la causa'] },
      pregunta: 'El sello de una bomba de pulpa se quema una y otra vez porque los operadores la arrancan sin abrir el agua de sello. El supervisor propone cambiar el sello cada mes, antes de que falle. ¿Es la corrección que pide esa causa, y por qué?',
      criterios: [
        'Decide que no es la corrección que pide esa causa',
        'Da la razón: la causa es una práctica de operación, y pide corregir la práctica y capacitar',
      ],
      critical: [2],
      commonMistakes: ['Responde a toda falla con un preventivo, que sirve para el desgaste en el tiempo', 'Cambia la pieza y no la práctica que la daña: el sello nuevo se vuelve a quemar'],
    },
  ],

  // Gemelo del caso de la hoja de modos de falla: otro equipo (bomba) y otra causa común (desalineamiento), una sola decisión.
  casoCorto: {
    id: 'caso-corto',
    title: 'Corrección de una causa común en un caso',
    subtitle: 'Caso de la bomba y su acople',
    keyPointIndex: 3,
    caso: {
      id: 'caso-acople',
      title: 'Caso: la bomba y su acople',
      referencia: 'el caso de la bomba y su acople',
      name: 'Cerro Blanco, bombas de pulpa',
      source: 'Caso corto construido para Sophia sobre el CV2 · pendiente de aprobación del instructor',
      facts: [
        'Bomba de pulpa de la descarga del molino, unida a su motor por un acople',
        'Modo 1: el acople rompe sus elementos elásticos; 5 cambios en el año',
        'Modo 2: los rodamientos del motor, del lado del acople, se gastan antes de tiempo; 2 cambios en el año',
        'El alineamiento láser encontró los ejes del motor y de la bomba fuera de línea',
        'El jefe de guardia propone: «Compremos un acople más resistente: es lo que más se cambia»',
      ],
      question: '¿Conviene comprar un acople más resistente, como propone el jefe de guardia, y por qué?',
    },
    pistas: 'Si acepta el acople, señálale que relea el cuarto hecho del caso. Si dice que no sin razón, dile que falta el porqué.',
    usa: ['norma-correccion'],
    criterios: [
      'Decide que no conviene',
      'Da la razón: los dos modos comparten una causa, el desalineamiento, y corregirla elimina los dos',
    ],
    critical: [1],
    commonMistakes: ['Corrige el componente que más se cambia y no la causa: un acople nuevo solo atiende el modo, y la falla vuelve', 'Trata los dos modos como fallas sin relación', 'No dice qué hacer: alinear el motor con la bomba y fijar ese ajuste, porque es un ajuste perdido'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 374 y 375) · manual de operación de Tambomayo (faja transportadora N.° 1 y zaranda Tyler XL)',
    referencias: [
      'Sesión 7 de 12 del curso Fundamentos mecánicos de planta (48 h, ciclo II), primera del bloque 2: el TC1 cerró los equipos, sus fallas y la parada programada; el bloque 2 revisa un plan de mantenimiento y empieza por lo básico: cómo falla cada pieza, qué provoca y por qué. Indicador IND-PM-FMPLANTA-2: explica fallas comunes en equipos mecánicos, proponiendo soluciones de mantenimiento preventivo y correctivo en casos, aplicando protocolos de seguridad.',
      'Antes de esta sesión el estudiante trabajó la lectura 1 del recurso autónomo CV2, «Del síntoma a la causa». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Función, modo y efecto (punto clave 1): la función es lo que el componente debe hacer, con su medida; el modo de falla, cómo deja de cumplirla; el efecto, lo que ese modo le hace al equipo y al proceso (horas de parada, producción, seguridad); la causa, por qué ocurre. Un mismo componente puede fallar de varios modos. Ejemplo de la lámina (la bomba de la S4): función del rodamiento, sostener el eje del motor girando sin juego; modo, pista externa erosionada; efecto, vibración y parada; causa, la corriente del variador que pasa por el rodamiento; cambiarlo sin aislarlo repite la falla.',
      'Síntoma y causa (punto clave 2): el síntoma es lo que se ve o se mide; admite varias causas posibles, que se descartan con una inspección, de la más probable a la menos. Zaranda de la lámina: vibra más que antes (resorte roto o contrapeso suelto: inspección visual de resortes); el fino sale grueso (panel roto o abertura gastada: revisión de paneles con la zaranda parada); la correa chilla (correa floja o poleas desalineadas: tensión y alineamiento láser). Corregir el síntoma sin la causa hace que la falla vuelva; la causa se registra en la orden.',
      'Componentes de la faja (punto clave 3, manual de Tambomayo): el motor gira la polea motriz o de cabeza, que arrastra la banda; la polea de cola la devuelve y el tensor (espárrago y carril guía) la mantiene tensa; los polines de impacto amortiguan la caída del mineral en la zona de carga; los de carga y de retorno sostienen y guían la banda; los limpiadores retiran el mineral pegado.',
      'De la causa a la corrección (punto clave 4): desgaste en el tiempo, un preventivo con su frecuencia; práctica de operación, corregir la práctica y capacitar; ajuste perdido, ajustar y fijar el punto; se repite pese a todo, cambiar el diseño o el material. Una sola corrección de la causa puede eliminar varios modos de falla; tras corregir, se verifica que el modo no vuelva.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la bomba y su acople, y los ejemplos que Sophia resuelve son propios o de láminas anteriores (la bomba de la S4, los resortes de la zaranda, los limpiadores de la faja, el panel de zaranda que se cambia de material).',
    ],
  },
}
