import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAhora, useDb } from '../lib/hooks'
import { inscribir, listaEspera, plazasLibres, validarDatos } from '../lib/store'
import { fechaLarga, precioTexto } from '../lib/fechas'
import { Plazas } from '../components/Plazas'

export function FichaActividad() {
  const { id } = useParams()
  const db = useDb()
  const ahora = useAhora()
  const navigate = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', correo: '', telefono: '' })
  const [consentimiento, setConsentimiento] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

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
    const errs = validarDatos({ ...datos, consentimiento })
    setErrores(errs as Record<string, string>)
    const primero = (['nombre', 'correo', 'telefono', 'consentimiento'] as const).find((k) => errs[k])
    // Los errores quedan encima del botón: llevamos el foco al primer campo que hay que corregir.
    if (primero) return formRef.current?.querySelector<HTMLInputElement>(`#campo-${primero}`)?.focus()
    setEnviando(true)
    try {
      const { inscripcion, yaExistia } = await inscribir({ ...datos, consentimiento, actividadId: actividad!.id })
      navigate(`/inscripcion/${inscripcion.codigoQR}`, { state: { yaExistia } })
    } finally {
      setEnviando(false)
    }
  }

  const campo = (k: keyof typeof datos) => ({
    id: `campo-${k}`,
    value: datos[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setDatos({ ...datos, [k]: e.target.value })
      if (errores[k]) setErrores({ ...errores, [k]: '' })
    },
    required: true,
    'aria-invalid': !!errores[k],
    'aria-describedby': errores[k] ? `error-${k}` : undefined,
  })

  return (
    <article className="ficha">
      <title>{`${actividad.titulo} · Club de Running Arequipa`}</title>
      <Link to="/" className="volver">← Actividades</Link>
      <h1>{actividad.titulo}</h1>
      <dl className="datos-ficha">
        <div><dt>Fecha</dt><dd className="capital">{fechaLarga(actividad.fecha)}</dd></div>
        <div><dt>Hora</dt><dd>{actividad.hora} h</dd></div>
        <div><dt>Lugar</dt><dd>{actividad.lugar}</dd></div>
        <div><dt>Precio</dt><dd>{precioTexto(actividad.precio)}</dd></div>
      </dl>
      {actividad.precio > 0 && (
        <p className="nota">Precio informativo: no se paga en esta web. El club te indicará cómo pagarlo.</p>
      )}
      <p className="descripcion">{actividad.descripcion}</p>

      <Plazas libres={libres} total={actividad.plazas} />

      <form className="formulario" onSubmit={enviar} noValidate ref={formRef}>
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
          {errores.nombre && <small className="error" id="error-nombre">{errores.nombre}</small>}
        </label>
        <label>
          Correo
          <input {...campo('correo')} type="email" inputMode="email" autoComplete="email" placeholder="ana@correo.com" />
          {errores.correo && <small className="error" id="error-correo">{errores.correo}</small>}
        </label>
        <label>
          Teléfono
          <input {...campo('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="959 000 000" />
          {errores.telefono && <small className="error" id="error-telefono">{errores.telefono}</small>}
        </label>
        <div className="consentimiento">
          <label className="casilla">
            <input
              type="checkbox"
              id="campo-consentimiento"
              checked={consentimiento}
              onChange={(e) => {
                setConsentimiento(e.target.checked)
                if (errores.consentimiento) setErrores({ ...errores, consentimiento: '' })
              }}
              aria-invalid={!!errores.consentimiento}
              aria-describedby={errores.consentimiento ? 'error-consentimiento' : 'detalle-consentimiento'}
            />
            <span>Acepto que el Club de Running Arequipa guarde mis datos para gestionar esta inscripción.</span>
          </label>
          <details id="detalle-consentimiento">
            <summary>Cómo usamos tus datos</summary>
            <p>
              Usamos tu nombre, correo y teléfono solo para gestionar tu plaza, avisarte de cambios, controlar la asistencia y
              enviarte una encuesta corta tras la actividad. No los compartimos con terceros. Puedes pedir que los borremos
              escribiendo al club, como establece la Ley N.º 29733 de Protección de Datos Personales.
            </p>
          </details>
          {errores.consentimiento && <small className="error" id="error-consentimiento">{errores.consentimiento}</small>}
        </div>
        <button className={`boton boton--bloque${llena ? ' boton--secundario' : ''}`} disabled={enviando}>
          {enviando ? 'Guardando…' : llena ? 'Unirme a la lista de espera' : 'Inscribirme'}
        </button>
        <p className="nota">Te enviaremos tu código QR por correo. Puedes cancelar cuando quieras desde ese mismo correo.</p>
      </form>
    </article>
  )
}
