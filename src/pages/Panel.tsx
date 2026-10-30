import { Link, useNavigate } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { listaEspera, plazasLibres, restablecerDemo } from '../lib/store'
import { esProxima, fechaLarga } from '../lib/fechas'
import { descargarCSV, generarCSV } from '../lib/csv'
import { Plazas } from '../components/Plazas'
import type { Actividad } from '../lib/types'

export function exportar(a: Actividad, inscripciones: Parameters<typeof generarCSV>[1]) {
  const slug = a.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  descargarCSV(`${slug}-${a.fecha || 'sin-fecha'}.csv`, generarCSV(a, inscripciones))
}

export function Panel() {
  const db = useDb()
  const ahora = useAhora()
  const navigate = useNavigate()
  const actividades = [...db.actividades].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))

  return (
    <section className="panel">
      <title>Panel del organizador · Club de Running Arequipa</title>
      <div className="panel__cabecera">
        <h1>Panel del organizador</h1>
        <Link className="boton" to="/organizador/nueva"><span aria-hidden="true">+</span> Crear actividad</Link>
      </div>

      <ul className="lista-panel">
        {actividades.map((a) => {
          const confirmados = db.inscripciones.filter((i) => i.actividadId === a.id && i.estado === 'confirmada').length
          const espera = listaEspera(db, a.id).length
          return (
            <li key={a.id} className={`tarjeta tarjeta--plana${esProxima(a.fecha, ahora) ? '' : ' tarjeta--pasada'}`}>
              <div className="lista-panel__info">
                <h2>{a.titulo}</h2>
                <p className="meta">
                  <span className="capital">{fechaLarga(a.fecha)} · {a.hora} h</span>
                  <span>{a.lugar}</span>
                </p>
                <Plazas libres={plazasLibres(db, a, ahora)} total={a.plazas} compacto />
                <p className="meta">
                  <span>{confirmados} inscritos</span>
                  <span>{espera} en espera</span>
                </p>
              </div>
              <div className="acciones">
                <Link className="boton boton--chico" to={`/organizador/actividad/${a.id}`}>Ver inscritos</Link>
                <button className="boton boton--chico boton--secundario" onClick={() => navigate(`/organizador/nueva?desde=${a.id}`)}>Duplicar</button>
                <button className="boton boton--chico boton--secundario" onClick={() => exportar(a, db.inscripciones)}>Exportar</button>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="nota">
        Los datos se guardan en este navegador (localStorage).{' '}
        <button className="enlace-suave" onClick={() => confirm('¿Borrar todo y volver a los datos de ejemplo?') && restablecerDemo()}>
          Restablecer datos de ejemplo
        </button>
      </p>
    </section>
  )
}
