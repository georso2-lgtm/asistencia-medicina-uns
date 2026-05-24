import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Administracion from './pages/Administracion'
import Asignaturas from './pages/Asignaturas'
import Estudiantes from './pages/Estudiantes'
import NuevaSesion from './pages/NuevaSesion'
import ListaSesiones from './pages/ListaSesiones'
import TomarAsistencia from './pages/TomarAsistencia'
import GenerarQR from './pages/GenerarQR'
import Reportes from './pages/Reportes'
import MarcarAsistencia from './pages/MarcarAsistencia'
import MiCuenta from './pages/MiCuenta'

import Navbar from './components/Navbar'

import { AuthProvider, useAuth } from './context/AuthContext'

function ProtectedRoute({ children, rolesPermitidos }) {
  const { perfil, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Verificando acceso...</div>
  }

  if (!perfil) {
    return <Navigate to="/login" />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acceso no autorizado</h2>
        <p>No tiene permiso para ingresar.</p>
      </div>
    )
  }

  return children
}

function LayoutConNavbar({ children, rolesPermitidos }) {
  return (
    <ProtectedRoute rolesPermitidos={rolesPermitidos}>
      <Navbar />
      {children}
    </ProtectedRoute>
  )
}

function RedireccionInicial() {
  const { perfil, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Verificando acceso...</div>
  }

  if (!perfil) return <Navigate to="/login" />

  if (perfil.rol === 'ADMINISTRADOR') return <Navigate to="/admin" />

  if (perfil.rol === 'DOCENTE' || perfil.rol === 'COORDINADOR') {
    return <Navigate to="/dashboard" />
  }

  return <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RedireccionInicial />} />

          <Route
            path="/dashboard"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR']}>
                <Dashboard />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/nueva-sesion"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR']}>
                <NuevaSesion />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/sesiones"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR']}>
                <ListaSesiones />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/asistencia"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR']}>
                <TomarAsistencia />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/qr"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR']}>
                <GenerarQR />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/reportes"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR', 'ADMINISTRADOR']}>
                <Reportes />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/mi-cuenta"
            element={
              <LayoutConNavbar rolesPermitidos={['DOCENTE', 'COORDINADOR', 'ADMINISTRADOR']}>
                <MiCuenta />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/admin"
            element={
              <LayoutConNavbar rolesPermitidos={['ADMINISTRADOR']}>
                <Administracion />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/asignaturas"
            element={
              <LayoutConNavbar rolesPermitidos={['ADMINISTRADOR']}>
                <Asignaturas />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/estudiantes"
            element={
              <LayoutConNavbar rolesPermitidos={['ADMINISTRADOR', 'COORDINADOR']}>
                <Estudiantes />
              </LayoutConNavbar>
            }
          />

          <Route
            path="/marcar-asistencia"
            element={<MarcarAsistencia />}
          />

          <Route path="*" element={<RedireccionInicial />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App