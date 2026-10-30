import type { Actividad, Correo, DB, Inscripcion } from './types'
import { crearSemilla } from './seed'

const KEY = 'cra:db:v1'
const LOCK = 'cra:db-lock'
export const HORAS_PARA_CONFIRMAR = 24

// ---------- Almacenamiento ----------

/**
 * ok: localStorage funciona.
 * no-disponible: el navegador lo bloquea (modo privado, cookies desactivadas…); se trabaja en memoria.
 * corrupto: los datos guardados no se podían leer; se guardó una copia y se restauraron los de ejemplo.
 * error-escritura: se pudo leer pero no guardar (p. ej. espacio lleno); los cambios solo viven en esta pestaña.
 */
export type EstadoAlmacenamiento = 'ok' | 'no-disponible' | 'corrupto' | 'error-escritura'

type Almacen = Pick<Storage, 'getItem' | 'setItem'>
const memoria = new Map<string, string>()
const almacenMemoria: Almacen = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => void memoria.set(k, v) }

let storage: Almacen = almacenMemoria
let estadoAlmacenamiento: EstadoAlmacenamiento = 'ok'
const oyentesEstado = new Set<() => void>()

function cambiarEstado(nuevo: EstadoAlmacenamiento) {
  if (nuevo === estadoAlmacenamiento) return
  estadoAlmacenamiento = nuevo
  oyentesEstado.forEach((fn) => fn())
}

/** Pasa a trabajar en memoria conservando lo último que se pudo leer, para no perder la sesión en curso. */
function pasarAMemoria(estado: EstadoAlmacenamiento) {
  if (storage !== almacenMemoria && cacheRaw) memoria.set(KEY, cacheRaw)
  storage = almacenMemoria
  cambiarEstado(estado)
}

/** Comprueba que el almacenamiento se puede leer y escribir de verdad (Safari privado lanza al escribir). */
export function usarAlmacenamiento(candidato: Almacen | undefined) {
  cacheRaw = null
  cacheDb = null
  memoria.clear()
  estadoAlmacenamiento = 'ok'
  try {
    if (!candidato) throw new Error('Sin localStorage')
    const prueba = 'cra:prueba'
    candidato.setItem(prueba, '1')
    if (candidato.getItem(prueba) !== '1') throw new Error('localStorage no conserva los datos')
    ;(candidato as Partial<Storage>).removeItem?.(prueba)
    storage = candidato
  } catch {
    storage = almacenMemoria
    estadoAlmacenamiento = 'no-disponible'
  }
  oyentesEstado.forEach((fn) => fn())
}

export const obtenerEstadoAlmacenamiento = () => estadoAlmacenamiento

export function suscribirEstadoAlmacenamiento(fn: () => void) {
  oyentesEstado.add(fn)
  return () => void oyentesEstado.delete(fn)
}

const oyentes = new Set<() => void>()
let cacheRaw: string | null = null
let cacheDb: DB | null = null

function leerRaw(): string | null {
  try {
    return storage.getItem(KEY)
  } catch {
    pasarAMemoria('no-disponible')
    return storage.getItem(KEY)
  }
}

function leer(): DB {
  let raw = leerRaw()
  if (raw && raw === cacheRaw && cacheDb) return cacheDb
  if (raw) {
    try {
      const db = JSON.parse(raw) as DB
      if (!Array.isArray(db?.actividades) || !Array.isArray(db?.inscripciones)) throw new Error('Formato inesperado')
      db.correos ??= []
      cacheRaw = raw
      cacheDb = db
      return db
    } catch {
      // Se guarda una copia de lo que había para poder recuperarlo a mano.
      try {
        storage.setItem(`${KEY}:danado:${Date.now()}`, raw)
      } catch {
        /* sin espacio para la copia: se avisa igualmente */
      }
      cambiarEstado('corrupto')
      raw = null
    }
  }
  const semilla = crearSemilla(new Date())
  raw = JSON.stringify(semilla)
  guardarRaw(raw)
  cacheRaw = raw
  cacheDb = semilla
  return semilla
}

function guardarRaw(raw: string) {
  try {
    storage.setItem(KEY, raw)
  } catch {
    pasarAMemoria('error-escritura')
    storage.setItem(KEY, raw)
  }
}

function escribir(db: DB) {
  guardarRaw(JSON.stringify(db))
  oyentes.forEach((fn) => fn())
}

