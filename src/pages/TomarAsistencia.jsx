import { useEffect, useMemo, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function TomarAsistencia() {
  const { perfil } = useAuth()

  const [sesiones, setSesiones] = useState([])
  const [sesionId, setSesionId] = useState('')
  const [sesionActual, setSesionActual] = useState(null)

  const [unidadFiltro, setUnidadFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Abierta')

  const [asistencias, setAsistencias] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(false)

  const [mostrarQR, setMostrarQR] = useState(false)
  const [datosQR, setDatosQR] = useState('')
  const [expiraQR, setExpiraQR] = useState(null)

  useEffect(() => {
    if (perfil) cargarSesiones()
  }, [perfil])

  useEffect(() => {
    if (sesionId) {
      cargarAsistencias()
    } else {
      setSesionActual(null)
      setAsistencias([])
      setMostrarQR(false)
    }
  }, [sesionId])

  useEffect(() => {
  if (!sesionActual?.id) return

  const channel = supabase
    .channel(`asistencias-${sesionActual.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'asistencias',
        filter: `sesion_id=eq.${sesionActual.id}`
      },
      async () => {
        await cargarAsistencias()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [sesionActual?.id])

  const cargarSesiones = async () => {
    setMensaje('')

    let query = supabase
      .from('sesiones')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false })

    if (perfil?.rol === 'DOCENTE') {
      query = query.eq('docente_id', perfil.docente_id)
    }

    const { data, error } = await query

    if (error) {
      setMensaje(`Error al cargar sesiones: ${error.message}`)
      return
    }

    setSesiones(data || [])
  }

  const obtenerUnidad = (sesion) => sesion?.unidad || 'Sin unidad'

  const obtenerTipoSesion = (sesion) =>
    sesion?.tipo_sesion || sesion?.tipo || ''

  const obtenerCodigo = (item) =>
    item?.codigo || item?.codigo_estudiante || ''

  const obtenerNombre = (item) =>
    item?.estudiante ||
    item?.apellidos_nombres ||
    item?.nombre_completo ||
    ''

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

  const cargarAsistencias = async () => {
    setCargandoLista(true)
    setMensaje('')

    const sesion = sesiones.find(
      item => item.id.toString() === sesionId
    )

    if (!sesion) {
      setSesionActual(null)
      setAsistencias([])
      setCargandoLista(false)
      return
    }

    setSesionActual(sesion)

    const tipoSesion = obtenerTipoSesion(sesion).toUpperCase()
    const grupoSesion = normalizarGrupo(sesion.grupo)

    const { data: estudiantesData, error: errorEstudiantes } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('asignatura_id', sesion.asignatura_id)
      .order('nombre_completo', { ascending: true })

    if (errorEstudiantes) {
      setMensaje(`Error al cargar estudiantes: ${errorEstudiantes.message}`)
      setCargandoLista(false)
      return
    }

    let estudiantesSesion = estudiantesData || []

    if (tipoSesion !== 'TEORIA' && tipoSesion !== 'TEORÍA') {
      estudiantesSesion = estudiantesSesion.filter(
        est => normalizarGrupo(est.grupo) === grupoSesion
      )
    }

    const { data: asistenciasData, error: errorAsistencias } = await supabase
      .from('asistencias')
      .select('*')
      .eq('sesion_id', sesion.id)
      .order('estudiante', { ascending: true })

    if (errorAsistencias) {
      setMensaje(`Error al cargar asistencias: ${errorAsistencias.message}`)
      setCargandoLista(false)
      return
    }

    const asistenciasExistentes = asistenciasData || []

    const codigosExistentes = new Set(
      asistenciasExistentes.map(a =>
        obtenerCodigo(a).toString()
      )
    )

    const faltantes = estudiantesSesion.filter(est =>
      !codigosExistentes.has(est.codigo?.toString())
    )

    if (faltantes.length > 0) {
      const nuevosRegistros = faltantes.map(est => ({
        sesion_id: sesion.id,
        codigo: est.codigo,
        estudiante: est.nombre_completo,
        grupo: est.grupo,
        asignatura_id: est.asignatura_id,
        asignatura_nombre: est.asignatura_nombre,
        estado: 'Falta',
        metodo: 'DOCENTE'
      }))

      const { error: errorInsert } = await supabase
        .from('asistencias')
        .insert(nuevosRegistros)

      if (errorInsert) {
        setMensaje(`Error al preparar lista de asistencia: ${errorInsert.message}`)
        setCargandoLista(false)
        return
      }
    }

    const { data: asistenciasFinales, error: errorFinal } = await supabase
      .from('asistencias')
      .select('*')
      .eq('sesion_id', sesion.id)
      .order('estudiante', { ascending: true })

    if (errorFinal) {
      setMensaje(`Error al cargar lista final: ${errorFinal.message}`)
      setCargandoLista(false)
      return
    }

    setAsistencias(asistenciasFinales || [])
    setCargandoLista(false)
  }

  const actualizarEstado = async (id, nuevoEstado) => {
    setGuardando(true)
    setMensaje('')

    const { error } = await supabase
      .from('asistencias')
      .update({
        estado: nuevoEstado,
        metodo: 'DOCENTE'
      })
      .eq('id', id)

    setGuardando(false)

    if (error) {
      setMensaje(`Error al actualizar asistencia: ${error.message}`)
      return
    }

    setAsistencias(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              estado: nuevoEstado,
              metodo: 'DOCENTE'
            }
          : item
      )
    )
  }

  const marcarTodos = async (nuevoEstado) => {
    if (!sesionActual) return

    if (asistencias.length === 0) {
      setMensaje('No hay estudiantes para marcar.')
      return
    }

    const confirmar = window.confirm(
      `¿Marcar todos como ${nuevoEstado}?`
    )

    if (!confirmar) return

    const ids = asistencias.map(a => a.id)

    setGuardando(true)
    setMensaje('')

    const { error } = await supabase
      .from('asistencias')
      .update({
        estado: nuevoEstado,
        metodo: 'DOCENTE'
      })
      .in('id', ids)

    setGuardando(false)

    if (error) {
      setMensaje(`Error al marcar todos: ${error.message}`)
      return
    }

    setAsistencias(prev =>
      prev.map(item => ({
        ...item,
        estado: nuevoEstado,
        metodo: 'DOCENTE'
      }))
    )

    setMensaje(`Todos fueron marcados como ${nuevoEstado}.`)
  }

  const generarQR = () => {
    if (!sesionActual) {
      setMensaje('Seleccione una sesión.')
      return
    }

    if (sesionActual.estado !== 'Abierta') {
      setMensaje('La sesión está cerrada.')
      return
    }

    const expira = Date.now() + 10 * 60 * 1000

    const url =
      `${window.location.origin}/marcar-asistencia?sesionId=${sesionActual.id}&expira=${expira}`

    setDatosQR(url)
    setExpiraQR(expira)
    setMostrarQR(true)
  }

  const cerrarSesion = async () => {
    if (!sesionActual) return

    const confirmar = window.confirm(
      '¿Cerrar esta sesión de asistencia?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('sesiones')
      .update({
        estado: 'Cerrada'
      })
      .eq('id', sesionActual.id)

    if (error) {
      setMensaje(`Error al cerrar sesión: ${error.message}`)
      return
    }

    setSesionActual(prev => ({
      ...prev,
      estado: 'Cerrada'
    }))

    setSesiones(prev =>
      prev.map(item =>
        item.id === sesionActual.id
          ? {
              ...item,
              estado: 'Cerrada'
            }
          : item
      )
    )

    setMostrarQR(false)
    setMensaje('Sesión cerrada correctamente.')
  }

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter(sesion => {
      if (unidadFiltro && obtenerUnidad(sesion) !== unidadFiltro) return false
      if (estadoFiltro && sesion.estado !== estadoFiltro) return false
      return true
    })
  }, [sesiones, unidadFiltro, estadoFiltro])

  const resumen = useMemo(() => {
    return {
      esperados: asistencias.length,
      qr: asistencias.filter(a => a.metodo === 'QR').length,
      presentes: asistencias.filter(a => a.estado === 'Presente').length,
      faltas: asistencias.filter(a => a.estado === 'Falta').length,
      tardanzas: asistencias.filter(a => a.estado === 'Tardanza').length,
      justificados: asistencias.filter(a => a.estado === 'Justificado').length
    }
  }, [asistencias])

  const esError = mensaje.includes('Error')

  return (
    <div style={page}>
      <style>
        {`
          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }

            .filtros-grid {
              grid-template-columns: 1fr !important;
            }

            .tabla-asistencia {
              min-width: 620px !important;
            }
          }
        `}
      </style>

      <h2 style={title}>
        Control de Asistencia
      </h2>

      {mensaje && (
        <div
          style={{
            ...alert,
            background: esError ? '#fee2e2' : '#dcfce7',
            color: esError ? '#991b1b' : '#166534'
          }}
        >
          {mensaje}
        </div>
      )}

      <div style={card}>
        <div className="filtros-grid" style={filtrosGrid}>
          <select
            style={input}
            value={unidadFiltro}
            onChange={(e) => {
              setUnidadFiltro(e.target.value)
              setSesionId('')
            }}
          >
            <option value="">Todas las unidades</option>
            <option value="Unidad I">Unidad I</option>
            <option value="Unidad II">Unidad II</option>
            <option value="Unidad III">Unidad III</option>
          </select>

          <select
            style={input}
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value)
              setSesionId('')
            }}
          >
            <option value="">Todas</option>
            <option value="Abierta">Abiertas</option>
            <option value="Cerrada">Cerradas</option>
          </select>
        </div>

        <select
          style={{
            ...input,
            marginTop: '12px'
          }}
          value={sesionId}
          onChange={(e) =>
            setSesionId(e.target.value)
          }
        >
          <option value="">
            Seleccione sesión...
          </option>

          {sesionesFiltradas.map(sesion => (
            <option
              key={sesion.id}
              value={sesion.id}
            >
              {obtenerUnidad(sesion)} | {sesion.fecha} | {sesion.estado} | {sesion.asignatura_nombre} | {sesion.grupo}
            </option>
          ))}
        </select>
      </div>

      {sesionActual && (
        <>
          <div style={detalleSesion}>
            <p><strong>Docente:</strong> {sesionActual.docente || 'No registrado'}</p>
            <p><strong>Asignatura:</strong> {sesionActual.asignatura_nombre || 'No registrada'}</p>
            <p><strong>Fecha:</strong> {sesionActual.fecha || '-'}</p>
            <p><strong>Estado:</strong> {sesionActual.estado || '-'}</p>
            <p><strong>Tipo:</strong> {obtenerTipoSesion(sesionActual) || '-'}</p>
            <p><strong>Grupo:</strong> {sesionActual.grupo || '-'}</p>
            <p>
              <strong>Horario:</strong> {sesionActual.hora_inicio || '--'} - {sesionActual.hora_fin || sesionActual.hora_cierre || '--'}
            </p>
          </div>

          <div className="stats-grid" style={statsGrid}>
            <ResumenCard titulo="Esperados" valor={resumen.esperados} fondo="#f8fafc" />
            <ResumenCard titulo="Marcados QR" valor={resumen.qr} fondo="#dcfce7" />
            <ResumenCard titulo="Justificados" valor={resumen.justificados} fondo="#f3e8ff" />
            <ResumenCard titulo="Presentes" valor={resumen.presentes} fondo="#dbeafe" />
            <ResumenCard titulo="Tardanzas" valor={resumen.tardanzas} fondo="#fef3c7" />
            <ResumenCard titulo="Faltas" valor={resumen.faltas} fondo="#fee2e2" />
          </div>

          <div style={card}>
            <div style={accionesSesion}>
              <button
                onClick={generarQR}
                disabled={sesionActual.estado !== 'Abierta'}
                style={{
                  ...botonQR,
                  opacity: sesionActual.estado !== 'Abierta' ? 0.5 : 1
                }}
              >
                Generar QR 10 min
              </button>

              <button
                onClick={cerrarSesion}
                disabled={sesionActual.estado !== 'Abierta'}
                style={{
                  ...botonCerrar,
                  opacity: sesionActual.estado !== 'Abierta' ? 0.5 : 1
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {mostrarQR && (
            <div style={qrContainer}>
              <QRCodeCanvas
                value={datosQR}
                size={240}
              />

              <p style={{
                marginTop: '10px',
                fontWeight: 'bold'
              }}>
                QR activo para registro de asistencia
              </p>

              <p style={{
                marginTop: '4px',
                color: '#dc2626',
                fontWeight: 'bold'
              }}>
                Expira: {new Date(expiraQR).toLocaleTimeString()}
              </p>
            </div>
          )}

          {cargandoLista ? (
            <div style={guardandoBox}>
              Preparando lista de estudiantes...
            </div>
          ) : (
            <div style={tableWrap}>
              <table
                className="tabla-asistencia"
                style={table}
              >
                <thead>
                  <tr>
                    <th style={thCodigo}>Código</th>
                    <th style={thNombre}>Estudiante</th>
                    <th style={thGrupo}>Grupo</th>
                    <th style={thEstado}>
                      Estado

                      <div style={todosBox}>
                        <button style={miniTodos} onClick={() => marcarTodos('Presente')}>P</button>
                        <button style={miniTodos} onClick={() => marcarTodos('Falta')}>F</button>
                        <button style={miniTodos} onClick={() => marcarTodos('Tardanza')}>T</button>
                        <button style={miniTodos} onClick={() => marcarTodos('Justificado')}>J</button>
                      </div>
                    </th>
                    <th style={thMetodo}>Modalidad</th>
                  </tr>
                </thead>

                <tbody>
                  {asistencias.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={tdVacio}>
                        No hay estudiantes para esta sesión.
                      </td>
                    </tr>
                  ) : (
                    asistencias.map(item => (
                      <tr key={item.id}>
                        <td style={tdCodigo}>
                          {obtenerCodigo(item)}
                        </td>

                        <td style={tdNombre}>
                          {obtenerNombre(item)}
                        </td>

                        <td style={tdGrupo}>
                          {item.grupo || '-'}
                        </td>

                        <td style={tdEstado}>
                          <select
                            value={item.estado}
                            style={estadoSelect}
                            onChange={(e) =>
                              actualizarEstado(
                                item.id,
                                e.target.value
                              )
                            }
                          >
                            <option value="Presente">Presente</option>
                            <option value="Falta">Falta</option>
                            <option value="Tardanza">Tardanza</option>
                            <option value="Justificado">Justificado</option>
                          </select>
                        </td>

                        <td style={tdMetodo}>
                          {item.metodo || 'DOCENTE'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {guardando && (
            <div style={guardandoBox}>
              Guardando cambios...
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResumenCard({
  titulo,
  valor,
  fondo
}) {
  return (
    <div style={{
      background: fondo,
      borderRadius: '12px',
      padding: '10px',
      border: '1px solid #cbd5e1',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {titulo}
      </div>

      <div style={{
        marginTop: '4px',
        fontSize: '22px',
        fontWeight: 'bold'
      }}>
        {valor}
      </div>
    </div>
  )
}

const page = {
  padding: '16px',
  fontFamily: 'Arial'
}

const title = {
  textAlign: 'center'
}

const alert = {
  padding: '10px',
  borderRadius: '10px',
  marginBottom: '12px',
  fontWeight: 'bold',
  textAlign: 'center'
}

const card = {
  background: 'white',
  padding: '14px',
  borderRadius: '14px',
  marginBottom: '14px',
  border: '1px solid #cbd5e1'
}

const filtrosGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
}

const input = {
  width: '100%',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box',
  color: '#0f172a',
  background: 'white'
}

const detalleSesion = {
  background: '#e0f2fe',
  border: '1px solid #bae6fd',
  borderRadius: '14px',
  padding: '12px',
  marginBottom: '14px',
  textAlign: 'center',
  color: '#334155',
  fontSize: '13px'
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '10px',
  marginBottom: '14px'
}

const accionesSesion = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap'
}

const botonQR = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '10px 14px',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const botonCerrar = {
  background: '#dc2626',
  color: 'white',
  border: 'none',
  padding: '10px 14px',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const qrContainer = {
  background: 'white',
  border: '1px solid #cbd5e1',
  borderRadius: '14px',
  padding: '20px',
  textAlign: 'center',
  marginBottom: '14px'
}

const tableWrap = {
  overflowX: 'auto',
  background: 'white',
  borderRadius: '14px',
  border: '1px solid #cbd5e1'
}

const table = {
  width: '100%',
  minWidth: '620px',
  borderCollapse: 'collapse',
  fontSize: '12px'
}

const thCodigo = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '82px'
}

const thNombre = {
  background: '#0f172a',
  color: 'white',
  padding: '8px'
}

const thGrupo = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '40px'
}

const thEstado = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '105px'
}

const thMetodo = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '70px'
}

const tdCodigo = {
  padding: '5px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0',
  whiteSpace: 'nowrap'
}

const tdNombre = {
  padding: '5px',
  borderBottom: '1px solid #e2e8f0'
}

const tdGrupo = {
  padding: '5px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0'
}

const tdEstado = {
  padding: '5px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0'
}

const tdMetodo = {
  padding: '5px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 'bold',
  fontSize: '10px'
}

const tdVacio = {
  padding: '14px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 'bold',
  color: '#475569'
}

const estadoSelect = {
  width: '100%',
  padding: '4px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  background: 'white',
  color: '#0f172a'
}

const todosBox = {
  display: 'flex',
  justifyContent: 'center',
  gap: '4px',
  marginTop: '5px'
}

const miniTodos = {
  border: 'none',
  borderRadius: '6px',
  padding: '2px 4px',
  fontSize: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const guardandoBox = {
  marginTop: '12px',
  background: '#dbeafe',
  padding: '10px',
  borderRadius: '10px',
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#1e3a8a'
}

export default TomarAsistencia