import { test } from 'node:test'
import assert from 'node:assert/strict'
import { programadaParaElAlumno } from '../lib/lecciones-alumno'

const hoy = new Date('2026-10-27T12:45:00Z')

test('inicio del alumno: solo lo programado en su sección, abierto o por venir (27 oct)', () => {
  // Sostenimiento S2, su sección la programó hoy: se ve.
  assert.equal(programadaParaElAlumno({ seccionDelAlumno: 'EOM A', horario: { availableAt: hoy }, cerrada: false }), true)
  // Tutoría: sin matrícula ni horario.
  assert.equal(programadaParaElAlumno({ seccionDelAlumno: null, horario: null, cerrada: false }), false)
  // Matriculada, pero su sección no programó esta lección.
  assert.equal(programadaParaElAlumno({ seccionDelAlumno: 'EOM A', horario: null, cerrada: false }), false)
  assert.equal(programadaParaElAlumno({ seccionDelAlumno: 'EOM A', horario: { availableAt: null }, cerrada: false }), false)
  // S1 de ayer: la ventana cerró.
  assert.equal(programadaParaElAlumno({ seccionDelAlumno: 'EOM A', horario: { availableAt: hoy }, cerrada: true }), false)
})