export function suscribir(fn: () => void) {
  oyentes.add(fn)
  const alCambiarOtraPestana = (e: StorageEvent) => e.key === KEY && fn()
  if (typeof window !== 'undefined') window.addEventListener('storage', alCambiarOtraPestana)
  return () => {
    oyentes.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', alCambiarOtraPestana)
  }
}

export const obtenerDb = leer

/**
 * Transacción atómica: lee el estado más reciente, aplica `fn` y escribe, todo
 * dentro de un Web Lock exclusivo para que otras pestañas no intercalen
 * escrituras. Dentro de una misma pestaña `fn` es síncrona, así que tampoco
 * puede intercalarse con otra transacción.
 */
async function tx<T>(fn: (db: DB, ahora: Date) => T): Promise<T> {
  const ejecutar = () => {
    const db: DB = structuredClone(leer())
    const ahora = new Date()
    procesarVencimientos(db, ahora)
    const resultado = fn(db, ahora)
    escribir(db)
    return resultado
  }
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks ? locks.request(LOCK, ejecutar) : ejecutar()
}

// ---------- Utilidades ----------

const uid = () => crypto.randomUUID()

function nuevoCodigo(db: DB): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo: string
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    codigo = 'CRA-' + Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('')
  } while (db.inscripciones.some((i) => i.codigoQR === codigo))
  return codigo
}

const normalizarCorreo = (c: string) => c.trim().toLowerCase()

export function ofertaActiva(i: Inscripcion, ahora = new Date()): boolean {
  return (
    i.estado === 'espera' &&
    !!i.fechaLimiteConfirmacion &&
    new Date(i.fechaLimiteConfirmacion).getTime() > ahora.getTime()
  )
}

/** Plazas ocupadas: confirmadas + plazas reservadas a alguien de la lista de espera que aún puede confirmar. */
export function plazasOcupadas(db: DB, actividadId: string, ahora = new Date()): number {
  return db.inscripciones.filter(
    (i) => i.actividadId === actividadId && (i.estado === 'confirmada' || ofertaActiva(i, ahora)),
  ).length
}

export function plazasLibres(db: DB, actividad: Actividad, ahora = new Date()): number {
  return Math.max(0, actividad.plazas - plazasOcupadas(db, actividad.id, ahora))
}

export function listaEspera(db: DB, actividadId: string): Inscripcion[] {
  return db.inscripciones
    .filter((i) => i.actividadId === actividadId && i.estado === 'espera')
    .sort((a, b) => a.posicionEspera - b.posicionEspera)
}

function renumerarEspera(db: DB, actividadId: string) {
  listaEspera(db, actividadId).forEach((i, n) => (i.posicionEspera = n + 1))
}

function enviarCorreo(db: DB, ahora: Date, c: Omit<Correo, 'id' | 'enviadoEn'>) {
  db.correos.unshift({ ...c, id: uid(), enviadoEn: ahora.toISOString() })
}

function actividadDe(db: DB, id: string): Actividad {
  const a = db.actividades.find((x) => x.id === id)
  if (!a) throw new Error('Actividad no encontrada')
  return a
}

/** Mientras haya plazas libres, ofrece una al siguiente de la lista de espera (24 h para confirmar). */
function ofrecerPlazasLibres(db: DB, actividadId: string, ahora: Date) {
  const actividad = actividadDe(db, actividadId)
  while (plazasLibres(db, actividad, ahora) > 0) {
    const siguiente = listaEspera(db, actividadId).find((i) => !i.fechaLimiteConfirmacion)
    if (!siguiente) return
    const limite = new Date(ahora.getTime() + HORAS_PARA_CONFIRMAR * 3600_000)
    siguiente.fechaLimiteConfirmacion = limite.toISOString()
    enviarCorreo(db, ahora, {
      para: siguiente.correo,
      inscripcionId: siguiente.id,
      asunto: `¡Se liberó una plaza en ${actividad.titulo}!`,
      cuerpo: `Hola ${siguiente.nombre}, se liberó una plaza y es para ti. Tienes ${HORAS_PARA_CONFIRMAR} horas para confirmarla; si no, pasará a la siguiente persona de la lista.`,
      enlace: { texto: 'Confirmar mi plaza', ruta: `/plaza/${siguiente.codigoQR}` },
    })
  }
}

