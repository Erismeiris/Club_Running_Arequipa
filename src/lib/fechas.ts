const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha local en formato YYYY-MM-DD. */
export const aISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const desdeISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const fechaLarga = (s: string) =>
  desdeISODate(s).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

export const fechaCorta = (s: string) => {
  const d = desdeISODate(s)
  return {
    dia: d.getDate(),
    mes: d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''),
    semana: d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
  }
}

export const esProxima = (s: string, hoy = new Date()) => s >= aISODate(hoy)

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function tiempoRestante(iso: string, ahora = new Date()) {
  const ms = new Date(iso).getTime() - ahora.getTime()
  if (ms <= 0) return 'vencido'
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}
