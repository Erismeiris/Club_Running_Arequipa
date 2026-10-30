/**
 * Claves sencillas para las zonas del club. Son una barrera de uso, no seguridad real:
 * sin backend, las claves viajan dentro del JavaScript publicado.
 * Se cambian sin tocar código con VITE_CLAVE_PUERTA y VITE_CLAVE_ORGANIZADOR.
 */
export type Zona = 'puerta' | 'organizador'

const env = import.meta.env ?? {}

export const CLAVES: Record<Zona, string> = {
  puerta: env.VITE_CLAVE_PUERTA || 'misti2026',
  organizador: env.VITE_CLAVE_ORGANIZADOR || 'chachani2026',
}

const claveSesion = (zona: Zona) => `cra:acceso:${zona}`

/** La clave del organizador también abre la puerta; la de la puerta solo abre la puerta. */
export function comprobarClave(zona: Zona, intento: string): boolean {
  const valor = intento.trim()
  return valor === CLAVES[zona] || (zona === 'puerta' && valor === CLAVES.organizador)
}

/** El acceso dura lo que la pestaña abierta (sessionStorage). */
export function zonaDesbloqueada(zona: Zona): boolean {
  try {
    const abierta = (z: Zona) => sessionStorage.getItem(claveSesion(z)) === '1'
    return abierta(zona) || (zona === 'puerta' && abierta('organizador'))
  } catch {
    return false
  }
}

export function recordarDesbloqueo(zona: Zona, desbloqueada: boolean) {
  try {
    if (desbloqueada) sessionStorage.setItem(claveSesion(zona), '1')
    else sessionStorage.removeItem(claveSesion(zona))
  } catch {
    /* sin sessionStorage la clave se pedirá de nuevo al recargar */
  }
}

/** Bloquear cierra todas las zonas, para que un móvil compartido no quede abierto. */
export function bloquearTodo() {
  recordarDesbloqueo('puerta', false)
  recordarDesbloqueo('organizador', false)
}
