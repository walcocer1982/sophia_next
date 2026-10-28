# Aprendizajes de las clases con alumnos

**Se lee antes de planificar o revisar cualquier sesión**, junto con [DISENO-DE-CLASE.md](DISENO-DE-CLASE.md). Cada aprendizaje sale de clases reales, con la cita literal del alumno, y termina en una regla para planificar. Si una prueba nueva enseña algo, se agrega aquí con su fecha y su evidencia.

## De dónde sale (27 oct 2026)

Las clases reales de octubre de 2026: 11 lecciones (SI-ALTORIESGO S1–S3, EOM-SOST S1–S4, PM-FMPLANTA S1–S2 y «Aprender con una tutora de IA»), 2 506 mensajes de alumnos, sin sesiones de prueba ni alumnos simulados. Se leyeron completas 18 conversaciones de alumnos que avanzaron por límite en las seis actividades que más fallaron.

**El dato que manda:** en el **38 %** de las actividades con nota el alumno avanzó **por límite** (217 de 566), no porque las superara. Casi nunca falló la decisión: faltó «Da la razón». Y en 8 de las 18 conversaciones leídas **el alumno sí había entendido**: lo que lo llevó al límite fue cómo estaba escrito el mensaje, el criterio o el flujo.

---

## 1. La pregunta se perdía en un mensaje largo que mezclaba dos actividades

Sophia abría cada punto clave con un solo párrafo de ~150 palabras: el cierre de la actividad anterior («Esa es la línea. Correcto.»), la regla, el ejemplo y, al final, la pregunta. El alumno respondía lo primero que leía.

- SI S3: «No cumple porque las patas están apoyadas directamente sobre la grava» (era la actividad anterior). Sophia: «Entiendo que repites la conclusión anterior…».
- PM S1: el alumno copió como respuesta la línea de la actividad anterior: «Disponibilidad = (horas programadas − horas de parada) ÷ …».
- PM S2: el mensaje terminó preguntando por el ejemplo («Mira la lámina de la chancadora de quijadas: ¿dónde está el movimiento…?»), no por el cono. Respuesta: «Por las bolas y por las rpm».

**Al planificar:** regla en una o dos frases y ejemplo en una; juntos, ~40 palabras. La pregunta es una situación nueva, que no se confunda con el ejemplo.
**Ya aplicado:** la plantilla pide la pregunta al final, sola y en negrita (`plantillas.ts`), y el validador mide la instrucción completa (máximo 90 palabras).
**Pendiente de código:** que el cierre de la actividad anterior vaya en una línea o en su propio mensaje, y que Sophia nunca termine con una pregunta sobre el ejemplo (formato de transición en `lib/prompt-builder.ts`).

## 2. Las repreguntas partían la pregunta en preguntas de una palabra, a veces con trampa

Ante una respuesta incompleta, Sophia preguntaba cosas cerradas. El alumno acertaba y aun así no cubría el criterio; se acababa el intento. El 45 % de las respuestas en los puntos clave tenía 3 palabras o menos, y parte de eso lo provocaba la propia Sophia.

- PM S2: «¿la corona o el manto?» → «el manto». Correcto, y no se le pidió juntarlo con el porqué.
- EOM S1: «Si no hay pernos, ¿qué es lo que cose la roca por dentro?» → «LOS PERNOS». La respuesta era «nada», pero la pregunta da por hecho que algo la cose. Otro: «¿quién o qué entra al taladro?» → «el split set» → «No exactamente».
- EOM S2: «¿a qué distancia quedaron los cuadros?» → «1,50 m y otros a 2,10 m». Correcto, y ahí terminó la actividad.

**Al planificar:** `commonMistakes` nombra el error real («cree que el shotcrete refuerza»), no una pregunta para corregirlo. En el caso corto, `pistas` pide volver a la decisión con su porqué; nunca una pregunta que suponga algo que no hay.
**Ya aplicado:** la plantilla pide «si responde a medias, nombra lo que está y repite esa pregunta».
**Pendiente de código:** la misma regla en el prompt general de seguimiento, para todas las lecciones.

## 3. Criterios con varias ideas: el alumno que dio la regla quedaba «sin razón»

Muchos «Da la razón» juntaban la regla, la consecuencia y la alternativa. El verificador exigía todo.

