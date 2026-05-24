import { useAuth } from '../context/AuthContext'

function Dashboard() {
  const { perfil } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      padding: '40px 16px',
      fontFamily: 'Arial',
      background: '#31334d4b'
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(30, 30, 32, 0.42)',
        textAlign: 'center'
      }}>
        <h1>Panel docente</h1>
        <h2>{perfil?.nombre}</h2>
        <p><strong>Rol:</strong> {perfil?.rol}</p>
        <p style={{ color: '#2e558b' }}>
          Use la barra superior para navegar entre Nueva sesión, Sesiones, Asistencia y Reportes.
        </p>
      </div>
    </div>
  )
}

export default Dashboard