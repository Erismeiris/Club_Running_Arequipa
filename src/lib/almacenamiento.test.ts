import { afterEach, describe, expect, it } from 'vitest'
import { inscribir, obtenerDb, obtenerEstadoAlmacenamiento, usarAlmacenamiento } from './store'

const KEY = 'cra:db:v1'

function almacenFalso(opciones: { fallaLectura?: boolean; fallaEscritura?: boolean } = {}) {
  const datos = new Map<string, string>()
  return {
    datos,
    bloquearEscritura: () => (opciones.fallaEscritura = true),
    getItem(k: string) {
      if (opciones.fallaLectura) throw new DOMException('Bloqueado', 'SecurityError')
      return datos.get(k) ?? null
    },
    setItem(k: string, v: string) {
      if (opciones.fallaEscritura) throw new DOMException('Lleno', 'QuotaExceededError')
      datos.set(k, v)
    },
    removeItem: (k: string) => void datos.delete(k),
  }
}

afterEach(() => usarAlmacenamiento(undefined))

describe('fallos de localStorage', () => {
  it('con almacenamiento sano el estado es ok', () => {
    usarAlmacenamiento(almacenFalso())
    obtenerDb()
    expect(obtenerEstadoAlmacenamiento()).toBe('ok')
  })

  it('si el navegador lo bloquea, avisa y la app sigue funcionando en memoria', async () => {
    usarAlmacenamiento(almacenFalso({ fallaEscritura: true }))
    expect(obtenerEstadoAlmacenamiento()).toBe('no-disponible')
    const a = obtenerDb().actividades[0]
    const r = await inscribir({ actividadId: a.id, nombre: 'Ana Torres', correo: 'ana@test.pe', telefono: '959000000', consentimiento: true })
    expect(r.inscripcion.estado).toBe('confirmada')
  })

  it('si la lectura falla después de arrancar, avisa', () => {
    const almacen = almacenFalso()
    usarAlmacenamiento(almacen)
    obtenerDb()
    almacen.getItem = () => {
      throw new Error('Bloqueado')
    }
    expect(obtenerDb().actividades).toHaveLength(2)
    expect(obtenerEstadoAlmacenamiento()).toBe('no-disponible')
  })

  it('si los datos están dañados, guarda una copia, carga los de ejemplo y avisa', () => {
    const almacen = almacenFalso()
    almacen.datos.set(KEY, '{esto no es json')
    usarAlmacenamiento(almacen)
    expect(obtenerDb().actividades).toHaveLength(2)
    expect(obtenerEstadoAlmacenamiento()).toBe('corrupto')
    expect([...almacen.datos.keys()].some((k) => k.startsWith(`${KEY}:danado:`))).toBe(true)
  })

  it('si no se puede guardar (espacio lleno), avisa sin perder los cambios de la pestaña', async () => {
    const almacen = almacenFalso()
    usarAlmacenamiento(almacen)
    const a = obtenerDb().actividades[0]
    almacen.bloquearEscritura()
    const r = await inscribir({ actividadId: a.id, nombre: 'Ana Torres', correo: 'ana@test.pe', telefono: '959000000', consentimiento: true })
    expect(obtenerEstadoAlmacenamiento()).toBe('error-escritura')
    expect(obtenerDb().inscripciones.some((i) => i.id === r.inscripcion.id)).toBe(true)
  })
})