- SI S2: «No lo frena antes del piso… el sistema requiere un espacio libre total de 5,3 m». Sin razón: el criterio pedía también «corresponde un retráctil».
- EOM S2: «No se recibe porque algunos cuadros están a 2,10 m superando los 1,50 m y el parte no registra el espaciamiento». Le faltó «"quedó firme" no es criterio», que la pregunta nunca pidió.
- EOM S4: «C y D, no sé cómo elegirlo». Era justo lo que se quería que viera.

**Al planificar:** un criterio, una idea: la regla que respalda la decisión. Lo demás va a `commonMistakes` o al contexto. Un criterio nunca exige lo que la pregunta no pide.
**Ya aplicado:** el validador no carga un criterio con «;» ni de más de 25 palabras (`validar.ts`, regla 4b).
**Pendiente de código:** que el verificador dé por cubierto el criterio cuando está su núcleo.

## 4. Si la respuesta es la excepción, el ejemplo tiene que mostrar la excepción

- SI S3: el ejemplo era un andamio que cumplía todo; la excepción («el rodapié se exige cuando la plataforma supera 1,80 m») pasaba de largo en la regla. 8 de 12 respondieron «no cumple, falta el rodapié». En seguridad, el alumno que contesta lo prudente salía mal.
- EOM S4 (vigencia): «sí sigue valiendo» era la respuesta esperada y la contraria a lo que el alumno ya sabía.

**Al planificar:** si la pregunta pide la excepción, el ejemplo resuelto es la excepción con otros datos. En seguridad, evitar preguntas cuya respuesta correcta sea «sí cumple» por un tecnicismo, salvo que el ejemplo lo haya mostrado.

## 5. Cifras: Sophia mezclaba números y el alumno se perdía

SI S2: Sophia dijo «el amortiguador disipa en 1,07 m» y en la frase siguiente sumó 1,2 m. «Me confunde los números, ¿puedes hacer un ejemplo más simple?». «No hay datos claros».

**Al planificar:** la regla trae cada cifra una sola vez, con su unidad, y la misma en la norma, el ejemplo y los criterios. Una suma de varias cifras va escrita en la norma (una línea por sumando), no solo en la regla. El ejemplo y la pregunta no son la misma cuenta con otros números: si la pregunta es «no alcanza», el ejemplo es otro caso.
**Pendiente de código:** que Sophia no diga cifras que no estén en la regla ni en la pizarra.

## 6. Nadie entiende «tocar la línea»

Después de «Tu respuesta quedó guardada. Falta un paso: toca…», los alumnos escribieron «hola», «..», «A», «¿me entiendes?», «no me entiendes». Y al revés: al tocar se envía «listo», y en las respuestas aparece «listo · listo · listo» mientras Sophia pide escribir. El 20 % de los mensajes de alumnos son «listo».

- PM S2: «la parte que aprieta la roca es el manto contra el tazón; motor, fajas, piñón y corona solo transmiten el giro». Respuesta perfecta; ante el pedido de tocar escribió «...» y avanzó por límite.

**Al planificar:** la norma de cada punto clave tiene pocas líneas y la que respalda es inconfundible (DISENO-DE-CLASE.md §4).
**Pendiente de código:** reescribir el pedido («Busca en la pizarra la línea que dice por qué y tócala con el dedo o el mouse: se pone verde si es la correcta»), un botón «Ir a la pizarra» en celular y mostrar «Tocaste: «…»» en el chat en vez de «listo». Evaluar que la línea correcta cuente como la razón cuando el alumno ya decidió bien.

## 7. El caso corto en la pizarra no se encuentra en celular

37 mensajes del tipo «no veo ninguna imagen», «¿qué caso?», «¿ahora qué hago?», «¿escribo mi respuesta o qué?», casi todos en el caso corto («Lee el caso en la pizarra»), donde en celular la pizarra es otra pestaña.

**Al planificar:** el caso corto tiene pocos hechos (los que la decisión necesita) y la pregunta del caso se entiende sola.
**Pendiente de código:** mostrar el caso dentro de la conversación en celular o abrir la pizarra sola, y un aviso fijo sobre la caja con «qué te toca ahora».

## 8. Contenido que no se entendió: rehacer antes de volver a dictarlo

| Sesión | Actividad | Resultado |
|---|---|---|
| PM S2 | Chancadora de cono (manto frente a corona) | 13 de 22 ni siquiera deciden bien |
| PM S1 | Disponibilidad | 12 de 18 por límite |
| PM S1 | Historial ordenado por horas | 10 de 18 por límite |
| SI S2 | Distancia de detención de 5,3 m | 7 de 11 por límite |
| EOM S1 | Caso cable o perno | 7 de 9 por límite |
| EOM S3 | La casilla sin la picota | 8 de 14 por límite |

