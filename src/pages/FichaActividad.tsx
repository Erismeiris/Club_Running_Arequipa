import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { inscribir, listaEspera, plazasLibres, validarDatos } from '../lib/store'
import { fechaLarga } from '../lib/fechas'
import { Plazas } from '../components/Plazas'

export function FichaActividad() {
  const { id } = useParams()
  const db = useDb()
  const ahora = useAhora()
  const navigate = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', correo: '', telefono: '' })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)

  const actividad = db.actividades.find((a) => a.id === id)
  if (!actividad) {
    return (
      <section className="estado">
        <h1>No encontramos esta actividad</h1>
        <Link className="boton" to="/">Ver actividades</Link>
      </section>
    )
  }

  const libres = plazasLibres(db, actividad, ahora)
  const llena = libres === 0
  const enEspera = listaEspera(db, actividad.id).length

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const errs = validarDatos(datos)
    setErrores(errs as Record<string, string>)
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      const { inscripcion, yaExistia } = await inscribir({ ...datos, actividadId: actividad!.id })
      navigate(`/inscripcion/${inscripcion.codigoQR}`, { state: { yaExistia } })
    } finally {
      setEnviando(false)
    }
  }

  const campo = (k: keyof typeof datos) => ({
    value: datos[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDatos({ ...datos, [k]: e.target.value }),
    'aria-invalid': !!errores[k],
  })

  return (
    <article className="ficha">
      <Link to="/" className="volver">← Actividades</Link>
      <h1>{actividad.titulo}</h1>
      <dl className="datos-ficha">
        <div><dt>Fecha</dt><dd className="capital">{fechaLarga(actividad.fecha)}</dd></div>
        <div><dt>Hora</dt><dd>{actividad.hora} h</dd></div>
        <div><dt>Lugar</dt><dd>{actividad.lugar}</dd></div>
      </dl>
      <p className="descripcion">{actividad.descripcion}</p>

      <Plazas libres={libres} total={actividad.plazas} />

      <form className="formulario" onSubmit={enviar} noValidate>
        <h2>{llena ? 'Está completa, pero aún puedes apuntarte' : 'Reserva tu plaza'}</h2>
        {llena && (
          <p className="aviso aviso--espera">
            Te ponemos en la lista de espera{enEspera ? ` (hay ${enEspera} antes que tú)` : ''}. Si alguien cancela, te
            escribimos y tienes 24 h para confirmar.
          </p>
        )}
        <label>
          Nombre completo
          <input {...campo('nombre')} autoComplete="name" autoCapitalize="words" placeholder="Ej. Ana Torres Salas" />
          {errores.nombre && <small className="error">{errores.nombre}</small>}
        </label>
        <label>
          Correo
          <input {...campo('correo')} type="email" inputMode="email" autoComplete="email" placeholder="ana@correo.com" />
          {errores.correo && <small className="error">{errores.correo}</small>}
        </label>
        <label>
          Teléfono
          <input {...campo('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="959 000 000" />
          {errores.telefono && <small className="error">{errores.telefono}</small>}
        </label>
        <button className={`boton boton--bloque${llena ? ' boton--secundario' : ''}`} disabled={enviando}>
          {enviando ? 'Guardando…' : llena ? 'Unirme a la lista de espera' : 'Inscribirme'}
        </button>
        <p className="nota">Te enviaremos tu código QR por correo. Puedes cancelar cuando quieras desde ese mismo correo.</p>
      </form>
    </article>
  )
}
