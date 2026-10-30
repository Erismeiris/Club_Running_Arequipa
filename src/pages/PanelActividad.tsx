import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { cancelar, forzarVencimiento, listaEspera, marcarAsistencia, ofertaActiva, plazasLibres } from '../lib/store'
import { fechaLarga, tiempoRestante } from '../lib/fechas'
import { Plazas } from '../components/Plazas'
import { EstadoAsistencia } from './Puerta'
import { exportar } from './Panel'

type Pestana = 'inscritos' | 'espera' | 'asistencia'

export function PanelActividad() {
  const { id } = useParams()
  const db = useDb()
  const ahora = useAhora(15_000)
  const [pestana, setPestana] = useState<Pestana>('inscritos')
  const a = db.actividades.find((x) => x.id === id)
  if (!a) return <section className="estado"><h1>Actividad no encontrada</h1><Link to="/organizador">Volver</Link></section>

  const inscritos = db.inscripciones
    .filter((i) => i.actividadId === a.id && i.estado === 'confirmada')
    .sort((x, y) => x.nombre.localeCompare(y.nombre))
  const espera = listaEspera(db, a.id)
  const asistieron = inscritos.filter((i) => i.asistio).length

  const pestanas: [Pestana, string, number][] = [
    ['inscritos', 'Inscritos', inscritos.length],
    ['espera', 'Lista de espera', espera.length],
    ['asistencia', 'Asistencia', asistieron],
  ]

  return (
    <section className="panel">
      <Link to="/organizador" className="volver">← Panel</Link>
      <div className="panel__cabecera">
        <div>
          <h1>{a.titulo}</h1>
          <p className="meta"><span className="capital">{fechaLarga(a.fecha)} · {a.hora} h</span><span>{a.lugar}</span></p>
        </div>
        <button className="boton boton--secundario" onClick={() => exportar(a, db.inscripciones)}>Exportar CSV</button>
      </div>
      <Plazas libres={plazasLibres(db, a, ahora)} total={a.plazas} />

      <div className="pestanas" role="tablist">
        {pestanas.map(([k, texto, n]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}>
            {texto} <span className="contador-pestana">{n}</span>
          </button>
        ))}
      </div>

      {pestana === 'inscritos' && (
        <ul className="tabla">
          {inscritos.map((i) => (
            <li key={i.id}>
              <div><b>{i.nombre}</b><small>{i.correo} · {i.telefono}</small></div>
              <button
                className="boton boton--chico boton--fantasma"
                onClick={() => confirm(`¿Cancelar la inscripción de ${i.nombre}? Su plaza pasa a la lista de espera.`) && cancelar(i.codigoQR)}
              >
                Cancelar
              </button>
            </li>
          ))}
          {inscritos.length === 0 && <li className="vacio">Aún no hay inscritos.</li>}
        </ul>
      )}

      {pestana === 'espera' && (
        <ul className="tabla">
          {espera.map((i) => (
            <li key={i.id}>
              <span className="posicion-chica">{i.posicionEspera}</span>
              <div>
                <b>{i.nombre}</b>
                <small>{i.correo} · {i.telefono}</small>
                {ofertaActiva(i, ahora) && (
                  <small className="oferta">Plaza ofrecida · quedan {tiempoRestante(i.fechaLimiteConfirmacion!, ahora)}</small>
                )}
              </div>
              {ofertaActiva(i, ahora) && (
                <button className="boton boton--chico boton--fantasma" title="Solo para probar el flujo" onClick={() => forzarVencimiento(i.id)}>
                  Simular 24 h
                </button>
              )}
            </li>
          ))}
          {espera.length === 0 && <li className="vacio">La lista de espera está vacía.</li>}
        </ul>
      )}

      {pestana === 'asistencia' && (
        <>
          <p className="contador"><b>{asistieron}/{inscritos.length}</b> asistieron</p>
          <ul className="tabla">
            {[...inscritos].sort((x, y) => Number(y.asistio) - Number(x.asistio)).map((i) => (
              <li key={i.id}>
                <div><b>{i.nombre}</b><small>{i.codigoQR}{i.qrUsado ? ' · QR usado' : ''}</small></div>
                <EstadoAsistencia i={i} />
                {!i.asistio && <button className="boton boton--chico" onClick={() => marcarAsistencia(i.id)}>Marcar asistencia</button>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
