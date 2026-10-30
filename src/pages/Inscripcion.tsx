import { Link, useLocation, useParams } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { ofertaActiva } from '../lib/store'
import { fechaLarga, tiempoRestante } from '../lib/fechas'
import { QRCodigo } from '../components/QRCodigo'

export function Inscripcion() {
  const { codigo } = useParams()
  const { state } = useLocation() as { state?: { yaExistia?: boolean } }
  const db = useDb()
  const ahora = useAhora()
  const i = db.inscripciones.find((x) => x.codigoQR === codigo)
  const a = i && db.actividades.find((x) => x.id === i.actividadId)

  if (!i || !a) {
    return (
      <section className="estado">
        <h1>No encontramos esta inscripción</h1>
        <Link className="boton" to="/">Ver actividades</Link>
      </section>
    )
  }

  const resumen = (
    <p className="resumen-actividad">
      <b>{a.titulo}</b>
      <span className="capital">{fechaLarga(a.fecha)} · {a.hora} h · {a.lugar}</span>
    </p>
  )

  if (i.estado === 'cancelada') {
    return (
      <section className="estado">
        <h1>Esta inscripción está cancelada</h1>
        {resumen}
        <Link className="boton" to={`/actividad/${a.id}`}>Volver a inscribirme</Link>
      </section>
    )
  }

  if (i.estado === 'espera') {
    const oferta = ofertaActiva(i, ahora)
    return (
      <section className="estado">
        <title>Lista de espera · Club de Running Arequipa</title>
        <span className="sello sello--espera" aria-hidden="true">⏳</span>
        <h1>{oferta ? '¡Se liberó una plaza para ti!' : 'Estás en la lista de espera'}</h1>
        {resumen}
        {oferta ? (
          <>
            <p>Tienes <b>{tiempoRestante(i.fechaLimiteConfirmacion!, ahora)}</b> para confirmarla.</p>
            <Link className="boton boton--bloque" to={`/plaza/${i.codigoQR}`}>Confirmar mi plaza</Link>
          </>
        ) : (
          <>
            <p className="posicion">Posición <b>{i.posicionEspera}</b></p>
            <p>Si alguien cancela te escribimos a <b>{i.correo}</b> y tendrás 24 h para confirmar.</p>
          </>
        )}
        <p className="aviso aviso--correo"><span aria-hidden="true">📩 </span>Te enviamos un correo a {i.correo} con estos datos.</p>
        <Link className="enlace-suave" to={`/cancelar/${i.codigoQR}`}>Salir de la lista de espera</Link>
      </section>
    )
  }

  // Ya pasó por la puerta: el QR no sirve más, lo útil ahora es la encuesta.
  if (i.asistio) {
    return (
      <section className="estado">
        <title>Gracias por venir · Club de Running Arequipa</title>
        <span className="sello sello--ok" aria-hidden="true">✓</span>
        <h1>¡Gracias por venir, {i.nombre.split(' ')[0]}!</h1>
        {resumen}
        {i.encuesta ? (
          <p>Ya nos contaste qué tal te fue. ¡Gracias!</p>
        ) : (
          <>
            <p>Cuéntanos en 30 segundos qué tal te fue: nos ayuda a preparar las próximas actividades.</p>
            <Link className="boton boton--bloque" to={`/encuesta/${i.codigoQR}`}>Responder la encuesta</Link>
          </>
        )}
        <Link className="boton boton--secundario boton--bloque" to="/">Ver próximas actividades</Link>
      </section>
    )
  }

  return (
    <section className="estado">
      <title>Inscripción confirmada · Club de Running Arequipa</title>
      <span className="sello sello--ok" aria-hidden="true">✓</span>
      <h1>¡Inscripción confirmada!</h1>
      {state?.yaExistia && <p className="aviso aviso--espera">Ya estabas inscrito con este correo, aquí tienes tu QR.</p>}
      {resumen}
      <QRCodigo valor={i.codigoQR} />
      <p>Muéstralo en la puerta el día de la actividad. Es personal y sirve una sola vez.</p>
      <p className="nota">Guarda esta página: después de la actividad, aquí mismo encontrarás la encuesta.</p>
      <p className="aviso aviso--correo"><span aria-hidden="true">📩 </span>Te enviamos un correo a <b>{i.correo}</b> con tu código QR y el enlace para cancelar.</p>
      <Link className="boton boton--secundario boton--bloque" to="/">Ver otras actividades</Link>
      <Link className="enlace-suave" to={`/cancelar/${i.codigoQR}`}>No podré ir, cancelar mi inscripción</Link>
    </section>
  )
}
