/**
 * PM-FMPLANTA · S2 · Equipos de trituración, molienda y clasificación.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (lectura 2). Las figuras de los manuales se miraron una por una.
 * El caso de la sesión («Los repuestos del primer año de una planta de hierro»,
 * Rosa Huamán, Ica) NO entra: es el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const MANUAL = 'Figura de manual de operación; uso autorizado por el instructor líder de PM (Harley Pereyra, 21 set 2026)'
const TAMBOMAYO = 'Compañía de Minas Buenaventura y TECSUP (s. f.). Manual de Operaciones, Planta de Procesos Metalúrgicos, Proyecto Tambomayo'
const EQ = '04_Recursos-graficos/PM/equipos'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-PM-FMPLANTA-S2-FOTO-MOLIENDA', archivo: '04_Recursos-graficos/PM/fotos/seccion-de-molienda-plomo-zinc.jpg', kind: 'scene', license: 'Uso educativo con cita (fotografía de tesis en repositorio universitario)',
    source: 'Salvador Rivera, J. L. (2022). Evaluación de la influencia del RA-CN300… unidad minera Recuperada. UNDAC, anexos, imagen 2',
    description: 'Fotografía de la sección de molienda de una planta concentradora de plomo y zinc, vista desde arriba: en primer plano, un molino de bolas con su corona cubierta (verde y amarillo) y su motor; al centro, una fila de celdas de flotación amarillas; alrededor, pasarelas, fajas y tuberías bajo el techo de la nave. Sin rótulos.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-QUIJADAS', archivo: `${EQ}/chancadora-quijadas-c106/c106_funcionamiento_referencia.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 410 Chancado, figura 3.9 (Metso Nordberg C106)`,
    description: 'Corte de una chancadora de quijadas Metso C106: el mineral entra por arriba (flechas marrones), la quijada móvil (verde, a la izquierda) avanza y retrocede contra la quijada fija (verde oscuro, a la derecha; flechas azules de ida y vuelta) y el producto sale por abajo. A la izquierda, el motor eléctrico y el eje excéntrico con una flecha roja de giro. Sin texto.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-CONO', archivo: `${EQ}/chancadora-cono-hp100/hp100_funcionamiento_leyenda.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 7.18 y tabla 7.19 (Metso HP100)`,
    description: 'Chancadora de cono Metso HP100 en corte, con la cámara de chancado marcada en rojo, y dos esquemas del principio: «1. El mineral grueso entra al lado abierto; el mineral grueso se tritura en el lado cerrado» y «2. Después de una rotación de 180°, el lado abierto está ahora cerrado. El mineral grueso cae en el lado abierto». Leyenda: 1 Lado grueso de la excéntrica, 2 Tazón, 3 Eje principal, 4 Engranaje (corona), 5 Piñón, 6 Contraeje, 7 Excéntrica.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-SAG-PRINCIPIO', archivo: `${EQ}/molino-sag-15x27/sag_principio_referencia.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 4.16 (Metso)`,
    description: 'Tres secciones de un molino con mineral (amarillo) y bolas (gris), rotuladas CARGA ÓPTIMA, CARGA BAJA y SOBRECARGA, cada una con la flecha de giro y el «Punto de impacto» de la carga que cae: en la óptima cae sobre la carga; en la baja, sobre el revestimiento; en la sobrecarga, sobre el mineral que la amortigua. Leyenda: MINERAL, BOLAS.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-SAG-PARTES', archivo: `${EQ}/molino-sag-15x27/sag_partes_leyenda.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 4.3 y tabla 4.5 (Metso)`,
    description: 'Molino SAG de frente y de costado, con catorce partes numeradas: 1 Chute de alimentación, 2 Chumacera principal, 3 Muñón de alimentación, 4 Tapa de alimentación, 5 Casco o cilindro, 6 Tapa de descarga, 7 Chumacera de descarga, 8 Revestimiento del muñón, 9 Eje piñón, 10 Cubierta de engranaje, 11 Corona, 12 Pedestal de cubierta, 13 Pedestal de chumacera, 14 Unidad de lubricación.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-ZARANDA', archivo: `${EQ}/zaranda-tyler-xl/tyler-xl_funcionamiento_referencia.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 5.8 (Tyler XL)`,
    description: 'Zaranda vibratoria Tyler XL en corte, con el excitador arriba (flecha roja de giro) y los rociadores de agua sobre el mineral; leyenda de colores: Alimentación de mineral (naranja), Oversize (azul: lo grueso que sigue de largo y sale por el extremo), Undersize (verde: lo fino que cae por los paneles), Vibración (morado), Sentido de giro (rojo). Arriba, una foto de los rociadores sobre la malla con mineral.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-CICLONES', archivo: `${EQ}/nido-ciclones-krebs/nido_funcionamiento_referencia.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 8.8 (Krebs gMAX15, FLSmidth)`,
    description: 'Nido de ciclones Krebs con su distribuidor central y, a la derecha, un ciclón en corte: la pulpa entra por «Ingreso de pulpa en espiral», el flujo descendente en espiral (verde) baja por la pared hasta el «Apex» y sale como «underflow»; el flujo ascendente en espiral (naranja) sube por el centro hasta el «Vortex» y sale como «overflow». Leyenda: Eje central del ciclón, Flujo descendente en espiral, Flujo ascendente en espiral, Alimentación; «Vista superior del ciclón».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-ACCIONAMIENTOS', archivo: '04_Recursos-graficos/PM/esquemas/fmplanta/s2/fmplanta-s2_accionamientos.png', kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia con los datos generales de los manuales de operación de Tambomayo y Marcobre',
    description: 'Tabla «Equipo / Motor / Transmisión / Salida»: Grizzly, 14,5 kW, fajas y poleas, 800 rpm; Zaranda, 22,3 kW, fajas y poleas, 1 130 rpm; Quijadas, 110 kW, fajas y volantes, 280 rpm; Bomba de pulpa, 112 kW, fajas y poleas, 749 rpm; Molino SAG, 3 000 kW, reductor, piñón y corona, —; HPGR, 3 600 kW, cardán y reductor, 17,5 rpm. Abajo: «Los motores giran a 1 200 o 1 800 rpm».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S2-BOMBA', archivo: `${EQ}/bomba-warman-8x6/warman_funcionamiento_referencia.png`, kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 9.9 (Warman 8/6 F-AH, Weir)`,
    description: 'Bomba de pulpa Warman en corte: arriba el motor eléctrico, a la izquierda la guarda de las fajas y poleas con dos flechas rojas de giro, al centro la caja de rodamientos y a la derecha la carcasa abierta con el impulsor amarillo; la succión entra por la derecha (flecha verde) y la descarga sale hacia arriba (flecha amarilla). Sin texto.',
  },
]

export const S2: SesionSpec = {
  slug: 'pm-fmplanta-s2-equipos-de-trituracion-molienda-y-clasificacion',
  order: 2,
  etiqueta: 'S2',
  idPrefijo: 'fmplanta-s2',
  title: 'Equipos de trituración, molienda y clasificación',
  objective:
    'Describe el principio de funcionamiento y las partes principales de los equipos de trituración, molienda y clasificación, y de los accionamientos y bombas que los sirven.',
  keyPoints: ['Trituración: quijadas, cono y HPGR', 'Molienda: el molino SAG', 'Clasificación: zaranda e hidrociclón', 'Accionamientos y bombas'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Huamán', 'Ica', 'planta de hierro', '170 bar', 'LIMS'],

  rutina: {
    imagenId: 'IMG-PM-FMPLANTA-S2-FOTO-MOLIENDA',
    tituloImagen: 'Sección de molienda de una planta',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    preguntas: {
      veo: '¿Qué hay en la imagen?',
      pienso: '¿Qué crees que pasa ahí?',
      mePregunto: '¿Qué te gustaría saber?',
    },
    titulos: {
      veo: 'Observación de una sección de molienda',
      pienso: 'Lo que pasa en la sección de molienda',
      mePregunto: 'Lo que falta saber de esos equipos',
    },
    pistaVeo: 'qué equipo hay en primer plano y qué hay al fondo',
    criterios: {
      pienso: ['Dice qué cree que pasa en esa sección', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le gustaría saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'trituracion',
      title: 'Trituración: quijadas, cono y HPGR',
      subtitle: 'La parte que aprieta la roca',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S2-QUIJADAS', title: 'La chancadora de quijadas' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S2-CONO', title: 'La chancadora de cono' }],
      norma: {
        id: 'norma-trituracion',
        title: 'Cómo tritura cada chancadora',
        source: 'CV1, lectura 2 · manuales de Tambomayo (C106, HP100) y Marcobre (HPGR Polycom)',
        body: [
          '- **Quijadas:** tritura por **compresión** entre dos mordazas; un eje excéntrico mueve la quijada móvil contra la fija. Motor, fajas y volantes bajan el giro a 280 rpm.',
          '- **Cono:** el **manto gira con movimiento excéntrico** y el mineral queda atrapado entre el manto y el revestimiento del tazón; el contraeje mueve la excéntrica por un piñón y una corona.',
          '- **HPGR:** tritura **comprimiendo el mineral entre dos rodillos**, uno fijo y otro móvil empujado por cilindros hidráulicos; cada rodillo tiene su motor, cardán y reductor planetario.',
          '- En los tres, la parte que hace el trabajo es la que **aprieta la roca**; lo demás transmite el giro.',
        ].join('\n'),
      },
      regla: 'triturar es apretar la roca: la quijada entre mordaza móvil y fija, el cono entre manto excéntrico y revestimiento, el HPGR entre dos rodillos; lo demás transmite el giro.',
      ejemplo: 'en la quijada, el eje excéntrico empuja la mordaza móvil contra la fija y la roca se parte por compresión; motor, fajas y volantes solo mueven el eje.',
      ejemploClave: 'mordaza',
      subrayar: { respalda: ['Cono:', 'aprieta la roca'] },
      pregunta: 'En una chancadora de cono, el supervisor dice que lo que rompe la roca es el giro de la corona. ¿Es así, y por qué?',
      criterios: [
        'Decide que no es así',
        'Da la razón: el mineral se tritura al quedar atrapado entre el manto, que gira excéntrico, y el revestimiento; el piñón y la corona solo transmiten el giro del contraeje a la excéntrica',
      ],
      critical: [2],
      commonMistakes: ['Confunde la transmisión (piñón, corona, contraeje) con la parte que tritura', 'Cree que el cono tritura por impacto'],
    },
    {
      id: 'molienda',
      title: 'Molienda: el molino SAG',
      subtitle: 'La carga que sube y cae',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S2-SAG-PRINCIPIO', title: 'Carga del molino SAG' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S2-SAG-PARTES', title: 'Las partes del molino SAG' }],
      norma: {
        id: 'norma-molienda',
        title: 'Cómo muele el molino SAG',
        source: 'CV1, lectura 2 · manual de Tambomayo, figuras 4.3 y 4.16',
        body: [
          '- El molino SAG muele **mineral, bolas y agua** dentro de un cilindro: al girar, **eleva la carga y la deja caer** sobre sí misma.',
          '- Los **levantadores** suben la carga; los **revestimientos** protegen el casco.',
          '- La carga total ocupa **hasta el 28 % del volumen**: con carga baja las bolas golpean el revestimiento; con sobrecarga el mineral amortigua los golpes y muele menos.',
          '- Gira sobre **chumaceras**, movido por motor, reductor y eje piñón; descarga a una zaranda que devuelve lo grueso al molino.',
        ].join('\n'),
      },
      regla: 'el SAG muele mineral, bolas y agua: al girar eleva la carga y la deja caer sobre sí misma; la carga ocupa hasta el 28 % del volumen.',
      ejemplo: 'con carga baja las bolas caen sobre el revestimiento y lo destrozan; con sobrecarga el mineral amortigua el golpe y muele menos.',
      ejemploClave: 'amortigua',
      subrayar: { respalda: 'hasta el 28 %' },
      pregunta: 'Un operador sube la carga del molino SAG por encima del 28 % del volumen «para moler más». ¿Va a moler más, y por qué?',
      criterios: [
        'Decide que no va a moler más',
        'Da la razón: con sobrecarga el mineral amortigua los golpes de la carga que cae y el molino muele menos; la carga total ocupa hasta el 28 %',
      ],
      critical: [2],
      commonMistakes: ['Cree que más carga siempre es más molienda', 'Cree que el molino muele por rozamiento del casco'],
    },
    {
      id: 'clasificacion',
      title: 'Clasificación: zaranda e hidrociclón',
      subtitle: 'Vibrar o girar la pulpa',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S2-ZARANDA', title: 'La zaranda vibratoria' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S2-CICLONES', title: 'El hidrociclón' }],
      norma: {
        id: 'norma-clasificacion',
        title: 'Cómo clasifica cada equipo',
        source: 'CV1, lectura 2 · manual de Tambomayo, figuras 5.8 y 8.8',
        body: [
          '- El **grizzly y la zaranda** clasifican por tamaño **vibrando**: los excitadores giran contrapesos; lo fino pasa entre rieles o paneles, lo grueso sigue de largo.',
          '- El **hidrociclón** recibe pulpa bombeada y la hace **girar en espiral**.',
          '- El **grueso baja por la pared y sale por el ápex** (underflow); el **fino sube por el centro y sale por el vórtex** (overflow).',
          '- La zaranda separa por tamaño con una malla; el hidrociclón, por peso, con la fuerza centrífuga.',
        ].join('\n'),
      },
      regla: 'la zaranda clasifica por tamaño vibrando: lo fino pasa, lo grueso sigue; el hidrociclón hace girar la pulpa en espiral: el grueso baja al ápex, el fino sube al vórtex.',
      // 22 oct 2026: el ejemplo describía el equipo y se fundía con la regla; ahora es una situación.
      ejemplo: 'el operador de la zaranda ve caer lo fino por los paneles y lo grueso seguir hasta el extremo: es la vibración de los excitadores, que giran contrapesos.',
      ejemploClave: 'operador de la zaranda',
      subrayar: { respalda: 'grueso baja por la pared' },
      pregunta: 'En un hidrociclón, el ayudante dice que el grueso sale por arriba «porque la pulpa sube». ¿Es así, y por qué?',
      criterios: [
        'Decide que no es así',
        'Da la razón: el grueso baja por la pared y sale por el ápex (underflow); el fino sube por el centro y sale por el vórtex (overflow)',
      ],
      critical: [2],
      commonMistakes: ['Invierte ápex y vórtex', 'Cree que el hidrociclón separa con una malla, como la zaranda'],
    },
    {
      id: 'accionamientos',
      title: 'Accionamientos y bombas',
      subtitle: 'Del motor al equipo, y de un equipo al siguiente',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S2-ACCIONAMIENTOS', title: 'Motor y transmisión de cada equipo' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S2-BOMBA', title: 'La bomba de pulpa' }],
      norma: {
        id: 'norma-accionamientos',
        title: 'Accionamientos y bombas',
        source: 'CV1, lectura 2 · manuales de Tambomayo y Marcobre',
        body: [
          '- Cada equipo principal tiene su **propio motor eléctrico**; los motores giran a 1 200 o 1 800 rpm.',
          '- **Fajas y poleas** bajan la velocidad del motor a la del equipo; el molino y el HPGR usan **reductor** en lugar de fajas.',
          '- La **bomba de pulpa** lleva la pulpa de un equipo al siguiente: el impulsor succiona y la empuja por fuerza centrífuga. La faja mueve mineral seco.',
          '- Las válvulas del nido de ciclones se mueven con **aire comprimido**.',
        ].join('\n'),
      },
      regla: 'cada equipo tiene su motor; fajas y poleas bajan la velocidad a la del equipo; molino y HPGR usan reductor. La pulpa la mueve la bomba de pulpa; el mineral seco, la faja.',
      ejemplo: 'la zaranda: motor de 22,3 kW con fajas y poleas a 1 130 rpm; el SAG no usa fajas: reductor, piñón y corona.',
      ejemploClave: 'poleas',
      subrayar: { respalda: 'bomba de pulpa' },
      pregunta: 'Para llevar la descarga del molino hasta los hidrociclones, el practicante propone una faja transportadora. ¿Sirve, y por qué?',
      criterios: [
        'Decide que no sirve',
        'Da la razón: la descarga del molino es pulpa (mineral con agua) y la mueve la bomba de pulpa, cuyo impulsor succiona y empuja por fuerza centrífuga; la faja mueve mineral seco',
      ],
      critical: [2],
      commonMistakes: ['Cree que la faja mueve cualquier material', 'No distingue mineral seco de pulpa'],
    },
  ],

  // Gemelo del caso de la lista de repuestos: un equipo puesto en la operación equivocada.
  casoCorto: {
    id: 'caso-corto',
    title: 'Ubicación de un equipo en su operación',
    subtitle: 'Caso de la lista de repuestos',
    keyPointIndex: 2,
    caso: {
      id: 'caso-repuestos',
      title: 'Caso: la lista de repuestos',
      referencia: 'el caso de la lista de repuestos',
      name: 'Concentradora San Martín, almacén',
      source: 'Caso corto construido para Sophia sobre el CV1 · pendiente de aprobación del instructor',
      facts: [
        'La planta cierra el lunes su lista de repuestos críticos, ordenada por operación: trituración, molienda y clasificación',
        'El nido de hidrociclones figura bajo «molienda», porque trabaja en circuito cerrado con el molino de bolas',
        'El jefe de mantenimiento anotó al margen: «va con los repuestos del molino»',
        'Un repuesto que quede en la operación equivocada tarda meses en aparecer cuando hace falta',
      ],
      question: '¿El nido de hidrociclones va con los repuestos de molienda o de clasificación, y por qué?',
    },
    pistas: 'Si lo pone en molienda por estar pegado al molino, pregúntale qué le hace el hidrociclón a la pulpa y si reduce el tamaño del mineral. Si dice clasificación sin razón, pídele cómo separa el grueso del fino.',
    criterios: [
      'Decide que va con clasificación',
      'Da la razón: el hidrociclón no reduce tamaño; separa la pulpa haciéndola girar en espiral (grueso al ápex, fino al vórtex); estar en circuito cerrado con el molino no lo vuelve molienda',
    ],
    critical: [1],
    commonMistakes: ['Clasifica el equipo por dónde está instalado y no por lo que hace', 'Cree que todo lo que recibe la descarga del molino es molienda'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 374 y 375) · manuales de operación de Tambomayo (Buenaventura–TECSUP) y Marcobre',
    referencias: [
      'Sesión 2 de 12 del curso Fundamentos mecánicos de planta (48 h, ciclo II). Indicador IND-PM-FMPLANTA-1: describe los componentes eléctricos y mecánicos principales de los equipos de trituración, molienda y clasificación, asociándolos con sus respectivas funciones en la planta. La sesión 1 enseñó la falla y la disponibilidad; hoy, cómo funciona cada equipo: no se puede mantener lo que no se sabe cómo funciona.',
      'Antes de esta sesión el estudiante trabajó la lectura 2 del recurso autónomo CV1, «Los equipos de la planta y su accionamiento». Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Trituración (punto clave 1): la quijadas tritura por compresión entre dos mordazas; un eje excéntrico mueve la quijada móvil contra la fija; motor, fajas y volantes bajan el giro a 280 rpm. En el cono, el manto gira con movimiento excéntrico y el mineral queda atrapado entre el manto y el revestimiento del tazón; el contraeje mueve la excéntrica por un piñón y una corona (el lado abierto recibe el mineral grueso y, tras media vuelta, lo tritura en el lado cerrado). El HPGR tritura comprimiendo el mineral entre dos rodillos, uno fijo y otro móvil empujado por cilindros hidráulicos; cada rodillo tiene su motor, cardán y reductor planetario; recibe mineral seco.',
      'Molienda (punto clave 2): el molino SAG muele mineral, bolas y agua dentro de un cilindro; al girar eleva la carga y la deja caer sobre sí misma (impacto y rozamiento); los levantadores suben la carga y los revestimientos protegen el casco; la carga total ocupa hasta el 28 % del volumen (carga baja: las bolas golpean el revestimiento; sobrecarga: el mineral amortigua y muele menos); gira sobre chumaceras, movido por motor, reductor y eje piñón; descarga a una zaranda que devuelve lo grueso al molino.',
      'Clasificación (punto clave 3): el grizzly y la zaranda clasifican por tamaño vibrando (excitadores con contrapesos; lo fino pasa entre rieles o paneles, lo grueso sigue de largo); el hidrociclón recibe pulpa bombeada y la hace girar en espiral: el grueso baja por la pared y sale por el ápex (underflow), el fino sube por el centro y sale por el vórtex (overflow).',
      'Accionamientos y bombas (punto clave 4): cada equipo principal tiene su propio motor; fajas y poleas bajan la velocidad del motor (1 200 o 1 800 rpm) a la del equipo (grizzly 800 rpm, zaranda 1 130, quijadas 280 con volantes, bomba de pulpa 749); el molino SAG (3 000 kW) usa reductor, piñón y corona, y el HPGR (3 600 kW) cardán y reductor, a 17,5 rpm; la bomba de pulpa lleva la pulpa de un equipo al siguiente (el impulsor succiona y empuja por fuerza centrífuga); las válvulas del nido de ciclones se mueven con aire comprimido.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto de la lista de repuestos, y los ejemplos que Sophia resuelve son propios (la mordaza de la quijada, la carga baja y la sobrecarga, los excitadores de la zaranda, el motor de la zaranda con fajas y poleas).',
    ],
  },
}
