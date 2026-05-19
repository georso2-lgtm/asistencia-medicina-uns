import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function NuevaSesion() {
  const { perfil } = useAuth()

  const [asignaturas, setAsignaturas] = useState([])
  const [gruposDisponibles, setGruposDisponibles] = useState([])
  const [docenteNombre, setDocenteNombre] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [formulario, setFormulario] = useState({
    asignatura_id: '',
    asignatura_nombre: '',
    tipo_sesion: 'TEORIA',
    grupo: 'GRUPO UNICO',
    unidad: 'Unidad I',
    tema: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: ''
  })

  useEffect(() => {
    if (perfil?.docente_id) {
      cargarDatosIniciales()
    }
  }, [perfil])

  useEffect(() => {
    if (formulario.asignatura_id) {
      cargarGruposDesdeEstudiantes(formulario.asignatura_id)
    }
  }, [formulario.asignatura_id])

  const cargarDatosIniciales = async () => {
    const { data: docenteData } = await supabase
      .from('docentes')
      .select('*')
      .eq('id', perfil.docente_id)
      .maybeSingle()

    setDocenteNombre(docenteData?.nombre || perfil?.nombre || '')

    const { data, error } = await supabase
      .from('docente_asignatura')
      .select(`
        asignaturas (
          id,
          nombre,
          ciclo,
          estado
        )
      `)
      .eq('docente_id', perfil.docente_id)

    if (error) {
      setMensaje(`Error al cargar asignaturas: ${error.message}`)
      return
    }

    const lista = (data || [])
      .map(item => item.asignaturas)
      .filter(item => item && item.estado === 'Activo')

    setAsignaturas(lista)

    if (lista.length > 0) {
      setFormulario(prev => ({
        ...prev,
        asignatura_id: lista[0].id,
        asignatura_nombre: lista[0].nombre
      }))
    }
  }

  const cargarGruposDesdeEstudiantes = async (asignaturaId) => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('grupo')
      .eq('asignatura_id', Number(asignaturaId))

    if (error) {
      setMensaje(`Error al cargar grupos: ${error.message}`)
      return
    }

    const grupos = [
      ...new Set(
        (data || [])
          .map(item => item.grupo)
          .filter(Boolean)
          .map(item => item.toString().trim().toUpperCase())
      )
    ].sort()

    setGruposDisponibles(grupos)
  }

  const manejarCambio = (e) => {
    const { name, value } = e.target

    if (name === 'asignatura_id') {
      const asignaturaSeleccionada = asignaturas.find(
        item => item.id.toString() === value.toString()
      )

      setFormulario(prev => ({
        ...prev,
        asignatura_id: value,
        asignatura_nombre: asignaturaSeleccionada?.nombre || '',
        grupo: prev.tipo_sesion === 'TEORIA' ? 'GRUPO UNICO' : ''
      }))

      return
    }

    if (name === 'tipo_sesion') {
      setFormulario(prev => ({
        ...prev,
        tipo_sesion: value,
        grupo: value === 'TEORIA' ? 'GRUPO UNICO' : ''
      }))

      return
    }

    setFormulario(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const guardarSesion = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!perfil?.docente_id) {
      setMensaje('Usuario no vinculado a docente institucional.')
      return
    }

    if (!formulario.asignatura_id) {
      setMensaje('Seleccione asignatura.')
      return
    }

    if (!formulario.tema.trim()) {
      setMensaje('Ingrese el tema de la sesión.')
      return
    }

    if (!formulario.fecha) {
      setMensaje('Seleccione fecha.')
      return
    }

    if (!formulario.hora_inicio || !formulario.hora_fin) {
      setMensaje('Ingrese hora de inicio y hora de fin.')
      return
    }

    if (formulario.tipo_sesion !== 'TEORIA' && !formulario.grupo) {
      setMensaje('Seleccione grupo.')
      return
    }

    setGuardando(true)

    const grupoFinal =
      formulario.tipo_sesion === 'TEORIA'
        ? 'GRUPO UNICO'
        : formulario.grupo

    const nuevaSesion = {
      docente_id: perfil.docente_id,
      docente: docenteNombre,
      asignatura_id: Number(formulario.asignatura_id),
      asignatura_nombre: formulario.asignatura_nombre,
      tipo_sesion: formulario.tipo_sesion,
      tipo: formulario.tipo_sesion,
      grupo: grupoFinal,
      unidad: formulario.unidad,
      tema: formulario.tema.trim(),
      fecha: formulario.fecha,
      hora_inicio: formulario.hora_inicio,
      hora_fin: formulario.hora_fin,
      hora_cierre: formulario.hora_fin,
      estado: 'Abierta'
    }

    const { error } = await supabase
      .from('sesiones')
      .insert([nuevaSesion])

    setGuardando(false)

    if (error) {
      setMensaje(`Error al guardar sesión: ${error.message}`)
      return
    }

    setMensaje('Sesión creada correctamente.')

    setFormulario(prev => ({
      ...prev,
      tipo_sesion: 'TEORIA',
      grupo: 'GRUPO UNICO',
      unidad: 'Unidad I',
      tema: '',
      hora_inicio: '',
      hora_fin: ''
    }))
  }

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('Seleccione') ||
    mensaje.includes('Ingrese') ||
    mensaje.includes('Usuario')

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={title}>Nueva sesión académica</h2>

        
           <form onSubmit={guardarSesion} style={form}>
          <div>
            <label style={label}>Docente responsable</label>
            <input
              style={{ ...input, background: '#e2e8f0', fontWeight: 'bold' }}
              value={docenteNombre || 'Docente no vinculado'}
              disabled
            />
          </div>

          <div>
            <label style={label}>Asignatura</label>
            <select
              name="asignatura_id"
              value={formulario.asignatura_id}
              onChange={manejarCambio}
              style={input}
            >
              <option value="">Seleccione asignatura</option>
              {asignaturas.map(item => (
                <option key={item.id} value={item.id}>
                  {item.nombre} {item.ciclo ? `- ${item.ciclo}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Unidad</label>
            <select
              name="unidad"
              value={formulario.unidad}
              onChange={manejarCambio}
              style={input}
            >
              <option>Unidad I</option>
              <option>Unidad II</option>
              <option>Unidad III</option>
              <option>Unidad IV</option>
            </select>
          </div>

          <div>
            <label style={label}>Tipo de sesión</label>
            <select
              name="tipo_sesion"
              value={formulario.tipo_sesion}
              onChange={manejarCambio}
              style={input}
            >
              <option value="TEORIA">TEORÍA</option>
              <option value="PRACTICA">PRÁCTICA </option>
              <option value="LABORATORIO">PRÁCTICA EN LABORATORIO</option>
              <option value="SEMINARIO">PRÁCTICA DE SEMINARIO</option>
              <option value="DISCUCION DE CASO">PRÁCTICA DISCUCION DE CASO</option>
            </select>
          </div>

          {formulario.tipo_sesion !== 'TEORIA' && (
            <div>
              <label style={label}>Grupo</label>
              <select
                name="grupo"
                value={formulario.grupo}
                onChange={manejarCambio}
                style={input}
              >
                <option value="">Seleccione grupo</option>
                {gruposDisponibles.map(grupo => (
                  <option key={grupo} value={grupo}>
                    Grupo {grupo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={label}>Tema</label>
            <input
              name="tema"
              value={formulario.tema}
              onChange={manejarCambio}
              placeholder="Ejemplo: Osteología del miembro superior"
              style={input}
            />
          </div>

          <div>
            <label style={label}>Fecha</label>
            <input
              type="date"
              name="fecha"
              value={formulario.fecha}
              onChange={manejarCambio}
              style={input}
            />
          </div>

          <div style={grid2}>
            <div>
              <label style={label}>Hora inicio</label>
              <input
                type="time"
                name="hora_inicio"
                value={formulario.hora_inicio}
                onChange={manejarCambio}
                style={input}
              />
            </div>

            <div>
              <label style={label}>Hora fin</label>
              <input
                type="time"
                name="hora_fin"
                value={formulario.hora_fin}
                onChange={manejarCambio}
                style={input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            style={{
              ...button,
              opacity: guardando ? 0.7 : 1
            }}
          >
            {guardando ? 'Guardando...' : 'Crear sesión'}
          </button>

          {mensaje && (
          <div style={{
            ...alert,
            background: esError ? '#fee2e2' : '#dcfce7',
            color: esError ? '#991b1b' : '#166534'
          }}>
            {mensaje}
          </div>
        )}

        </form>
      </div>
    </div>
  )
}

const page = {
  padding: '85px 12px 30px',
  fontFamily: 'Arial',
  display: 'flex',
  justifyContent: 'center'
}

const card = {
  width: '100%',
  maxWidth: '720px',
  background: 'white',
  borderRadius: '18px',
  padding: '20px',
  boxShadow: '0 8px 22px rgba(0,0,0,0.08)',
  border: '1px solid #e2e8f0'
}

const title = {
  textAlign: 'center',
  color: '#0f172a'
}

const alert = {
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '14px',
  textAlign: 'center',
  fontWeight: 'bold'
}

const form = {
  display: 'grid',
  gap: '14px'
}

const label = {
  display: 'block',
  marginBottom: '6px',
  fontWeight: 'bold',
  color: '#334155'
}

const input = {
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  boxSizing: 'border-box'
}

const grid2 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px'
}

const button = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '14px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px'
}

export default NuevaSesion