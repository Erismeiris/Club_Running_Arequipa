import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { bloquearTodo, comprobarClave, recordarDesbloqueo, zonaDesbloqueada, type Zona } from '../lib/acceso'

const textos: Record<Zona, { titulo: string; ayuda: string; bloquear: string }> = {
  puerta: {
    titulo: 'Control de puerta',
    ayuda: 'Solo para voluntarios del club. Escribe la clave que te dio el organizador.',
    bloquear: 'Bloquear control de puerta',
  },
  organizador: {
    titulo: 'Panel del organizador',
    ayuda: 'Solo para la organización del club. Escribe la clave de organizador.',
    bloquear: 'Cerrar sesión de organizador',
  },
}

/**
 * Pide la clave de la zona antes de mostrar su contenido.
 * `titulo` distingue pantallas que comparten clave (p. ej. la bandeja de correos usa la del organizador).
 */
export function AccesoClub({ zona, titulo, children }: { zona: Zona; titulo?: string; children: ReactNode }) {
  const [abierta, setAbierta] = useState(() => zonaDesbloqueada(zona))
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const t = textos[zona]
  const encabezado = titulo ?? t.titulo

  function entrar(e: FormEvent) {
    e.preventDefault()
    if (comprobarClave(zona, clave)) {
      recordarDesbloqueo(zona, true)
      setAbierta(true)
    } else {
      setError(true)
      setClave('')
      campo.current?.focus()
    }
  }

  function bloquear() {
    bloquearTodo()
    setAbierta(false)
    setClave('')
    setError(false)
  }

  if (abierta) {
    return (
      <>
        {children}
        <p className="bloquear-zona">
          <button type="button" className="enlace-suave" onClick={bloquear}>
            🔒 {t.bloquear}
          </button>
        </p>
      </>
    )
  }

  return (
    <section className="estado">
      <title>{`${encabezado} · Club de Running Arequipa`}</title>
      <span className="sello" aria-hidden="true">🔒</span>
      <h1>{encabezado}</h1>
      <p>{t.ayuda}</p>
      <form className="formulario acceso-zona" onSubmit={entrar} noValidate>
        <label>
          Clave
          <input
            ref={campo}
            type="password"
            value={clave}
            onChange={(e) => {
              setClave(e.target.value)
              setError(false)
            }}
            autoComplete="current-password"
            autoFocus
            aria-invalid={error}
            aria-describedby={error ? `error-clave-${zona}` : undefined}
          />
          {error && (
            <small id={`error-clave-${zona}`} className="error" role="alert">
              Clave incorrecta. Pídesela a la organización del club.
            </small>
          )}
        </label>
        <button className="boton boton--bloque">Entrar</button>
      </form>
    </section>
  )
}
