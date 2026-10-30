/**
 * Clave sencilla para el control de puerta. Es una barrera de uso, no seguridad real:
 * sin backend, la clave viaja dentro del JavaScript publicado.
 * Se puede cambiar sin tocar código con la variable de entorno VITE_CLAVE_PUERTA.
 */
export const CLAVE_PUERTA: string = import.meta.env?.VITE_CLAVE_PUERTA || 'misti2026'

const KEY = 'cra:puerta-desbloqueada'

export const comprobarClave = (intento: string) => intento.trim() === CLAVE_PUERTA

/** El acceso dura lo que la pestaña abierta (sessionStorage). */
export function puertaDesbloqueada(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function recordarDesbloqueo(desbloqueada: boolean) {
  try {
    if (desbloqueada) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    /* sin sessionStorage la clave se pedirá de nuevo al recargar */
  }
}
