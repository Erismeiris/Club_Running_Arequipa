import { Link } from 'react-router-dom'
import { useDb } from '../lib/hooks'
import { fechaHora } from '../lib/fechas'

/** Bandeja simulada: sin servidor de correo, aquí se ven los avisos y se siguen sus enlaces. */
export function Correos() {
  const { correos } = useDb()
  return (
    <section className="panel panel--estrecho">
      <title>Bandeja de correos · Club de Running Arequipa</title>
      <h1>Bandeja de correos</h1>
      <p className="aviso aviso--espera">
        Demo: esta app no tiene servidor de correo, así que los avisos que recibirían los socios se muestran aquí.
      </p>
      <ul className="correos">
        {correos.map((c) => (
          <li key={c.id} className="tarjeta tarjeta--plana">
            <small>Para {c.para} · {fechaHora(c.enviadoEn)}</small>
            <b>{c.asunto}</b>
            <p>{c.cuerpo}</p>
            {c.enlace && <Link className="boton boton--chico" to={c.enlace.ruta}>{c.enlace.texto}</Link>}
          </li>
        ))}
        {correos.length === 0 && <li className="vacio">Todavía no se ha enviado ningún correo. Inscríbete en una actividad para ver el primero.</li>}
      </ul>
    </section>
  )
}
