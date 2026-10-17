/**
 * EVA-NOTA v5 — «Asistencia y Sistema de Evaluación»: un pedido por actividad.
 *
 * v5 (13 oct 2026): en la prueba de Walther la actividad 7 pedía decidir qué
 * criterio subir Y reescribir una oración; el desglose se gastó en lo primero,
 * la actividad avanzó por tope y Sophia pidió la reescritura junto con la
 * pregunta de la 8. Ahora la 7 es la decisión y la 7b la reescritura, y las
 * preguntas de 2, 3, 5, 6 y 8 piden una sola cosa (ver lib/planner/pedidos.ts).
 * Respaldo de la v4 en investigacion/eva-nota-v4.backup.2026-10-13.json.
 *
 * v4 — conversar sobre el panel.
 *
 * v4 (7 oct 2026, spec del panel §16.5): ninguna actividad pide sumar. La nota
 * se entiende moviendo un ecualizador (actividades 4 y 6); las alternativas
 * quedan solo en las decisiones (Mario, la tardanza, Rosa) y en una
 * comprobación de 3 preguntas antes del cierre. Las actividades 1 y 7
 * conversan sobre el caso y la rúbrica del panel. Respaldo de la v3 en
 * investigacion/eva-nota-v3.backup.2026-10-07.json.
 *
 * Lo que sigue describe la v3, de la que esta parte:
 *
 * Reescribe el contentJson de la lección EVA-NOTA del Plan de Tutoría. La v2
 * (5 oct 2026, 9 actividades) tenía seis cálculos y Walther la vio como «una
 * clase de matemáticas». El problema de los alumnos no es multiplicar por
 * 0,25: es no saber que con la tercera falta pierden el 15, que justificar no
 * borra la falta, o que un TC no entregado los hunde. Eso se aprende tomando
 * decisiones en situaciones, con los números ya dados.
 *
 * Estructura: 1 cálculo (la fórmula, con lámina y ejemplo resuelto), 6
 * decisiones, la rúbrica y el cierre. Explicación y práctica abren con un paso
 * cerrado (alternativas corregidas en código) y siguen con la justificación.
 * Cada opción incorrecta es un error real de los datos de tutoría: ir enfermo,
 * justificar tarde, no entregar «y compensar», copiar.
 *
 * Reglas verificadas contra el Reglamento Interno v03 (PDP-CT-OD-02,
 * 08/01/2026; copia en diseño-ppt-cetemin/01_Insumos/Institucional) y la
 * doctrina de diseño-ppt-cetemin (§06 evaluación, §14 lista de cotejo):
 *  - Art. 40: el que obtenga el 30 % de inasistencias desaprueba por DPI con
 *    nota 00 y se invalidan las notas registradas. En 10 sesiones, la 3.ª falta
 *    desaprueba; el máximo seguro es 2. (El artículo también dice «al menos
 *    70 % de asistencia»; se enseña el límite conservador. Pendiente aclarar
 *    con Servicios Académicos.)
 *  - Art. 39: tolerancia 10 min presencial / 20 min virtual; después, inasistencia.
 *  - Art. 41: justificar NO anula la falta acumulada; reporte inmediato al
 *    instructor por Blackboard y justificación formal hasta 3 días calendario
 *    después, solo por motivos válidos.
 *  - Art. 52.8: nota mínima 13; 0,5 redondea a favor. Pesos (§06): CV 10 % en
 *    total, EP 20 %, EF 20 %, TC1 25 %, TC2 25 %.
 *  - Rúbrica del TC (§06, §14): 5 criterios iguales de 0 a 4, nota = suma.
 *  - Antiplagio: los trabajos pasan por el software oficial; hasta 25 % de
 *    similitud con las referencias.
 *
 * Uso: npx tsx scripts/eva-nota-v2.ts            (valida y escribe)
 *      npx tsx scripts/eva-nota-v2.ts --solo-validar
 */
import { existsSync, writeFileSync } from 'node:fs'
import { prisma } from '../lib/prisma'
import { GeneratedStructureSchema } from '../lib/planner/validation'
import { avisosDePedidos } from '../lib/planner/pedidos'
import { avisosDeTitulos } from '../lib/planner/titulos'
import type { Activity, LessonContent, SupportBlock } from '../types/lesson'

const LESSON_SLUG = 'eva-nota-asistencia-y-sistema-de-evaluacion'
// Regla de nombres (lib/planner/titulos.ts): el código EVA-NOTA queda en el slug.
const TITULO = 'Asistencia y sistema de evaluación'

// ─── Material de apoyo (panel derecho). Reemplaza a la lámina SVG subida a
// Cloudinary: ahora la fórmula, el semáforo y los casos son datos de la
// lección. Spec: investigacion/panel-de-apoyo-especificacion.md
const REGLAMENTO = 'Reglamento Interno v03 (PDP-CT-OD-02)'

