import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDb } from '../lib/hooks'
import { cancelar, type ResultadoCancelacion } from '../lib/store'
import { fechaLarga } from '../lib/fechas'

export function Cancelar() {
  const { codigo = '' } = useParams()
  const db = useDb()
  const [preguntando, setPreguntando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCancelacion | null>(null)
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

  if (resultado === 'cancelada' || i.estado === 'cancelada') {
    return (
      <section className="estado">
        <span className="sello" aria-hidden="true">👋</span>
        <h1>{resultado === 'cancelada' ? 'Listo, cancelamos tu inscripción' : 'Esta inscripción ya estaba cancelada'}</h1>
        <p>Gracias por avisar: tu plaza pasa a la siguiente persona de la lista de espera.</p>
        <Link className="boton" to="/">Ver otras actividades</Link>
      </section>
    )
  }

  return (
    <section className="estado">
      <h1>Cancelar mi inscripción</h1>
      <p className="resumen-actividad">
        <b>{a.titulo}</b>
        <span className="capital">{fechaLarga(a.fecha)} · {a.hora} h · {a.lugar}</span>
        <span>A nombre de {i.nombre}</span>
      </p>
      {!preguntando ? (
        <button className="boton boton--peligro boton--bloque" onClick={() => setPreguntando(true)}>
          Cancelar mi inscripción
        </button>
      ) : (
        <div className="confirmacion" role="alertdialog" aria-labelledby="pregunta-cancelar">
          <p id="pregunta-cancelar">
            <b>¿Seguro?</b> {i.estado === 'confirmada' ? 'Perderás tu plaza y no se puede deshacer.' : 'Saldrás de la lista de espera.'}
          </p>
          <button className="boton boton--peligro boton--bloque" onClick={async () => setResultado(await cancelar(codigo))}>
            Sí, cancelar
          </button>
          <button className="boton boton--secundario boton--bloque" onClick={() => setPreguntando(false)}>
            No, mantener mi plaza
          </button>
        </div>
      )}
    </section>
  )
}
