# Fases de Implementación: Planificador de Clases

**Deadline piloto:** 31 de marzo de 2026
**Curso piloto:** Procesos Metalúrgicos
**Enfoque:** 1 MVP testeable en frontend por fase

---

## Fase 1: Formulario → Estructura Visible (2 semanas)

**Objetivo:** Instructor abre `/planner`, llena formulario, ve estructura de actividades generada en pantalla.

### Tareas

| # | Tarea | Archivos | Prioridad |
|---|-------|----------|-----------|
| 1.1 | Crear modelo `LessonDraft` en Prisma | `prisma/schema.prisma` | Alta |
| 1.2 | Endpoint `POST /api/planner/generate-structure` | `app/api/planner/generate-structure/route.ts` | Alta |
| 1.3 | Prompt de generación de estructura | `lib/planner/prompts.ts` | Alta |
| 1.4 | Validación de estructura generada (Zod) | `lib/planner/validation.ts` | Alta |
| 1.5 | Página `/planner` con formulario | `app/(protected)/planner/page.tsx` | Alta |
| 1.6 | Componente formulario de input | `components/planner/input-form.tsx` | Alta |
| 1.7 | Vista de estructura propuesta | `components/planner/structure-view.tsx` | Alta |

### MVP: "Generar estructura desde formulario"

Instructor abre `/planner`, llena tema + objetivo + contenido técnico, click en "Generar", ve lista de 5 actividades en pantalla con título y tipo.

Sin persistencia. Sin clarificación. Sin edición. Solo ida: formulario → resultado visible.

### Prueba front

1. Abrir `/planner`
2. Llenar: tema "Fundición de metales", objetivo "Identificar tipos de fundición", contenido técnico (2 párrafos)
3. Click "Generar"
4. Ver 5 actividades con progresión pedagógica (intro → explicación → práctica → cierre)
5. Verificar que no inventa contenido técnico fuera de lo proporcionado

### Criterios de éxito

- [ ] Formulario valida campos obligatorios (tema, objetivo, contenido)
- [ ] Muestra loading mientras genera
- [ ] Genera 4-6 actividades coherentes
- [ ] Las actividades siguen progresión pedagógica
- [ ] No inventa contenido técnico que el instructor no proporcionó

---

## Fase 2: Editar Actividades + Guardar Borrador (2 semanas)

**Objetivo:** Instructor edita cada actividad generada y guarda borrador que persiste.

### Tareas

| # | Tarea | Archivos | Prioridad |
|---|-------|----------|-----------|
| 2.1 | Endpoint `POST /api/planner/generate-activity` - Detalle por actividad | `app/api/planner/generate-activity/route.ts` | Alta |
| 2.2 | Endpoint `POST /api/planner/save-draft` | `app/api/planner/save-draft/route.ts` | Alta |
| 2.3 | Editor de actividad individual | `components/planner/activity-editor.tsx` | Alta |
| 2.4 | Navegación entre actividades (anterior/siguiente) | `components/planner/wizard-nav.tsx` | Alta |
| 2.5 | Lista de borradores guardados | `components/planner/drafts-list.tsx` | Media |
| 2.6 | Chat de clarificación (Paso 2) | `components/planner/clarify-chat.tsx` | Media |

### MVP: "Editar y guardar borrador"

Click en actividad → ve campos editables (`agent_instruction`, `question`, `criteria`). Puede modificar cualquier campo. Botón "Guardar" persiste en `LessonDraft`. Al volver a `/planner`, ve borrador y puede retomarlo.

### Prueba front

1. Generar estructura (Fase 1)
2. Click en actividad 3
3. Ver campos pre-llenados: `agent_instruction`, `verification.question`, `success_criteria`
4. Editar la pregunta de verificación
5. Click "Guardar borrador"
6. Cerrar pestaña
7. Volver a `/planner`
8. Ver borrador en lista con fecha y estado
9. Click en borrador → ver la edición intacta en actividad 3

### Criterios de éxito

- [ ] Campos editables pre-llenados con contenido generado por AI
- [ ] Instructor puede editar cualquier campo
- [ ] Navegación anterior/siguiente entre actividades funciona
- [ ] Auto-save o save manual persiste en BD
- [ ] Lista de borradores con fecha y estado visible
- [ ] Puede retomar borrador donde lo dejó

---

## Fase 3: Módulo de Imágenes (1 semana)

**Objetivo:** Instructor sube imágenes con descripción y las asigna a actividades.

### Tareas

| # | Tarea | Archivos | Prioridad |
|---|-------|----------|-----------|
| 3.1 | Crear modelo `DraftImage` en Prisma | `prisma/schema.prisma` | Alta |
| 3.2 | Upload de imágenes con preview | `components/planner/image-upload.tsx` | Alta |
| 3.3 | Campo de descripción obligatorio por imagen | (integrado en 3.2) | Alta |
| 3.4 | Storage de imágenes (Vercel Blob o similar) | `lib/planner/image-storage.ts` | Alta |
| 3.5 | Asignación de imagen a actividad (select) | `components/planner/image-assign.tsx` | Alta |
| 3.6 | Selector "cuándo mostrar" (inicio/referencia/demanda) | (integrado en 3.2) | Media |

