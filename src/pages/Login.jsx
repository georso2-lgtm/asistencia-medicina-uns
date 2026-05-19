import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    setMensaje('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setMensaje('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    const {
      data: { user }
    } = await supabase.auth.getUser()

    const { data: usuarioDB, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    setLoading(false)

    if (errorUsuario || !usuarioDB) {
      setMensaje('Usuario sin perfil asignado.')
      return
    }

    if (usuarioDB.estado !== 'Activo') {
      setMensaje('Usuario inactivo.')
      return
    }

    if (usuarioDB.rol === 'ADMINISTRADOR') {
      navigate('/admin')
      return
    }

    if (usuarioDB.rol === 'COORDINADOR' || usuarioDB.rol === 'DOCENTE') {
      navigate('/dashboard')
      return
    }

    setMensaje('Rol no reconocido.')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src="/logo-medicina.png"
          alt="Logo Medicina Humana"
          className="login-logo"
        />

        <h1>Registro de Asistencia</h1>

        <h2>Escuela Profesional de Medicina Humana</h2>

        <p className="login-description">
          Sistema para el registro y control de asistencia estudiantil.
        </p>

        {mensaje && (
          <div className="login-error">
            {mensaje}
          </div>
        )}

        <form onSubmit={iniciarSesion} className="login-form">
          <label>Correo docente</label>
          <input
            type="email"
            placeholder="docente@uns.edu.pe"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Contraseña</label>
          <input
            type="password"
            placeholder="Ingrese contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-footer">
          Universidad Nacional del Santa | v.1
        </p>
      </div>
    </div>
  )
}

export default Login