/**
 * Seguimiento manual del alumno (decisión del 1 oct 2026).
 *
 * La segunda columna del lienzo: lo que marca Jorge o el instructor cuando
 * llamó a alguien. Cinco estados y cuatro motivos, cerrados a propósito: lo que
 * no se puede contar no sirve para medir la retención. La marca vigente es la
 * última; el historial queda entero.
 */
import { prisma } from '@/lib/prisma'
import type { SeguimientoEstado, SeguimientoMotivo } from '@prisma/client'

export const ESTADOS: Record<SeguimientoEstado, { texto: string; ayuda: string }> = {
  SIN_NOVEDAD: { texto: 'Sin novedad', ayuda: 'no hay nada que anotar' },
  NO_RESPONDE: { texto: 'No responde', ayuda: 'llamado o escrito, sin respuesta' },
  JUSTIFICADO: { texto: 'Justificado', ayuda: 'habló y hay un motivo' },
  DESERTO: { texto: 'Desertó', ayuda: 'dejó el instituto; sale de todos sus cursos' },
  RETOMO: { texto: 'Retomó', ayuda: 'volvió a entrar' },
}

export const MOTIVOS: Record<SeguimientoMotivo, string> = {
  HORARIO: 'Horario',
  CONEXION: 'Conexión',
  NO_ENTENDIO: 'No entendió la sesión',
  PERSONAL: 'Personal',
}

export const ORDEN_ESTADOS: SeguimientoEstado[] = [
  'SIN_NOVEDAD',
  'NO_RESPONDE',
  'JUSTIFICADO',
  'DESERTO',
  'RETOMO',
]
export const ORDEN_MOTIVOS: SeguimientoMotivo[] = ['HORARIO', 'CONEXION', 'NO_ENTENDIO', 'PERSONAL']

export type Marca = {
  id: string
  estado: SeguimientoEstado
  motivo: SeguimientoMotivo | null
  nota: string | null
  cursoId: string | null
  cursoTitulo: string | null
  autor: string
  fecha: Date
}

const SELECT_MARCA = {
  id: true,
  userId: true,
  estado: true,
  motivo: true,
  nota: true,
  courseId: true,
  createdAt: true,
  autor: { select: { name: true, email: true } },
  course: { select: { title: true } },
} as const

type FilaMarca = {
  id: string
  userId: string
  estado: SeguimientoEstado
  motivo: SeguimientoMotivo | null
  nota: string | null
  courseId: string | null
  createdAt: Date
  autor: { name: string | null; email: string }
  course: { title: string } | null
}

function aMarca(f: FilaMarca): Marca {
  return {
    id: f.id,
    estado: f.estado,
    motivo: f.motivo,
    nota: f.nota,
    cursoId: f.courseId,
    cursoTitulo: f.course?.title ?? null,
    autor: f.autor.name ?? f.autor.email,
    fecha: f.createdAt,
  }
}

/** La marca vigente (la última) de cada alumno de la lista. */
export async function ultimaMarcaPorAlumno(userIds: string[]): Promise<Map<string, Marca>> {
  if (userIds.length === 0) return new Map()
  const filas = (await prisma.seguimientoAlumno.findMany({
    where: { userId: { in: userIds } },
    orderBy: [{ userId: 'asc' }, { createdAt: 'desc' }],
    distinct: ['userId'],
    select: SELECT_MARCA,
  })) as FilaMarca[]
  return new Map(filas.map((f) => [f.userId, aMarca(f)]))
}

/** Historial completo de un alumno, el más reciente primero. */
export async function historialDeSeguimiento(userId: string, take = 30): Promise<Marca[]> {
  const filas = (await prisma.seguimientoAlumno.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: SELECT_MARCA,
  })) as FilaMarca[]
  return filas.map(aMarca)
}

/** «No responde · J. Canchiz · 30 set». */
export function resumenDeMarca(m: Marca, fecha: (d: Date) => string): string {
  const partes = [ESTADOS[m.estado].texto]
  if (m.estado === 'JUSTIFICADO' && m.motivo) {
    partes[0] += ` · ${MOTIVOS[m.motivo].toLowerCase()}${m.cursoTitulo ? ` (${m.cursoTitulo})` : ''}`
  }
  partes.push(m.autor, fecha(m.fecha))
  return partes.join(' · ')
}