### MVP: "Imágenes asignadas a actividades"

En el editor de actividad, sección "Imagen". Upload con preview + descripción obligatoria. Selector "cuándo mostrar". La descripción se inyecta en `agent_instruction` automáticamente.

### Prueba front

1. Abrir borrador existente (Fase 2)
2. Ir a actividad 2
3. Sección "Imagen" → subir `diagrama.png`
4. Ver preview de la imagen
5. Escribir descripción: "Diagrama de tipos de fundición con ventajas y limitaciones"
6. Seleccionar "Mostrar cuando se referencie"
7. Guardar
8. Ver que el `agent_instruction` ahora incluye: "Observa el diagrama que se muestra en la imagen..."
9. Intentar guardar sin descripción → error de validación

### Criterios de éxito

- [ ] Upload funciona con PNG, JPG, SVG (max 5MB)
- [ ] Preview visible después de subir
- [ ] Descripción es obligatoria (no se puede guardar sin ella)
- [ ] Imagen asignada se refleja en `agent_instruction`
- [ ] Selector "cuándo mostrar" funciona

---

## Fase 4: Publicar → Clase Funcional (1 semana)

**Objetivo:** Botón "Publicar" genera `contentJson` compatible y la clase funciona en Sophia.

### Tareas

| # | Tarea | Archivos | Prioridad |
|---|-------|----------|-----------|
| 4.1 | Endpoint `POST /api/planner/publish` - Genera contentJson | `app/api/planner/publish/route.ts` | Alta |
| 4.2 | Resumen pre-publicación (stats, validación) | `components/planner/publish-summary.tsx` | Alta |
| 4.3 | Endpoint `POST /api/planner/preview` - Chat simulado | `app/api/planner/preview/route.ts` | Media |
| 4.4 | Vista de preview (reutilizar chat-interface) | `components/planner/preview-chat.tsx` | Media |
| 4.5 | Redirect a `/lessons` después de publicar | (integrado en 4.1) | Baja |

### MVP: "Publicar y tomar la clase"

Botón "Publicar clase" desde el editor. Genera `contentJson` 100% compatible. Crea `Lesson` en BD. Redirect a `/lessons`. Un estudiante puede entrar y completarla con el chat normal.

### Prueba front

1. Abrir borrador completo (con actividades editadas + imágenes)
2. Click "Publicar clase"
3. Ver resumen: 5 actividades, 2 imágenes, duración estimada
4. Confirmar publicación
5. Redirect a `/lessons`
6. Ver la clase nueva en la lista
7. Entrar como estudiante → completar las 5 actividades con el chat
8. Verificación de respuestas funciona correctamente
9. Imágenes aparecen en el panel lateral cuando corresponde

### Criterios de éxito

- [ ] `contentJson` generado pasa por `lesson-parser.ts` sin error
- [ ] La clase publicada aparece en `/lessons` con título correcto
- [ ] Un estudiante puede entrar y completar todas las actividades
- [ ] Verificación de respuestas funciona igual que en clases manuales
- [ ] Imágenes aparecen en panel lateral correctamente
- [ ] No hay diferencia entre clase creada manual vs planificador

---

## Timeline

```
Febrero 2026
├── Semana 1-2: Fase 1 (Formulario → Estructura visible)
├── Semana 3-4: Fase 2 (Editor + Borradores)

Marzo 2026
├── Semana 1: Fase 3 (Imágenes) + Fase 4 (Publicar)
├── Semana 2-3: Buffer + mejoras
│
└── 31 marzo: Entrega
```

---

## Resumen de MVPs

| Fase | MVP | Prueba del instructor |
|------|-----|----------------------|
| 1 | Formulario → estructura visible | "Veo 5 actividades generadas" |
| 2 | Editar + guardar borrador | "Cerré y mi borrador sigue ahí" |
| 3 | Imágenes con descripción | "Mi imagen aparece en la actividad" |
| 4 | Publicar → clase funcional | "Mi estudiante completó la clase" |

**Prueba definitiva (Fase 4):** Si no hay diferencia entre una clase creada manual y una del planner, el sistema funciona.

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| AI genera contenido técnico incorrecto | Alto | El instructor SIEMPRE revisa y edita antes de publicar |
| Upload de imágenes pesadas | Medio | Limitar a 5MB, comprimir client-side |
| Prompts de generación inconsistentes | Alto | Iterar prompts durante Fase 1, validar con Zod |
| Instructor no entiende el flujo | Medio | UX simple, wizard paso a paso, tooltips |
| Deadline ajustado | Alto | MVP mínimo: Fases 1-4 sin preview chat (solo publicar) |

---

## Dependencias con sistema actual

| Componente existente | Cómo se usa |
|---------------------|-------------|
| `contentJson` structure | El planner genera exactamente este formato |
| `prompt-builder.ts` | Las clases creadas usan el mismo prompt builder |
| `chat/stream/route.ts` | Las clases creadas usan el mismo chat |
| `activity-verification.ts` | Misma verificación de respuestas |
| `image-panel.tsx` | Muestra las imágenes durante la clase |
| Auth (NextAuth) | El instructor debe estar autenticado |
| Prisma + Neon | Misma BD, nuevos modelos `LessonDraft` y `DraftImage` |
