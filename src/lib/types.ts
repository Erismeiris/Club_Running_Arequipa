export interface Actividad {
  id: string
  titulo: string
  fecha: string // YYYY-MM-DD
  hora: string // HH:mm
  lugar: string
  descripcion: string
  plazas: number
  /** Precio informativo en soles; 0 = gratis. No se cobra en la app. */
  precio: number
}

export type EstadoInscripcion = 'confirmada' | 'espera' | 'cancelada'

export interface Inscripcion {
  id: string
  actividadId: string
  nombre: string
  correo: string
  telefono: string
  estado: EstadoInscripcion
  codigoQR: string
  qrUsado: boolean
  asistio: boolean
  /** 0 si no está en lista de espera */
  posicionEspera: number
  /** ISO datetime; solo se usa cuando se le ofrece una plaza liberada desde la lista de espera */
  fechaLimiteConfirmacion: string | null
  creadaEn: string
  /** ISO datetime en que aceptó el tratamiento de sus datos (null en registros anteriores a la casilla). */
  consentimientoEn: string | null
  /** Encuesta corta tras la actividad; solo para quienes asistieron. */
  encuesta?: RespuestaEncuesta
}

export interface RespuestaEncuesta {
  /** 1 a 5 */
  valoracion: number
  volveria: boolean
  comentario: string
  respondidaEn: string
}

/** Correos simulados: sin backend, se guardan en una bandeja local para poder seguir los enlaces. */
export interface Correo {
  id: string
  para: string
  asunto: string
  cuerpo: string
  enlace?: { texto: string; ruta: string }
  inscripcionId: string
  enviadoEn: string
}

export interface DB {
  version: 1
  actividades: Actividad[]
  inscripciones: Inscripcion[]
  correos: Correo[]
}