const FORMULA_NOTA: SupportBlock = {
  id: 'formula-nota',
  type: 'formula',
  title: 'Cómo se arma tu nota',
  pinned: true,
  source: `${REGLAMENTO}, Art. 52.8`,
  expression: 'Nota final = CV × 10 % + EP × 20 % + EF × 20 % + TC1 × 25 % + TC2 × 25 %',
  terms: [
    { symbol: 'CV', meaning: 'cuestionarios (todos juntos)', value: '10 %' },
    { symbol: 'EP', meaning: 'examen parcial', value: '20 %' },
    { symbol: 'EF', meaning: 'examen final', value: '20 %' },
    { symbol: 'TC', meaning: 'cada trabajo colaborativo', value: '25 %' },
  ],
  example: {
    label: 'Pedro',
    rows: [
      { term: 'CV', value: '14', weight: '10 %', result: '1,4' },
      { term: 'EP', value: '12', weight: '20 %', result: '2,4' },
      { term: 'EF', value: '13', weight: '20 %', result: '2,6' },
      { term: 'TC1', value: '14', weight: '25 %', result: '3,5' },
      { term: 'TC2', value: '15', weight: '25 %', result: '3,75' },
    ],
    total: '13,65 → 14',
  },
}

const SEMAFORO_10: SupportBlock = {
  id: 'semaforo-10',
  type: 'table',
  title: 'Faltas en un curso de 10 sesiones',
  source: `${REGLAMENTO}, Art. 40`,
  columns: ['Faltas', 'Color', 'Qué pasa'],
  rows: [
    ['0 a 1', 'Verde', 'Sin riesgo'],
    ['2', 'Amarillo', 'Una falta más y desaprueba'],
    ['3', 'Rojo', 'Llegó al 30 %: DPI, nota 00'],
  ],
  legend: 'Las faltas no se borran, ni con justificación.',
}

const SEMAFORO: SupportBlock = {
  id: 'semaforo-faltas',
  type: 'table',
  title: 'Semáforo de faltas',
  source: `${REGLAMENTO}, Art. 40`,
  columns: ['Sesiones', 'Verde', 'Amarillo', 'Rojo'],
  rows: [
    ['10', '0–1', '2', '3'],
    ['12', '0–2', '3', '4'],
    ['16', '0–3', '4', '5'],
    ['24', '0–6', '7', '8'],
  ],
  legend: 'Rojo = ya llegó al 30 %: desaprobado por inasistencia (DPI). Las faltas no se borran, ni con justificación.',
}

const CASO_LUIS: SupportBlock = {
  id: 'caso-luis',
  type: 'case',
  title: 'Caso: Luis',
  name: 'Luis, estudiante de EOM',
  facts: ['Promedio final: 15', 'Entregó sus dos trabajos colaborativos', 'Rindió el examen final sin observaciones', 'Faltó a 3 de las 10 sesiones', 'Figura como desaprobado con nota 00'],
  question: '¿Qué pasó?',
}

const CASO_MARIO: SupportBlock = {
  id: 'caso-mario',
  type: 'case',
  title: 'Caso: Mario',
  name: 'Mario',
  facts: ['Curso de 10 sesiones', 'Lleva 1 falta', 'El jueves amanece con fiebre'],
  question: '¿Qué hace?',
}

// Ecualizador de la nota (spec del panel §16.2). Fijo desde la actividad 4:
// acompaña a Rosa y a la prioridad TC2/EF. Los casos son los de la lección.
const ECUALIZADOR_NOTA: SupportBlock = {
  id: 'ecualizador-nota',
  type: 'simulator',
  title: 'Ecualizador de la nota',
  kind: 'weighted_sum',
  pinned: true,
  source: REGLAMENTO,
  variables: [
    { id: 'cv', label: 'CV', weight: 10 },
    { id: 'ep', label: 'EP', weight: 20 },
    { id: 'ef', label: 'EF', weight: 20 },
    { id: 'tc1', label: 'TC1', weight: 25 },
    { id: 'tc2', label: 'TC2', weight: 25 },
  ],
  scale: { min: 0, max: 20, pass: 13, round: 'half_up' },
  presets: [
    { label: 'Ana', values: { cv: 10, ep: 11, ef: 14, tc1: 16, tc2: 12 } },
    // Sin entregar el TC2 desaprueba (10); con un EF de 10 aprueba igual (13).
    { label: 'Semana del TC2', values: { cv: 12, ep: 13, ef: 14, tc1: 14, tc2: 14 } },
    { label: 'Rosa sin TC2', values: { cv: 12, ep: 12, ef: 12, tc1: 16, tc2: 0 } },
  ],
  allowOwnValues: true,
}

const CASO_ROSA: SupportBlock = {
  id: 'caso-rosa',
  type: 'case',
  title: 'Caso: Rosa',
  name: 'Rosa',
  facts: [
    '12 en evaluaciones (CV, EP y EF juntos)',
    '16 en el TC1',
    'El TC2 vence mañana y a su equipo le falta la mitad',
    'Sin TC2 queda en 10: desaprueba',
    'Con un TC2 de 10 llega a 12,5 → 13',
    'Con un TC2 de 12 llega a 13',
  ],
  question: '¿Qué hace?',
}

