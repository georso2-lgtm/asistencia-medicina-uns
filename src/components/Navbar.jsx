import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const { perfil } = useAuth()
  const [cerrando, setCerrando] = useState(false)

  const rol = perfil?.rol

  const cerrarSesion = async () => {
    if (cerrando) return

    setCerrando(true)

    try {
      localStorage.clear()
      sessionStorage.clear()

      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 1500))
      ])
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    } finally {
      window.location.replace('/login')
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-title">
        Medicina UNS
      </div>

      <div className="nav-links">
        {rol === 'ADMINISTRADOR' && (
          <>
            <NavLink to="/admin">Docente</NavLink>
            <NavLink to="/asignaturas">Asignaturas</NavLink>
            <NavLink to="/estudiantes">Estudiantes</NavLink>
            <NavLink to="/reportes">Reportes</NavLink>
          </>
        )}

        {(rol === 'COORDINADOR' || rol === 'DOCENTE') && (
          <>
            <NavLink to="/dashboard">Panel</NavLink>
            <NavLink to="/nueva-sesion">Nueva sesión</NavLink>
            <NavLink to="/sesiones">Sesiones</NavLink>
            <NavLink to="/asistencia">Asistencia</NavLink>
            <NavLink to="/reportes">Reportes</NavLink>
          </>
        )}

        <button
          type="button"
          onClick={cerrarSesion}
          disabled={cerrando}
          className="logout-button"
        >
          {cerrando ? 'Saliendo...' : 'Salir'}
        </button>
      </div>
    </nav>
  )
}

export default Navbar