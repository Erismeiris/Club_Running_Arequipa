import { useState, useSyncExternalStore } from 'react'
import { obtenerEstadoAlmacenamiento, suscribirEstadoAlmacenamiento, type EstadoAlmacenamiento } from '../lib/store'
import './AvisoAlmacenamiento.css'

const mensajes: Record<Exclude<EstadoAlmacenamiento, 'ok'>, { titulo: string; texto: string }> = {
  'no-disponible': {
    titulo: 'Este navegador no deja guardar datos',
    texto:
      'Puede que estés en modo privado o con las cookies bloqueadas. Puedes seguir usando la app, pero todo lo que hagas se perderá al cerrar esta pestaña.',
  },
  'error-escritura': {
    titulo: 'No pudimos guardar tus últimos cambios',
    texto:
      'El almacenamiento del navegador está lleno o bloqueado. Los cambios siguen en esta pestaña, pero se perderán al cerrarla. Libera espacio o prueba con otro navegador.',
  },
  corrupto: {
    titulo: 'No pudimos leer los datos guardados',
    texto:
      'Estaban dañados, así que guardamos una copia aparte y cargamos los datos de ejemplo. Si es un error, avisa al organizador antes de seguir.',
  },
}

/** Avisa de forma visible cuando localStorage no se puede leer o escribir. */
export function AvisoAlmacenamiento() {
  const estado = useSyncExternalStore(suscribirEstadoAlmacenamiento, obtenerEstadoAlmacenamiento)
  const [cerrado, setCerrado] = useState<EstadoAlmacenamiento | null>(null)
  if (estado === 'ok' || cerrado === estado) return null
  const { titulo, texto } = mensajes[estado]
  return (
    <div className="aviso-almacenamiento" role="alert">
      <span className="aviso-almacenamiento__icono" aria-hidden="true">!</span>
      <div>
        <b>{titulo}</b>
        <p>{texto}</p>
      </div>
      <button type="button" onClick={() => setCerrado(estado)} aria-label="Cerrar aviso">×</button>
    </div>
  )
}
