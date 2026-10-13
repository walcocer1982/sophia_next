/**
 * Banco de imágenes del curso: usos en las lecciones, propagación de cambios y
 * adopción de imágenes viejas. Spec: investigacion/panel-de-apoyo-especificacion.md §9.3
 *
 * El bloque `image` de una lección guarda una COPIA de url, descripción, uso,
 * fuente, licencia y «validada», más `bankId`. Así el alumno no depende de esta
 * tabla, pero un cambio en el banco (validarla, corregir la licencia) tiene que
 * llegar a esas copias: si no, una foto validada en el banco seguiría oculta.
 */
import type { CourseImage, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { LICENCIA_INVALIDA } from '@/lib/planner/validation'
import type { Activity, ImageBlock, LessonContent } from '@/types/lesson'

export const IMAGE_KINDS = ['scene', 'term', 'equipment', 'diagram'] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

type LeccionConContenido = { id: string; title: string; contentJson: unknown }

const actividades = (c: unknown): Activity[] => ((c as LessonContent | null)?.activities ?? []) as Activity[]

/** Qué le falta a una imagen para poder validarse. Vacío si está lista. */
export function faltaParaValidar(img: Pick<CourseImage, 'description' | 'license' | 'source'>, alValidar = false): string[] {
  const faltas: string[] = []
  // «sin registrar» es la marca de las imágenes viejas (ya se mostraban): se
  // tolera al editarlas, pero no alcanza para validar una foto nueva.
  const sinRegistrar = (s: string) => alValidar && /^\s*sin registrar\s*$/i.test(s)
  if (img.description.trim().length < 10) faltas.push('una descripción de al menos 10 caracteres (es lo único que Sophia «ve»)')
  if (LICENCIA_INVALIDA.test(img.license) || sinRegistrar(img.license)) faltas.push('una licencia real (no vale vacía, «sin registrar» ni «generada con IA»)')
  if (!img.source.trim() || sinRegistrar(img.source)) faltas.push('la fuente (fabricante, planta, banco)')
  return faltas
}

/** Lecciones del curso que usan cada imagen del banco (por `bankId` o por la misma url). */
export function usosPorImagen(imagenes: Pick<CourseImage, 'id' | 'url'>[], lecciones: LeccionConContenido[]) {
  const usos = new Map<string, { lessonId: string; title: string }[]>()
  for (const img of imagenes) usos.set(img.id, [])
  for (const l of lecciones) {
    const enLeccion = new Set<string>()
    for (const a of actividades(l.contentJson)) {
      const urls = [
        ...(a.teaching?.images ?? []).map((i) => ({ url: i.url, bankId: undefined as string | undefined })),
        ...(a.teaching?.image?.url ? [{ url: a.teaching.image.url, bankId: undefined }] : []),
        ...(a.teaching?.blocks ?? []).flatMap((b) =>
          b.type === 'image' ? [{ url: b.url, bankId: b.bankId }] : b.type === 'compare' ? b.items.map((i) => ({ url: i.url, bankId: undefined })) : [],
        ),
      ]
      for (const u of urls) {
        const img = imagenes.find((i) => i.id === u.bankId || i.url === u.url)
        if (img) enLeccion.add(img.id)
      }
    }
    for (const id of enLeccion) usos.get(id)?.push({ lessonId: l.id, title: l.title })
  }
  return usos
}

/** Copia los datos del banco a los bloques que lo referencian. Devuelve cuántas lecciones cambiaron. */
export async function propagarALecciones(img: CourseImage): Promise<number> {
  const lecciones = await prisma.lesson.findMany({
    where: { courseId: img.courseId },
    select: { id: true, title: true, contentJson: true },
  })
  let cambiadas = 0
  for (const l of lecciones) {
    let cambio = false
    const nuevas = actividades(l.contentJson).map((a) => {
      if (!a.teaching?.blocks?.some((b) => b.type === 'image' && b.bankId === img.id)) return a
      cambio = true
      return {
        ...a,
        teaching: {
          ...a.teaching,
          blocks: a.teaching.blocks.map((b): typeof b =>
            b.type === 'image' && b.bankId === img.id
              ? ({
                  ...b,
                  url: img.url,
                  description: img.description,
                  kind: img.kind as ImageKind,
                  source: img.source,
                  license: img.license,
                  validated: img.validated,
                } satisfies ImageBlock)
              : b,
          ),
        },
      }
    })
    if (!cambio) continue
    const contenido = { ...(l.contentJson as Record<string, unknown>), activities: nuevas }
    await prisma.lesson.update({ where: { id: l.id }, data: { contentJson: JSON.parse(JSON.stringify(contenido)) as Prisma.InputJsonValue } })
    cambiadas++
  }
  return cambiadas
}

/**
 * Adopta al banco las imágenes que las lecciones del curso ya usan y no están
 * en él (imágenes viejas e `image` sin `bankId`). Las viejas ya se mostraron a
 * alumnos: entran validadas, con licencia «sin registrar» para completar.
 * Devuelve cuántas entraron.
 */
export async function adoptarImagenesDelCurso(courseId: string, userId: string): Promise<number> {
  const [lecciones, banco] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId }, select: { id: true, title: true, contentJson: true } }),
    prisma.courseImage.findMany({ where: { courseId }, select: { url: true } }),
  ])
  const enBanco = new Set(banco.map((b) => b.url))
  const nuevas = new Map<string, Prisma.CourseImageCreateManyInput>()
  for (const l of lecciones) {
    for (const a of actividades(l.contentJson)) {
      const viejas = a.teaching?.images ?? (a.teaching?.image ? [a.teaching.image] : [])
      for (const v of viejas) {
        if (!v?.url || enBanco.has(v.url) || nuevas.has(v.url)) continue
        nuevas.set(v.url, {
          courseId, url: v.url, description: v.description ?? '', kind: 'equipment',
          source: 'sin registrar', license: 'sin registrar', validated: true,
          uploadedBy: userId, validatedBy: userId, validatedAt: new Date(), tags: [l.title.slice(0, 60)],
        })
      }
      for (const b of a.teaching?.blocks ?? []) {
        if (b.type !== 'image' || b.bankId || !b.url || enBanco.has(b.url) || nuevas.has(b.url)) continue
        nuevas.set(b.url, {
          courseId, url: b.url, description: b.description, kind: b.kind, source: b.source ?? '',
          license: b.license, validated: b.validated, uploadedBy: userId,
          validatedBy: b.validated ? userId : null, validatedAt: b.validated ? new Date() : null, tags: [l.title.slice(0, 60)],
        })
      }
    }
  }
  if (nuevas.size > 0) await prisma.courseImage.createMany({ data: [...nuevas.values()] })
  await enlazarBloquesAlBanco(courseId)
  return nuevas.size
}

