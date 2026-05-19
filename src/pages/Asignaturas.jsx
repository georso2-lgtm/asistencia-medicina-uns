import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function Asignaturas() {
  const [asignatura, setAsignatura] = useState({
    nombre: '',
    codigo: '',
    ciclo: '',
    escuela: 'Medicina Humana'
  })

  const [asignaturas, setAsignaturas] = useState([])
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarAsignaturas()
  }, [])

  const cargarAsignaturas = async () => {
    const { data, error } = await supabase
      .from('asignaturas')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      setMensaje(`Error al cargar asignaturas: ${error.message}`)
      return
    }

    setAsignaturas(data || [])
  }

  const guardarAsignatura = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!asignatura.nombre.trim()) {
      setMensaje('Ingrese el nombre de la asignatura.')
      return
    }

    const nuevaAsignatura = {
      nombre: asignatura.nombre.trim().toUpperCase(),
      codigo: asignatura.codigo.trim().toUpperCase(),
      ciclo: asignatura.ciclo.trim().toUpperCase(),
      escuela: asignatura.escuela.trim(),
      estado: 'Activo'
    }

    const { error } = await supabase
      .from('asignaturas')
      .insert([nuevaAsignatura])

    if (error) {
      setMensaje(`Error al guardar asignatura: ${error.message}`)
      return
    }

    setMensaje('Asignatura registrada correctamente.')

    setAsignatura({
      nombre: '',
      codigo: '',
      ciclo: '',
      escuela: 'Medicina Humana'
    })

    cargarAsignaturas()
  }

  const cambiarEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo'

    const { error } = await supabase
      .from('asignaturas')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      setMensaje(`Error al cambiar estado: ${error.message}`)
      return
    }

    cargarAsignaturas()
  }

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('Ingrese')

  return (
    <div style={{
      padding: '18px 12px 24px',
      fontFamily: 'Arial'
    }}>
      <h2>Asignaturas</h2>

      {mensaje && (
        <div style={{
          background: esError ? '#fee2e2' : '#dcfce7',
          color: esError ? '#991b1b' : '#166534',
          padding: '12px',
          borderRadius: '10px',
          marginBottom: '14px',
          fontWeight: 'bold'
        }}>
          {mensaje}
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '14px',
        padding: '14px',
        boxShadow: '0 4px 12px rgba(2, 47, 192, 0.65)',
        marginBottom: '18px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ marginTop: 0 }}>Registrar asignatura</h3>

        <form
          onSubmit={guardarAsignatura}
          style={{
            display: 'grid',
            gap: '12px'
          }}
        >
          <input
            type="text"
            placeholder="Nombre de la asignatura"
            value={asignatura.nombre}
            onChange={(e) =>
              setAsignatura({
                ...asignatura,
                nombre: e.target.value
              })
         }
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Código de asignatura"
            value={asignatura.codigo}
            onChange={(e) =>
              setAsignatura({
                ...asignatura,
                codigo: e.target.value
              })
            }
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Ciclo. Ejemplo: III ciclo"
            value={asignatura.ciclo}
            onChange={(e) =>
              setAsignatura({
                ...asignatura,
                ciclo: e.target.value
              })
            }
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Escuela"
            value={asignatura.escuela}
            onChange={(e) =>
              setAsignatura({
                ...asignatura,
                escuela: e.target.value
              })
            }
            style={inputStyle}
          />

          <button type="submit" style={primaryButton}>
            Guardar asignatura
          </button>
        </form>
      </div>

      <h3>Asignaturas registradas ({asignaturas.length})</h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {asignaturas.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 3px 8px rgba(0,0,0,0.05)'
            }}
          >
            <strong>{item.nombre}</strong>

            <p style={mutedText}>
              Código: {item.codigo || 'Sin código'} | Ciclo: {item.ciclo || 'No definido'}
            </p>

            <p style={mutedText}>
              Escuela: {item.escuela}
            </p>

            <div style={rowBetween}>
              <span style={{
                background: item.estado === 'Activo' ? '#dcfce7' : '#fee2e2',
                color: item.estado === 'Activo' ? '#166534' : '#991b1b',
                padding: '5px 9px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {item.estado}
              </span>

              <button
                onClick={() => cambiarEstado(item.id, item.estado)}
                style={secondaryButton}
              >
                Cambiar estado
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #1459ad',
  fontSize: '15px'
}

const primaryButton = {
  padding: '12px',
  background: '#0284c7',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px'
}

const secondaryButton = {
  padding: '8px 10px',
  background: '#113ea7',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px'
}

const mutedText = {
  margin: '6px 0',
  color: '#10132e',
  fontSize: '13px',
  wordBreak: 'break-word'
}

const rowBetween = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap'
}

export default Asignaturas