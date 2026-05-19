import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, rolesPermitidos }) {
  const { session, perfil, cargando } = useAuth()
  const navigate = useNavigate()

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (cargando) {
    return (
      <div style={{ padding: '30px', fontFamily: 'Arial' }}>
        Verificando acceso...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (!perfil) {
    return (
      <div style={{ padding: '30px', fontFamily: 'Arial', textAlign: 'center' }}>
        <h2>Usuario sin perfil asignado</h2>
        <p>Contacte al administrador del sistema.</p>

        <button
          onClick={cerrarSesion}
          style={{
            padding: '12px 18px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  if (perfil.estado !== 'Activo') {
    return (
      <div style={{ padding: '30px', fontFamily: 'Arial', textAlign: 'center' }}>
        <h2>Usuario inactivo</h2>
        <p>Contacte al administrador del sistema.</p>

        <button
          onClick={cerrarSesion}
          style={{
            padding: '12px 18px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return (
      <div style={{ padding: '30px', fontFamily: 'Arial', textAlign: 'center' }}>
        <h2>Acceso no autorizado</h2>
        <p>No tiene permiso para ingresar a esta sección.</p>

        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 18px',
            background: '#0284c7',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Ir al inicio
        </button>

        <button
          onClick={cerrarSesion}
          style={{
            padding: '12px 18px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return children
}

export default ProtectedRoute