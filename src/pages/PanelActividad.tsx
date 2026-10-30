import { useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { cancelar, enviarEncuesta, forzarVencimiento, listaEspera, marcarAsistencia, ofertaActiva, plazasLibres, resumenEncuesta } from '../lib/store'
import { fechaLarga, precioTexto, tiempoRestante } from '../lib/fechas'
import { Plazas } from '../components/Plazas'
import { EstadoAsistencia } from './Puerta'
import { exportar } from './Panel'

type Pestana = 'inscritos' | 'espera' | 'asistencia' | 'encuesta'

export function PanelActividad() {
  const { id } = useParams()
  const db = useDb()
  const ahora = useAhora(15_000)
  const [pestana, setPestana] = useState<Pestana>('inscritos')
  const [avisoEncuesta, setAvisoEncuesta] = useState('')
  const lista = useRef<HTMLDivElement>(null)
  const a = db.actividades.find((x) => x.id === id)
  if (!a) return <section className="estado"><h1>Actividad no encontrada</h1><Link to="/organizador">Volver</Link></section>

  const inscritos = db.inscripciones
    .filter((i) => i.actividadId === a.id && i.estado === 'confirmada')
    .sort((x, y) => x.nombre.localeCompare(y.nombre))
  const espera = listaEspera(db, a.id)
  const asistieron = inscritos.filter((i) => i.asistio).length
  const encuesta = resumenEncuesta(db, a.id)

  const pestanas: [Pestana, string, number, string?][] = [
    ['inscritos', 'Inscritos', inscritos.length],
    ['espera', 'Lista de espera', espera.length, 'Espera'],
    ['asistencia', 'Asistencia', asistieron],
    ['encuesta', 'Encuesta', encuesta.respuestas.length],
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
          <p className="meta"><span className="capital">{fechaLarga(a.fecha)} · {a.hora} h</span><span>{a.lugar}</span><span>{precioTexto(a.precio)}</span></p>
        </div>
        <button className="boton boton--secundario" onClick={() => exportar(a, db.inscripciones)}>Exportar CSV</button>
      </div>
      <Plazas libres={plazasLibres(db, a, ahora)} total={a.plazas} />

      <div className="pestanas" role="tablist" aria-label="Personas" ref={lista} onKeyDown={teclas}>
        {pestanas.map(([k, texto, n, corto]) => (
          <button
            key={k}
            id={`pestana-${k}`}
            role="tab"
            aria-selected={pestana === k}
            aria-controls="panel-pestana"
            tabIndex={pestana === k ? 0 : -1}
            onClick={() => setPestana(k)}
          >
            {corto ? <><span className="texto-largo">{texto}</span><span className="texto-corto" aria-hidden="true">{corto}</span></> : texto}{' '}
            <span className="contador-pestana">{n}</span>
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

        {pestana === 'encuesta' && (
          <>
            <div className="resumen-encuesta">
              <div><b>{encuesta.respuestas.length}/{encuesta.enviadas}</b><small>respondieron</small></div>
              <div><b>{encuesta.respuestas.length ? encuesta.media.toFixed(1) : '–'}</b><small>valoración media</small></div>
              <div><b>{encuesta.respuestas.length ? `${Math.round((encuesta.volverian / encuesta.respuestas.length) * 100)} %` : '–'}</b><small>volvería</small></div>
            </div>
            <div className="contador">
              <span>La encuesta se envía por correo a quienes asistieron.</span>
              <button
                className="boton boton--chico"
                disabled={asistieron === 0}
                onClick={async () => {
                  const n = await enviarEncuesta(a.id)
                  setAvisoEncuesta(n ? `Enviada a ${n} ${n === 1 ? 'persona' : 'personas'}.` : 'Todos los asistentes ya la tienen.')
                }}
              >
                Enviar encuesta
              </button>
            </div>
            <p className="nota" role="status">{asistieron === 0 ? 'Marca la asistencia primero: solo se envía a quienes vinieron.' : avisoEncuesta}</p>
            <ul className="tabla">
              {encuesta.respuestas.map((r) => (
                <li key={r.nombre + r.respondidaEn}>
                  <div>
                    <b>{r.nombre}</b>
                    <small>{r.volveria ? 'Volvería' : 'No volvería'}{r.comentario ? ` · “${r.comentario}”` : ''}</small>
                  </div>
                  <span className="estrellas-chicas" aria-label={`${r.valoracion} de 5`}>{'★'.repeat(r.valoracion)}{'☆'.repeat(5 - r.valoracion)}</span>
                </li>
              ))}
              {encuesta.respuestas.length === 0 && <li className="vacio">Aún no hay respuestas.</li>}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
