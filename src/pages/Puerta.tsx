import { lazy, Suspense, useMemo, useRef, useState, type FormEvent } from 'react'
import { useDb } from '../lib/hooks'
import { marcarAsistencia, validarQR, type ResultadoValidacion } from '../lib/store'
import { aISODate, fechaLarga } from '../lib/fechas'
import type { Inscripcion } from '../lib/types'

// La librería del escáner es pesada: solo se descarga al abrir la cámara.
const Escaner = lazy(() => import('../components/Escaner').then((m) => ({ default: m.Escaner })))

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Puerta() {
  const db = useDb()
  const hoy = aISODate(new Date())
  const ordenadas = [...db.actividades].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  const porDefecto = ordenadas.find((a) => a.fecha >= hoy) ?? ordenadas[ordenadas.length - 1]
  const [actividadId, setActividadId] = useState(porDefecto?.id ?? '')
  const [camara, setCamara] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultado, setResultado] = useState<ResultadoValidacion | null>(null)
  const [lectura, setLectura] = useState(0)
  const [pausado, setPausado] = useState(false)
  const temporizador = useRef<number>(undefined)

  const actividad = db.actividades.find((a) => a.id === actividadId)
  const confirmadas = db.inscripciones.filter((i) => i.actividadId === actividadId && i.estado === 'confirmada')
  const asistieron = confirmadas.filter((i) => i.asistio).length
  const filtradas = useMemo(() => {
    const q = sinTildes(busqueda.trim())
    return confirmadas
      .filter((i) => !q || sinTildes(i.nombre).includes(q) || i.codigoQR.toLowerCase().includes(q))
      .sort((a, b) => Number(a.asistio) - Number(b.asistio) || a.nombre.localeCompare(b.nombre))
  }, [confirmadas, busqueda])

  function mostrar(r: ResultadoValidacion) {
    setResultado(r)
    setLectura((n) => n + 1)
    setPausado(true)
    clearTimeout(temporizador.current)
    // Pausa breve para que la misma lectura no se repita y el voluntario vea el resultado.
    temporizador.current = window.setTimeout(() => setPausado(false), 2500)
  }

  const leer = async (texto: string) => actividadId && mostrar(await validarQR(texto, actividadId))

  async function enviarCodigo(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    setCodigo('')
    await leer(codigo)
  }

  if (!actividad) return <p className="vacio">No hay actividades creadas.</p>

  return (
    <section className="puerta">
      <h1>Control de asistencia</h1>
      <label className="selector">
        Actividad
        <select value={actividadId} onChange={(e) => { setActividadId(e.target.value); setResultado(null) }}>
          {ordenadas.map((a) => (
            <option key={a.id} value={a.id}>{a.titulo} · {a.fecha}</option>
          ))}
        </select>
      </label>
      <p className="contador">
        <span className="capital">{fechaLarga(actividad.fecha)}</span>
        <b>{asistieron}/{confirmadas.length}</b> han llegado
      </p>

      {resultado && <BannerResultado key={lectura} r={resultado} />}

      <div className="tarjeta tarjeta--plana">
        <h2>Escanear QR</h2>
        {camara ? (
          <>
            <Suspense fallback={<p className="nota">Abriendo cámara…</p>}>
              <Escaner onLeer={leer} pausado={pausado} />
            </Suspense>
            <button className="boton boton--secundario boton--bloque" onClick={() => setCamara(false)}>Apagar cámara</button>
          </>
        ) : (
          <button className="boton boton--bloque" onClick={() => setCamara(true)}>📷 Abrir cámara</button>
        )}
        <form className="fila-codigo" onSubmit={enviarCodigo}>
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="o escribe el código: CRA-…" autoCapitalize="characters" aria-label="Código QR" />
          <button className="boton">Validar</button>
        </form>
      </div>

      <div className="tarjeta tarjeta--plana">
        <h2>Buscar por nombre</h2>
        <input className="buscador" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe un nombre…" aria-label="Buscar por nombre" />
        <ul className="lista-asistencia">
          {filtradas.map((i) => (
            <FilaAsistencia key={i.id} i={i} onMarcar={async () => mostrar(await marcarAsistencia(i.id))} />
          ))}
          {filtradas.length === 0 && <li className="vacio">Nadie coincide con “{busqueda}”.</li>}
        </ul>
      </div>
    </section>
  )
}

export function EstadoAsistencia({ i }: { i: Inscripcion }) {
  if (i.asistio) return <span className="chip chip--ok">Asistió</span>
  return <span className="chip">Pendiente</span>
}

function FilaAsistencia({ i, onMarcar }: { i: Inscripcion; onMarcar: () => void }) {
  return (
    <li>
      <div>
        <b>{i.nombre}</b>
        <small>{i.codigoQR}</small>
      </div>
      <EstadoAsistencia i={i} />
      {!i.asistio && <button className="boton boton--chico" onClick={onMarcar}>Marcar asistencia</button>}
    </li>
  )
}

function BannerResultado({ r }: { r: ResultadoValidacion }) {
  const nombre = 'inscripcion' in r ? r.inscripcion.nombre : ''
  const config = {
    ok: { clase: 'ok', titulo: 'Asistió', texto: `Bienvenida/o, ${nombre}` },
    usado: { clase: 'error', titulo: 'QR ya usado', texto: `${nombre} ya registró su entrada.` },
    'no-valida': { clase: 'error', titulo: 'No tiene plaza', texto: `${nombre} está en lista de espera o canceló.` },
    'otra-actividad': { clase: 'error', titulo: 'Otra actividad', texto: `Este QR de ${nombre} es para otra actividad.` },
    'no-encontrado': { clase: 'error', titulo: 'Código desconocido', texto: 'No existe ninguna inscripción con ese código.' },
  }[r.tipo]
  return (
    <div className={`banner banner--${config.clase}`} role="status" aria-live="assertive">
      <b>{config.titulo}</b>
      <span>{config.texto}</span>
    </div>
  )
}