/** Las ofertas vencidas se anulan y la plaza pasa al siguiente de la lista. */
export function procesarVencimientos(db: DB, ahora: Date) {
  const afectadas = new Set<string>()
  for (const i of db.inscripciones) {
    if (i.estado === 'espera' && i.fechaLimiteConfirmacion && !ofertaActiva(i, ahora)) {
      i.estado = 'cancelada'
      i.posicionEspera = 0
      afectadas.add(i.actividadId)
      enviarCorreo(db, ahora, {
        para: i.correo,
        inscripcionId: i.id,
        asunto: 'Tu plaza reservada ha vencido',
        cuerpo: `Hola ${i.nombre}, pasaron ${HORAS_PARA_CONFIRMAR} horas sin confirmar, así que la plaza pasó a la siguiente persona de la lista de espera.`,
      })
    }
  }
  for (const id of afectadas) {
    renumerarEspera(db, id)
    ofrecerPlazasLibres(db, id, ahora)
  }
}

// ---------- Operaciones públicas ----------

export async function sincronizar() {
  await tx(() => undefined)
}

export interface DatosInscripcion {
  actividadId: string
  nombre: string
  correo: string
  telefono: string
}

export type ResultadoInscripcion = { inscripcion: Inscripcion; yaExistia: boolean }

export function validarDatos(d: Omit<DatosInscripcion, 'actividadId'>): Partial<Record<keyof DatosInscripcion, string>> {
  const errores: Partial<Record<keyof DatosInscripcion, string>> = {}
  if (d.nombre.trim().length < 3) errores.nombre = 'Escribe tu nombre y apellido.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) errores.correo = 'Revisa el correo, parece incompleto.'
  if (d.telefono.replace(/\D/g, '').length < 7) errores.telefono = 'Necesitamos un teléfono de al menos 7 dígitos.'
  return errores
}

export function inscribir(datos: DatosInscripcion): Promise<ResultadoInscripcion> {
  return tx((db, ahora) => {
    const actividad = actividadDe(db, datos.actividadId)
    const correo = normalizarCorreo(datos.correo)
    const existente = db.inscripciones.find(
      (i) => i.actividadId === actividad.id && i.correo === correo && i.estado !== 'cancelada',
    )
    if (existente) return { inscripcion: existente, yaExistia: true }

    // Comprobación y reserva en la misma transacción: no hay hueco entre "hay plaza" y "la ocupo".
    const hayPlaza = plazasLibres(db, actividad, ahora) > 0
    const inscripcion: Inscripcion = {
      id: uid(),
      actividadId: actividad.id,
      nombre: datos.nombre.trim(),
      correo,
      telefono: datos.telefono.trim(),
      estado: hayPlaza ? 'confirmada' : 'espera',
      codigoQR: nuevoCodigo(db),
      qrUsado: false,
      asistio: false,
      posicionEspera: hayPlaza ? 0 : listaEspera(db, actividad.id).length + 1,
      fechaLimiteConfirmacion: null,
      creadaEn: ahora.toISOString(),
    }
    db.inscripciones.push(inscripcion)
    enviarCorreo(db, ahora, hayPlaza ? correoConfirmacion(actividad, inscripcion) : correoEspera(actividad, inscripcion))
    return { inscripcion, yaExistia: false }
  })
}

function correoConfirmacion(a: Actividad, i: Inscripcion): Omit<Correo, 'id' | 'enviadoEn'> {
  return {
    para: i.correo,
    inscripcionId: i.id,
    asunto: `Inscripción confirmada: ${a.titulo}`,
    cuerpo: `Hola ${i.nombre}, ¡ya tienes tu plaza! Presenta tu código QR en la puerta. Si no puedes ir, cancela desde este correo para liberar la plaza.`,
    enlace: { texto: 'Ver mi QR o cancelar', ruta: `/inscripcion/${i.codigoQR}` },
  }
}

function correoEspera(a: Actividad, i: Inscripcion): Omit<Correo, 'id' | 'enviadoEn'> {
  return {
    para: i.correo,
    inscripcionId: i.id,
    asunto: `Estás en la lista de espera: ${a.titulo}`,
    cuerpo: `Hola ${i.nombre}, la actividad está llena y quedaste en la posición ${i.posicionEspera} de la lista de espera. Si se libera una plaza te escribiremos y tendrás ${HORAS_PARA_CONFIRMAR} h para confirmarla.`,
    enlace: { texto: 'Salir de la lista de espera', ruta: `/cancelar/${i.codigoQR}` },
  }
}

export type ResultadoCancelacion = 'cancelada' | 'ya-cancelada' | 'no-encontrada'

