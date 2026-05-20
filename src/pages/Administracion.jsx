import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function Administracion() {
  const { perfil } = useAuth()

  const [usuarios, setUsuarios] = useState([])
  const [docentes, setDocentes] = useState([])
  const [asignaturas, setAsignaturas] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [seccionAbierta, setSeccionAbierta] = useState('usuarios')

  const [nuevoUsuario, setNuevoUsuario] = useState({
    uid: '',
    email: '',
    nombre: '',
    rol: 'DOCENTE'
  })

  const [vinculoUsuario, setVinculoUsuario] = useState({
    usuarioId: '',
    docenteId: ''
  })

  const [cambioRol, setCambioRol] = useState({
    usuarioId: '',
    rol: ''
  })

  const [resetPassword, setResetPassword] = useState({
    usuarioId: '',
    nuevaPassword: '',
    confirmarPassword: ''
  })

  const [docente, setDocente] = useState({
    nombre: '',
    correo: ''
  })

  const [asignacion, setAsignacion] = useState({
    docenteId: '',
    asignaturaId: ''
  })

  useEffect(() => {
    cargarTodo()
  }, [])

  const cargarTodo = async () => {
    await Promise.all([
      cargarUsuarios(),
      cargarDocentes(),
      cargarAsignaturas(),
      cargarAsignaciones()
    ])
  }

  const cargarUsuarios = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre')

    if (error) {
      setMensaje(`Error al cargar usuarios: ${error.message}`)
      return
    }

    setUsuarios(data || [])
  }

  const cargarDocentes = async () => {
    const { data, error } = await supabase
      .from('docentes')
      .select('*')
      .order('nombre')

    if (error) {
      setMensaje(`Error al cargar docentes: ${error.message}`)
      return
    }

    setDocentes(data || [])
  }

  const cargarAsignaturas = async () => {
    const { data, error } = await supabase
      .from('asignaturas')
      .select('*')
      .eq('estado', 'Activo')
      .order('nombre')

    if (error) {
      setMensaje(`Error al cargar asignaturas: ${error.message}`)
      return
    }

    setAsignaturas(data || [])
  }

  const cargarAsignaciones = async () => {
    const { data, error } = await supabase
      .from('docente_asignatura')
      .select(`
        id,
        docente_id,
        asignatura_id,
        docentes ( id, nombre ),
        asignaturas ( id, nombre, ciclo )
      `)
      .order('id', { ascending: false })

    if (error) {
      setMensaje(`Error al cargar asignaciones: ${error.message}`)
      return
    }

    setAsignaciones(data || [])
  }

  const obtenerNombreDocente = (docenteId) => {
    const encontrado = docentes.find(item => item.id === docenteId)
    return encontrado?.nombre || 'No vinculado'
  }

  const guardarUsuarioAcceso = async () => {
    setMensaje('Procesando registro de usuario...')

    const uid = nuevoUsuario.uid.trim()
    const email = nuevoUsuario.email.trim().toLowerCase()
    const nombre = nuevoUsuario.nombre.trim().toUpperCase()
    const rol = nuevoUsuario.rol

    if (!uid || !email || !nombre || !rol) {
      setMensaje('Complete UID, correo, nombre y rol.')
      return
    }

    const { data: existePorId, error: errorId } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', uid)
      .maybeSingle()

    if (errorId) {
      setMensaje(`Error verificando usuario: ${errorId.message}`)
      return
    }

    if (existePorId) {
      const { error } = await supabase
        .from('usuarios')
        .update({ email, nombre, rol, estado: 'Activo' })
        .eq('id', uid)

      if (error) {
        setMensaje(`Error actualizando usuario: ${error.message}`)
        return
      }

      setMensaje('Usuario actualizado correctamente.')
    } else {
      const { error } = await supabase
        .from('usuarios')
        .insert([{ id: uid, email, nombre, rol, estado: 'Activo' }])

      if (error) {
        setMensaje(`Error registrando usuario: ${error.message}`)
        return
      }

      setMensaje('Usuario registrado correctamente.')
    }

    setNuevoUsuario({ uid: '', email: '', nombre: '', rol: 'DOCENTE' })
    await cargarUsuarios()
  }

  const guardarVinculoUsuario = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!vinculoUsuario.usuarioId || !vinculoUsuario.docenteId) {
      setMensaje('Seleccione usuario de acceso y docente institucional.')
      return
    }

    const { error } = await supabase
      .from('usuarios')
      .update({ docente_id: Number(vinculoUsuario.docenteId) })
      .eq('id', vinculoUsuario.usuarioId)

    if (error) {
      setMensaje(`Error al vincular usuario: ${error.message}`)
      return
    }

    setMensaje('Usuario vinculado correctamente.')
    setVinculoUsuario({ usuarioId: '', docenteId: '' })
    await cargarUsuarios()
  }

  const guardarCambioRol = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!cambioRol.usuarioId || !cambioRol.rol) {
      setMensaje('Seleccione usuario y nuevo rol.')
      return
    }

    const confirmar = window.confirm(`¿Está seguro de cambiar el rol a ${cambioRol.rol}?`)
    if (!confirmar) return

    const { error } = await supabase
      .from('usuarios')
      .update({ rol: cambioRol.rol })
      .eq('id', cambioRol.usuarioId)

    if (error) {
      setMensaje(`Error al cambiar rol: ${error.message}`)
      return
    }

    setMensaje('Rol actualizado correctamente.')
    setCambioRol({ usuarioId: '', rol: '' })
    await cargarUsuarios()
  }

  const restablecerPassword = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!resetPassword.usuarioId) {
      setMensaje('Seleccione usuario.')
      return
    }

    if (!resetPassword.nuevaPassword || resetPassword.nuevaPassword.length < 8) {
      setMensaje('La contraseña temporal debe tener al menos 8 caracteres.')
      return
    }

    if (resetPassword.nuevaPassword !== resetPassword.confirmarPassword) {
      setMensaje('Las contraseñas no coinciden.')
      return
    }

    const usuario = usuarios.find(item => item.id === resetPassword.usuarioId)

    const confirmar = window.confirm(
      `¿Restablecer contraseña de ${usuario?.nombre || 'usuario seleccionado'}?`
    )

    if (!confirmar) return

    setMensaje('Procesando restablecimiento de contraseña...')

    const { data, error } = await supabase.functions.invoke(
      'reset-password-admin',
      {
        body: {
          userId: resetPassword.usuarioId,
          nuevaPassword: resetPassword.nuevaPassword
        }
      }
    )

    if (error) {
      setMensaje(`Error al restablecer contraseña: ${error.message}`)
      return
    }

    if (data?.error) {
      setMensaje(`Error al restablecer contraseña: ${data.error}`)
      return
    }

    setMensaje('Contraseña restablecida correctamente.')
    setResetPassword({
      usuarioId: '',
      nuevaPassword: '',
      confirmarPassword: ''
    })
  }

  const guardarDocente = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!docente.nombre.trim()) {
      setMensaje('Ingrese el nombre del docente.')
      return
    }

    const { error } = await supabase
      .from('docentes')
      .insert([{
        nombre: docente.nombre.trim().toUpperCase(),
        correo: docente.correo.trim().toLowerCase(),
        estado: 'Activo'
      }])

    if (error) {
      setMensaje(`Error al guardar docente: ${error.message}`)
      return
    }

    setMensaje('Docente registrado correctamente.')
    setDocente({ nombre: '', correo: '' })
    await cargarDocentes()
  }

  const eliminarDocente = async (id) => {
    const confirmar = window.confirm(
      '¿Eliminar docente institucional? También se eliminarán sus asignaciones.'
    )

    if (!confirmar) return

    await supabase.from('docente_asignatura').delete().eq('docente_id', id)

    const { error } = await supabase
      .from('docentes')
      .delete()
      .eq('id', id)

    if (error) {
      setMensaje(`Error al eliminar docente: ${error.message}`)
      return
    }

    setMensaje('Docente eliminado.')
    await cargarDocentes()
    await cargarAsignaciones()
  }

  const guardarAsignacion = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!asignacion.docenteId || !asignacion.asignaturaId) {
      setMensaje('Seleccione docente y asignatura.')
      return
    }

    const { error } = await supabase
      .from('docente_asignatura')
      .insert([{
        docente_id: Number(asignacion.docenteId),
        asignatura_id: Number(asignacion.asignaturaId)
      }])

    if (error) {
      setMensaje(
        error.message.includes('duplicate key')
          ? 'Esta asignatura ya está asignada a ese docente.'
          : `Error asignando docente: ${error.message}`
      )
      return
    }

    setMensaje('Asignación registrada correctamente.')
    setAsignacion({ docenteId: '', asignaturaId: '' })
    await cargarAsignaciones()
  }

  const eliminarAsignacion = async (id) => {
    const confirmar = window.confirm('¿Eliminar esta asignación docente-asignatura?')
    if (!confirmar) return

    const { error } = await supabase
      .from('docente_asignatura')
      .delete()
      .eq('id', id)

    if (error) {
      setMensaje(`Error al eliminar asignación: ${error.message}`)
      return
    }

    setMensaje('Asignación eliminada.')
    await cargarAsignaciones()
  }

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('Seleccione') ||
    mensaje.includes('Ingrese') ||
    mensaje.includes('Complete') ||
    mensaje.includes('no coinciden') ||
    mensaje.includes('debe tener') ||
    mensaje.includes('ya está')

  const puedeRestablecer =
    perfil?.rol === 'ADMINISTRADOR' ||
    perfil?.rol === 'COORDINADOR'

  return (
    <div style={page}>
      <style>
        {`
          @media (max-width: 768px) {
            .admin-summary { grid-template-columns: 1fr 1fr !important; }
            .admin-grid { grid-template-columns: 1fr !important; }
            .admin-row-card { flex-direction: column !important; align-items: stretch !important; }
            .admin-action-button { width: 100% !important; }
          }

          input::placeholder { color: #64748b; opacity: 1; }
          select, input { color: #0f172a; background-color: #ffffff; }
        `}
      </style>

      <h2 style={title}>Administración del sistema</h2>
      <p style={subtitle}>Gestión de usuarios, docentes y asignación académica.</p>

      <div className="admin-summary" style={summaryGrid}>
        <MiniCard titulo="Usuarios" valor={usuarios.length} color="#e0f2fe" />
        <MiniCard titulo="Docentes" valor={docentes.length} color="#dcfce7" />
        <MiniCard titulo="Asignaturas" valor={asignaturas.length} color="#fef9c3" />
        <MiniCard titulo="Asignaciones" valor={asignaciones.length} color="#f3e8ff" />
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

      <Seccion id="usuarios" abierta={seccionAbierta} setAbierta={setSeccionAbierta} titulo="Usuarios, roles y vinculación docente" icono="👤">
        <div className="admin-grid" style={formGrid}>
          <div style={box}>
            <h3 style={boxTitle}>Registrar usuario de acceso</h3>
            <p style={helpText}>Cree primero el usuario en Supabase Authentication y copie su User UID.</p>

            <div style={form}>
              <input style={input} placeholder="User UID de Supabase Auth" value={nuevoUsuario.uid} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, uid: e.target.value })} />
              <input style={input} type="email" placeholder="Correo de acceso" value={nuevoUsuario.email} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })} />
              <input style={input} placeholder="Nombre completo del usuario" value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} />

              <select style={input} value={nuevoUsuario.rol} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}>
                <option value="DOCENTE">DOCENTE</option>
                <option value="COORDINADOR">COORDINADOR</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              </select>

              <button type="button" onClick={guardarUsuarioAcceso} style={primaryButton}>
                Registrar usuario de acceso
              </button>
            </div>
          </div>

          <div style={box}>
            <h3 style={boxTitle}>Vincular usuario con docente</h3>

            <form onSubmit={guardarVinculoUsuario} style={form}>
              <select value={vinculoUsuario.usuarioId} onChange={(e) => setVinculoUsuario({ ...vinculoUsuario, usuarioId: e.target.value })} style={input}>
                <option value="">Seleccione usuario de acceso</option>
                {usuarios.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre} | {item.rol} | {item.email}</option>
                ))}
              </select>

              <select value={vinculoUsuario.docenteId} onChange={(e) => setVinculoUsuario({ ...vinculoUsuario, docenteId: e.target.value })} style={input}>
                <option value="">Seleccione docente institucional</option>
                {docentes.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>

              <button type="submit" style={primaryButton}>Vincular usuario</button>
            </form>
          </div>

          <div style={box}>
            <h3 style={boxTitle}>Cambiar rol</h3>

            <form onSubmit={guardarCambioRol} style={form}>
              <select value={cambioRol.usuarioId} onChange={(e) => setCambioRol({ ...cambioRol, usuarioId: e.target.value })} style={input}>
                <option value="">Seleccione usuario</option>
                {usuarios.map(item => (
                  <option key={item.id} value={item.id}>{item.nombre} | Rol actual: {item.rol}</option>
                ))}
              </select>

              <select value={cambioRol.rol} onChange={(e) => setCambioRol({ ...cambioRol, rol: e.target.value })} style={input}>
                <option value="">Seleccione nuevo rol</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                <option value="COORDINADOR">COORDINADOR</option>
                <option value="DOCENTE">DOCENTE</option>
              </select>

              <button type="submit" style={warningButton}>Actualizar rol</button>
            </form>
          </div>

          {puedeRestablecer && (
            <div style={box}>
              <h3 style={boxTitle}>Restablecer contraseña</h3>

              <form onSubmit={restablecerPassword} style={form}>
                <select value={resetPassword.usuarioId} onChange={(e) => setResetPassword({ ...resetPassword, usuarioId: e.target.value })} style={input}>
                  <option value="">Seleccione usuario</option>
                  {usuarios.map(item => (
                    <option key={item.id} value={item.id}>{item.nombre} | {item.email} | {item.rol}</option>
                  ))}
                </select>

                <input type="password" style={input} placeholder="Nueva contraseña temporal" value={resetPassword.nuevaPassword} onChange={(e) => setResetPassword({ ...resetPassword, nuevaPassword: e.target.value })} />
                <input type="password" style={input} placeholder="Confirmar contraseña temporal" value={resetPassword.confirmarPassword} onChange={(e) => setResetPassword({ ...resetPassword, confirmarPassword: e.target.value })} />

                <button type="submit" style={dangerButton}>
                  Restablecer contraseña
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={selectPanel}>
          <label style={label}>Usuarios registrados</label>
          <select style={input}>
            <option>Seleccione para revisar usuarios...</option>
            {usuarios.map(item => (
              <option key={item.id}>
                {item.nombre} | {item.email} | {item.rol} | Docente: {obtenerNombreDocente(item.docente_id)}
              </option>
            ))}
          </select>
        </div>
      </Seccion>

      <Seccion id="docentes" abierta={seccionAbierta} setAbierta={setSeccionAbierta} titulo="Docentes institucionales" icono="🧑‍🏫">
        <div style={box}>
          <h3 style={boxTitle}>Agregar docente institucional</h3>

          <form onSubmit={guardarDocente} style={form}>
            <input style={input} placeholder="Nombre completo del docente" value={docente.nombre} onChange={(e) => setDocente({ ...docente, nombre: e.target.value })} />
            <input style={input} type="email" placeholder="Correo institucional o personal" value={docente.correo} onChange={(e) => setDocente({ ...docente, correo: e.target.value })} />
            <button type="submit" style={primaryButton}>Guardar docente</button>
          </form>
        </div>

        <div style={compactList}>
          {docentes.map(item => (
            <div key={item.id} className="admin-row-card" style={rowCard}>
              <div>
                <strong>{item.nombre}</strong>
                <p style={smallText}>{item.correo || 'Sin correo registrado'}</p>
              </div>

              <button type="button" onClick={() => eliminarDocente(item.id)} className="admin-action-button" style={smallDanger}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion id="asignaciones" abierta={seccionAbierta} setAbierta={setSeccionAbierta} titulo="Asignación docente - asignatura" icono="📚">
        <div style={box}>
          <h3 style={boxTitle}>Asignar docente a asignatura</h3>

          <form onSubmit={guardarAsignacion} style={form}>
            <select value={asignacion.docenteId} onChange={(e) => setAsignacion({ ...asignacion, docenteId: e.target.value })} style={input}>
              <option value="">Seleccione docente</option>
              {docentes.map(item => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>

            <select value={asignacion.asignaturaId} onChange={(e) => setAsignacion({ ...asignacion, asignaturaId: e.target.value })} style={input}>
              <option value="">Seleccione asignatura</option>
              {asignaturas.map(item => (
                <option key={item.id} value={item.id}>{item.nombre} {item.ciclo ? `- ${item.ciclo}` : ''}</option>
              ))}
            </select>

            <button type="submit" style={primaryButton}>Asignar docente</button>
          </form>
        </div>

        <div style={compactList}>
          {asignaciones.map(item => (
            <div key={item.id} className="admin-row-card" style={rowCard}>
              <div>
                <strong>{item.docentes?.nombre || 'Docente no registrado'}</strong>
                <p style={smallText}>
                  {item.asignaturas?.nombre || 'Asignatura no registrada'}
                  {item.asignaturas?.ciclo ? ` - ${item.asignaturas.ciclo}` : ''}
                </p>
              </div>

              <button type="button" onClick={() => eliminarAsignacion(item.id)} className="admin-action-button" style={smallDanger}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </Seccion>
    </div>
  )
}

function Seccion({ id, abierta, setAbierta, titulo, icono, children }) {
  const visible = abierta === id

  return (
    <section style={section}>
      <button type="button" onClick={() => setAbierta(visible ? '' : id)} style={sectionHeader}>
        <span>{icono} {titulo}</span>
        <strong>{visible ? '▲' : '▼'}</strong>
      </button>

      {visible && <div style={sectionBody}>{children}</div>}
    </section>
  )
}

function MiniCard({ titulo, valor, color }) {
  return (
    <div style={{ ...miniCard, background: color }}>
      <strong>{titulo}</strong>
      <p>{valor}</p>
    </div>
  )
}

const page = {
  padding: '18px 12px 32px',
  fontFamily: 'Arial',
  background: '#f8fafc',
  minHeight: '100vh',
  color: '#0f172a'
}

const title = {
  textAlign: 'center',
  marginBottom: '4px',
  color: '#0f172a',
  fontSize: '28px'
}

const subtitle = {
  textAlign: 'center',
  color: '#475569',
  marginTop: 0,
  marginBottom: '18px',
  fontSize: '14px'
}

const summaryGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '10px',
  marginBottom: '16px'
}

const miniCard = {
  borderRadius: '16px',
  padding: '14px 8px',
  textAlign: 'center',
  border: '1px solid #cbd5e1',
  boxShadow: '0 3px 8px rgba(15,23,42,0.08)'
}

const alert = {
  padding: '13px',
  borderRadius: '12px',
  marginBottom: '14px',
  fontWeight: 'bold',
  textAlign: 'center',
  border: '1px solid rgba(0,0,0,0.05)'
}

const section = {
  background: 'white',
  borderRadius: '18px',
  marginBottom: '14px',
  border: '1px solid #dbe4ef',
  overflow: 'hidden',
  boxShadow: '0 6px 16px rgba(15,23,42,0.08)'
}

const sectionHeader = {
  width: '100%',
  padding: '15px',
  border: 'none',
  background: '#0f172a',
  color: 'white',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontWeight: 'bold',
  fontSize: '15px',
  cursor: 'pointer'
}

const sectionBody = {
  padding: '14px',
  display: 'grid',
  gap: '14px'
}

const formGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
  gap: '14px'
}

const box = {
  background: '#f1f5f9',
  borderRadius: '16px',
  padding: '14px',
  border: '1px solid #cbd5e1'
}

const boxTitle = {
  marginTop: 0,
  marginBottom: '10px',
  textAlign: 'center',
  color: '#334155',
  fontSize: '18px'
}

const helpText = {
  fontSize: '13px',
  color: '#334155',
  lineHeight: '1.4',
  textAlign: 'center'
}

const form = {
  display: 'grid',
  gap: '11px'
}

const input = {
  width: '100%',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid #94a3b8',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: '#ffffff',
  color: '#0f172a',
  outlineColor: '#0284c7'
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '8px',
  color: '#0f172a'
}

const selectPanel = {
  background: '#eff6ff',
  borderRadius: '14px',
  padding: '13px',
  border: '1px solid #93c5fd'
}

const primaryButton = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px'
}

const warningButton = {
  background: '#f97316',
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px'
}

const dangerButton = {
  background: '#7f1d1d',
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px'
}

const compactList = {
  display: 'grid',
  gap: '9px',
  maxHeight: '320px',
  overflowY: 'auto',
  paddingRight: '4px'
}

const rowCard = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '14px',
  padding: '11px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
  fontSize: '13px'
}

const smallText = {
  margin: '4px 0 0',
  color: '#475569',
  fontSize: '12px'
}

const smallDanger = {
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 10px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold'
}

export default Administracion