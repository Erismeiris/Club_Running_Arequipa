import { useEffect } from 'react'
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { sincronizar } from './lib/store'
import { Home } from './pages/Home'
import { FichaActividad } from './pages/FichaActividad'
import { Inscripcion } from './pages/Inscripcion'
import { Cancelar } from './pages/Cancelar'
import { ConfirmarPlaza } from './pages/ConfirmarPlaza'
import { Puerta } from './pages/Puerta'
import { Panel } from './pages/Panel'
import { PanelActividad } from './pages/PanelActividad'
import { FormActividad } from './pages/FormActividad'
import { Correos } from './pages/Correos'
import { AvisoAlmacenamiento } from './components/AvisoAlmacenamiento'
import { AccesoClub } from './components/AccesoClub'

export function App() {
  const { pathname } = useLocation()
  const zonaClub = pathname.startsWith('/organizador') || pathname.startsWith('/puerta') || pathname.startsWith('/correos')

  // Procesa ofertas de lista de espera vencidas al abrir la app y cada minuto.
  useEffect(() => {
    sincronizar()
    const t = setInterval(sincronizar, 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`app${zonaClub ? ' app--club' : ''}`}>
      <header className="cabecera">
        <Link to="/" className="marca">
          <span className="marca__logo" aria-hidden="true">
            <svg viewBox="0 0 64 64"><path d="M10 46 L26 22 L34 32 L40 24 L54 46 Z" /><circle cx="46" cy="16" r="5" /></svg>
          </span>
          <span className="marca__texto">
            Club de Running <b>Arequipa</b>
          </span>
        </Link>
        {zonaClub && (
          <nav className="nav-club">
            <NavLink to="/organizador">Panel</NavLink>
            <NavLink to="/puerta">Puerta</NavLink>
            <NavLink to="/correos">Correos</NavLink>
          </nav>
        )}
      </header>

      <AvisoAlmacenamiento />

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/actividad/:id" element={<FichaActividad />} />
          <Route path="/inscripcion/:codigo" element={<Inscripcion />} />
          <Route path="/cancelar/:codigo" element={<Cancelar />} />
          <Route path="/plaza/:codigo" element={<ConfirmarPlaza />} />
          <Route path="/puerta" element={<AccesoClub zona="puerta"><Puerta /></AccesoClub>} />
          <Route path="/organizador" element={<AccesoClub zona="organizador"><Outlet /></AccesoClub>}>
            <Route index element={<Panel />} />
            <Route path="nueva" element={<FormActividad />} />
            <Route path="actividad/:id" element={<PanelActividad />} />
          </Route>
          <Route path="/correos" element={<Correos />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>

      <footer className="pie">
        <span>Club de Running Arequipa · 200 socios corriendo bajo el Misti</span>
        <nav>
          <Link to="/organizador">Organizadores</Link>
          <Link to="/puerta">Control de puerta</Link>
          <Link to="/correos">Bandeja de correos (demo)</Link>
        </nav>
      </footer>
    </div>
  )
}

function NoEncontrada() {
  return (
    <section className="estado">
      <h1>Esta página se fue a correr</h1>
      <p>No encontramos lo que buscas.</p>
      <Link className="boton" to="/">Ver actividades</Link>
    </section>
  )
}
