import type { Actividad, Inscripcion } from './types'

const celda = (v: string | number) => {
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV con inscritos y lista de espera, incluido el estado de asistencia. Las canceladas se omiten. */
export function generarCSV(actividad: Actividad, inscripciones: Inscripcion[]): string {
  const filas = inscripciones
    .filter((i) => i.actividadId === actividad.id && i.estado !== 'cancelada')
    .sort((a, b) =>
      a.estado === b.estado ? a.posicionEspera - b.posicionEspera || a.nombre.localeCompare(b.nombre) : a.estado === 'confirmada' ? -1 : 1,
    )
    .map((i) => [
      actividad.titulo,
      actividad.fecha,
      i.estado === 'confirmada' ? 'Inscrito' : 'Lista de espera',
      i.posicionEspera || '',
      i.nombre,
      i.correo,
      i.telefono,
      i.codigoQR,
      i.estado === 'confirmada' ? (i.asistio ? 'Asistió' : 'Pendiente') : '',
      i.qrUsado ? 'Sí' : 'No',
      i.fechaLimiteConfirmacion ?? '',
    ])
  const cabecera = [
    'Actividad', 'Fecha', 'Lista', 'Posición espera', 'Nombre', 'Correo', 'Teléfono',
    'Código QR', 'Asistencia', 'QR usado', 'Límite para confirmar',
  ]
  return [cabecera, ...filas].map((f) => f.map(celda).join(',')).join('\r\n')
}

export function descargarCSV(nombre: string, contenido: string) {
  // BOM para que Excel abra bien las tildes.
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}
