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
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(false)

  const [mostrarQR, setMostrarQR] = useState(false)
  const [datosQR, setDatosQR] = useState('')
  const [expiraQR, setExpiraQR] = useState(null)

  useEffect(() => {
    if (perfil) {
      cargarSesiones()
    }
  }, [perfil])

  useEffect(() => {
    if (sesionId) {
      cargarAsistencias()
    } else {
      setSesionActual(null)
      setAsistencias([])
    }
  }, [sesionId])

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

  const obtenerUnidad = (sesion) => {
    return sesion?.unidad || 'Sin unidad'
  }

  const obtenerTipoSesion = (sesion) => {
    return sesion?.tipo_sesion || sesion?.tipo || ''
  }

  const obtenerCodigo = (item) => {
    return item?.codigo || item?.codigo_estudiante || ''
  }

  const obtenerNombre = (item) => {
    return item?.estudiante || item?.apellidos_nombres || item?.nombre_completo || ''
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

    let queryEstudiantes = supabase
      .from('estudiantes')
      .select('*')
      .eq('asignatura_id', sesion.asignatura_id)
      .order('nombre_completo', { ascending: true })

    const { data: estudiantesData, error: errorEstudiantes } = await queryEstudiantes

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

    const url = `${window.location.origin}/marcar-asistencia?sesionId=${sesionActual.id}&expira=${expira}`

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

  const unidadesDisponibles = [
    'Unidad I',
    'Unidad II',
    'Unidad III'
  ]

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter(sesion => {
      if (
        unidadFiltro &&
        obtenerUnidad(sesion) !== unidadFiltro
      ) {
        return false
      }

      if (
        estadoFiltro &&
        sesion.estado !== estadoFiltro
      ) {
        return false
      }

      return true
    })
  }, [sesiones, unidadFiltro, estadoFiltro])

  const asistenciasFiltradas = useMemo(() => {
    return asistencias.filter((item) => {
      const texto = busqueda.toLowerCase()

      return (
        obtenerNombre(item).toLowerCase().includes(texto) ||
        obtenerCodigo(item).toString().toLowerCase().includes(texto)
      )
    })
  }, [asistencias, busqueda])

  const resumen = useMemo(() => {
    return {
      presentes: asistencias.filter(a => a.estado === 'Presente').length,
      faltas: asistencias.filter(a => a.estado === 'Falta').length,
      tardanzas: asistencias.filter(a => a.estado === 'Tardanza').length,
      justificados: asistencias.filter(a => a.estado === 'Justificado').length
    }
  }, [asistencias])

  const esError =
    mensaje.includes('Error')

  return (
    <div style={page}>
      <style>
        {`
          @media (max-width: 768px) {
            .filtros-grid {
              grid-template-columns: 1fr !important;
            }

            .stats-grid {
              grid-template-columns: 1fr 1fr !important;
            }

            .fila-estudiante {
              flex-direction: column !important;
              align-items: stretch !important;
            }

            .botones-estado {
              width: 100%;
              justify-content: space-between;
            }
          }
        `}
      </style>

      <h2 style={title}>
        Control de asistencia
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
        <h3 style={subtitle}>
          Filtros de sesiones
        </h3>

        <div className="filtros-grid" style={filtrosGrid}>
          <div>
            <label style={label}>
              Unidad
            </label>

            <select
              style={input}
              value={unidadFiltro}
              onChange={(e) => {
                setUnidadFiltro(e.target.value)
                setSesionId('')
              }}
            >
              <option value="">
                Todas las unidades
              </option>

              {unidadesDisponibles.map(unidad => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>
              Estado de sesión
            </label>

            <select
              style={input}
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value)
                setSesionId('')
              }}
            >
              <option value="">
                Todas
              </option>

              <option value="Abierta">
                Abiertas
              </option>

              <option value="Cerrada">
                Cerradas
              </option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <label style={label}>
            Seleccione sesión
          </label>

          <select
            style={input}
            value={sesionId}
            onChange={(e) => setSesionId(e.target.value)}
          >
            <option value="">
              Seleccione sesión...
            </option>

            {sesionesFiltradas.map((sesion) => (
              <option
                key={sesion.id}
                value={sesion.id}
              >
                {obtenerUnidad(sesion)} | {sesion.fecha} | {sesion.estado} | {sesion.asignatura_nombre} | {sesion.grupo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {sesionActual && (
        <>
          <div className="stats-grid" style={statsGrid}>
            <ResumenCard titulo="Presentes" valor={resumen.presentes} fondo="#dcfce7" />
            <ResumenCard titulo="Faltas" valor={resumen.faltas} fondo="#fee2e2" />
            <ResumenCard titulo="Tardanzas" valor={resumen.tardanzas} fondo="#fef3c7" />
            <ResumenCard titulo="Justificados" valor={resumen.justificados} fondo="#dbeafe" />
          </div>

          <div style={card}>
            <div style={detalleHeader}>
              <div>
                <strong>
                  {sesionActual.asignatura_nombre}
                </strong>

                <p style={detalleTexto}>
                  {obtenerUnidad(sesionActual)} | {sesionActual.fecha} | {sesionActual.grupo}
                </p>
              </div>

              <span style={{
                ...estadoBadge,
                background:
                  sesionActual.estado === 'Abierta'
                    ? '#dcfce7'
                    : '#fee2e2',

                color:
                  sesionActual.estado === 'Abierta'
                    ? '#166534'
                    : '#991b1b'
              }}>
                {sesionActual.estado}
              </span>
            </div>

            <div style={accionesSesion}>
              <button
                onClick={generarQR}
                disabled={sesionActual.estado !== 'Abierta'}
                style={{
                  ...botonQR,
                  opacity: sesionActual.estado !== 'Abierta' ? 0.5 : 1
                }}
              >
                Generar QR (10 min)
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

            <input
              type="text"
              style={input}
              placeholder="Buscar estudiante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {mostrarQR && datosQR && (
            <div style={qrContainer}>
              <QRCodeCanvas
                value={datosQR}
                size={260}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />

              <p style={{
                marginTop: '14px',
                fontWeight: 'bold'
              }}>
                QR activo para registro de asistencia
              </p>

              <p style={{
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
            <div style={listaContainer}>
              {asistenciasFiltradas.length === 0 ? (
                <div style={emptyBox}>
                  No hay estudiantes para esta sesión.
                </div>
              ) : (
                asistenciasFiltradas.map((item) => (
                  <div
                    key={item.id}
                    className="fila-estudiante"
                    style={fila}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>
                        {obtenerNombre(item)}
                      </strong>

                      <p style={codigo}>
                        Código: {obtenerCodigo(item)}
                        {' | '}
                        Grupo: {item.grupo || '-'}
                        {' | '}
                        Modalidad: {item.metodo || 'DOCENTE'}
                      </p>
                    </div>

                    <div
                      className="botones-estado"
                      style={botonesEstado}
                    >
                      <BotonEstado
                        activo={item.estado === 'Presente'}
                        texto="P"
                        color="#16a34a"
                        onClick={() =>
                          actualizarEstado(item.id, 'Presente')
                        }
                      />

                      <BotonEstado
                        activo={item.estado === 'Falta'}
                        texto="F"
                        color="#dc2626"
                        onClick={() =>
                          actualizarEstado(item.id, 'Falta')
                        }
                      />

                      <BotonEstado
                        activo={item.estado === 'Tardanza'}
                        texto="T"
                        color="#d97706"
                        onClick={() =>
                          actualizarEstado(item.id, 'Tardanza')
                        }
                      />

                      <BotonEstado
                        activo={item.estado === 'Justificado'}
                        texto="J"
                        color="#2563eb"
                        onClick={() =>
                          actualizarEstado(item.id, 'Justificado')
                        }
                      />
                    </div>
                  </div>
                ))
              )}
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

function ResumenCard({ titulo, valor, fondo }) {
  return (
    <div style={{
      background: fondo,
      borderRadius: '12px',
      padding: '12px',
      textAlign: 'center',
      border: '1px solid #cbd5e1'
    }}>
      <strong>{titulo}</strong>

      <p style={{
        margin: '8px 0 0',
        fontSize: '22px',
        fontWeight: 'bold'
      }}>
        {valor}
      </p>
    </div>
  )
}

function BotonEstado({
  texto,
  color,
  activo,
  onClick
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        border: 'none',
        fontWeight: 'bold',
        cursor: 'pointer',
        background: activo ? color : '#e2e8f0',
        color: activo ? 'white' : '#334155'
      }}
    >
      {texto}
    </button>
  )
}

const page = {
  padding: '18px 10px 30px',
  fontFamily: 'Arial'
}

const title = {
  textAlign: 'center',
  marginTop: 0
}

const subtitle = {
  marginTop: 0,
  textAlign: 'center'
}

const alert = {
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '14px',
  fontWeight: 'bold'
}

const card = {
  background: 'white',
  borderRadius: '14px',
  padding: '14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  marginBottom: '14px'
}

const filtrosGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px'
}

const label = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: 'bold',
  fontSize: '13px'
}

const input = {
  width: '100%',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  boxSizing: 'border-box'
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '10px',
  marginBottom: '14px'
}

const detalleHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '14px'
}

const detalleTexto = {
  margin: '4px 0 0',
  color: '#475569',
  fontSize: '13px'
}

const estadoBadge = {
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 'bold'
}

const accionesSesion = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '14px'
}

const botonQR = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '10px 16px',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const botonCerrar = {
  background: '#dc2626',
  color: 'white',
  border: 'none',
  padding: '10px 16px',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const qrContainer = {
  background: 'white',
  borderRadius: '16px',
  padding: '24px',
  textAlign: 'center',
  marginBottom: '16px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
}

const listaContainer = {
  display: 'grid',
  gap: '10px'
}

const fila = {
  background: 'white',
  borderRadius: '12px',
  padding: '12px',
  border: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px'
}

const codigo = {
  margin: '5px 0 0',
  color: '#64748b',
  fontSize: '12px'
}

const botonesEstado = {
  display: 'flex',
  gap: '8px'
}

const guardandoBox = {
  marginTop: '14px',
  background: '#e0f2fe',
  border: '1px solid #7dd3fc',
  borderRadius: '10px',
  padding: '10px',
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#0369a1'
}

const emptyBox = {
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '16px',
  textAlign: 'center',
  color: '#475569',
  fontWeight: 'bold'
}

export default TomarAsistencia