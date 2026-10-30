import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelar, confirmarPlaza, crearActividad, inscribir, listaEspera, marcarAsistencia, obtenerDb,
  plantillaDuplicado, plazasLibres, restablecerDemo, sincronizar, validarQR,
} from './store'
import { generarCSV } from './csv'

const persona = (n: number) => ({ nombre: `Runner ${n}`, correo: `r${n}@test.pe`, telefono: '959000000' })

async function actividadCon(plazas: number) {
  return crearActividad({ titulo: 'Prueba', fecha: '2030-01-01', hora: '07:00', lugar: 'Plaza de Armas', descripcion: 'x', plazas })
}

beforeEach(() => {
  vi.useRealTimers()
  restablecerDemo()
})

describe('plazas', () => {
  it('dos inscripciones simultáneas a la última plaza: una entra y la otra pasa a espera', async () => {
    const a = await actividadCon(1)
    const [x, y] = await Promise.all([inscribir({ ...persona(1), actividadId: a.id }), inscribir({ ...persona(2), actividadId: a.id })])
    const estados = [x.inscripcion.estado, y.inscripcion.estado].sort()
    expect(estados).toEqual(['confirmada', 'espera'])
    expect(plazasLibres(obtenerDb(), a)).toBe(0)
  })

  it('nunca supera las plazas con muchas inscripciones concurrentes', async () => {
    const a = await actividadCon(5)
    await Promise.all(Array.from({ length: 30 }, (_, n) => inscribir({ ...persona(n), actividadId: a.id })))
    const db = obtenerDb()
    expect(db.inscripciones.filter((i) => i.actividadId === a.id && i.estado === 'confirmada')).toHaveLength(5)
    expect(listaEspera(db, a.id).map((i) => i.posicionEspera)).toEqual(Array.from({ length: 25 }, (_, n) => n + 1))
  })

  it('el mismo correo no se inscribe dos veces', async () => {
    const a = await actividadCon(3)
    await inscribir({ ...persona(1), actividadId: a.id })
    const r = await inscribir({ ...persona(1), correo: 'R1@TEST.PE', actividadId: a.id })
    expect(r.yaExistia).toBe(true)
    expect(plazasLibres(obtenerDb(), a)).toBe(2)
  })
})

describe('lista de espera', () => {
  it('al cancelar, el primero en espera recibe aviso con 24 h y la plaza queda reservada', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T10:00:00'))
    const a = await actividadCon(1)
    const c = (await inscribir({ ...persona(1), actividadId: a.id })).inscripcion
    const e1 = (await inscribir({ ...persona(2), actividadId: a.id })).inscripcion
    await inscribir({ ...persona(3), actividadId: a.id })

    await cancelar(c.codigoQR)
    let db = obtenerDb()
    const ofrecida = db.inscripciones.find((i) => i.id === e1.id)!
    expect(new Date(ofrecida.fechaLimiteConfirmacion!).getTime() - Date.now()).toBe(24 * 3600_000)
    expect(db.correos[0].para).toBe('r2@test.pe')
    expect(plazasLibres(db, a)).toBe(0)
    // Mientras dura la oferta, nadie nuevo puede quitarle la plaza.
    expect((await inscribir({ ...persona(9), actividadId: a.id })).inscripcion.estado).toBe('espera')

    expect(await confirmarPlaza(e1.codigoQR)).toBe('confirmada')
    db = obtenerDb()
    expect(db.inscripciones.find((i) => i.id === e1.id)!.estado).toBe('confirmada')
    expect(listaEspera(db, a.id).map((i) => i.nombre)).toEqual(['Runner 3', 'Runner 9'])
  })

  it('si no confirma en 24 h, la plaza pasa al siguiente', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T10:00:00'))
    const a = await actividadCon(1)
    const c = (await inscribir({ ...persona(1), actividadId: a.id })).inscripcion
    const e1 = (await inscribir({ ...persona(2), actividadId: a.id })).inscripcion
    const e2 = (await inscribir({ ...persona(3), actividadId: a.id })).inscripcion
    await cancelar(c.codigoQR)

    vi.setSystemTime(new Date('2030-01-02T10:00:01'))
    await sincronizar()
    const db = obtenerDb()
    expect(db.inscripciones.find((i) => i.id === e1.id)!.estado).toBe('cancelada')
    const segundo = db.inscripciones.find((i) => i.id === e2.id)!
    expect(segundo.fechaLimiteConfirmacion).not.toBeNull()
    expect(segundo.posicionEspera).toBe(1)
    expect(await confirmarPlaza(e1.codigoQR)).toBe('vencida')
  })
})

describe('control de puerta', () => {
  it('un QR solo se valida una vez', async () => {
    const a = await actividadCon(2)
    const { inscripcion } = await inscribir({ ...persona(1), actividadId: a.id })
    const [r1, r2] = await Promise.all([validarQR(inscripcion.codigoQR, a.id), validarQR(inscripcion.codigoQR, a.id)])
    expect([r1.tipo, r2.tipo].sort()).toEqual(['ok', 'usado'])
    expect((await validarQR(inscripcion.codigoQR.toLowerCase(), a.id)).tipo).toBe('usado')
  })

  it('el marcado manual también inutiliza el QR, y la espera no entra', async () => {
    const a = await actividadCon(1)
    const c = (await inscribir({ ...persona(1), actividadId: a.id })).inscripcion
    const e = (await inscribir({ ...persona(2), actividadId: a.id })).inscripcion
    expect((await marcarAsistencia(c.id)).tipo).toBe('ok')
    expect((await validarQR(c.codigoQR, a.id)).tipo).toBe('usado')
    expect((await validarQR(e.codigoQR, a.id)).tipo).toBe('no-valida')
    expect((await validarQR('CRA-NOEXISTE', a.id)).tipo).toBe('no-encontrado')
  })
})

describe('organizador', () => {
  it('duplicar copia todo menos la fecha y los inscritos', async () => {
    const db = obtenerDb()
    const original = db.actividades[0]
    const { id, fecha, ...resto } = original
    const copia = plantillaDuplicado(original)
    expect(copia).toEqual({ ...resto, fecha: '' })

    const nueva = await crearActividad({ ...copia, fecha: '2030-02-01' })
    expect(nueva.id).not.toBe(id)
    expect(obtenerDb().inscripciones.filter((i) => i.actividadId === nueva.id)).toHaveLength(0)
    expect(fecha).not.toBe('2030-02-01')
  })

  it('el CSV incluye inscritos, lista de espera y asistencia', async () => {
    const a = await actividadCon(1)
    const c = (await inscribir({ ...persona(1), actividadId: a.id })).inscripcion
    await inscribir({ ...persona(2), actividadId: a.id })
    await validarQR(c.codigoQR, a.id)
    const csv = generarCSV(a, obtenerDb().inscripciones).split('\r\n')
    expect(csv[0]).toContain('Asistencia')
    expect(csv[1]).toContain('Inscrito')
    expect(csv[1]).toContain('Asistió')
    expect(csv[2]).toContain('Lista de espera')
    expect(csv).toHaveLength(3)
  })

  it('los datos de ejemplo traen 2 actividades y 3 inscripciones', () => {
    const db = obtenerDb()
    expect(db.actividades.map((a) => [a.titulo, a.plazas])).toEqual([
      ['Quedada 10K Yanahuara', 20],
      ['Taller de técnica de carrera', 12],
    ])
    expect(db.inscripciones).toHaveLength(3)
  })
})
