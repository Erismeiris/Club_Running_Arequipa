import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDb } from '../lib/hooks'
import { crearActividad, plantillaDuplicado, type DatosActividad } from '../lib/store'
import { aISODate } from '../lib/fechas'

const vacia: DatosActividad = { titulo: '', fecha: '', hora: '', lugar: '', descripcion: '', plazas: 20 }

export function FormActividad() {
  const [params] = useSearchParams()
  const db = useDb()
  const navigate = useNavigate()
  const origen = db.actividades.find((a) => a.id === params.get('desde'))
  const [datos, setDatos] = useState<DatosActividad>(() => (origen ? plantillaDuplicado(origen) : vacia))
  const [error, setError] = useState('')

  const set = <K extends keyof DatosActividad>(k: K, v: DatosActividad[K]) => setDatos({ ...datos, [k]: v })

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!datos.titulo.trim() || !datos.fecha || !datos.hora || !datos.lugar.trim()) return setError('Completa título, fecha, hora y lugar.')
    if (!Number.isInteger(datos.plazas) || datos.plazas < 1) return setError('Las plazas deben ser un número mayor que 0.')
    const a = await crearActividad({ ...datos, titulo: datos.titulo.trim(), lugar: datos.lugar.trim() })
    navigate(`/organizador/actividad/${a.id}`)
  }

  return (
    <section className="panel panel--estrecho">
      <title>{`${origen ? 'Duplicar' : 'Crear'} actividad · Club de Running Arequipa`}</title>
      <Link to="/organizador" className="volver">← Panel</Link>
      <h1>{origen ? 'Duplicar actividad' : 'Crear actividad'}</h1>
      {origen && <p className="aviso aviso--espera">Copiamos título, lugar, descripción y plazas de “{origen.titulo}”. Elige la nueva fecha y hora; los inscritos no se copian.</p>}
      <form className="formulario" onSubmit={guardar} noValidate>
        <label>Título<input value={datos.titulo} onChange={(e) => set('titulo', e.target.value)} /></label>
        <div className="fila-2">
          <label>Fecha<input type="date" min={aISODate(new Date())} value={datos.fecha} onChange={(e) => set('fecha', e.target.value)} autoFocus={!!origen} /></label>
          <label>Hora<input type="time" value={datos.hora} onChange={(e) => set('hora', e.target.value)} /></label>
        </div>
        <label>Lugar<input value={datos.lugar} onChange={(e) => set('lugar', e.target.value)} /></label>
        <label>Descripción<textarea rows={4} value={datos.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></label>
        <label>Plazas<input type="number" min={1} inputMode="numeric" value={datos.plazas || ''} onChange={(e) => set('plazas', Number(e.target.value))} /></label>
        {error && <p className="aviso aviso--error">{error}</p>}
        <button className="boton boton--bloque">Guardar actividad</button>
      </form>
    </section>
  )
}
