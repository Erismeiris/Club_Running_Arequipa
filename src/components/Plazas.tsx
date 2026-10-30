interface Props {
  libres: number
  total: number
  compacto?: boolean
}

export function Plazas({ libres, total, compacto }: Props) {
  const ocupadas = total - libres
  const tono = libres === 0 ? 'llena' : libres <= Math.max(2, Math.ceil(total * 0.2)) ? 'pocas' : 'ok'
  return (
    <div className={`plazas plazas--${tono}${compacto ? ' plazas--compacto' : ''}`}>
      <div className="plazas__texto">
        <span>Plazas libres:</span>
        <strong>
          {libres}/{total}
        </strong>
        {tono === 'llena' && <span className="chip chip--espera">Completa</span>}
        {tono === 'pocas' && <span className="chip chip--pocas">¡Últimas!</span>}
      </div>
      <div className="plazas__puntos" aria-hidden="true">
        {total <= 40
          ? Array.from({ length: total }, (_, n) => <span key={n} className={n < ocupadas ? 'ocupada' : ''} />)
          : <span className="plazas__barra"><span style={{ width: `${(ocupadas / total) * 100}%` }} /></span>}
      </div>
    </div>
  )
}