**Al planificar:** una actividad con más de la mitad por límite se revisa con estos aprendizajes antes de volver a usarla (criterio, ejemplo, lámina).

## 9. Los pasos sin nota también cansan

En «Aprender con una tutora de IA», la actividad 4 perdió a 8 de 25 alumnos tras 43 desgloses.

**Pendiente de código:** menos desgloses en pasos sin nota.

## 10. La respuesta solo estaba en una imagen (EOM S4, 27 oct 2026)

«La letra de calidad y su banda»: 8 de 15 avanzaron por límite. La pregunta pedía leer en la cartilla qué letra da la casilla IF/MP, y eso solo estaba en la imagen. Sophia no ve imágenes y el alumno no encontraba la celda: «ya veo varios colores», «picota», «MP», cuatro repreguntas seguidas de «¿qué letra ves?». A un alumno nunca se le dijo que era F.

**Al planificar:** lo que la respuesta necesita está en un texto de la pizarra (la norma o un bloque `table`), no solo en una imagen. La imagen ilustra. La razón del criterio y la línea que respalda dicen lo mismo.

## 11. La forma de la sesión, medida por fase (165 sesiones reales, SI · EOM · PM)

- **Duración:** mediana de 27 min de un bloque de 45; solo 6 de 131 pasaron los 45 min. Sobran unos 15 min.
- **Por límite, igual en todas las posiciones:** punto clave 1, 45 %; 2, 44 %; 3, 39 %; 4, 41 %; caso corto, 40 %. No mejora a medida que el alumno entra en la sesión: el problema es el formato de cada actividad (decisión y razón en un mensaje, dos intentos), no el calentamiento.
- **Respuestas cortas:** el alumno escribe una mediana de 12 palabras, sin contar los «listo».
- **El cierre es donde más alumnos se van:** 9 se fueron sin escribir su duda, más que en cualquier punto clave. Es el dato que el instructor necesita para sus 15 minutos.
- **«Listo» viene del toque:** de 657 «listo», 607 los mandó el navegador al tocar una línea. La mitad de los «Esa línea no respalda tu respuesta» (70 de 140) salió cuando el alumno todavía no tenía una respuesta guardada: buscaba la respuesta en la pizarra.
- **Cierre por límite:** en 136 de 310 transiciones tras un cierre por límite (44 %), el mensaje traía dos preguntas: Sophia volvía a pedir lo de la actividad anterior y el código pegaba la pregunta nueva. El prompt ya le prohíbe preguntar, y no basta.

## 12. Primera medición del procedimiento (28 oct 2026)

SI S4, SI S5, EOM S5 y PM S4 son las primeras sesiones dictadas que pasaron por [PROCEDIMIENTO.md](PROCEDIMIENTO.md) (revisadas y recargadas el 27 oct). Se comparan con las que no pasaron: S1–S3 de los tres cursos y EOM S4. Alumnos reales, sin pruebas ni simulados. Medición: `medir-clase.ts` y el conteo por hallazgo de este documento.

| | Sin procedimiento (165 sesiones) | Con procedimiento (64 sesiones) |
|---|---|---|
| Aciertan al primer intento | 34 % | **50 %** |
| Actividades cerradas por límite | 42 % | **30 %** |
| Intentos por actividad con nota | 1,77 | **1,59** |
| Terminan la sesión | 79 % | **89 %** |
| Duración mediana | 27 min | **22 min** |
| Se fueron en el cierre | 9 | **0** |
| Transición tras cierre por límite con dos preguntas | 44 % | 53 % |
| Mensajes de Sophia con dos preguntas | 10 % | 8 % |
| «Esa línea no respalda» por sesión (con la clave corregida, §13) | 0,78 | 0,95 |
| …de ellos, sin respuesta guardada todavía | 53 % | 53 % |

Pares de sesiones seguidas, mismos alumnos (sin → con): por límite SI S3 → S4, 43 % → 20 %; EOM S4 → S5, 41 % → 25 %; PM S3 → S4, 48 % → 35 %. Acierto al primer intento: 34 % → 46 %, 31 % → 60 %, 31 % → 44 %.

**Funciona: lo que el procedimiento controla, el contenido.** Criterios de una idea (§3), razón dicha en el texto que se toca (§10), ejemplo con la excepción (§4) y cifras iguales (§5) bajan el cierre por límite en los tres cursos, también con los mismos alumnos de un día a otro. Las sesiones duran menos y nadie se fue en el cierre.

