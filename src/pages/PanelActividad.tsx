import { useRef, useState, type KeyboardEvent } from 'react'
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
  const lista = useRef<HTMLDivElement>(null)
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

  // Patrón de pestañas: las flechas mueven la selección y el foco.
  function teclas(e: KeyboardEvent) {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!paso) return
    const n = (pestanas.findIndex(([k]) => k === pestana) + paso + pestanas.length) % pestanas.length
    setPestana(pestanas[n][0])
    lista.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[n]?.focus()
  }

  return (
    <section className="panel">
      <title>{`${a.titulo} · Panel · Club de Running Arequipa`}</title>
      <Link to="/organizador" className="volver">← Panel</Link>
      <div className="panel__cabecera">
        <div>
          <h1>{a.titulo}</h1>
          <p className="meta"><span className="capital">{fechaLarga(a.fecha)} · {a.hora} h</span><span>{a.lugar}</span></p>
        </div>
        <button className="boton boton--secundario" onClick={() => exportar(a, db.inscripciones)}>Exportar CSV</button>
      </div>
      <Plazas libres={plazasLibres(db, a, ahora)} total={a.plazas} />

      <div className="pestanas" role="tablist" aria-label="Personas" ref={lista} onKeyDown={teclas}>
        {pestanas.map(([k, texto, n]) => (
          <button
            key={k}
            id={`pestana-${k}`}
            role="tab"
            aria-selected={pestana === k}
            aria-controls="panel-pestana"
            tabIndex={pestana === k ? 0 : -1}
            onClick={() => setPestana(k)}
          >
            {texto} <span className="contador-pestana">{n}</span>
          </button>
        ))}
      </div>

      <div id="panel-pestana" role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'inscritos' && (
          <ul className="tabla">
            {inscritos.map((i) => (
              <li key={i.id}>
                <div><b>{i.nombre}</b><small>{i.correo}</small><small>{i.telefono}</small></div>
                <button
                  className="boton boton--chico boton--fantasma"
                  onClick={() => confirm(`¿Cancelar la inscripción de ${i.nombre}? Su plaza pasa a la lista de espera.`) && cancelar(i.codigoQR)}
                >
                  Dar de baja
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
                  <small>{i.correo}</small>
                  <small>{i.telefono}</small>
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
      </div>
    </section>
  )
}
