import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function TomarAsistencia() {
  const { perfil } = useAuth()

  const [sesiones, setSesiones] = useState([])
  const [sesionSeleccionada, setSesionSeleccionada] = useState('')
  const [estudiantes, setEstudiantes] = useState([])
  const [asistencias, setAsistencias] = useState({})
  const [metodos, setMetodos] = useState({})
  const [mensaje, setMensaje] = useState('')
  const [datosQR, setDatosQR] = useState('')
  const [expiraEn, setExpiraEn] = useState(null)

  useEffect(() => {
    if (perfil) cargarSesiones()
  }, [perfil])

  useEffect(() => {
    if (!sesionSeleccionada) {
      setEstudiantes([])
      setAsistencias({})
      setMetodos({})
      setDatosQR('')
      return
    }

    cargarDatosSesion()

    const intervalo = setInterval(() => {
      cargarRegistrosSesion()
    }, 5000)

    return () => clearInterval(intervalo)
  }, [sesionSeleccionada])

  const cargarSesiones = async () => {
    let query = supabase
      .from('sesiones')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })

    if (perfil?.rol === 'DOCENTE') {
      query = query
        .eq('docente_id', perfil.docente_id)
        .eq('estado', 'Abierta')
    }

    const { data, error } = await query

    if (error) {
      setMensaje(`Error al cargar sesiones: ${error.message}`)
      return
    }

    setSesiones(data || [])
  }

  const sesionActual = sesiones.find(
    s => s.id.toString() === sesionSeleccionada
  )

  const obtenerTipoSesion = (sesion) => {
    return sesion?.tipo_sesion || sesion?.tipo || ''
  }

  const obtenerHoraFin = (sesion) => {
    return sesion?.hora_fin || sesion?.hora_cierre || ''
  }

  const normalizarGrupo = (valor) => {
    if (!valor) return ''

    let texto = valor
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')

    texto = texto.replace('GRUPO', '').trim()

    const coincidencia = texto.match(/[A-Z]/)

    return coincidencia ? coincidencia[0] : texto
  }

  const cargarDatosSesion = async () => {
    const sesion = sesiones.find(
      s => s.id.toString() === sesionSeleccionada
    )

    if (!sesion) return

    let query = supabase
      .from('estudiantes')
      .select('*')
      .eq('asignatura_id', sesion.asignatura_id)
      .order('grupo', { ascending: true })
      .order('nombre_completo', { ascending: true })

    const { data, error } = await query

    if (error) {
      setMensaje(`Error al cargar estudiantes: ${error.message}`)
      return
    }

    const tipoSesion = obtenerTipoSesion(sesion)

    let lista = data || []

    if (tipoSesion !== 'TEORIA') {
      lista = lista.filter(
        est =>
          normalizarGrupo(est.grupo) ===
          normalizarGrupo(sesion.grupo)
      )
    }

    setEstudiantes(lista)

    await cargarRegistrosSesion()
  }

  const cargarRegistrosSesion = async () => {
    if (!sesionSeleccionada) return

    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('sesion_id', sesionSeleccionada)

    if (error) {
      setMensaje(`Error al cargar asistencias: ${error.message}`)
      return
    }

    const estados = {}
    const metodosRegistro = {}

    ;(data || []).forEach(reg => {
      estados[reg.codigo] = reg.estado
      metodosRegistro[reg.codigo] = reg.metodo || 'DOCENTE'
    })

    setAsistencias(estados)
    setMetodos(metodosRegistro)
  }

  const cambiarEstado = async (est, estado) => {
    if (!sesionActual) return

    if (
      perfil?.rol === 'DOCENTE' &&
      sesionActual.docente_id !== perfil.docente_id
    ) {
      setMensaje('No puede modificar asistencia de una sesión de otro docente.')
      return
    }

    setAsistencias(prev => ({
      ...prev,
      [est.codigo]: estado
    }))

    const metodoActual = metodos[est.codigo] || 'DOCENTE'
    const tipoSesion = obtenerTipoSesion(sesionActual)

    const registro = {
      sesion_id: sesionActual.id,
      codigo: est.codigo,
      estudiante: est.nombre_completo,
      grupo: est.grupo,
      tipo_sesion: tipoSesion,
      estado,
      metodo: metodoActual,
      fecha_registro: new Date().toLocaleString(),
      asignatura_id: sesionActual.asignatura_id,
      asignatura_nombre: sesionActual.asignatura_nombre,
      docente_id: sesionActual.docente_id,
      docente_nombre: sesionActual.docente
    }

    const { error } = await supabase
      .from('asistencias')
      .upsert(registro, {
        onConflict: 'sesion_id,codigo'
      })

    if (error) {
      setMensaje(`Error al guardar cambio: ${error.message}`)
      return
    }

    setMensaje(`Estado actualizado: ${est.nombre_completo} → ${estado}`)
  }

  const cambiarEstadoSesion = async (nuevoEstado) => {
    if (!sesionActual) return

    if (
      perfil?.rol === 'DOCENTE' &&
      sesionActual.docente_id !== perfil.docente_id
    ) {
      setMensaje('No puede modificar una sesión de otro docente.')
      return
    }

    const confirmar = window.confirm(
      `¿Desea cambiar esta sesión a estado "${nuevoEstado}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('sesiones')
      .update({ estado: nuevoEstado })
      .eq('id', sesionActual.id)

    if (error) {
      setMensaje(`Error al modificar sesión: ${error.message}`)
      return
    }

    setMensaje(`Sesión actualizada a estado: ${nuevoEstado}`)
    setDatosQR('')
    setSesionSeleccionada('')
    await cargarSesiones()
  }

  const generarQR = () => {
    if (!sesionActual) {
      setMensaje('Seleccione una sesión.')
      return
    }

    if (sesionActual.estado !== 'Abierta') {
      setMensaje('No se puede generar QR para una sesión cerrada. Reábrala primero si corresponde.')
      return
    }

    const expira = Date.now() + 10 * 60 * 1000
    const url = `${window.location.origin}/marcar-asistencia?sesionId=${sesionActual.id}&expira=${expira}`

    setDatosQR(url)
    setExpiraEn(expira)
  }

  const totalEsperados = estudiantes.length

  const marcadosQR = estudiantes.filter(
    est => metodos[est.codigo] === 'QR'
  ).length

  const presentes = estudiantes.filter(
    est => asistencias[est.codigo] === 'Presente'
  ).length

  const tardanzas = estudiantes.filter(
    est => asistencias[est.codigo] === 'Tardanza'
  ).length

  const faltas = estudiantes.filter(
    est => !asistencias[est.codigo] || asistencias[est.codigo] === 'Falta'
  ).length

  const justificados = estudiantes.filter(
    est => asistencias[est.codigo] === 'Justificado'
  ).length

  const pendientes = totalEsperados - marcadosQR

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('No puede') ||
    mensaje.includes('No se puede') ||
    mensaje.includes('Seleccione')

  return (
    <div style={page}>
      <h2 style={{ marginTop: 0 }}>Control de Asistencia</h2>

      {mensaje && (
        <div style={{
          ...alert,
          background: esError ? '#fee2e2' : '#dcfce7',
          color: esError ? '#991b1b' : '#166534'
        }}>
          {mensaje}
        </div>
      )}

      <div style={card}>
        <label style={label}>
          {perfil?.rol === 'COORDINADOR'
            ? 'Todas las sesiones'
            : 'Mis sesiones abiertas'}
        </label>

        <select
          value={sesionSeleccionada}
          onChange={(e) => {
            setSesionSeleccionada(e.target.value)
            setDatosQR('')
            setMensaje('')
          }}
          style={input}
        >
          <option value="">Seleccione sesión...</option>

          {sesiones.map((sesion) => (
            <option key={sesion.id} value={sesion.id}>
              {sesion.fecha} | {sesion.estado} | {sesion.docente || 'Sin docente'} | {sesion.asignatura_nombre || 'Sin asignatura'} | {obtenerTipoSesion(sesion)} | {sesion.grupo}
            </option>
          ))}
        </select>
      </div>

      {sesionActual && (
        <>
          <div style={infoBox}>
            <p><strong>Docente:</strong> {sesionActual.docente || 'No registrado'}</p>
            <p><strong>Asignatura:</strong> {sesionActual.asignatura_nombre || 'No registrada'}</p>
            <p><strong>Fecha:</strong> {sesionActual.fecha}</p>
            <p><strong>Estado:</strong> {sesionActual.estado}</p>
            <p><strong>Tipo:</strong> {obtenerTipoSesion(sesionActual)}</p>
            <p><strong>Grupo:</strong> {sesionActual.grupo}</p>
            <p><strong>Horario:</strong> {sesionActual.hora_inicio || '--'} - {obtenerHoraFin(sesionActual) || '--'}</p>
          </div>

          <div style={statsFila}>
            <Card titulo="Esperados" valor={totalEsperados} fondo="#f8fafc" />
            <Card titulo="Marcados QR" valor={marcadosQR} fondo="#dcfce7" />
            <Card titulo="Pendientes" valor={pendientes} fondo="#fef9c3" />
          </div>

          <div style={statsFila}>
            <Card titulo="Presentes" valor={presentes} fondo="#e0f2fe" />
            <Card titulo="Tardanzas" valor={tardanzas} fondo="#ffedd5" />
            <Card titulo="Faltas" valor={faltas} fondo="#fee2e2" />
          </div>

          <div style={statsFila}>
            <Card titulo="Justificados" valor={justificados} fondo="#f3e8ff" />
          </div>

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>QR y estado de sesión</h3>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={generarQR} style={botonAzul}>
                Generar QR 10 min
              </button>

              {sesionActual.estado === 'Abierta' && (
                <button
                  onClick={() => cambiarEstadoSesion('Cerrada')}
                  style={botonRojo}
                >
                  Cerrar sesión
                </button>
              )}

              {perfil?.rol === 'COORDINADOR' && sesionActual.estado === 'Cerrada' && (
                <button
                  onClick={() => cambiarEstadoSesion('Abierta')}
                  style={botonVerde}
                >
                  Reabrir sesión
                </button>
              )}
            </div>

            {datosQR && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <QRCodeCanvas
                  value={datosQR}
                  size={230}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                />

                <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                  Válido hasta: {new Date(expiraEn).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={stickyHeader}>Código</th>
                  <th style={th}>Estudiante</th>
                  <th style={th}>Grupo</th>
                  <th style={th}>Estado</th>
                  <th style={th}>Método</th>
                </tr>
              </thead>

              <tbody>
                {estudiantes.map((est) => (
                  <tr key={est.id}>
                    <td style={stickyCodigo}>{est.codigo}</td>

                    <td style={{ ...td, minWidth: '210px' }}>
                      {est.nombre_completo}
                    </td>

                    <td style={{ ...td, minWidth: '70px' }}>
                      {est.grupo}
                    </td>

                    <td style={{ ...td, minWidth: '120px' }}>
                      <select
                        value={asistencias[est.codigo] || 'Falta'}
                        onChange={(e) => cambiarEstado(est, e.target.value)}
                        style={selectEstado}
                      >
                        <option>Presente</option>
                        <option>Tardanza</option>
                        <option>Falta</option>
                        <option>Justificado</option>
                      </select>
                    </td>

                    <td style={{
                      ...td,
                      fontWeight: 'bold',
                      color: metodos[est.codigo] === 'QR' ? '#166534' : '#334155',
                      minWidth: '90px'
                    }}>
                      {metodos[est.codigo] || 'DOCENTE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Card({ titulo, valor, fondo }) {
  return (
    <div style={{
      background: fondo,
      padding: '10px 8px',
      borderRadius: '10px',
      border: '1px solid #cbd5e1',
      textAlign: 'center',
      minHeight: '58px'
    }}>
      <strong style={{ fontSize: '12px' }}>{titulo}</strong>
      <p style={{ fontSize: '23px', margin: '5px 0 0', fontWeight: 'bold' }}>
        {valor}
      </p>
    </div>
  )
}

const page = {
  padding: '80px 10px 24px',
  fontFamily: 'Arial'
}

const alert = {
  padding: '10px',
  borderRadius: '10px',
  marginBottom: '12px',
  fontWeight: 'bold',
  fontSize: '14px'
}

const card = {
  background: 'white',
  padding: '12px',
  borderRadius: '12px',
  marginBottom: '14px',
  boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
  border: '1px solid #e2e8f0'
}

const infoBox = {
  background: '#e0f2fe',
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '12px',
  fontSize: '14px'
}

const label = {
  fontWeight: 'bold',
  fontSize: '14px',
  display: 'block',
  marginBottom: '6px'
}

const input = {
  width: '100%',
  padding: '10px',
  borderRadius: '9px',
  border: '1px solid #cbd5e1'
}

const statsFila = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '8px'
}

const tableWrap = {
  overflowX: 'auto',
  width: '100%',
  border: '1px solid #e2e8f0',
  borderRadius: '10px'
}

const table = {
  width: '100%',
  minWidth: '610px',
  borderCollapse: 'collapse',
  fontSize: '13px'
}

const th = {
  padding: '9px',
  background: '#0f172a',
  color: 'white',
  textAlign: 'left'
}

const td = {
  padding: '8px',
  borderBottom: '1px solid #e2e8f0',
  background: 'white'
}

const stickyCodigo = {
  ...td,
  position: 'sticky',
  left: 0,
  zIndex: 2,
  minWidth: '88px',
  maxWidth: '88px',
  fontWeight: 'bold'
}

const stickyHeader = {
  ...th,
  position: 'sticky',
  left: 0,
  zIndex: 3,
  minWidth: '88px',
  maxWidth: '88px'
}

const selectEstado = {
  padding: '7px',
  borderRadius: '8px',
  width: '100%',
  fontSize: '13px'
}

const botonAzul = {
  padding: '10px 12px',
  background: '#0284c7',
  color: 'white',
  border: 'none',
  borderRadius: '9px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botonRojo = {
  padding: '10px 12px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '9px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botonVerde = {
  padding: '10px 12px',
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '9px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

export default TomarAsistencia