**No cambió: lo que depende de la conducta de Sophia o del código.** Las preguntas dobles en la transición (§1) y las repreguntas siguen igual o peor. El perfil de curso (`lib/perfil-curso.ts`) está en producción desde el 27 oct, pero solo actúa en actividades con `rol`, y ninguna sesión dictada lo tenía. El toque de la línea (§6) tampoco mejoró: la mitad de los rechazos sale cuando el alumno todavía no respondió y busca la respuesta en la pizarra. Eso es el flujo del toque, no el contenido.

**Acciones:**
1. Probar con alumno simulado una sesión con `rol` (S7) y, si la auditoría pasa, recargar las siguientes con la plantilla nueva. Se mide de nuevo la transición con dos preguntas.
2. Cambiar el flujo del toque: revisar la línea solo cuando Sophia la pidió. Es código; lo decide Walther.
3. Revisar la línea que respalda contra la razón del criterio antes de cargar (§13).

**Cuidado al leer la tabla:** las sesiones con procedimiento se dictaron después, con alumnos que ya conocían a Sophia, y son temas distintos. Por eso pesan más los pares de sesiones seguidas que la comparación por grupo. El deploy del 27 oct en la noche cambió costos y sondeo, no la conversación.

## 13. La clave dejaba fuera una línea que también respalda (EOM S5 y SI S5, 28 oct 2026)

EOM S5, «Las cuatro llaves»: el criterio pide «le falta la temporalidad, una de las cuatro llaves». El alumno respondía «No, porque le falta una de las cuatro llaves, la temporalidad» y tocaba «Para entrar a la tabla hacen falta cuatro llaves…». Esa línea sostiene su razón, pero la clave solo aceptaba la de la temporalidad: 10 rechazos injustos en 16 alumnos, y 4 que acertaron al primer intento quedaron con «Lectura sin comprobar». En SI S5, «Aislamiento», pasó lo mismo con «Aislar es… que no pueda entrar energía ni material» (2 rechazos).

Se corrigió el mismo día: la línea se sumó a `respalda` en los archivos y en la base, y las 4 marcas pasaron a comprobada. La nota no cambió: nunca dependió del toque.

**Al planificar:** ✋ leer cada línea del texto contra la razón del criterio. Si otra línea también la sostiene, va en `respalda`. **Después de la clase:** `medir-clase.ts` muestra la línea más rechazada de cada actividad. Si varios alumnos que respondieron bien tocaron la misma línea, se lee: puede ser un error de la clave, no del alumno.

---

## Cómo se aplica

1. Antes de escribir o revisar una sesión: leer este documento y DISENO-DE-CLASE.md.
2. `cargar.ts --solo-validar` hace cumplir lo que se puede comprobar (criterios de una idea, largo de la instrucción).
3. Lo demás (excepción en el ejemplo, cifras, preguntas que no suponen) se revisa a mano, punto por punto.
4. Después de cada clase real: medir por límite, abandono y líneas rechazadas por actividad y agregar aquí lo nuevo. Cada cierto número de clases, comparar las sesiones que pasaron por el procedimiento con las que no (§12).

## Tensión abierta: excepción frente a ejemplo parecido

Mostrar la excepción con otros datos (§4) puede dejar el ejemplo casi igual a la pregunta (§5), y entonces el alumno copia en vez de aplicar la regla. Pasó al revisar SI S4 («asoma la cabeza» / «mete la cabeza y el brazo»), SI S5 («se marea» / «habla enredado») y EOM S4 («galería ocho meses parada» / «subnivel cinco meses parado»). Se decide con la prueba de alumno simulado: si el flojo acierta copiando el ejemplo, se cambia la pregunta (otra situación de la misma excepción), no el ejemplo.

**Estado (27 oct 2026):** S4, S5 y S7 de los tres cursos se revisaron con este documento y se recargaron, salvo EOM S4, que esperó a que se revisara el reporte de su clase de ese día (recargarla cambia los criterios contra los que se lee). S1–S3 no cumplen las reglas nuevas del validador; se corrigen antes de volver a cargarlas.

**Estado (28 oct 2026):** SI S4, SI S5, EOM S5 y PM S4 se dictaron con el procedimiento (§12). EOM S5 y SI S5 llevan la clave corregida (§13). Ninguna sesión cargada tiene `rol` todavía.
