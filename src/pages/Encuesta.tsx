import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDb } from '../lib/hooks'
import { responderEncuesta } from '../lib/store'
import { fechaLarga } from '../lib/fechas'

const CARAS = ['', 'Muy mal', 'Regular', 'Bien', 'Muy bien', '¡Genial!']

/** Encuesta corta tras la actividad: 2 preguntas y un comentario opcional. Se llega desde el correo. */
export function Encuesta() {
  const { codigo = '' } = useParams()
  const db = useDb()
  const [valoracion, setValoracion] = useState(0)
  const [volveria, setVolveria] = useState<boolean | null>(null)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const i = db.inscripciones.find((x) => x.codigoQR === codigo)
  const a = i && db.actividades.find((x) => x.id === i.actividadId)

  if (!i || !a) {
    return (
      <section className="estado">
        <h1>Este enlace no es válido</h1>
        <Link className="boton" to="/">Ver actividades</Link>
      </section>
    )
  }

  if (i.encuesta) {
    return (
      <section className="estado">
        <title>Encuesta enviada · Club de Running Arequipa</title>
        <span className="sello sello--ok" aria-hidden="true">✓</span>
        <h1>¡Gracias por contarnos!</h1>
        <p>Tu opinión sobre “{a.titulo}” ya nos llegó. Nos vemos en la próxima.</p>
        <Link className="boton" to="/">Ver próximas actividades</Link>
      </section>
    )
  }

  if (!i.asistio) {
    return (
      <section className="estado">
        <h1>La encuesta es para quienes asistieron</h1>
        <p>No tenemos registrada tu asistencia a “{a.titulo}”. Si fuiste, avisa a la organización para que la marque.</p>
        <Link className="boton" to="/">Ver actividades</Link>
      </section>
    )
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valoracion) return setError('Elige una puntuación del 1 al 5.')
    if (volveria === null) return setError('Dinos si volverías a una actividad así.')
    setEnviando(true)
    try {
      const r = await responderEncuesta(codigo, { valoracion, volveria, comentario })
      if (r !== 'guardada' && r !== 'ya-respondida') setError('No pudimos guardar tu respuesta. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <article className="ficha">
      <title>{`Encuesta · ${a.titulo} · Club de Running Arequipa`}</title>
      <p className="intro__saludo">Hola, {i.nombre.split(' ')[0]}</p>
      <h1>¿Qué tal estuvo {a.titulo}?</h1>
      <p className="meta"><span className="capital">{fechaLarga(a.fecha)}</span><span>{a.lugar}</span></p>

      <form className="formulario" onSubmit={enviar} noValidate>
        <fieldset className="pregunta">
          <legend>¿Cómo valoras la actividad?</legend>
          <div className="estrellas">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={n <= valoracion ? 'activa' : ''}>
                <input type="radio" name="valoracion" value={n} checked={valoracion === n} onChange={() => { setValoracion(n); setError('') }} />
                <span aria-hidden="true">★</span>
                <span className="solo-lector">{n} de 5, {CARAS[n]}</span>
              </label>
            ))}
          </div>
          <small className="nota" aria-live="polite">{valoracion ? CARAS[valoracion] : 'Toca una estrella'}</small>
        </fieldset>

        <fieldset className="pregunta">
          <legend>¿Volverías a una actividad así?</legend>
          <div className="opciones">
            {([[true, 'Sí'], [false, 'No']] as const).map(([v, texto]) => (
              <label key={texto} className={volveria === v ? 'activa' : ''}>
                <input type="radio" name="volveria" checked={volveria === v} onChange={() => { setVolveria(v); setError('') }} />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          <span>¿Algo que mejorar? <span className="opcional">(opcional)</span></span>
          <textarea rows={3} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ritmo, punto de encuentro, horario…" />
        </label>

        {error && <p className="aviso aviso--error" role="alert">{error}</p>}
        <button className="boton boton--bloque" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar respuesta'}</button>
      </form>
    </article>
  )
}
