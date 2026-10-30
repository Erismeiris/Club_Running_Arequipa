import { useEffect, useState, useSyncExternalStore } from 'react'
import { obtenerDb, suscribir } from './store'

export const useDb = () => useSyncExternalStore(suscribir, obtenerDb)

/** Fecha actual que se refresca cada `ms` para cuentas atrás y vencimientos. */
export function useAhora(ms = 30_000) {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return ahora
}
