# Procedimiento para estructurar una sesión de curso

Se sigue cada vez que se crea o se revisa una sesión del canal `scripts/cetemin/`, sin saltar pasos. Cada paso dice qué se hace y qué lo comprueba. Lo que comprueba el validador no se puede cargar mal; lo que se revisa a mano está marcado con ✋.

## 1. Leer antes de escribir

- [APRENDIZAJES.md](APRENDIZAJES.md): lo que fallaron los alumnos reales, con sus citas.
- [DISENO-DE-CLASE.md](DISENO-DE-CLASE.md): cómo conversan imagen, ejemplo y pregunta.
- La fuente es solo `05_Base-de-datos` de diseño-ppt-cetemin. Lo que falte se pide allá, no se inventa.

## 2. Una ficha por punto clave, antes de escribir el archivo

| Campo | Regla |
|---|---|
| Decisión que se pide | Una sola, en una situación propia. No pide dos cosas. |
| Regla | Una o dos frases. Con el ejemplo, unas 40 palabras. |
| Línea que respalda | Es la razón del criterio, dicha en el texto de la norma. ✋ Lo que la respuesta necesita está en un texto que se toca, no solo en una imagen (§10). |
| Ejemplo resuelto | Otra situación, no la misma cuenta con otros números. Si la respuesta es la excepción, el ejemplo muestra la excepción (§4). ✋ No tan parecido que se pueda copiar. |
| Cifras | Una vez, con su unidad, iguales en la norma, el ejemplo y el criterio (§5). |
| Criterios | Uno decide y otro da la razón; cada uno es una idea, sin «;» y en 25 palabras o menos (§3). |
| Errores comunes | El error real del alumno («cree que el shotcrete refuerza»), no una pregunta para corregirlo. |

## 3. El caso corto

- Es gemelo del caso del equipo, con otra causa u otro equipo, y nunca lo nombra.
- Trae solo los hechos que la decisión necesita, y su pregunta se entiende sola.
- Las pistas van en afirmativo: «señálale que mire…», «dile que falta el porqué». Nada de «pregúntale…»: en ese rol las preguntas de Sophia se quitan y la pregunta la repite el código.

## 4. Escribir solo contenido

La conducta de Sophia vive en su perfil de curso ([lib/perfil-curso.ts](../../lib/perfil-curso.ts)) y la plantilla le da a cada actividad su rol. En el archivo de la sesión **no se escribe** «no califiques», «la pregunta tal cual», «en negrita», «sin nota», «no lo recites», «no inventes», «nombra lo que dijo» ni «repite la pregunta».

| Rol | Qué hace Sophia sin que se lo pidan | Quién pone la pregunta |
|---|---|---|
| Veo · Pienso · Me pregunto | Pregunta tal cual, no califica, no interpreta la imagen, nada de normas | Sophia |
| Punto clave | Enseña la regla, resuelve el ejemplo aparte y, si la respuesta va a medias, nombra lo que falta sin decirlo | El código, en negrita, al final |
| Caso corto | Remite al caso de la pizarra sin recitarlo y usa las pistas | El código |
| Cierre | Reconoce algo concreto; no responde la duda; el resumen lo pone el código | El código |

Si una sesión necesita una conducta que el perfil no tiene, es un cambio de código y lo decide Walther: no se escribe en la instrucción.

## 5. Validar

```bash
node --import tsx scripts/cetemin/cargar.ts <curso> <n> --solo-validar
```

El validador bloquea:
- una actividad sin su rol;
- conducta escrita en la instrucción o en las pistas;
- un criterio con dos ideas;
- una razón que no está en la línea que se toca;
- más de 70 palabras de instrucción;
- alternativas en el chat;
- un caso del equipo nombrado en la sesión;
- imágenes sin el texto que llevan escrito;
- más de 24 turnos.

## 6. Probar con alumno simulado

- Un alumno flojo y uno bueno (`scripts/alumno-simulado.mjs`) y después `auditar-sesion.ts` sobre cada transcripción.
- ✋ Si el flojo acierta copiando el ejemplo, se cambia la pregunta, no el ejemplo.
- Una prueba cuesta lo mismo que una clase real (el 22 oct, 862 mensajes de prueba costaron USD 19,8): se prueba lo que cambió, no todo de nuevo.

## 7. Aprobación del instructor

- El instructor del curso aprueba su caso corto.
- Lee las instrucciones en el planner. Ahora son solo contenido y se pueden leer.

## 8. Cargar, publicar y programar

- `cargar.ts` carga sin publicar.
- Publicar y abrir la ventana de la sección solo con el visto bueno de Walther.
- No se recarga una sesión ya dictada antes de revisar su reporte: recargarla cambia los criterios contra los que se lee.

## 9. Después de cada clase

```bash
node --import tsx scripts/cetemin/medir-clase.ts <curso> <n>
```

- Una actividad con más de la mitad de los alumnos por límite se revisa antes de volver a usarse.
- Se leen las conversaciones de las peores actividades y lo nuevo va a [APRENDIZAJES.md](APRENDIZAJES.md), con su fecha y las citas literales.
