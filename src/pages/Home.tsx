import { Link } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { plazasLibres } from '../lib/store'
import { esProxima, fechaCorta } from '../lib/fechas'
import { Plazas } from '../components/Plazas'

export function Home() {
  const db = useDb()
  const ahora = useAhora()
  const proximas = db.actividades
    .filter((a) => esProxima(a.fecha, ahora))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))

  return (
    <>
      <section className="intro">
        <p className="intro__saludo">¡Hola, runner!</p>
        <h1>Próximas actividades del club</h1>
        <p>Elige una, deja tu nombre, correo y teléfono, y listo. Sin crear cuenta, en menos de un minuto.</p>
      </section>

      {proximas.length === 0 ? (
        <p className="vacio">Por ahora no hay actividades programadas. ¡Vuelve pronto!</p>
      ) : (
        <ul className="lista-actividades">
          {proximas.map((a) => {
            const f = fechaCorta(a.fecha)
            return (
              <li key={a.id} className="tarjeta">
                <div className="hoja-fecha" aria-hidden="true">
                  <span className="hoja-fecha__semana">{f.semana}</span>
                  <span className="hoja-fecha__dia">{f.dia}</span>
                  <span className="hoja-fecha__mes">{f.mes}</span>
                </div>
                <div className="tarjeta__cuerpo">
                  <h2>{a.titulo}</h2>
                  <p className="meta">
                    <span>📍 {a.lugar}</span>
                    <span>🕕 {a.hora} h</span>
                  </p>
                  <Plazas libres={plazasLibres(db, a, ahora)} total={a.plazas} compacto />
                  <Link className="boton boton--bloque" to={`/actividad/${a.id}`}>
                    Ver actividad
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