/**
 * Pone `bankId` a los bloques `image` del curso que usan una foto del banco y
 * todavía no lo tienen. Sin el enlace, validar la foto en el banco no llegaría
 * a esos bloques. No toca las imágenes viejas (`teaching.images`): se enlazan
 * al abrirlas en el editor de material.
 */
export async function enlazarBloquesAlBanco(courseId: string): Promise<number> {
  const [lecciones, banco] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId }, select: { id: true, contentJson: true } }),
    prisma.courseImage.findMany({ where: { courseId }, select: { id: true, url: true } }),
  ])
  const porUrl = new Map(banco.map((b) => [b.url, b.id]))
  let cambiadas = 0
  for (const l of lecciones) {
    let cambio = false
    const nuevas = actividades(l.contentJson).map((a) => {
      const blocks = a.teaching?.blocks
      if (!blocks?.some((b) => b.type === 'image' && !b.bankId && porUrl.has(b.url))) return a
      cambio = true
      return {
        ...a,
        teaching: {
          ...a.teaching,
          blocks: blocks.map((b) => (b.type === 'image' && !b.bankId && porUrl.has(b.url) ? { ...b, bankId: porUrl.get(b.url) } : b)),
        },
      }
    })
    if (!cambio) continue
    const contenido = { ...(l.contentJson as Record<string, unknown>), activities: nuevas }
    await prisma.lesson.update({ where: { id: l.id }, data: { contentJson: JSON.parse(JSON.stringify(contenido)) as Prisma.InputJsonValue } })
    cambiadas++
  }
  return cambiadas
}
