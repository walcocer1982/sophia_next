# Canal de carga de sesiones de CETEMIN

Decisión de Walther (15 oct 2026): **todas las cargas de sesiones de curso pasan por aquí.** Nada se escribe a mano en la base ni en el planner.

**Antes de escribir una sesión, lee [DISENO-DE-CLASE.md](DISENO-DE-CLASE.md):** cómo se piensa cada punto clave (regla, ejemplo, imagen y pregunta que conversan) y qué revisar antes de publicar.

```
cursos/<curso>/curso.ts      datos del curso (slug, título, capacidad, voz de Sophia, carrera)
cursos/<curso>/s<n>.ts       datos de la sesión (imágenes, rutina, puntos clave, caso corto, contexto)
cursos/registro.ts           qué cursos y sesiones existen
tipos.ts                     la forma de esos datos
plantillas.ts                cómo se vuelven actividades (la forma vive UNA vez aquí)
validar.ts                   reglas que bloquean la carga
cargar.ts                    validar → imágenes al banco → curso y lección en la base
auditar-sesion.ts            revisa la transcripción de una sesión de prueba
simular-alumnos.ts           alumnos ficticios con sesiones reales, para ver el Monitor y la ficha
```

## Flujo

```bash
npx tsx scripts/cetemin/cargar.ts si-altoriesgo 1 --solo-validar   # reglas, sin tocar nada
npx tsx scripts/cetemin/cargar.ts si-altoriesgo 1                   # carga (sin publicar)
# probar con scripts/alumno-simulado.mjs (alumno flojo y alumno bueno)
npx tsx scripts/cetemin/auditar-sesion.ts <sessionId>               # la transcripción contra las reglas
```

La lección se publica solo cuando la auditoría de las dos pruebas pasa sin fallas.

## Cursos en el canal (22 oct 2026)

| Curso | Dicta | Sesiones cargadas | Fuente del diseño |
|---|---|---|---|
| `si-altoriesgo` · Trabajos de alto riesgo | Maritza Mercado | S1, S2, S3 | `03_Entregables-diseño/SI - Ciclo II/4 - SI-ALTORIESGO` · CV1 caps. 1–6 |
| `eom-sost` · Sostenimiento de labores mineras | Walther Alcocer | S1, S2, S3 | `03_Entregables-diseño/EOM - Ciclo II/3 - EOM-SOST` · CV1 caps. 1–4 |
| `pm-fmplanta` · Fundamentos mecánicos de planta | Christian Huamán | S1, S2, S3 | `03_Entregables-diseño/PM - Ciclo II/4 - PM-FMPLANTA` · CV1 lecturas 1–2 |

Las sesiones de EOM y PM salen de `laminas.csv` (el PPT en tabla) y de `contenidos.csv`; en `imagenes.csv` las descripciones de SI son solo el nombre («S2 · jerarquia»), así que cada imagen se miró antes de describirla, como manda `DISENO-DE-CLASE.md`. Ninguna de las nueve está publicada.

## Alumnos simulados (Monitor y ficha)

```bash
npx tsx scripts/cetemin/simular-alumnos.ts si-altoriesgo/1                       # bueno, apurado y flojo, de corrido
npx tsx scripts/cetemin/simular-alumnos.ts si-altoriesgo/1 bueno:12 apurado:45 atascado:75 --en-vivo
    # clase en vivo: a la vez, cada uno a su ritmo (segundos por mensaje); perfiles: bueno, apurado, flojo, atascado, equivoca
npx tsx scripts/cetemin/simular-alumnos.ts --limpiar si-altoriesgo/1             # borra alumnos, sesiones y sección
```

La lección se nombra por id o como `<slug del curso>/<número de sesión>`. **El servidor local y producción
comparten la base de datos**: una clase corrida desde la laptop (con `npm run dev` levantado) se ve en el
Monitor de producción al momento. Para una demostración: levantar `npm run dev`, correr la línea `--en-vivo`
y abrir el Monitor del curso; en unos cinco minutos hay uno por terminar, uno a medias y uno atascado.

Crea la sección «Práctica (simulados)» en el curso de la lección, matricula alumnos
`<perfil>@simulado.local` (rol STUDENT, nombre con «(simulado)») y corre la lección por
las rutas reales de chat con el usuario de prueba; al terminar, la sesión pasa al alumno
simulado y deja de ser de prueba, así el Monitor y la ficha la cuentan como una clase
real. Requiere `npm run dev` corriendo. La transcripción queda en `logs/simulados/`.

## Reglas que el validador bloquea

1. Esquema, un pedido por pregunta y nombres en tono de sílabo (las reglas de siempre).
2. Sin alternativas: ni `choice` ni `checks`.
3. La rutina de entrada: tres pasos `reflection` sin nota, con la consigna en la pizarra; Pienso admite un turno más para «¿qué te hace decir eso?». Las preguntas son las que trae la lámina (o la imagen, si las lleva escritas); cada sesión declara sus `criterios` de Pienso y Me pregunto, el `tipoImagen` («fotografía», «figura») y el enlace de Me pregunto (desde el 22 oct 2026: antes la plantilla traía los criterios de «caídas» y solo servían en SI).
4. Cada punto clave: instrucción que empieza con «Enseña primero», trae «Resuelve tú…», cabe en 90 palabras (regla + ejemplo ≈ 55 palabras con un título de lámina de 4), un reintento, norma fijada, `subrayar.respalda`.
5. Caso corto como bloque de caso (nombre ≤ 40 caracteres, hechos ≤ 140); cierre sin nota.
6. Hasta 24 turnos (un turno de subrayar por punto clave) y 10 actividades (45 min).
7. Los casos del equipo no aparecen en ningún texto.
8. Bloques con id único, `uses` apunta a lo fijado antes, cada imagen con el texto que está escrito en ella (mínimo 60 caracteres).

## Reglas que el auditor revisa en la transcripción

- R1 En los pasos sin nota Sophia no califica.
- R2 En cada punto clave, el ejemplo resuelto va antes de la pregunta.
- R3 Sophia nunca nombra los casos del equipo.
- R4 La sesión terminó y cupo en los 16 turnos.
- R5 (aviso) Sophia no mandó a leer material de otra actividad.

## Qué es código de Sophia y qué no

Todo lo de esta carpeta es contenido: no toca `lib/`, `app/` ni los prompts. Lo que el auditor marque y la plantilla no pueda arreglar (por ejemplo, que Sophia califique aunque se le pida que no) es un cambio de código y lo decide Walther.

## Fuente de los datos

Solo `05_Base-de-datos` del proyecto `C:\Users\LEGION\Claude\cetemin\diseño-ppt-cetemin` (solo lectura). Lo que falte (casos cortos con solución, texto visible de las imágenes, rutinas con sus preguntas) se pide a ese proyecto; no se saca de los guiones.