const ANTIPLAGIO: SupportBlock = {
  id: 'antiplagio',
  type: 'text',
  title: 'Antiplagio',
  kind: 'norma',
  // Aparece cuando Sophia habla de copiar, no al presentar el caso: así no
  // delata que copiar es la opción equivocada antes de que Rosa elija.
  showWhen: 'on_reference',
  source: REGLAMENTO,
  body: 'Todo trabajo pasa por el software antiplagio oficial de CETEMIN. Se acepta **hasta 25 % de similitud** con las referencias usadas.',
}

const RUBRICA_EQUIPO: SupportBlock = {
  id: 'rubrica-equipo',
  type: 'table',
  title: 'Rúbrica del TC: notas del equipo',
  source: 'Lista de cotejo CETEMIN (§14)',
  columns: ['Criterio', 'Nota (0 a 4)'],
  rows: [
    ['1 Comprensión del problema', '3'],
    ['2 Desarrollo técnico', '2'],
    ['3 Conclusiones', '2'],
    ['4 Organización y presentación', '3'],
    ['5 Sustentación oral', '3'],
    ['Suma', '13'],
  ],
  highlight: { rows: [5] },
  legend: 'Cinco criterios iguales de 0 a 4; la nota del TC es la suma. 13 es justo el mínimo.',
}

const CRITERIO_DESARROLLO: SupportBlock = {
  id: 'criterio-desarrollo',
  type: 'table',
  title: 'Criterio 2: Desarrollo técnico',
  source: 'Lista de cotejo CETEMIN (§14)',
  columns: ['Nivel', 'Qué se ve en el trabajo'],
  rows: [
    ['1 En inicio', 'No resuelve el problema o lo hace sin métodos de clase'],
    ['2 En proceso', 'Resuelve solo una parte, sin sustento'],
    ['3 Logrado', 'Resuelve todo con métodos aprendidos en clase'],
    ['4 Destacado', 'Además el sustento es verificable: norma, parámetro o dato'],
  ],
}

const FRAGMENTO_FAJA: SupportBlock = {
  id: 'fragmento-faja',
  type: 'text',
  title: 'Fragmento del TC',
  kind: 'fragment',
  body: '«La faja transportadora falló porque estaba en mal estado. Es importante hacer mantenimiento para que no vuelva a pasar.»',
}

const objective =
  'Toma decisiones en situaciones reales del ciclo (faltar, llegar tarde, entregar o no un trabajo, repartir las horas, mejorar un criterio) aplicando las reglas de asistencia, los pesos de la nota y la rúbrica del Reglamento Interno, con los números ya dados.'

const keyPoints = [
  'Límite de faltas: llegar al 30 % de inasistencias desaprueba con nota 00, y justificar no borra la falta',
  'Tardanza: 10 minutos de tolerancia en presencial; después cuenta como inasistencia',
  'La fórmula de la nota: cada evento aporta nota × peso; un trabajo no entregado vale 0 y no se compensa',
  'Decidir con los pesos y la rúbrica a la vista: qué entregar, a qué dedicar las horas, qué criterio subir',
]

