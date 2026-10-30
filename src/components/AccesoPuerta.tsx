import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { comprobarClave, puertaDesbloqueada, recordarDesbloqueo } from '../lib/acceso'

/** Pide la clave del control de puerta antes de mostrar su contenido. */
export function AccesoPuerta({ children }: { children: ReactNode }) {
  const [abierta, setAbierta] = useState(puertaDesbloqueada)
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  function entrar(e: FormEvent) {
    e.preventDefault()
    if (comprobarClave(clave)) {
      recordarDesbloqueo(true)
      setAbierta(true)
    } else {
      setError(true)
      setClave('')
      campo.current?.focus()
    }
  }

  function bloquear() {
    recordarDesbloqueo(false)
    setAbierta(false)
    setClave('')
    setError(false)
  }

  if (abierta) {
    return (
      <>
        {children}
        <p className="bloquear-puerta">
          <button type="button" className="enlace-suave" onClick={bloquear}>
            🔒 Bloquear control de puerta
          </button>
        </p>
      </>
    )
  }

  return (
    <section className="estado">
      <span className="sello" aria-hidden="true">🔒</span>
      <h1>Control de puerta</h1>
      <p>Solo para voluntarios del club. Escribe la clave que te dio el organizador.</p>
      <form className="formulario acceso-puerta" onSubmit={entrar} noValidate>
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
            aria-describedby={error ? 'error-clave' : undefined}
          />
          {error && (
            <small id="error-clave" className="error" role="alert">
              Clave incorrecta. Pídesela al organizador.
            </small>
          )}
        </label>
        <button className="boton boton--bloque">Entrar</button>
      </form>
    </section>
  )
}