export function cancelar(codigo: string): Promise<ResultadoCancelacion> {
  return tx((db, ahora) => {
    const i = db.inscripciones.find((x) => x.codigoQR === codigo)
    if (!i) return 'no-encontrada'
    if (i.estado === 'cancelada') return 'ya-cancelada'
    i.estado = 'cancelada'
    i.posicionEspera = 0
    i.fechaLimiteConfirmacion = null
    renumerarEspera(db, i.actividadId)
    ofrecerPlazasLibres(db, i.actividadId, ahora)
    return 'cancelada'
  })
}

export type ResultadoConfirmarPlaza = 'confirmada' | 'ya-confirmada' | 'vencida' | 'sin-oferta' | 'no-encontrada'

/** El de la lista de espera acepta la plaza que se le ofreció. */
export function confirmarPlaza(codigo: string): Promise<ResultadoConfirmarPlaza> {
  return tx((db, ahora) => {
    const i = db.inscripciones.find((x) => x.codigoQR === codigo)
    if (!i) return 'no-encontrada'
    if (i.estado === 'confirmada') return 'ya-confirmada'
    if (i.estado === 'cancelada') return 'vencida'
    if (!ofertaActiva(i, ahora)) return 'sin-oferta'
    i.estado = 'confirmada'
    i.posicionEspera = 0
    i.fechaLimiteConfirmacion = null
    renumerarEspera(db, i.actividadId)
    enviarCorreo(db, ahora, correoConfirmacion(actividadDe(db, i.actividadId), i))
    return 'confirmada'
  })
}

export type ResultadoValidacion =
  | { tipo: 'ok'; inscripcion: Inscripcion }
  | { tipo: 'usado'; inscripcion: Inscripcion }
  | { tipo: 'no-valida'; inscripcion: Inscripcion }
  | { tipo: 'otra-actividad'; inscripcion: Inscripcion }
  | { tipo: 'no-encontrado' }

/** Control de puerta: un código solo se valida una vez. */
export function validarQR(codigo: string, actividadId: string): Promise<ResultadoValidacion> {
  return tx((db) => {
    const i = db.inscripciones.find((x) => x.codigoQR === codigo.trim().toUpperCase())
    if (!i) return { tipo: 'no-encontrado' }
    if (i.actividadId !== actividadId) return { tipo: 'otra-actividad', inscripcion: i }
    if (i.estado !== 'confirmada') return { tipo: 'no-valida', inscripcion: i }
    if (i.qrUsado) return { tipo: 'usado', inscripcion: i }
    i.qrUsado = true
    i.asistio = true
    return { tipo: 'ok', inscripcion: { ...i } }
  })
}

/** Marcado manual (búsqueda por nombre). También inutiliza el QR para que no se use después. */
export function marcarAsistencia(inscripcionId: string): Promise<ResultadoValidacion> {
  return tx((db) => {
    const i = db.inscripciones.find((x) => x.id === inscripcionId)
    if (!i) return { tipo: 'no-encontrado' }
    if (i.estado !== 'confirmada') return { tipo: 'no-valida', inscripcion: i }
    if (i.qrUsado || i.asistio) return { tipo: 'usado', inscripcion: i }
    i.qrUsado = true
    i.asistio = true
    return { tipo: 'ok', inscripcion: { ...i } }
  })
}

export type DatosActividad = Omit<Actividad, 'id'>

export function crearActividad(datos: DatosActividad): Promise<Actividad> {
  return tx((db) => {
    const actividad: Actividad = { ...datos, id: uid() }
    db.actividades.push(actividad)
    return actividad
  })
}

/** Duplicar copia todos los datos de la actividad salvo la fecha; los inscritos nunca se copian. */
export function plantillaDuplicado(a: Actividad): DatosActividad {
  return { titulo: a.titulo, hora: a.hora, lugar: a.lugar, descripcion: a.descripcion, plazas: a.plazas, fecha: '' }
}

/** Solo para demostración: adelanta el reloj de una oferta para comprobar el paso al siguiente. */
export function forzarVencimiento(inscripcionId: string): Promise<void> {
  return tx((db, ahora) => {
    const i = db.inscripciones.find((x) => x.id === inscripcionId)
    if (i?.fechaLimiteConfirmacion) {
      i.fechaLimiteConfirmacion = new Date(ahora.getTime() - 1000).toISOString()
      procesarVencimientos(db, ahora)
    }
  })
}

export function restablecerDemo() {
  escribir(crearSemilla(new Date()))
  if (estadoAlmacenamiento === 'corrupto') cambiarEstado('ok')
}

usarAlmacenamiento(typeof localStorage !== 'undefined' ? localStorage : undefined)