const context: LessonContent['context'] = {
  pais: 'Perú',
  normativa: 'Programa de Tutoría CETEMIN — eje Evaluación (EVA-NOTA) — primer ciclo presencial, semana 1',
  referencias: [
    'Regla de asistencia (Reglamento Interno v03, Art. 40): el estudiante debe asistir al menos al 70 % de las clases; el que obtenga el 30 % de inasistencias en un curso desaprueba automáticamente por DPI (desaprobado por inasistencias), queda registrado con nota 00 y cualquier nota que tuviera se invalida. Recupera el curso asumiendo el costo.',
    'Tabla de umbrales (semáforo) según las sesiones del curso. 10 sesiones: verde 0 a 1 falta · amarillo 2 · rojo 3 (DPI). 12 sesiones: verde 0 a 2 · amarillo 3 · rojo 4. 16 sesiones: verde 0 a 3 · amarillo 4 · rojo 5. 24 sesiones: verde 0 a 6 · amarillo 7 · rojo 8. Rojo = ya llegó al 30 %. Las faltas acumuladas NO se borran ni se recuperan (ni con justificación): el color solo puede empeorar durante el curso; el objetivo es no cambiar de color.',
    'Tardanza (Art. 39): tolerancia de 10 minutos en clase presencial y 20 en virtual; dentro de ese plazo es tardanza y no suma al 30 %; pasado el plazo, cuenta como inasistencia. Hay que permanecer toda la sesión.',
    'Justificación de faltas (Art. 41): solo valen salud (certificado, receta o descanso médico), fallecimiento de familiar directo, desastre natural o circunstancia excepcional documentada con fecha. Ante el riesgo de faltar se reporta DE INMEDIATO al instructor por Blackboard; la justificación formal se envía por la plataforma hasta 3 días calendario después de la falta. JUSTIFICAR NO ANULA LA FALTA ACUMULADA: sirve para el registro y, si se pasó el 30 %, para pedir por tickets una recuperación con costo diferenciado.',
    'Estructura de la nota en cursos TP (Art. 52.8 y diseño instruccional): conocimiento 50 % = cuestionarios de verificación CV (10 % entre todos) + examen parcial EP (20 %) + examen final EF (20 %); habilidades 50 % = TC1 (25 %) + TC2 (25 %). Se aprueba con 13; 0,5 o más redondea a favor (12,5 es 13). Un trabajo no entregado vale 0 y no se compensa con otro evento: los pesos ya están fijos.',
    'Ejemplo resuelto — Pedro: CV 14 (×10 % = 1,4), EP 12 (×20 % = 2,4), EF 13 (×20 % = 2,6), TC1 14 (×25 % = 3,5), TC2 15 (×25 % = 3,75). Suma = 13,65 → 14.',
    'Ejercicio — Ana: CV 10, EP 11, EF 14, TC1 16, TC2 12. Aportes: 1,0 + 2,2 + 2,8 + 4,0 + 3,0 = 13,0. Aprueba justo con 13. Errores típicos: promediar las cinco notas (12,6), sumar sin pesos, dar a los CV el mismo peso que al examen.',
    'Caso Luis (estudiante ficticio de EOM): terminó el curso con 15 de promedio, entregó sus dos TC, rindió el examen final sin observaciones y faltó a 3 de las 10 sesiones. Figura como DPI con nota 00.',
    'Caso Mario (estudiante ficticio): curso de 10 sesiones; lleva 1 falta y el jueves amanece con fiebre. Si falta hoy queda en amarillo (2); con la siguiente, rojo (DPI), tenga o no certificado.',
    'Caso Rosa (estudiante ficticia): 12 en evaluaciones (CV, EP y EF juntos), 16 en el TC1; mañana vence el TC2 y a su equipo le falta la mitad. Números ya calculados: sin TC2 queda en 10 (TC = (16 + 0) / 2 = 8; final = (12 + 8) / 2 = 10); con un TC2 de 12 llega a 13; con un TC2 de 10 llega a 12,5 → 13. Los trabajos pasan por el software antiplagio oficial de CETEMIN (hasta 25 % de similitud con las referencias): copiar de otro equipo no pasa.',
    'Rúbrica del TC (presentación pública del producto): 5 criterios con el mismo peso, cada uno de 0 a 4; la nota es la suma (20 = destacado en los cinco; 15 = logrado en los cinco; 13 = tres logrados y dos en proceso). Criterios: 1 Comprensión del problema · 2 Desarrollo técnico · 3 Conclusiones · 4 Organización y presentación del producto · 5 Sustentación oral. Logrado en Conclusiones: «la conclusión se desprende del desarrollo y responde a la pregunta del caso».',
    'Criterio 2, Desarrollo técnico. Nivel 1 (En inicio): no resuelve el problema o lo hace sin los métodos aprendidos. Nivel 2 (En proceso): resuelve solo una parte, sin sustento. Nivel 3 (Logrado): resuelve el problema en su totalidad con métodos aprendidos en clase. Nivel 4 (Destacado): además el sustento es verificable: la norma con su artículo, el parámetro técnico o la consecuencia específica. (Logrado y Destacado son textuales de la lista de cotejo; los niveles 1 y 2 son redacción de tutoría.)',
    'Fragmento de un TC para la rúbrica: «La faja transportadora falló porque estaba en mal estado. Es importante hacer mantenimiento para que no vuelva a pasar.»',
  ],
}

