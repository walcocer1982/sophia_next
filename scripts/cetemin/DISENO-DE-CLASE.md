# Cómo se diseña una clase con Sophia

Guía para quien arma una sesión de curso en Sophia (un archivo `cursos/<curso>/s<n>.ts`). Las reglas que el validador ya hace cumplir están en `CLAUDE.md`, sección «Sesiones de curso con Sophia» (rutina tal cual, enseñar primero, sin alternativas, caso corto gemelo, cierre para el instructor, descripción de imágenes, fuente de datos, canal único, lectura comprobada). Esta guía no las repite: explica **cómo se piensa la sesión** para que esas reglas tengan sentido, y qué revisar antes de publicarla.

Nace de la prueba de Edwin Baltodano (21 oct 2026, SI-ALTORIESGO S1) y de la revisión que le siguió (`investigacion/prueba-edwin-s1-2026-10-21.md`): las imágenes y lo que decía Sophia no conversaban, porque el material se había elegido por norma y no por lo que el alumno tenía que decidir.

**Lo que enseñaron las clases con alumnos va en [APRENDIZAJES.md](APRENDIZAJES.md)** (27 oct 2026: criterios de una idea, la pregunta sola al final, el ejemplo que muestra la excepción, cifras). Se lee antes que esta guía.

---

## 1. Se parte del aprendizaje esperado, partido en decisiones

El aprendizaje esperado (literal de `sesiones.csv`) se lee primero y se parte en **las decisiones que el alumno tiene que poder tomar**. Cada decisión es un punto clave de Sophia.

> SI-ALTORIESGO S1: «Explica cuándo una tarea es trabajo en altura según la norma, qué peligros de caída presenta y cómo cada uno se convierte en la caída de una persona o de un objeto, con su consecuencia.»
> → ¿Es trabajo en altura? · ¿Cuál es el umbral en este rubro? · ¿Qué peligro de caída hay? · ¿Qué cae y a quién le llega?

Si una pieza de material no sirve a ninguna de esas decisiones, sobra (Lemov, *Enseña como un maestro 2.0*, técnica 16 «Comenzar por el final»: se planifica desde lo que el alumno tiene que lograr, no desde el temario).

## 2. Cada punto clave es una sola unidad: regla, ejemplo, imagen y pregunta

| Pieza | Qué es | Dónde va |
|---|---|---|
| **Regla** | La regla para decidir, en una o dos frases | `regla` |
| **Ejemplo resuelto** | Una situación propia, que Sophia resuelve antes de preguntar | `ejemplo` (nunca un caso de la sesión ni la pregunta misma) |
| **Imagen** | **La del ejemplo o la de la pregunta.** Es lo que el alumno mira mientras Sophia enseña | `lamina` |
| **Texto de la norma** | Solo las líneas que hacen falta para decidir; una de ellas respalda la respuesta | `norma` + `subrayar.respalda` |
| **Pregunta** | Una situación nueva, una sola decisión con su porqué | `pregunta` |

**La regla de oro:** mientras Sophia dice el ejemplo, la imagen de la pizarra tiene que mostrar ese ejemplo (o la situación de la pregunta). Si Sophia habla de una cisterna y la pizarra muestra una tabla de normas, no conversan. La imagen va debajo del texto que se toca (§3).

> Así quedó la S1: el ejemplo de la cisterna va con «Los cuatro casos de la G.050», que trae la foto de los líquidos y la de la electricidad (la pregunta); el de la canaleta, con la foto de un vano abierto en una losa.

Por qué regla **y** ejemplo: quien solo memoriza ejemplos no sabe qué hacer con un caso nuevo; quien extrae la regla, sí (Brown, Roediger y McDaniel, *Make It Stick*, cap. 6, «Rule versus Example Learning»). El ejemplo muestra la regla aplicada; la pregunta obliga a aplicarla a otra situación. Y la pregunta va después, no antes: recuperar con esfuerzo lo recién enseñado es lo que fija el aprendizaje (*Make It Stick*, cap. 2, «The Testing Effect»).

## 3. Menos material, y cada pieza con un uso

- **Una imagen por actividad**, más un apoyo solo si Sophia lo cita en el ejemplo o en la pregunta. En una laptop la pizarra muestra una sola columna: con tres recursos, el texto para subrayar queda fuera de vista.
- **El texto que se toca va primero** (23 oct 2026, primera clase con alumnos): la plantilla lo pone arriba y la lámina debajo. Si la lámina no hace falta para decidir, declárala `laminaCuando: 'on_reference'`: la pizarra muestra solo el texto y la lámina aparece cuando Sophia la cita. En el caso corto, `usa` dice qué textos siguen abiertos; `[]` deja solo el caso. Con dos recursos a la vista, los alumnos escribieron «¿cuál es la pizarra? no veo» y volvían a escribir su respuesta en vez de tocar la línea.
- **Fuera los datos para el instructor:** «ninguna norma lo define con todas sus letras», historia de la norma, artículos sin uso en la decisión. Van a las notas del instructor, no a la pizarra del alumno.
- **Dos piezas no pueden contradecirse en apariencia.** La S1 tenía una tabla «a 1,20 m sobre piso plano: no pide arnés» al lado del umbral de 1,2 m de industria («sí pide»): mismo número, respuesta opuesta. Se quitó.
- **La imagen se mira antes de describirla.** La `description` lleva lo que se ve y el texto escrito en ella; Sophia no ve imágenes.
- **Una foto que «ilustra» no basta: tiene que mostrar la regla.** La foto de un trabajador enganchado a un anclaje no sirve para «borde sin protección»: muestra a alguien protegido.

