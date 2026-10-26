/**
 * Aprender con una tutora de IA (23 oct 2026). La prueba corta con que los
 * alumnos conocen Sophia el día de la capacitación. Curso transversal: la ven
 * todas las carreras (decisión de Walther, 23 oct 2026). Pedido de Walther: que piensen que una IA les enseña y que vean,
 * con un estudio, por qué la forma en que Sophia enseña es mejor para ellos.
 *
 * Fuentes:
 * - Bastani, H. y otros (2025). Generative AI without guardrails can harm learning:
 *   Evidence from high school mathematics. PNAS 122(26). Resumen de Wharton:
 *   knowledge.wharton.upenn.edu/article/without-guardrails-generative-ai-can-harm-education
 * - Brown, Roediger y McDaniel (2014). Make It Stick, caps. 1 y 2 (copia en
 *   negocio-ia/conocimiento/ensenanza-cursos).
 *
 * No viene de 05_Base-de-datos: no es contenido de un curso. Las imágenes las
 * genera `generar-imagenes.py` en `img/`.
 */
import type { ImagenSpec, SesionSpec } from '../../tipos'

const IMG = 'scripts/cetemin/cursos/aprender-con-sophia/img'
const PROPIA = 'Elaboración propia CETEMIN (diseño instruccional)'

const IMAGENES: ImagenSpec[] = [
  {
    // Reemplaza la captura de la pantalla de Sophia (23 oct 2026): en la primera
    // clase de EOM los alumnos no entendían una interfaz que todavía no conocían,
    // y la captura era de la sesión de trabajo en altura («¿En serio? … es
    // trabajo en altura»). Dos chats se parecen a lo que ya hacen con una IA.
    // V2 (23 oct 2026, Walther): la IA abre con la pregunta, como hace Sophia.
    // Id nuevo porque el cargador reutiliza la imagen subida con el id anterior.
    id: 'IMG-SOPHIA-CHATS-V2', archivo: `${IMG}/dos-conversaciones.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia CETEMIN (23 oct 2026)',
    description: 'Dos conversaciones lado a lado entre una IA y un alumno, «Chat A» y «Chat B». En las dos, la IA abre preguntando: «Un terreno mide 12 m por 8 m. ¿Cuál es su área?», y el alumno contesta «No sé, dame la respuesta.». En el Chat A, la IA responde «El área es 96 m².» y el alumno dice «Ok, listo.». En el Chat B, la IA responde «Te ayudo: ¿qué dos medidas tienes y qué operación las junta?»; el alumno escribe «12 y 8… ¿las multiplico?»; la IA dice «Sí. Hazlo tú: ¿cuánto te da y en qué unidad?» y el alumno responde «96 m²». Los mensajes del alumno van en amarillo y los de la IA en blanco.',
  },
  {
    id: 'IMG-SOPHIA-ESTUDIO', archivo: `${IMG}/estudio-ia-respuesta-vs-pistas.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia con los datos de Bastani y otros (2025), PNAS 122(26)',
    description: 'Gráfico de barras «Comparados con quienes estudiaron sin IA», con dos grupos. «IA que da la respuesta»: barra gris «Practicando CON la IA» +48 % y barra azul «Examen SIN la IA» −17 %, en rojo y hacia abajo. «IA tutora que da pistas»: barra gris +127 % y, en el examen sin IA, «igual». Al pie: «Bastani y otros (2025), PNAS 122(26). Casi 1 000 escolares de Turquía practicando matemática».',
  },
  {
    id: 'IMG-SOPHIA-RECORDAR', archivo: `${IMG}/releer-vs-recordar.png`, kind: 'diagram', license: PROPIA,
    source: 'Elaboración propia sobre Brown, Roediger y McDaniel, «Make It Stick» (2014), caps. 1 y 2',
    description: 'Dos cajas. «Releer», en gris: «Se siente fácil», «“Ya lo sé”», «En el examen no sale», «No ves lo que te falta». «Recordar sin mirar», en amarillo: «Cuesta», «Te equivocas y corriges», «Lo aprendido se queda», «Ves lo que te falta». Al pie: «Brown, Roediger y McDaniel, “Make It Stick” (2014), caps. 1 y 2».',
  },
]

