import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function ListaSesiones() {
  const { perfil } = useAuth()

  const [sesiones, setSesiones] = useState([])
  const [sesionSeleccionada, setSesionSeleccionada] = useState('')
  const [unidadFiltro, setUnidadFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    if (perfil) {
      cargarSesiones()
    }
  }, [perfil])

  const cargarSesiones = async () => {
    setMensaje('')

    let query = supabase
      .from('sesiones')
      .select('*')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })

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

  const obtenerTipoSesion = (sesion) => {
    return sesion?.tipo_sesion || sesion?.tipo || 'No registrado'
  }

  const obtenerHoraFin = (sesion) => {
    return sesion?.hora_fin || sesion?.hora_cierre || '--'
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

  const sesionesFiltradas = sesiones.filter(sesion => {
    if (unidadFiltro && obtenerUnidad(sesion) !== unidadFiltro) {
      return false
    }

    if (estadoFiltro && sesion.estado !== estadoFiltro) {
      return false
    }

    return true
  })

  const sesionActual = sesiones.find(
    item => item.id.toString() === sesionSeleccionada
  )

  const puedeEliminar =
    perfil?.rol === 'COORDINADOR' ||
    perfil?.rol === 'ADMINISTRADOR'

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
    setSesionSeleccionada('')
    await cargarSesiones()
  }

  const eliminarSesion = async () => {
    if (!sesionActual) return

    if (!puedeEliminar) {
      setMensaje('No tiene permiso para eliminar sesiones.')
      return
    }

    const confirmar1 = window.confirm(
      '¿Está seguro de eliminar esta sesión? También se eliminarán sus registros de asistencia.'
    )

    if (!confirmar1) return

    const confirmar2 = window.confirm(
      `Confirmación final: se eliminará la sesión "${sesionActual.tema || 'sin tema'}" del ${sesionActual.fecha}. Esta acción no se puede deshacer.`
    )

    if (!confirmar2) return

    const { error: errorAsistencias } = await supabase
      .from('asistencias')
      .delete()
      .eq('sesion_id', sesionActual.id)

    if (errorAsistencias) {
      setMensaje(`Error al eliminar asistencias: ${errorAsistencias.message}`)
      return
    }

    const { error: errorSesion } = await supabase
      .from('sesiones')
      .delete()
      .eq('id', sesionActual.id)

    if (errorSesion) {
      setMensaje(`Error al eliminar sesión: ${errorSesion.message}`)
      return
    }

    setMensaje('Sesión y asistencias asociadas eliminadas correctamente.')
    setSesionSeleccionada('')
    await cargarSesiones()
  }

  const abiertas = sesiones.filter(s => s.estado === 'Abierta').length
  const cerradas = sesiones.filter(s => s.estado === 'Cerrada').length

  const abiertasFiltradas = sesionesFiltradas.filter(s => s.estado === 'Abierta').length
  const cerradasFiltradas = sesionesFiltradas.filter(s => s.estado === 'Cerrada').length

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('No puede') ||
    mensaje.includes('No tiene')

  return (
    <div style={page}>
      <style>
        {`
          @media (max-width: 768px) {
            .sesiones-filtros {
              grid-template-columns: 1fr !important;
            }

            .sesiones-stats {
              grid-template-columns: 1fr 1fr 1fr !important;
            }
          }

          select, input {
            color: #0f172a;
            background-color: #ffffff;
          }
        `}
      </style>

      <h2 style={{ marginTop: 0, textAlign: 'center' }}>
        {perfil?.rol === 'COORDINADOR' || perfil?.rol === 'ADMINISTRADOR'
          ? 'Sesiones registradas'
          : 'Mis sesiones'}
      </h2>

      {mensaje && (
        <div style={{
          ...alert,
          background: esError ? '#fee2e2' : '#dcfce7',
          color: esError ? '#991b1b' : '#166534'
        }}>
          {mensaje}
        </div>
      )}

      <div className="sesiones-stats" style={statsFila}>
        <Resumen titulo="Total" valor={sesiones.length} fondo="#e0f2fe" />
        <Resumen titulo="Abiertas" valor={abiertas} fondo="#dcfce7" />
        <Resumen titulo="Cerradas" valor={cerradas} fondo="#fee2e2" />
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>
          Filtros de búsqueda
        </h3>

        <div className="sesiones-filtros" style={filtrosGrid}>
          <div>
            <label style={label}>
              Unidad
            </label>

            <select
              value={unidadFiltro}
              onChange={(e) => {
                setUnidadFiltro(e.target.value)
                setSesionSeleccionada('')
              }}
              style={input}
            >
              <option value="">Todas las unidades</option>

              {unidadesDisponibles.map(unidad => (
                <option key={unidad} value={unidad}>
                  {unidad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>
              Estado
            </label>

            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value)
                setSesionSeleccionada('')
              }}
              style={input}
            >
              <option value="">Todos los estados</option>
              <option value="Abierta">Abiertas</option>
              <option value="Cerrada">Cerradas</option>
            </select>
          </div>
        </div>

        <div style={resumenFiltro}>
          Mostrando <strong>{sesionesFiltradas.length}</strong> sesiones:
          {' '}<strong>{abiertasFiltradas}</strong> abiertas /
          {' '}<strong>{cerradasFiltradas}</strong> cerradas
        </div>
      </div>

      <button onClick={cargarSesiones} style={botonAzul}>
        Actualizar sesiones
      </button>

      <div style={card}>
        <label style={label}>
          Seleccione sesión
        </label>

        <select
          value={sesionSeleccionada}
          onChange={(e) => {
            setSesionSeleccionada(e.target.value)
            setMensaje('')
          }}
          style={input}
        >
          <option value="">
            Seleccione una sesión...
          </option>

          {sesionesFiltradas.map((sesion) => (
            <option key={sesion.id} value={sesion.id}>
              {obtenerUnidad(sesion)} | {sesion.fecha} | {sesion.estado} | {sesion.docente || 'Sin docente'} | {sesion.asignatura_nombre || 'Sin asignatura'} | {obtenerTipoSesion(sesion)} | {sesion.grupo}
            </option>
          ))}
        </select>
      </div>

      {sesionActual && (
        <div style={card}>
          <div style={headerDetalle}>
            <strong>
              {sesionActual.asignatura_nombre || 'Sesión'}
            </strong>

            <span style={{
              background: sesionActual.estado === 'Abierta' ? '#dcfce7' : '#fee2e2',
              color: sesionActual.estado === 'Abierta' ? '#166534' : '#991b1b',
              padding: '5px 9px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {sesionActual.estado}
            </span>
          </div>

          <Info titulo="Docente" valor={sesionActual.docente || 'No registrado'} />
          <Info titulo="Fecha" valor={sesionActual.fecha || 'No registrada'} />
          <Info titulo="Unidad" valor={obtenerUnidad(sesionActual)} />
          <Info titulo="Tema" valor={sesionActual.tema || 'No registrado'} />
          <Info titulo="Tipo" valor={obtenerTipoSesion(sesionActual)} />
          <Info titulo="Grupo" valor={sesionActual.grupo || 'No registrado'} />
          <Info
            titulo="Horario"
            valor={`${sesionActual.hora_inicio || '--'} - ${obtenerHoraFin(sesionActual)}`}
          />

          {sesionActual.estado === 'Abierta' && (
            <button
              onClick={() => cambiarEstadoSesion('Cerrada')}
              style={botonRojo}
            >
              Cerrar sesión
            </button>
          )}

          {puedeEliminar && sesionActual.estado === 'Cerrada' && (
            <button
              onClick={() => cambiarEstadoSesion('Abierta')}
              style={botonVerde}
            >
              Reabrir sesión
            </button>
          )}

          {puedeEliminar && (
            <button
              onClick={eliminarSesion}
              style={botonEliminar}
            >
              Eliminar sesión y asistencias
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Resumen({ titulo, valor, fondo }) {
  return (
    <div style={{
      background: fondo,
      padding: '10px 8px',
      borderRadius: '10px',
      textAlign: 'center',
      border: '1px solid #cbd5e1'
    }}>
      <strong style={{ fontSize: '12px' }}>{titulo}</strong>
      <p style={{ fontSize: '22px', margin: '5px 0 0', fontWeight: 'bold' }}>
        {valor}
      </p>
    </div>
  )
}

function Info({ titulo, valor }) {
  return (
    <p style={{ margin: '7px 0', fontSize: '14px' }}>
      <strong>{titulo}:</strong> {valor}
    </p>
  )
}

const page = {
  padding: '18px 10px 24px',
  fontFamily: 'Arial'
}

const alert = {
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '14px',
  fontWeight: 'bold'
}

const statsFila = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '14px'
}

const filtrosGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
}

const resumenFiltro = {
  marginTop: '12px',
  padding: '9px',
  borderRadius: '10px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontSize: '13px',
  textAlign: 'center',
  color: '#334155'
}

const card = {
  background: 'white',
  borderRadius: '14px',
  padding: '14px',
  marginTop: '14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '8px',
  fontSize: '13px'
}

const input = {
  width: '100%',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  background: 'white',
  color: '#0f172a',
  boxSizing: 'border-box'
}

const headerDetalle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  alignItems: 'center',
  marginBottom: '10px'
}

const botonAzul = {
  padding: '10px 14px',
  background: '#0284c7',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginBottom: '8px'
}

const botonRojo = {
  marginTop: '12px',
  width: '100%',
  padding: '10px',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const botonVerde = {
  marginTop: '12px',
  width: '100%',
  padding: '10px',
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const botonEliminar = {
  marginTop: '12px',
  width: '100%',
  padding: '11px',
  background: '#7f1d1d',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

export default ListaSesiones