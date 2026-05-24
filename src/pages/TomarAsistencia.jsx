import { useEffect, useMemo, useState } from 'react'
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

  const cargarAsistencias = async () => {
    const sesion = sesiones.find(
      item => item.id.toString() === sesionId
    )

    setSesionActual(sesion || null)

    const { data, error } = await supabase
      .from('asistencias')
      .select('*')
      .eq('sesion_id', sesionId)
      .order('apellidos_nombres')

    if (error) {
      setMensaje(`Error al cargar asistencias: ${error.message}`)
      return
    }

    setAsistencias(data || [])
  }

  const obtenerUnidad = (sesion) => {
    return sesion?.unidad || 'Sin unidad'
  }

  const unidadesDisponibles = [
    ...new Set(
      sesiones
        .map(sesion => obtenerUnidad(sesion))
        .filter(Boolean)
    )
  ].sort()

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
        item.apellidos_nombres?.toLowerCase().includes(texto) ||
        item.codigo_estudiante?.toLowerCase().includes(texto)
      )
    })
  }, [asistencias, busqueda])

  const actualizarEstado = async (id, nuevoEstado) => {
    setGuardando(true)

    const { error } = await supabase
      .from('asistencias')
      .update({
        estado: nuevoEstado
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
          ? { ...item, estado: nuevoEstado }
          : item
      )
    )
  }

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

          select, input {
            color: #0f172a;
            background-color: white;
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
            <ResumenCard
              titulo="Presentes"
              valor={resumen.presentes}
              fondo="#dcfce7"
            />

            <ResumenCard
              titulo="Faltas"
              valor={resumen.faltas}
              fondo="#fee2e2"
            />

            <ResumenCard
              titulo="Tardanzas"
              valor={resumen.tardanzas}
              fondo="#fef3c7"
            />

            <ResumenCard
              titulo="Justificados"
              valor={resumen.justificados}
              fondo="#dbeafe"
            />
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

            <input
              type="text"
              style={input}
              placeholder="Buscar estudiante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div style={listaContainer}>
            {asistenciasFiltradas.map((item) => (
              <div
                key={item.id}
                className="fila-estudiante"
                style={fila}
              >
                <div style={{ flex: 1 }}>
                  <strong>
                    {item.apellidos_nombres}
                  </strong>

                  <p style={codigo}>
                    {item.codigo_estudiante}
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
            ))}
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
  boxSizing: 'border-box',
  color: '#0f172a',
  background: 'white'
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

export default TomarAsistencia