export const S1: SesionSpec = {
    slug: 'aprender-con-sophia-s1-aprender-con-una-tutora-de-ia',
    order: 1,
    etiqueta: 'S1',
    idPrefijo: 'sophia-s1',
    title: 'Aprender con una tutora de IA',
    objective:
      'Explica por qué una tutora de IA que te da pistas y te hace recordar te ayuda a aprender más que una que te da la respuesta.',
    keyPoints: ['Aprender con pistas y no con respuestas', 'El esfuerzo de recordar'],
    imagenes: IMAGENES,
    casosDelEquipo: [],
    sinTrabajoEnEquipo: true,

    rutina: {
      imagenId: 'IMG-SOPHIA-CHATS-V2',
      tituloImagen: 'Dos conversaciones',
      tipoImagen: 'figura',
      fuente: 'Rutina de pensamiento de Project Zero (Harvard)',
      preguntas: {
        veo: '¿Qué ves en las dos conversaciones?',
        pienso: '¿En cuál de los dos chats crees que el alumno aprende más?',
        mePregunto: '¿Qué te gustaría saber sobre aprender con una IA como Sophia?',
      },
      titulos: {
        veo: 'Observación de dos conversaciones',
        pienso: 'El chat donde se aprende más',
        mePregunto: 'Preguntas sobre aprender con una IA',
      },
      pistaVeo: 'qué le pregunta la IA al alumno y qué hace la IA cuando él le pide la respuesta, en cada chat',
      criterios: {
        pienso: ['Dice en cuál de los dos chats cree que el alumno aprende más', 'Dice qué de la conversación le hace pensarlo'],
        mePregunto: ['Dice qué le gustaría saber sobre aprender con una IA, o que no se pregunta nada'],
      },
      enlaceMePregunto: 'Sobre los dos chats:',
    },

    puntosClave: [
      {
        id: 'pistas',
        title: 'Aprender con pistas y no con respuestas',
        subtitle: 'Lo que pasó cuando se probó con escolares',
        keyPointIndex: 0,
        lamina: { imagenId: 'IMG-SOPHIA-ESTUDIO', title: 'Respuesta o pistas' },
        // Clase de EOM (23 oct 2026): un solo recurso a la vista, el texto que se toca.
        laminaCuando: 'on_reference',
        norma: {
          // Contado como historia y con una sola cifra (23 oct 2026): «casi
          // 1 000 escolares de Turquía» y «17 % menos» no les decían nada y dos
          // de cuatro dijeron que lo menos claro fue «lo que dice la investigación».
          id: 'texto-estudio',
          title: 'Qué pasó cuando se probó',
          source: 'Bastani y otros (2025), PNAS 122(26)',
          body: [
            '- Se probó con **casi mil escolares** que practicaban matemática con una IA.',
            '- A unos, la IA les **daba la respuesta**; a otros, solo les daba **pistas**.',
            '- Mientras practicaban con la IA, a los dos grupos les fue mejor.',
            '- En el examen **sin la IA**, los que recibían la respuesta **salieron peor** que quienes nunca la usaron.',
            '- Los de las pistas salieron **igual de bien** que quienes no usaron IA.',
            '- Los que recibían la respuesta **creían haber aprendido** más de lo que aprendieron.',
          ].join('\n'),
        },
        regla: 'si la IA te da la respuesta, practicas mejor pero en el examen sin IA rindes peor: pensó ella, no tú. Con pistas, el esfuerzo es tuyo.',
        ejemplo: 'Rosa copia de un chat las respuestas del cuestionario y lo entrega completo; en la evaluación sin celular no sabe cómo empezar: pensó el chat, no ella.',
        ejemploClave: 'Rosa',
        subrayar: { respalda: ['salieron peor', 'igual de bien', 'creían haber aprendido'] },
        // Desde su experiencia y no la de un «compañero» (23 oct 2026): con el
        // compañero, respondían lo que ellos quieren de una IA.
        pregunta: 'Mañana tienes evaluación sin celular y esta noche practicas con una IA: ¿le pides las respuestas o le pides pistas para resolverlo tú, y por qué?',
        criterios: [
          'Elige pedirle pistas para resolverlo él mismo',
          'Da la razón: si la IA le da la respuesta, en la evaluación sin IA rinde peor porque no pensó él',
        ],
        critical: [2],
        commonMistakes: ['Cree que terminar rápido es lo mismo que aprender', 'Cree que si la práctica sale bien, el examen también'],
      },
      {
        id: 'recordar',
        title: 'El esfuerzo de recordar',
        subtitle: 'Por qué Sophia pregunta y te deja equivocarte',
        keyPointIndex: 1,
        lamina: { imagenId: 'IMG-SOPHIA-RECORDAR', title: 'Releer o recordar' },
        laminaCuando: 'on_reference',
        norma: {
          id: 'texto-recordar',
          title: 'Qué pasa cuando recuerdas sin mirar',
          source: 'Brown, Roediger y McDaniel, «Make It Stick» (2014), caps. 1 y 2',
          body: [
            '- Releer da la **sensación de dominar** un tema sin dominarlo.',
            '- **Recordar sin mirar**, aunque cueste, fija lo aprendido mejor que releer.',
            '- Creemos que se aprende mejor cuando es fácil; cuando se mide, pasa **lo contrario**.',
            '- Después de responder, sabes mejor **qué sabes y qué te falta**.',
            '- Las preguntas frecuentes que **no definen la nota** bajan la ansiedad ante el examen.',
          ].join('\n'),
        },
        regla: 'recordar sin mirar cuesta más que releer, y por eso fija mejor. Equivocarte con Sophia no baja tu nota: te muestra qué te falta antes del examen.',
        ejemplo: 'Jorge relee tres veces sus apuntes y siente que ya sabe; en la práctica no puede explicarlo: releer le dio la sensación de dominar, no el dominio.',
        ejemploClave: 'Jorge',
        subrayar: { respalda: ['Recordar sin mirar', 'qué sabes y qué te falta', 'no definen la nota'] },
        pregunta: 'Respondes una pregunta de Sophia, te equivocas y te pide intentarlo de nuevo. ¿Eso juega a tu favor o en tu contra, y por qué?',
        criterios: [
          'Decide que juega a su favor',
          'Da la razón: el esfuerzo de recordar fija lo aprendido, o el error le muestra qué le falta sin jugarse la nota',
        ],
        critical: [2],
        commonMistakes: ['Cree que equivocarse es fracasar', 'Cree que releer hasta que suene conocido es estudiar'],
      },
    ],

    casoCorto: {
      id: 'caso-corto',
      title: 'Elección de la forma de estudiar',
      subtitle: 'Caso de Ana y Luis',
      keyPointIndex: 1,
      caso: {
        id: 'caso-estudiar',
        title: 'Caso: dos formas de estudiar',
        referencia: 'el caso de Ana y Luis',
        name: 'Semana de evaluación',
        source: 'Caso corto construido para Sophia sobre Bastani y otros (2025) y «Make It Stick»',
        facts: [
          'Ana y Luis tienen evaluación el lunes, sin celular ni apuntes',
          'Ana pide a un chat de IA las respuestas de la práctica y las relee dos veces',
          'Luis responde la práctica de memoria con Sophia, se equivoca en dos y las vuelve a intentar',
          'Los dos estudiaron el mismo tiempo',
        ],
        question: '¿Quién llega mejor preparado a la evaluación, y por qué?',
      },
      // Solo el caso en la pizarra; los textos quedan plegados en «De actividades anteriores».
      usa: [],
      pistas: 'Si elige a Ana porque «tiene las respuestas correctas», pregúntale quién pensó esas respuestas. Si elige a Luis sin razón, pregúntale qué le dieron sus dos errores.',
      criterios: [
        'Decide que Luis llega mejor preparado',
        'Da la razón: Luis recordó con esfuerzo y vio lo que le faltaba; Ana releyó respuestas que pensó el chat',
      ],
      critical: [2],
      commonMistakes: ['Elige a Ana porque tiene las respuestas correctas', 'Cree que equivocarse en la práctica es mala señal'],
    },

    cierre: { title: 'Dudas sobre Sophia', subtitle: 'Para el instructor' },

    contexto: {
      pais: 'Perú',
      normativa: 'No aplica: es la lección de presentación de Sophia, no una sesión del curso',
      referencias: [
        'Esta lección NO es del tema del curso. Es la primera conversación del alumno con Sophia, el día de la capacitación (unos 15 minutos), y vale igual en todas las carreras. Sophia habla de cómo se aprende con ella, no de minería ni de mantenimiento.',
        'PARA QUÉ (dilo en la bienvenida, antes de los temas, en dos oraciones): Sophia es la tutora de IA que acompañará la primera parte de sus clases; esta primera conversación dura unos 15 minutos y sirve para conocerla. Equivocarse con Sophia es parte de aprender, y el instructor ve en qué va cada uno para ayudarlo en clase.',
        'PREGUNTAS QUE TRAEN LOS ALUMNOS (primera clase de EOM, 23 oct 2026). Si preguntan algo de esto, responde en una o dos oraciones y vuelve a la pregunta pendiente. ¿Cómo evalúa Sophia?: compara tu respuesta con lo que la clase pide aprender y te dice qué falta; tu instructor ve ese avance. ¿Qué ve el instructor?: en qué actividad va cada uno y qué le costó, para reforzarlo en clase. ¿Es mejor que Gemini o ChatGPT?: usa una IA parecida, pero está preparada para enseñar las clases de CETEMIN: no te da la respuesta, te ayuda a pensarla. ¿Se adapta a mi ritmo?: si una respuesta no sale, te da un ejemplo o una pista más y vuelve a preguntar.',
        'Cuando hables del estudio, cuéntalo como lo dice el texto de la pizarra: «casi mil escolares», sin el país y sin porcentajes. Las cifras de abajo son para que no te equivoques, no para decirlas.',
        'Punto clave 1 (Bastani y otros, PNAS 2025): casi 1 000 escolares de Turquía practicaron matemática con GPT-4. Con la IA que daba la respuesta, en la práctica les fue 48 % mejor, pero en el examen sin IA sacaron 17 % menos que quienes nunca la usaron. Con la IA tutora que daba pistas, en la práctica les fue 127 % mejor y en el examen rindieron igual que quienes no usaron IA. Quienes usaron IA creyeron haber aprendido más de lo que aprendieron. Los autores: el grupo de la respuesta usó la IA como muleta.',
        'Punto clave 2 («Make It Stick», caps. 1 y 2): releer da sensación de dominio sin dominio; recordar con esfuerzo fija lo aprendido; después de responder se sabe mejor qué se sabe y qué falta; las preguntas frecuentes de bajo riesgo bajan la ansiedad ante el examen.',
        'Por eso Sophia enseña con un ejemplo, pregunta, no da la respuesta y pide tocar la línea que respalda: es para que el esfuerzo sea del alumno. Sus preguntas no son un examen.',
        'No inventes cifras ni estudios: solo los de esta lección. Los ejemplos que Sophia resuelve son propios (Rosa y el chat, Jorge y sus apuntes).',
      ],
    },
}
