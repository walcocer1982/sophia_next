/**
 * PM-FMPLANTA · S3 · Sistemas eléctricos y su integración con los componentes mecánicos.
 * Fuente: 05_Base-de-datos (sesiones, contenidos, laminas, imagenes.csv) y el
 * recurso autónomo CV1 (lectura 2). Las figuras se miraron una por una.
 * El caso de la sesión («Los motores de la molienda antes de subir el tonelaje»,
 * Kevin Ríos, Pasco) NO entra: es el trabajo del equipo.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'
const MANUAL = 'Figura de manual de operación; uso autorizado por el instructor líder de PM (Harley Pereyra, 21 set 2026)'
const TAMBOMAYO = 'Compañía de Minas Buenaventura y TECSUP (s. f.). Manual de Operaciones, Planta de Procesos Metalúrgicos, Proyecto Tambomayo'
const ESQ = '04_Recursos-graficos/PM/esquemas/fmplanta/s3'
const GEN = 'Elaboración propia · 04_Recursos-graficos/scripts/gen_esquemas_fmplanta_s3.py'

const IMAGENES: ImagenSpec[] = [
  {
    id: 'IMG-PM-FMPLANTA-S3-FOTO-VARIADOR', archivo: '04_Recursos-graficos/PM/fotos/celda-de-laboratorio-d12-variador.jpg', kind: 'scene', license: 'Fotografía de producto del fabricante (manual público), uso educativo con cita',
    source: 'Legend, Inc. (s. f.). D-12 Flotation Machine (VFD): Operation and Maintenance Manual, portada',
    description: 'Fotografía pequeña del variador de frecuencia de una máquina de flotación de laboratorio D-12: a la izquierda, el tablero negro del variador con su pantalla de dígitos rojos, su teclado y el potenciómetro; a la derecha, la cubierta turquesa del motor con una argolla de izaje arriba. Sin rótulos.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-PLACA', archivo: `${ESQ}/fmplanta-s3_placa.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia con la tabla 5.1 del manual de Tambomayo (zaranda Tyler XL); FP 0,85 supuesto por decisión de Harley Pereyra',
    description: 'Tabla «Dato de placa / Valor»: Potencia, 30 HP · 22,3 kW; Voltaje · frecuencia, 460 V · 60 Hz; Velocidad, 1 800 rpm. Fórmula en amarillo: P = √3 × V × I × FP. Debajo: «Con FP = 0,85 (supuesto: el manual no lo da): I = 22 300 ÷ (1,73 × 460 × 0,85) ≈ 33 A». Pie: motor de la zaranda vibratoria Tyler XL · manual de Tambomayo, tabla 5.1 · sin contar la eficiencia del motor.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-MAGNITUDES', archivo: `${ESQ}/fmplanta-s3_magnitudes.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tabla «Magnitud / Qué es / Unidad / Se mide con»: Voltaje, el empuje eléctrico, voltio (V), voltímetro; Corriente, el flujo eléctrico, amperio (A), pinza amperimétrica; Potencia, la energía por segundo, kilovatio (kW), analizador de redes.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-SAG-ACCIONAMIENTO', archivo: '04_Recursos-graficos/PM/equipos/molino-sag-15x27/sag_accionamiento_leyenda.png', kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 4.5 y tabla 4.7 (Metso)`,
    description: 'Accionamiento del molino SAG en planta y en elevación, con ocho partes numeradas: 1 Acoplamiento de baja, 2 Acoplamiento de alta, 3 Motor de enfriamiento, 4 Acoplamiento del inching, 5 Eje piñón, 6 Reductor, 7 Motor principal, 8 Inching drive. En la elevación se ve la cadena: eje piñón, reductor, motor principal y, al extremo, el inching drive.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-SAG-ENFRIAMIENTO', archivo: '04_Recursos-graficos/PM/equipos/molino-sag-15x27/sag_enfriamiento-motor_leyenda.png', kind: 'diagram', license: MANUAL,
    source: `${TAMBOMAYO}. Área 430 Molienda, figura 4.6 y tabla 4.8 (Metso)`,
    description: 'Motor principal del molino SAG visto en planta, azul, con siete partes numeradas: 1 Escobilla de aterramiento, 2 Ingreso de aire, 3 Motor trifásico superior, 4 Motor trifásico posterior (los ventiladores), 5 Salida de aire, 6 Caja de conexiones, 7 Calentador (interior).',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-CARGA-CORRIENTE', archivo: `${ESQ}/fmplanta-s3_carga-corriente.png`, kind: 'diagram', license: PROPIA, source: GEN,
    description: 'Tres tarjetas con flechas: MÁS CARGA, «mecánico»: más bolas o mineral en el molino; MÁS TORQUE, «en el eje»: el motor tiene que empujar más; MÁS CORRIENTE, «eléctrico»: el bobinado se calienta más. Debajo: «% de carga = corriente de operación ÷ corriente nominal» y «Ejemplo: si la zaranda toma 25 A de 33 A, trabaja al 76 %».',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-MOTOR-CORONA', archivo: `${ESQ}/fmplanta-s3_motor-corona.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia con los datos del manual de Tambomayo (molino SAG, 3 000 kW, 1 200 rpm)',
    description: 'Tres tarjetas con flechas: MOTOR, «eléctrico»: 3 000 kW a 1 200 rpm, mucha velocidad, poco torque; REDUCTOR, «engranajes»: baja la velocidad y sube el torque; PIÑÓN Y CORONA, «mecánico»: la corona, en el cilindro, hace girar el molino.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-ENCLAVAMIENTO', archivo: `${ESQ}/fmplanta-s3_enclavamiento.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia con la sección 4.2.6 del manual de Tambomayo (lubricación del molino SAG)',
    description: 'Tabla «Paso / Qué pasa en el arranque»: 1, la bomba de baja presión lleva aceite filtrado y frío a los trunnions; 2, la bomba de alta presión levanta los trunnions sobre una película de aceite; 3, con la presión correcta, el enclavamiento da permiso de arranque; 4, arranca el motor principal y gira el molino; 5, pasado un tiempo, la bomba de alta presión se apaga sola.',
  },
  {
    id: 'IMG-PM-FMPLANTA-S3-HPGR-ACCIONAMIENTO', archivo: '04_Recursos-graficos/PM/equipos/hpgr-polycom-20-15/polycom_accionamiento_leyenda.png', kind: 'diagram', license: MANUAL,
    source: 'Marcobre S.A.C. (s. f.). Manual de Operaciones, sub área 2140, figura 2.3 (ThyssenKrupp Polycom 20/15M)',
    description: 'Un tren de accionamiento del HPGR, de izquierda a derecha: 1 Reductor (planetario, pegado al rodillo), 2 Guarda de seguridad (malla amarilla), 3 Eje cardán, 4 Acople de seguridad, 5 Motor trifásico (el más grande, a la derecha).',
  },
]

export const S3: SesionSpec = {
  slug: 'pm-fmplanta-s3-sistemas-electricos-y-su-integracion-con-los-componentes-mecanicos',
  order: 3,
  etiqueta: 'S3',
  idPrefijo: 'fmplanta-s3',
  // El nombre oficial («Sistemas eléctricos y su integración con los componentes mecánicos») pasa de 8 palabras.
  title: 'Integración de los sistemas eléctricos y mecánicos',
  objective:
    'Describe la función de los componentes eléctricos que accionan un equipo de planta y cómo la carga mecánica que mueven se refleja en sus datos eléctricos.',
  keyPoints: ['La placa del motor trifásico', 'Componentes eléctricos del accionamiento', 'La carga mecánica se ve en la corriente', 'Enclavamientos y protecciones'],
  imagenes: IMAGENES,
  casosDelEquipo: ['Ríos', 'Marcy', 'Hardinge', 'Dominion', 'COMESA', 'Pasco'],

  rutina: {
    imagenId: 'IMG-PM-FMPLANTA-S3-FOTO-VARIADOR',
    tituloImagen: 'Variador de velocidad de una celda de laboratorio',
    fuente: 'Rutina de pensamiento de Project Zero (Harvard) · lámina 8 del PPT de la sesión',
    preguntas: {
      veo: '¿Qué hay en la imagen?',
      pienso: '¿Qué crees que pasa ahí?',
      mePregunto: '¿Qué te gustaría saber?',
    },
    titulos: {
      veo: 'Observación de un variador y su motor',
      pienso: 'Lo que pasa en el variador',
      mePregunto: 'Lo que falta saber del variador',
    },
    pistaVeo: 'qué aparato hay a la izquierda y qué hay a la derecha',
    criterios: {
      pienso: ['Dice qué cree que hace el aparato o qué pasa ahí', 'Dice qué de la foto le hace pensarlo'],
      mePregunto: ['Dice qué le gustaría saber, o qué se pregunta'],
    },
  },

  puntosClave: [
    {
      id: 'placa',
      title: 'La placa del motor trifásico',
      subtitle: 'Voltaje, corriente y potencia',
      keyPointIndex: 0,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S3-PLACA', title: 'La placa del motor' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S3-MAGNITUDES', title: 'Las tres magnitudes' }],
      norma: {
        id: 'norma-placa',
        title: 'Lo que dice la placa',
        source: 'CV1, lectura 2 · manual de Tambomayo, tabla 5.1',
        body: [
          '- **Voltaje** (V): el empuje eléctrico. **Corriente** (A): el flujo eléctrico. **Potencia** (kW): la energía que se entrega cada segundo.',
          '- Los motores de planta son **trifásicos**, alimentados por tres líneas: **P = √3 × V × I × FP**.',
          '- La **placa** da los valores **nominales de diseño**: potencia, voltaje, corriente nominal, velocidad.',
          '- La corriente nominal es la que el motor toma cuando entrega su potencia de placa; **lo que consume depende de la carga que mueve**.',
        ].join('\n'),
      },
      regla: 'la placa da los valores nominales de diseño: potencia, voltaje, corriente nominal, velocidad; P = √3 × V × I × FP. Lo que consume depende de la carga que mueve.',
      ejemplo: 'motor de la zaranda: 22,3 kW y 460 V; con FP 0,85, I = 22 300 ÷ (1,73 × 460 × 0,85) ≈ 33 A, su corriente nominal.',
      ejemploClave: '33',
      // 22 oct 2026, alumno flojo: tocó «lo que consume depende de la carga», que es la respuesta.
      subrayar: { respalda: ['nominales de diseño', 'depende de la carga'] },
      pregunta: 'Un practicante lee en la placa «30 HP · 22,3 kW» y dice que el motor consume 22,3 kW todo el tiempo que está prendido. ¿Es así, y por qué?',
      criterios: [
        'Decide que no es así',
        'Da la razón: la placa da valores nominales de diseño, lo que el motor entrega a plena carga; lo que consume depende de la carga que mueve',
      ],
      critical: [2],
      commonMistakes: ['Cree que la potencia de placa es el consumo', 'Confunde corriente nominal con corriente de operación'],
    },
    {
      id: 'accionamiento',
      title: 'Componentes eléctricos del accionamiento',
      subtitle: 'Motor, enfriamiento, calentador e inching drive',
      keyPointIndex: 1,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S3-SAG-ACCIONAMIENTO', title: 'Accionamiento del molino SAG' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S3-SAG-ENFRIAMIENTO', title: 'El motor principal y su enfriamiento' }],
      norma: {
        id: 'norma-accionamiento',
        title: 'El accionamiento del molino',
        source: 'Manual de Tambomayo, figuras 4.5 y 4.6',
        body: [
          '- El **motor** convierte la energía eléctrica en giro del eje; el SAG usa un motor de inducción de **rotor bobinado**.',
          '- Un **reductor** y un **eje piñón** llevan el giro a la **corona**.',
          '- **Ventiladores y un intercambiador** enfrían el bobinado del motor; un **calentador interno evita la humedad con el motor detenido**.',
          '- El **inching drive** gira el molino lento para el mantenimiento.',
        ].join('\n'),
      },
      regla: 'el motor convierte la energía eléctrica en giro; reductor y eje piñón lo llevan a la corona; ventiladores enfrían el bobinado, el calentador interno evita la humedad con el motor detenido y el inching drive gira el molino lento.',
      ejemplo: 'para cambiar un revestimiento, el molino se gira despacio con el inching drive, nunca con el motor principal.',
      ejemploClave: 'inching',
      subrayar: { respalda: 'calentador interno' },
      pregunta: 'El molino SAG quedará detenido dos semanas por mantenimiento y el electricista propone apagar también el calentador interno del motor «para ahorrar». ¿Conviene, y por qué?',
      criterios: [
        'Decide que no conviene',
        'Da la razón: el calentador interno evita la humedad en el bobinado mientras el motor está detenido; apagarlo expone el motor a la humedad',
      ],
      critical: [2],
      commonMistakes: ['Cree que con el motor detenido nada del motor tiene que funcionar', 'Confunde el calentador con el sistema de enfriamiento'],
    },
    {
      id: 'carga-corriente',
      title: 'La carga mecánica se ve en la corriente',
      subtitle: 'Más carga, más torque, más corriente',
      keyPointIndex: 2,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S3-CARGA-CORRIENTE', title: 'La carga se ve en la corriente' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S3-MOTOR-CORONA', title: 'Del motor a la corona' }],
      norma: {
        id: 'norma-carga-corriente',
        title: 'La carga y la corriente',
        source: 'CV1, lectura 2',
        body: [
          '- El reductor baja la velocidad y **sube el torque**; el piñón empuja la corona montada en el cilindro.',
          '- **Más carga** en el molino pide **más torque** al motor, y más torque se refleja como **más corriente**.',
          '- **Porcentaje de carga = corriente de operación ÷ corriente nominal** (si la zaranda toma 25 A de 33 A, trabaja al 76 %).',
          '- Por encima de la nominal, el **bobinado se calienta y envejece**; la causa suele ser mecánica: mineral de más.',
        ].join('\n'),
      },
      regla: 'el reductor baja la velocidad y sube el torque; más carga en el molino pide más torque y más torque es más corriente. Porcentaje de carga = corriente de operación ÷ corriente nominal.',
      ejemplo: 'si la zaranda toma 25 A de 33 A, trabaja al 76 %; con 40 A estaría sobrecargada: mineral de más.',
      ejemploClave: '76',
      // 22 oct 2026, alumno flojo: tocó «la causa suele ser mecánica», que es la respuesta.
      subrayar: { respalda: ['Más carga', 'causa suele ser mecánica'] },
      pregunta: 'El amperímetro del molino marca por encima de la corriente nominal y el electricista busca primero una falla en el tablero. ¿Es lo primero que hay que revisar, y por qué?',
      criterios: [
        'Decide que no es lo primero',
        'Da la razón: más corriente es más torque, es decir, más carga mecánica (mineral o bolas de más en el molino); la causa suele ser mecánica, y por encima de la nominal el bobinado se calienta',
      ],
      critical: [2],
      commonMistakes: ['Cree que una corriente alta siempre es un problema eléctrico', 'No relaciona torque con corriente'],
    },
    {
      id: 'enclavamientos',
      title: 'Enclavamientos y protecciones',
      subtitle: 'El arranque tiene un orden',
      keyPointIndex: 3,
      lamina: { imagenId: 'IMG-PM-FMPLANTA-S3-ENCLAVAMIENTO', title: 'El arranque del molino SAG' },
      apoyo: [{ imagenId: 'IMG-PM-FMPLANTA-S3-HPGR-ACCIONAMIENTO', title: 'El acople de seguridad del HPGR' }],
      norma: {
        id: 'norma-enclavamientos',
        title: 'Enclavamientos y protecciones',
        source: 'Manual de Tambomayo, 4.2.6 · manual de Marcobre, figura 2.3',
        body: [
          '- Un **enclavamiento** impide arrancar si falta una condición: el molino no arranca sin aceite a presión en los trunnions.',
          '- La **bomba de alta presión** levanta los trunnions sobre una película de aceite al arrancar; con la presión correcta, el enclavamiento da el permiso.',
          '- El **acople de seguridad** protege al motor si el equipo se bloquea; un **interruptor de límite** avisa si falla la lubricación del HPGR.',
          '- Si una protección dispara, **se busca la causa**, a menudo mecánica; saltarse el orden es lo que el enclavamiento existe para impedir.',
        ].join('\n'),
      },
      regla: 'un enclavamiento impide arrancar si falta una condición; el acople de seguridad protege al motor si el equipo se bloquea; si una protección dispara, se busca la causa, a menudo mecánica.',
      ejemplo: 'el SAG no arranca sin aceite a presión en los trunnions: la bomba de baja, luego la de alta los levanta, recién el permiso de arranque.',
      // «trunnions» también está en la respuesta esperada de la pregunta: el auditor lo tomaba por hablar del ejemplo.
      ejemploClave: 'de baja',
      subrayar: { respalda: ['Un enclavamiento', 'bomba de alta presión', 'se busca la causa'] },
      pregunta: 'El SAG no arranca y el operador propone puentear el enclavamiento de presión de aceite «para no perder la guardia». ¿Se hace, y por qué?',
      criterios: [
        'Decide que no se hace',
        'Da la razón: el enclavamiento impide arrancar sin aceite a presión en los trunnions; sin esa condición el molino gira sin película de aceite; se busca la causa (a menudo mecánica, como la bomba de alta presión)',
      ],
      critical: [2],
      commonMistakes: ['Cree que el enclavamiento es un estorbo que se puede saltar', 'Busca la causa en el motor y no en la condición que falta'],
    },
  ],

  // Gemelo del caso de los motores de la molienda: un solo motor, una sola decisión.
  casoCorto: {
    id: 'caso-corto',
    title: 'Carga real de un motor en un caso',
    subtitle: 'Caso del motor de la bomba',
    keyPointIndex: 2,
    caso: {
      id: 'caso-bomba',
      title: 'Caso: el motor de la bomba de pulpa',
      referencia: 'el caso del motor de la bomba',
      name: 'Concentradora Cerro Blanco, bombas',
      source: 'Caso corto construido para Sophia sobre el CV1 · pendiente de aprobación del instructor',
      facts: [
        'Bomba de pulpa de la descarga del molino; placa del motor: 45 kW · 460 V · corriente nominal 75 A · 1 800 rpm',
        'La guardia midió con la pinza amperimétrica 71 A en operación normal',
        'El supervisor quiere subir el flujo de pulpa (más densidad y más tonelaje) «porque el motor es de 45 kW y le sobra»',
        'Si la bomba se detiene, la descarga del molino se inunda y el molino para',
      ],
      question: '¿Le sobra motor a la bomba, y por qué?',
    },
    pistas: 'Si dice que le sobra por los 45 kW, pregúntale a qué porcentaje de carga trabaja hoy (71 A de 75 A) y qué pasa con la corriente si sube la pulpa. Si dice que no sin razón, pídele el porcentaje de carga.',
    criterios: [
      'Decide que no le sobra: trabaja al 95 % (71 A de 75 A)',
      'Da la razón: más pulpa es más carga, más torque y más corriente; pasaría la nominal y el bobinado se calienta; la potencia de placa no dice cuánto consume, lo dice la corriente contra la nominal',
    ],
    critical: [1],
    commonMistakes: ['Decide por la potencia de placa y no por la corriente medida', 'Cree que un motor «grande» aguanta cualquier carga'],
  },

  contexto: {
    pais: 'Perú',
    normativa: 'D.S. 024-2016-EM (arts. 374 y 375) · manuales de operación de Tambomayo y Marcobre',
    referencias: [
      'Sesión 3 de 12 del curso Fundamentos mecánicos de planta (48 h, ciclo II). Indicador IND-PM-FMPLANTA-1: describe los componentes eléctricos y mecánicos principales de los equipos de trituración, molienda y clasificación, asociándolos con sus respectivas funciones en la planta. La sesión 2 enseñó cómo funciona cada equipo y qué motor lo acciona; hoy, el lado eléctrico: qué dice el motor y cómo se entera de la carga que mueve.',
      'Antes de esta sesión el estudiante trabajó la lectura 2 del recurso autónomo CV1 (el accionamiento eléctrico, la placa, la corriente, los enclavamientos). Sophia recuerda, muestra y hace aplicar; no parte de cero.',
      'Placa (punto clave 1): voltaje = empuje eléctrico (V, voltímetro); corriente = flujo eléctrico (A, pinza amperimétrica); potencia = energía por segundo (kW, analizador de redes). Motores trifásicos: P = √3 × V × I × FP. La placa da los valores nominales de diseño (potencia, voltaje, corriente nominal, velocidad, factor de servicio). Ejemplo de la lámina: motor de la zaranda Tyler XL, 30 HP · 22,3 kW, 460 V · 60 Hz, 1 800 rpm; con FP 0,85 supuesto, I = 22 300 ÷ (1,73 × 460 × 0,85) ≈ 33 A, sin contar la eficiencia del motor.',
      'Accionamiento (punto clave 2): el motor convierte la energía eléctrica en giro; el SAG usa motor de inducción de rotor bobinado; reductor y eje piñón llevan el giro a la corona; ventiladores y un intercambiador enfrían el bobinado; un calentador interno evita la humedad con el motor detenido; el inching drive gira el molino lento para el mantenimiento (figuras 4.5 y 4.6 del manual de Tambomayo: acoplamientos de baja y de alta, motor de enfriamiento, escobilla de aterramiento, caja de conexiones).',
      'Carga y corriente (punto clave 3): el reductor baja la velocidad y sube el torque (SAG: 3 000 kW a 1 200 rpm); más carga en el molino pide más torque y más torque se refleja como más corriente; porcentaje de carga = corriente de operación ÷ corriente nominal (zaranda: 25 A de 33 A = 76 %); por encima de la nominal el bobinado se calienta y envejece, y la causa suele ser mecánica (mineral de más). Un amperímetro es, en la práctica, un instrumento mecánico.',
      'Enclavamientos (punto clave 4): secuencia de arranque del SAG (manual de Tambomayo, 4.2.6): la bomba de baja presión lleva aceite filtrado y frío a los trunnions; la de alta presión los levanta sobre una película de aceite; con la presión correcta el enclavamiento da permiso; arranca el motor principal; pasado un tiempo la bomba de alta se apaga sola. El acople de seguridad protege al motor si el equipo se bloquea; un interruptor de límite avisa si falla la lubricación del HPGR. Si una protección dispara, se busca la causa, a menudo mecánica.',
      'Esta conversación es el primer bloque (45 min) de una clase virtual de 3 horas pedagógicas: después el instructor aclara lo que quedó menos claro y los equipos resuelven en sala el caso de la sesión, que Sophia no conoce ni presenta. La aplicación individual es el caso corto del motor de la bomba de pulpa, y los ejemplos que Sophia resuelve son propios (la corriente nominal de la zaranda, el inching drive, la zaranda al 76 %, el arranque del SAG).',
    ],
  },
}