const activities: Activity[] = [
  // 1 · Caso Luis: deducir la causa (decisión, sin nota)
  {
    id: 'eva-nota-1',
    type: 'explanation',
    title: 'Desaprobación por inasistencia',
    subtitle: 'Caso Luis',
    complexity: 'simple',
    keyPointIndex: 0,
    teaching: {
      agent_instruction:
        'Dile que mire el caso de Luis en el panel («Caso: Luis»); NO enumeres sus datos en el chat: ya los tiene a la vista. Aclara que esta parte no lleva nota. Pregúntale qué cree que pasó: cómo alguien con 15 de promedio puede figurar con 00. Si responde «no sé», pídele que lea el dato de las faltas en el caso y te diga qué ve. No digas la causa antes de que la diga él.',
      target_length: '50-80 palabras',
      blocks: [CASO_LUIS],
    },
    verification: {
      question: 'Luis tiene 15 de promedio y figura con 00: ¿qué crees que pasó y qué dato del caso te lo dice?',
      success_criteria: {
        must_include: [
          'Identifica las faltas como la causa, con el dato del caso (3 de 10 sesiones)',
          'Descarta otra causa con un dato del caso (entregó los TC o rindió el examen)',
        ],
        min_completeness: 50,
        understanding_level: 'developing',
      },
      max_attempts: 2,
      open_ended: true,
      is_evaluative: false,
    },
  },
  // 2 · Mario con fiebre: qué hacer el día que no puedes ir
  {
    id: 'eva-nota-2',
    type: 'practice',
    title: 'Justificación de inasistencias',
    subtitle: 'Caso Mario',
    complexity: 'moderate',
    keyPointIndex: 0,
    teaching: {
      agent_instruction:
        'Confirma que Luis desaprobó por faltas (DPI) y explica la regla de asistencia de context.referencias en dos oraciones: llegar al 30 % de inasistencias desaprueba con nota 00, sin importar el promedio. Señala la tabla «Faltas en un curso de 10 sesiones» del panel, sin copiarla. Presenta el caso Mario (también en el panel) y plantea el paso cerrado. Cuando elija bien, confirma en una oración el procedimiento (avisar de inmediato por Blackboard y justificar dentro de 3 días) y haz solo la pregunta de qué le pasa a Mario si vuelve a faltar la próxima semana aunque tenga certificado. No le adelantes que justificar no borra la falta: que lo deduzca con la tabla.',
      target_length: '90-130 palabras',
      blocks: [SEMAFORO_10, CASO_MARIO],
    },
    choice: {
      prompt: 'Mario lleva 1 falta en un curso de 10 sesiones. El jueves amanece con fiebre. ¿Qué hace?',
      options: [
        'Va a clase igual, aunque esté mal',
        'Falta, reporta de inmediato al instructor por Blackboard y envía el certificado por la plataforma dentro de 3 días',
        'Falta y justifica después, cuando se sienta mejor, aunque pasen más de 3 días',
        'Falta sin avisar: es solo una falta',
      ],
      answer: 1,
      max_attempts: 2,
    },
    verification: {
      question: 'Mario ya justificó esta falta. Si vuelve a faltar la próxima semana, aunque tenga certificado, ¿qué le pasa?',
      success_criteria: {
        must_include: [
          'Sabe que la falta justificada sigue contando: justificar no la borra',
          'Concluye que con la siguiente falta llega a 3 de 10 (30 %) y desaprueba por DPI',
        ],
        critical: [1],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: false,
    },
    commonMistakes: ['Cree que una falta justificada deja de contar para el 30 %', 'Cree que puede justificar cuando quiera, sin plazo'],
  },
  // 3 · Tardanza: llegas 12 minutos tarde
  {
    id: 'eva-nota-3',
    type: 'practice',
    title: 'Tolerancia y tardanza',
    complexity: 'simple',
    keyPointIndex: 1,
    teaching: {
      agent_instruction:
        'Plantea la situación de la tardanza con el paso cerrado, sin explicar antes la tolerancia: la regla la tiene que deducir o recordar. Cuando elija, pregunta solo hasta cuántos minutos es tardanza y desde cuándo cuenta como falta (Art. 39 en context.referencias). Si se equivoca, pregúntale cuántos minutos cree que son de tolerancia.',
      target_length: '50-80 palabras',
    },
    choice: {
      prompt: 'Llegas 12 minutos tarde a una clase presencial. Según el reglamento, ¿qué pasa y qué te conviene hacer?',
      options: [
        'Es tardanza: entras y no pasa nada más',
        'Ya cuenta como inasistencia, pero entras y te quedas toda la sesión para no perder la clase',
        'Mejor no entras: ya cuenta como falta igual',
        'Esperas al descanso y entras sin que te marquen',
      ],
      answer: 1,
      max_attempts: 2,
    },
    verification: {
      question: '¿Hasta cuántos minutos es tardanza y desde cuándo ya cuenta como falta para tu 30 %?',
      success_criteria: {
        must_include: [
          'Tolerancia de 10 minutos en presencial (20 en virtual); pasado ese plazo cuenta como inasistencia',
          'La tardanza dentro de la tolerancia no suma al 30 %; la inasistencia sí',
        ],
        critical: [1],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: false,
    },
    commonMistakes: ['Cree que la tolerancia es de 15 o 20 minutos en presencial', 'Cree que si ya es inasistencia no vale la pena entrar'],
  },
  // 4 · La fórmula: el único cálculo, con lámina y ejemplo resuelto
  {
    id: 'eva-nota-4',
    type: 'explanation',
    title: 'Ponderación de la nota final',
    subtitle: 'Caso Ana',
    complexity: 'moderate',
    keyPointIndex: 2,
    teaching: {
      agent_instruction:
        'En el panel están el ecualizador con la nota de Ana (13, aprueba justo) y, para quien quiera, la fórmula con el ejemplo de Pedro. No expliques la fórmula de entrada ni pidas ningún cálculo. Pide primero una predicción: qué cree que pasa con la nota de Ana si su TC2 baja a 0. Luego que lo baje y diga qué número ve. Después, que devuelva el TC2 a 12 y baje el CV a 0. Y pregunta por qué las dos bajaron a cero pero una la hunde y la otra apenas la mueve. Cierra en dos oraciones: cada nota aporta según su peso; el TC pesa 25 % y el CV 10 %.',
      target_length: '50-90 palabras',
      blocks: [FORMULA_NOTA, ECUALIZADOR_NOTA],
      first_question: 'Mira la nota de Ana en el ecualizador del panel: ¿qué crees que le pasa si su TC2 baja a 0?',
    },
    verification: {
      question: 'Las dos bajaron a cero: ¿por qué una hunde la nota de Ana y la otra apenas la mueve?',
      success_criteria: {
        must_include: [
          'Dice que las notas no pesan igual: el TC2 pesa más (25 %) que el CV (10 %)',
          'Relaciona el peso con cuánto cambia la nota final (el TC2 en 0 la deja en 10; el CV en 0 la baja solo un punto)',
        ],
        critical: [1],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: true,
    },
    commonMistakes: ['Cree que todas las notas pesan igual, como un promedio simple', 'Cree que la nota más alta es la que más aporta'],
  },
  // 5 · Rosa: entregar o no el TC2 (números dados)
  {
    id: 'eva-nota-5',
    type: 'practice',
    title: 'Trabajo colaborativo no entregado',
    subtitle: 'Caso Rosa',
    complexity: 'moderate',
    keyPointIndex: 2,
    teaching: {
      agent_instruction:
        'Recuerda en una oración que la fórmula sigue fija en el panel. Presenta el caso Rosa: sus datos y las cuentas ya hechas están en el panel («Caso: Rosa»); no los copies, menciona solo que sin TC2 queda en 10. Plantea el paso cerrado. Cuando elija, pregunta solo por qué esa y no las otras. Si en su razón no aparece lo de no entregar o lo de copiar, pregúntale por esa opción en el turno siguiente. No resuelvas nada: los números ya están dados.',
      target_length: '90-130 palabras',
      blocks: [CASO_ROSA, ANTIPLAGIO],
    },
    choice: {
      prompt: 'Rosa tiene 12 en evaluaciones y 16 en el TC1. Mañana vence el TC2 y a su equipo le falta la mitad. Sin TC2 queda en 10; con un TC2 de 12 llega a 13. ¿Qué hace?',
      options: [
        'Entrega lo que tienen, aunque esté incompleto',
        'No entrega el TC2 y lo compensa estudiando más para el EF',
        'Pide una prórroga al instructor el mismo día de la entrega',
        'Copia la parte que falta del trabajo de otro equipo',
      ],
      answer: 0,
      max_attempts: 2,
    },
    verification: {
      question: '¿Por qué esa y no las otras?',
      success_criteria: {
        must_include: [
          'Un trabajo no entregado vale 0 y la deja en 10; no se compensa con el EF porque los pesos ya están fijos',
          'Entregar incompleto puede dar los puntos que faltan (con 10 o 12 en el TC2 llega a 13)',
          'Copiar no pasa el antiplagio (máximo 25 % de similitud) y arriesga el trabajo entero',
        ],
        critical: [1],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: false,
    },
    commonMistakes: ['Cree que un TC no entregado se compensa con el examen', 'Cree que un trabajo incompleto vale lo mismo que no entregarlo', 'Cree que copiar un pedazo no se detecta'],
  },
  // 6 · Prioridad: TC2 y EF la misma semana
  {
    id: 'eva-nota-6',
    type: 'practice',
    title: 'Prioridad entre evaluaciones',
    subtitle: 'Semana del TC2',
    complexity: 'moderate',
    keyPointIndex: 3,
    teaching: {
      agent_instruction:
        'Situación: la misma semana tiene el TC2 y el EF y solo alcanza a preparar bien uno. Pídele que cargue el caso «Semana del TC2» en el ecualizador del panel. Que baje el TC2 a 0 (no lo entrega) y diga qué nota ve; que lo devuelva a 14 y baje el EF a 10 (lo rinde con poca preparación) y diga qué nota ve. Pregunta cuál de las dos decisiones lo hace desaprobar y por qué. No decidas por él.',
      target_length: '50-90 palabras',
      // El ecualizador es de la 4 y está fijado: acá se queda abierto; en las
      // demás se pliega y vuelve al caso de Ana.
      uses: ['ecualizador-nota'],
      first_question: 'Carga el caso «Semana del TC2» en el ecualizador: si no entregas el TC2, ¿qué crees que pasa con tu nota?',
    },
    verification: {
      question: '¿Cuál de las dos decisiones te hace desaprobar y por qué?',
      success_criteria: {
        must_include: [
          'Dice que no entregar el TC2 lo hace desaprobar (queda en 10) y un EF bajo no (queda en 13)',
          'Lo explica por el peso: el TC2 pesa 25 % y un trabajo no entregado vale 0',
        ],
        critical: [1],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: false,
    },
    commonMistakes: ['Cree que los exámenes siempre pesan más que los trabajos', 'Decide por el instructor y no por los pesos'],
  },
  // 7 · Rúbrica: qué criterio subir primero
  // (v5: antes también pedía reescribir la oración de la faja; eran dos tareas
  // en una pregunta y el desglose se gastaba en la primera. Ahora es la 7b.)
  {
    id: 'eva-nota-7',
    type: 'practice',
    title: 'Mejora según la rúbrica',
    complexity: 'moderate',
    keyPointIndex: 3,
    teaching: {
      agent_instruction:
        'Explica que la rúbrica del TC tiene cinco criterios iguales de 0 a 4 y que la nota es la suma (13 = tres logrados y dos en proceso), con los datos de context.referencias. Las notas del equipo están en el panel: cítalas, no las copies. Pregunta solo qué criterio subiría primero para la segunda entrega y por qué. Si propone Conclusiones u Organización, pregúntale de dónde salen las conclusiones.',
      target_length: '70-110 palabras',
      blocks: [RUBRICA_EQUIPO],
    },
    verification: {
      question: '¿Qué criterio subirías primero para la segunda entrega y por qué?',
      success_criteria: {
        must_include: [
          'Elige el Desarrollo técnico (o lo pone antes que las Conclusiones)',
          'Explica que las conclusiones se desprenden del desarrollo: si el desarrollo está incompleto, no suben solas',
        ],
        critical: [2],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: false,
    },
    commonMistakes: ['Cree que la nota del TC es un promedio y no la suma', 'Cree que con 13 exacto no hay riesgo', 'Sube primero lo que parece más fácil (Organización) sin ver qué depende de qué'],
  },
  // 7b · Rúbrica: reescribir con sustento verificable
  {
    id: 'eva-nota-7b',
    type: 'practice',
    title: 'Sustento técnico verificable',
    subtitle: 'Informe de la faja',
    complexity: 'moderate',
    keyPointIndex: 3,
    teaching: {
      agent_instruction:
        'Los niveles del criterio 2 y el fragmento del TC están en el panel: cítalos, no los copies. Pide que reescriba la primera oración del fragmento para que el Desarrollo técnico llegue a Destacado. Acepta cualquier norma, parámetro o dato verosímil: lo que importa es que el sustento sea verificable. Si solo agrega adjetivos («muy mal estado») o una recomendación, pregúntale cómo lo comprobaría alguien que no estuvo ahí.',
      target_length: '50-80 palabras',
      blocks: [CRITERIO_DESARROLLO, FRAGMENTO_FAJA],
    },
    verification: {
      question: 'Reescribe esta oración del trabajo para que el Desarrollo técnico llegue a Destacado: «La faja transportadora falló porque estaba en mal estado».',
      success_criteria: {
        must_include: [
          'Reescribe la oración con un sustento verificable: parámetro con unidades, norma con artículo o dato del fabricante',
          'Nombra la causa concreta de la falla, no solo un adjetivo («mal estado», «muy desgastada»)',
        ],
        critical: [1],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: false,
    },
    commonMistakes: ['Agrega adjetivos («muy mal estado») en vez de un sustento verificable', 'Agrega una recomendación («hay que hacer mantenimiento») en vez de la causa'],
  },
  // 8 · Semáforo de su propio curso
  {
    id: 'eva-nota-8',
    type: 'reflection',
    title: 'Diagnóstico de tu asistencia',
    complexity: 'simple',
    keyPointIndex: 0,
    teaching: {
      agent_instruction:
        'Dile que mire el «Semáforo de faltas» del panel (no lo copies en el chat). Pide que ubique su curso actual en la tabla y diga en qué color está y qué hace esta semana para no pasar al siguiente. Si no dice cuántas sesiones tiene o cuántas faltas lleva, pregúntaselo en el turno siguiente (si no sabe las sesiones, que las estime por semanas y días). No le digas el color: que lo lea en la tabla. Nunca digas que una falta se recupera o se borra: las faltas acumuladas no bajan.',
      target_length: '70-110 palabras',
      blocks: [SEMAFORO],
    },
    verification: {
      question: 'Ubica tu curso actual en el semáforo del panel: ¿en qué color estás y qué haces esta semana para no pasar al siguiente?',
      success_criteria: {
        must_include: [
          'Ubica su curso en la tabla (sesiones) y dice cuántas faltas lleva',
          'Dice el color que le corresponde según la tabla',
          'Una acción concreta para la semana',
        ],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 3,
      open_ended: true,
    },
  },
  // 9 · Cierre: a quién avisa, por dónde y en qué plazo
  {
    id: 'eva-nota-9',
    type: 'closing',
    title: 'Procedimiento ante una inasistencia',
    complexity: 'simple',
    keyPointIndex: null,
    teaching: {
      agent_instruction:
        'Antes de esta reflexión el sistema hace una comprobación de 3 preguntas y la corrige solo. Después cierra pidiendo su regla para el día que tenga que faltar, según el Art. 41 de context.referencias: a quién avisa, por dónde y en qué plazo justifica. Reconoce algo concreto que haya hecho bien en la sesión, sin felicitaciones vacías. No pidas día ni hora. Termina con «Gracias por participar».',
      target_length: '40-70 palabras',
    },
    // Comprobación de cierre (spec del panel §16.1): sin porqué, cuenta poco.
    checks: [
      { prompt: '¿Con cuántas faltas desapruebas un curso de 10 sesiones?', options: ['2', '3', '4'], answer: 1 },
      { prompt: '¿Cuánto vale un trabajo colaborativo que no entregas?', options: ['Cero, y no se compensa con el examen', 'Se promedia con las demás notas', 'Se recupera en el examen final'], answer: 0 },
      { prompt: '¿Cuál de estas notas pesa más en tu nota final?', options: ['El examen final (20 %)', 'Cada trabajo colaborativo (25 %)', 'Los cuestionarios (10 %)'], answer: 1 },
    ],
    verification: {
      question: 'Para el día que tengas que faltar: ¿a quién le avisas y por dónde, y cómo y hasta cuándo justificas?',
      success_criteria: {
        must_include: [
          'Avisa de inmediato al instructor por Blackboard (o la plataforma)',
          'Justifica por la plataforma con un documento válido, hasta 3 días calendario después',
        ],
        min_completeness: 60,
        understanding_level: 'achieved',
      },
      max_attempts: 2,
      open_ended: true,
    },
  },
]

async function main() {
  const soloValidar = process.argv.includes('--solo-validar')
  const parsed = GeneratedStructureSchema.safeParse({ activities })
  if (!parsed.success) {
    console.error('❌ La estructura no valida:\n', JSON.stringify(parsed.error.issues, null, 2))
    process.exit(1)
  }
  const conChoice = activities.filter((a) => a.choice).length
  console.log(`✅ ${activities.length} actividades válidas (${conChoice} con paso cerrado, 2 con ecualizador, comprobación de cierre; ningún cálculo)`)
  // Una actividad = un pedido: esta lección no se guarda si alguna pregunta pide dos cosas.
  const avisos = avisosDePedidos(activities)
  if (avisos.length) {
    for (const a of avisos) console.error(`❌ ${a.activityId} (${a.campo}): ${a.motivo}\n   «${a.texto}»`)
    process.exit(1)
  }
  console.log('✅ cada actividad pide una sola cosa')
  const avisosNombres = avisosDeTitulos(TITULO, activities)
  if (avisosNombres.length) {
    for (const a of avisosNombres) console.error(`❌ ${a.activityId ?? 'lección'}: ${a.motivos.join(' ')}
   «${a.texto}»`)
    process.exit(1)
  }
  console.log('✅ nombres según la regla')
  if (soloValidar) return

  const lesson = await prisma.lesson.findUnique({ where: { slug: LESSON_SLUG }, select: { id: true, title: true, contentJson: true, keyPoints: true } })
  if (!lesson) throw new Error(`No existe la lección ${LESSON_SLUG}`)

  // Respaldo de la v1 original, una sola vez (nombre fijo para no crear uno por día).
  const backup = 'investigacion/eva-nota-v1.backup.2026-10-05.json'
  if (!existsSync(backup)) {
    writeFileSync(backup, JSON.stringify({ keyPoints: lesson.keyPoints, contentJson: lesson.contentJson }, null, 2))
    console.log(`💾 respaldo de la versión anterior en ${backup}`)
  }

  // Respaldo de la v3 antes de pasar a la v4 (una sola vez).
  const backupV3 = 'investigacion/eva-nota-v3.backup.2026-10-07.json'
  if (!existsSync(backupV3)) {
    writeFileSync(backupV3, JSON.stringify({ keyPoints: lesson.keyPoints, contentJson: lesson.contentJson }, null, 2))
    console.log(`💾 respaldo de la v3 en ${backupV3}`)
  }

  // Respaldo de la v4 antes de pasar a la v5 (una sola vez).
  const backupV4 = 'investigacion/eva-nota-v4.backup.2026-10-13.json'
  if (!existsSync(backupV4)) {
    writeFileSync(backupV4, JSON.stringify({ keyPoints: lesson.keyPoints, contentJson: lesson.contentJson }, null, 2))
    console.log(`💾 respaldo de la v4 en ${backupV4}`)
  }

  const contentJson: LessonContent = { context, activities }
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: { title: TITULO, contentJson: JSON.parse(JSON.stringify(contentJson)), keyPoints, objective },
  })
  console.log(`✅ «${TITULO}» actualizada a v5 (un pedido por actividad, con nombres)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