## 4. El texto de la norma se escribe para tocarlo

El alumno toca la línea que respalda su respuesta (Lemov, técnica 23 «Orquestar la lectura»: no se pide «lee», se pide encontrar dónde lo dice). Por eso:

- **Una idea por línea**, y la que respalda la respuesta tiene que ser inconfundible. Si la decisión necesita dos datos (mina no, fábrica sí), se declaran las dos líneas.
- **Sin líneas «meta»** que parezcan respaldar todo («el umbral depende del rubro…»): un alumno con buena razón las toca y le salen en rojo. Si una línea así hace falta, se decide si cuenta como respaldo.
- Pocas líneas: con cuatro líneas y tres claves, marcar todas pasaría por correcto.

## 5. La redacción: lo que el alumno lee tiene que entenderse solo

- **Títulos del material entre «»** cuando se nombran en una oración («la fotografía «Obra en losa»»). El código ya lo corrige (`lib/titulos-material.ts`), pero el título debe leerse bien dentro de una frase.
- **Nada ambiguo en las consignas:** «sin leer nada más» no dice qué no se lee. «Mira la fotografía y responde una pregunta a la vez», sí.
- **Las preguntas que se apoyan en una respuesta anterior lo dicen:** «De los puntos que señalaste: ¿qué hay abajo de cada uno?», no «¿qué hay abajo de cada uno?» suelto.
- **Lo que pide el sistema va con su porqué y su límite:** «Tu respuesta quedó guardada. Falta un paso: toca… No hace falta escribir de nuevo». Con «Anoto tu respuesta», Edwin creyó que no había llegado y la volvió a dictar.

## 5b. Criterios, ejemplo y líneas que respaldan (ocho sesiones, 22 oct 2026)

- **Un criterio solo lleva las cifras que son la respuesta.** El código exige que el alumno diga cada valor con unidad que aparece en un criterio (`lib/cifras.ts`), salvo los que ya vienen en la pregunta o en el caso. «Decide que manda perno de 8 pies (2,44 m)» rechazó a un alumno que respondió bien «8 pies» sin los metros, y Sophia inventó un error. Equivalencias, rangos completos («de 1,00 a 1,50 m» cuando basta el máximo) y porcentajes de contexto se quitan del criterio.
- **El ejemplo es una situación con alguien que decide**, no la regla repetida («una galería con cimbras a 1,20 m cumple»). Si se parece a la regla, Sophia lo funde con ella y no lo dice.
- **`ejemploClave` es una palabra que solo está en el ejemplo** («galería 310», «techo a 8 m»), no una que el alumno va a usar al responder («galería», «trunnions», «5,3»): el auditor la usa para saber si el alumno habló del ejemplo.
- **Declara todas las líneas que respaldan la respuesta.** Si la respuesta correcta se apoya en dos líneas («se ordena por horas perdidas» y «la más frecuente no siempre es la que más resta»), van las dos en `subrayar.respalda`: con una sola, el alumno que toca la otra sale en rojo aunque leyó bien.
- **El ejemplo y la pregunta no son la misma tarea con datos opuestos.** «Barra con resina → helicoidal» como ejemplo y «tubo sin resina → ¿qué perno?» como pregunta invitan a confundirlos. Mejor otro perno, otro lugar y otra persona.
- **El caso corto pide una sola decisión.** Un dato de más en los hechos («limpieza semanal con parada de 20 minutos») abre una segunda pregunta que se come el cierre.

## 6. La estructura de la sesión se tiene que ver

El alumno tiene que saber en qué paso está y qué falta: el riel de avance, el título de cada actividad en tono de sílabo (regla de nombres de `CLAUDE.md`) y, cuando falta tocar una línea, el aviso sobre la caja y el texto iluminado en la pizarra. Si el alumno no sabe qué se espera de él, escribe de nuevo o se va.

## 7. Antes de publicar

1. `npx tsx scripts/cetemin/cargar.ts <curso> <n> --solo-validar`, y después la carga (sin publicar).
2. **Alumnos simulados** (`scripts/alumno-simulado.mjs`), por lo menos: uno bueno, uno flojo y uno que repita lo que hizo Edwin, que es lo que hace un alumno real: dicta las cifras como las escribe el navegador («1 m 80»), pide que le aclaren una pregunta y, cuando le piden tocar una línea, vuelve a dictar la respuesta. Se lee la transcripción entera, no solo el resultado, y se corre `auditar-sesion.ts`.
3. **Mirar la pantalla en laptop (1366 × 768) y en celular**: ¿se ven la imagen y el texto para subrayar a la vez? ¿Se entiende cada consigna sin explicación?
4. **Una prueba con una persona real del perfil**, no solo con instructores.
5. Cada error que aparezca en una prueba queda como **prueba automática con el texto literal** del alumno (`tests/`), para que no vuelva sin que nadie lo note.

Cuando Sophia se equivoca (dice «Exacto» en un paso sin nota, completa la respuesta del alumno, cita lo que no está), primero se revisa si el material la empujó a eso; recién después se toca el prompt o el código (Lemov, técnica 19 «Doble planificación»: se planifica lo que hace el alumno, no solo lo que dice el instructor).
