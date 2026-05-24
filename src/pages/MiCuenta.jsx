import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function MiCuenta() {
  const { perfil } = useAuth()

  const [form, setForm] = useState({
    nuevaPassword: '',
    confirmarPassword: ''
  })

  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  const cambiarPassword = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!form.nuevaPassword || form.nuevaPassword.length < 8) {
      setMensaje('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (form.nuevaPassword !== form.confirmarPassword) {
      setMensaje('Las contraseñas no coinciden.')
      return
    }

    const confirmar = window.confirm(
      '¿Desea cambiar su contraseña? Después deberá usar la nueva clave en sus próximos ingresos.'
    )

    if (!confirmar) return

    setProcesando(true)

    const { error } = await supabase.auth.updateUser({
      password: form.nuevaPassword
    })

    setProcesando(false)

    if (error) {
      setMensaje(`Error al cambiar contraseña: ${error.message}`)
      return
    }

    setMensaje('Contraseña actualizada correctamente.')

    setForm({
      nuevaPassword: '',
      confirmarPassword: ''
    })
  }

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('debe') ||
    mensaje.includes('coinciden')

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>Mi cuenta</h2>

        <p style={subtitle}>
          Cambio personal de contraseña
        </p>

        <div style={infoBox}>
          <p><strong>Usuario:</strong> {perfil?.nombre || 'Usuario'}</p>
          <p><strong>Rol:</strong> {perfil?.rol || 'No registrado'}</p>
          <p><strong>Correo:</strong> {perfil?.email || 'No registrado'}</p>
        </div>

        {mensaje && (
          <div style={{
            ...alert,
            background: esError ? '#fee2e2' : '#dcfce7',
            color: esError ? '#991b1b' : '#166534'
          }}>
            {mensaje}
          </div>
        )}

        <form onSubmit={cambiarPassword} style={formStyle}>
          <div>
            <label style={label}>Nueva contraseña</label>
            <input
              type="password"
              style={input}
              placeholder="Mínimo 8 caracteres"
              value={form.nuevaPassword}
              onChange={(e) =>
                setForm({
                  ...form,
                  nuevaPassword: e.target.value
                })
              }
            />
          </div>

          <div>
            <label style={label}>Confirmar nueva contraseña</label>
            <input
              type="password"
              style={input}
              placeholder="Repita la nueva contraseña"
              value={form.confirmarPassword}
              onChange={(e) =>
                setForm({
                  ...form,
                  confirmarPassword: e.target.value
                })
              }
            />
          </div>

          <button
            type="submit"
            disabled={procesando}
            style={{
              ...button,
              opacity: procesando ? 0.7 : 1
            }}
          >
            {procesando ? 'Actualizando...' : 'Cambiar contraseña'}
          </button>
        </form>

        <p style={note}>
          Esta opción cambia únicamente su propia contraseña. Ningún administrador verá su nueva clave.
        </p>
      </div>
    </div>
  )
}

const page = {
  padding: '18px 12px 30px',
  fontFamily: 'Arial',
  background: '#f8fafc',
  minHeight: '100vh',
  color: '#0f172a'
}

const card = {
  maxWidth: '520px',
  margin: '0 auto',
  background: 'white',
  borderRadius: '18px',
  padding: '18px',
  border: '1px solid #dbe4ef',
  boxShadow: '0 6px 16px rgba(15,23,42,0.08)'
}

const title = {
  textAlign: 'center',
  marginTop: 0,
  marginBottom: '4px'
}

const subtitle = {
  textAlign: 'center',
  color: '#475569',
  marginTop: 0,
  marginBottom: '16px'
}

const infoBox = {
  background: '#e0f2fe',
  border: '1px solid #bae6fd',
  borderRadius: '12px',
  padding: '12px',
  marginBottom: '14px',
  fontSize: '14px'
}

const alert = {
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '14px',
  fontWeight: 'bold',
  textAlign: 'center'
}

const formStyle = {
  display: 'grid',
  gap: '14px'
}

const label = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: 'bold'
}

const input = {
  width: '100%',
  padding: '11px',
  borderRadius: '10px',
  border: '1px solid #94a3b8',
  fontSize: '14px',
  boxSizing: 'border-box',
  color: '#0f172a',
  background: 'white'
}

const button = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  padding: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px'
}

const note = {
  marginTop: '14px',
  color: '#475569',
  fontSize: '13px',
  textAlign: 'center'
}

export default MiCuenta