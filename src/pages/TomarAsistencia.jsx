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
    if (perfil) cargarSesiones()
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

  const obtenerUnidad = (sesion) =>
    sesion?.unidad || 'Sin unidad'

  const obtenerCodigo = (item) =>
    item?.codigo || item?.codigo_estudiante || ''

  const obtenerNombre = (item) =>
    item?.estudiante ||
    item?.apellidos_nombres ||
    item?.nombre_completo ||
    ''

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

    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('sesion_id', sesion.id)
      .order('estudiante', { ascending: true })

    if (error) {
      setMensaje(`Error al cargar asistencias: ${error.message}`)
      setCargandoLista(false)
      return
    }

    setAsistencias(data || [])
    setCargandoLista(false)
  }

  const actualizarEstado = async (id, nuevoEstado) => {
    setGuardando(true)

    const { error } = await supabase
      .from('asistencias')
      .update({
        estado: nuevoEstado,
        metodo: 'DOCENTE'
      })
      .eq('id', id)

    setGuardando(false)

    if (error) {
      setMensaje(`Error: ${error.message}`)
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
    const confirmar = window.confirm(
      `¿Marcar todos como ${nuevoEstado}?`
    )

    if (!confirmar) return

    const ids = asistencias.map(a => a.id)

    const { error } = await supabase
      .from('asistencias')
      .update({
        estado: nuevoEstado,
        metodo: 'DOCENTE'
      })
      .in('id', ids)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setAsistencias(prev =>
      prev.map(item => ({
        ...item,
        estado: nuevoEstado,
        metodo: 'DOCENTE'
      }))
    )
  }

  const generarQR = () => {
    if (!sesionActual) return

    const expira = Date.now() + 10 * 60 * 1000

    const url =
      `${window.location.origin}/marcar-asistencia?sesionId=${sesionActual.id}&expira=${expira}`

    setDatosQR(url)
    setExpiraQR(expira)
    setMostrarQR(true)
  }

  const cerrarSesion = async () => {
    const confirmar = window.confirm(
      '¿Cerrar sesión de asistencia?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('sesiones')
      .update({
        estado: 'Cerrada'
      })
      .eq('id', sesionActual.id)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    setSesionActual(prev => ({
      ...prev,
      estado: 'Cerrada'
    }))

    setMostrarQR(false)
  }

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter(sesion => {
      if (
        unidadFiltro &&
        obtenerUnidad(sesion) !== unidadFiltro
      ) return false

      if (
        estadoFiltro &&
        sesion.estado !== estadoFiltro
      ) return false

      return true
    })
  }, [sesiones, unidadFiltro, estadoFiltro])

  const asistenciasFiltradas = useMemo(() => {
    return asistencias.filter(item => {
      const texto = busqueda.toLowerCase()

      return (
        obtenerNombre(item)
          .toLowerCase()
          .includes(texto) ||

        obtenerCodigo(item)
          .toString()
          .toLowerCase()
          .includes(texto)
      )
    })
  }, [asistencias, busqueda])

  const resumen = useMemo(() => {
    return {
      esperados: asistencias.length,

      qr: asistencias.filter(
        a => a.metodo === 'QR'
      ).length,

      presentes: asistencias.filter(
        a => a.estado === 'Presente'
      ).length,

      faltas: asistencias.filter(
        a => a.estado === 'Falta'
      ).length,

      tardanzas: asistencias.filter(
        a => a.estado === 'Tardanza'
      ).length,

      justificados: asistencias.filter(
        a => a.estado === 'Justificado'
      ).length
    }
  }, [asistencias])

  return (
    <div style={page}>
      <style>
        {`
          @media (max-width: 768px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }

            .tabla-asistencia {
              min-width: 640px !important;
            }
          }
        `}
      </style>

      <h2 style={title}>
        Control de Asistencia
      </h2>

      {mensaje && (
        <div style={alert}>
          {mensaje}
        </div>
      )}

      <div style={card}>
        <div style={filtrosGrid}>
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

            <option value="Unidad I">
              Unidad I
            </option>

            <option value="Unidad II">
              Unidad II
            </option>

            <option value="Unidad III">
              Unidad III
            </option>
          </select>

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
              {obtenerUnidad(sesion)} |
              {sesion.fecha} |
              {sesion.estado} |
              {sesion.asignatura_nombre} |
              {sesion.grupo}
            </option>
          ))}
        </select>
      </div>

      {sesionActual && (
        <>
          <div className="stats-grid" style={statsGrid}>
            <ResumenCard
              titulo="Esperados"
              valor={resumen.esperados}
              fondo="#f8fafc"
            />

            <ResumenCard
              titulo="Marcados QR"
              valor={resumen.qr}
              fondo="#dcfce7"
            />

            <ResumenCard
              titulo="Justificados"
              valor={resumen.justificados}
              fondo="#f3e8ff"
            />

            <ResumenCard
              titulo="Presentes"
              valor={resumen.presentes}
              fondo="#dbeafe"
            />

            <ResumenCard
              titulo="Tardanzas"
              valor={resumen.tardanzas}
              fondo="#fef3c7"
            />

            <ResumenCard
              titulo="Faltas"
              valor={resumen.faltas}
              fondo="#fee2e2"
            />
          </div>

          <div style={card}>
            <div style={accionesSesion}>
              <button
                onClick={generarQR}
                style={botonQR}
              >
                Generar QR 10 min
              </button>

              <button
                onClick={cerrarSesion}
                style={botonCerrar}
              >
                Cerrar sesión
              </button>
            </div>

            <input
              type="text"
              style={input}
              placeholder="Buscar estudiante..."
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
            />
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
                Expira:
                {' '}
                {new Date(expiraQR)
                  .toLocaleTimeString()}
              </p>
            </div>
          )}

          <div style={tableWrap}>
            <table
              className="tabla-asistencia"
              style={table}
            >
              <thead>
                <tr>
                  <th style={thCodigo}>
                    Código
                  </th>

                  <th style={thNombre}>
                    Estudiante
                  </th>

                  <th style={thGrupo}>
                    Grupo
                  </th>

                  <th style={thEstado}>
                    Estado

                    <div style={todosBox}>
                      <button
                        style={miniTodos}
                        onClick={() =>
                          marcarTodos('Presente')
                        }
                      >
                        P
                      </button>

                      <button
                        style={miniTodos}
                        onClick={() =>
                          marcarTodos('Falta')
                        }
                      >
                        F
                      </button>

                      <button
                        style={miniTodos}
                        onClick={() =>
                          marcarTodos('Tardanza')
                        }
                      >
                        T
                      </button>

                      <button
                        style={miniTodos}
                        onClick={() =>
                          marcarTodos('Justificado')
                        }
                      >
                        J
                      </button>
                    </div>
                  </th>

                  <th style={thMetodo}>
                    Modalidad
                  </th>
                </tr>
              </thead>

              <tbody>
                {asistenciasFiltradas.map(item => (
                  <tr key={item.id}>
                    <td style={tdCodigo}>
                      {obtenerCodigo(item)}
                    </td>

                    <td style={tdNombre}>
                      {obtenerNombre(item)}
                    </td>

                    <td style={tdGrupo}>
                      {item.grupo}
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
                        <option value="Presente">
                          Presente
                        </option>

                        <option value="Falta">
                          Falta
                        </option>

                        <option value="Tardanza">
                          Tardanza
                        </option>

                        <option value="Justificado">
                          Justificado
                        </option>
                      </select>
                    </td>

                    <td style={tdMetodo}>
                      {item.metodo || 'DOCENTE'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
  padding: '16px'
}

const title = {
  textAlign: 'center'
}

const alert = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '10px',
  borderRadius: '10px',
  marginBottom: '12px',
  fontWeight: 'bold'
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
  flexWrap: 'wrap',
  marginBottom: '12px'
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
  minWidth: '640px',
  borderCollapse: 'collapse',
  fontSize: '12px'
}

const thCodigo = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '90px'
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
  width: '45px'
}

const thEstado = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '120px'
}

const thMetodo = {
  background: '#0f172a',
  color: 'white',
  padding: '8px',
  width: '80px'
}

const tdCodigo = {
  padding: '6px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0'
}

const tdNombre = {
  padding: '6px',
  borderBottom: '1px solid #e2e8f0'
}

const tdGrupo = {
  padding: '6px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0'
}

const tdEstado = {
  padding: '6px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0'
}

const tdMetodo = {
  padding: '6px',
  textAlign: 'center',
  borderBottom: '1px solid #e2e8f0',
  fontWeight: 'bold',
  fontSize: '11px'
}

const estadoSelect = {
  width: '100%',
  padding: '4px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '11px'
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
  fontWeight: 'bold'
}

export default TomarAsistencia