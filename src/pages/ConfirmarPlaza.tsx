import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { confirmarPlaza, ofertaActiva, type ResultadoConfirmarPlaza } from '../lib/store'
import { fechaHora, fechaLarga, tiempoRestante } from '../lib/fechas'

const mensajes: Record<Exclude<ResultadoConfirmarPlaza, 'confirmada' | 'ya-confirmada'>, string> = {
  vencida: 'El plazo de 24 h terminó y la plaza pasó a la siguiente persona.',
  'sin-oferta': 'Todavía no hay una plaza libre para ti. Te escribiremos cuando la haya.',
  'no-encontrada': 'Este enlace no es válido.',
}

export function ConfirmarPlaza() {
  const { codigo = '' } = useParams()
  const db = useDb()
  const ahora = useAhora(15_000)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const i = db.inscripciones.find((x) => x.codigoQR === codigo)
  const a = i && db.actividades.find((x) => x.id === i.actividadId)

  async function confirmar() {
    const r = await confirmarPlaza(codigo)
    if (r === 'confirmada' || r === 'ya-confirmada') navigate(`/inscripcion/${codigo}`)
    else setError(mensajes[r])
  }

  if (!i || !a) return <section className="estado"><h1>{mensajes['no-encontrada']}</h1></section>
  if (i.estado === 'confirmada') return <Navigate to={`/inscripcion/${codigo}`} replace />

  const oferta = ofertaActiva(i, ahora)
  return (
    <section className="estado">
      <span className="sello sello--espera" aria-hidden="true">🎉</span>
      <h1>{oferta ? '¡Se liberó una plaza para ti!' : 'Esta plaza ya no está disponible'}</h1>
      <p className="resumen-actividad">
        <b>{a.titulo}</b>
        <span className="capital">{fechaLarga(a.fecha)} · {a.hora} h · {a.lugar}</span>
      </p>
      {oferta ? (
        <>
          <p className="cuenta-atras">
            Te queda <b>{tiempoRestante(i.fechaLimiteConfirmacion!, ahora)}</b>
            <small>hasta el {fechaHora(i.fechaLimiteConfirmacion!)}</small>
          </p>
          <button className="boton boton--bloque" onClick={confirmar}>Confirmar mi plaza</button>
          <Link className="enlace-suave" to={`/cancelar/${codigo}`}>Ya no puedo ir, dejarla para otro</Link>
        </>
      ) : (
        <p>{i.estado === 'cancelada' ? mensajes.vencida : mensajes['sin-oferta']}</p>
      )}
      {error && <p className="aviso aviso--error">{error}</p>}
    </section>
  )
}
