import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'

function Dashboard() {
  const { perfil } = useAuth()

  const [comunicados, setComunicados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargarComunicados()
  }, [])

  const cargarComunicados = async () => {
    setCargando(true)
    setMensaje('')

    const hoy = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('comunicados')
      .select('*')
      .eq('activo', true)
      .or(`fecha_inicio.is.null,fecha_inicio.lte.${hoy}`)
      .or(`fecha_fin.is.null,fecha_fin.gte.${hoy}`)
      .order('created_at', { ascending: false })

    setCargando(false)

    if (error) {
      setMensaje(`No se pudieron cargar comunicados: ${error.message}`)
      return
    }

    setComunicados(data || [])
  }

  const colorPrioridad = (prioridad) => {
    if (prioridad === 'urgente') {
      return {
        fondo: '#fee2e2',
        borde: '#ef4444',
        texto: '#991b1b',
        etiqueta: 'URGENTE'
      }
    }

    if (prioridad === 'importante') {
      return {
        fondo: '#fef3c7',
        borde: '#f59e0b',
        texto: '#92400e',
        etiqueta: 'IMPORTANTE'
      }
    }

    return {
      fondo: '#e0f2fe',
      borde: '#38bdf8',
      texto: '#075985',
      etiqueta: 'INFORMATIVO'
    }
  }

  return (
    <div style={page}>
      <div style={cardPrincipal}>
        <h1 style={titulo}>Panel docente</h1>

        <h2 style={nombre}>
          {perfil?.nombre}
        </h2>

        <p>
          <strong>Rol:</strong> {perfil?.rol}
        </p>

        <p style={ayuda}>
          Use la barra superior para navegar entre Nueva sesión, Sesiones, Asistencia y Reportes.
        </p>
      </div>

      <div style={comunicadosBox}>
        <div style={comunicadoHeader}>
          <h2 style={{ margin: 0 }}>
            📢 Comunicados institucionales
          </h2>

          <button
            onClick={cargarComunicados}
            style={botonActualizar}
          >
            Actualizar
          </button>
        </div>

        {cargando && (
          <p style={textoSecundario}>
            Cargando comunicados...
          </p>
        )}

        {mensaje && (
          <div style={alertaError}>
            {mensaje}
          </div>
        )}

        {!cargando && comunicados.length === 0 && (
          <div style={sinComunicados}>
            No hay comunicados activos por el momento.
          </div>
        )}

        <div style={listaComunicados}>
          {comunicados.map(item => {
            const estilo = colorPrioridad(item.prioridad)

            return (
              <div
                key={item.id}
                style={{
                  ...comunicadoCard,
                  background: estilo.fondo,
                  borderLeft: `6px solid ${estilo.borde}`,
                  color: estilo.texto
                }}
              >
                <div style={comunicadoTop}>
                  <strong style={comunicadoTitulo}>
                    {item.titulo}
                  </strong>

                  <span style={{
                    ...badge,
                    background: estilo.borde
                  }}>
                    {estilo.etiqueta}
                  </span>
                </div>

                <p style={comunicadoTexto}>
                  {item.mensaje}
                </p>

                <p style={fechaTexto}>
                  Publicado: {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  padding: '18px 16px 32px',
  fontFamily: 'Arial',
  background: '#31334d4b'
}

const cardPrincipal = {
  background: 'white',
  padding: '20px',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(30, 30, 32, 0.42)',
  textAlign: 'center',
  marginBottom: '16px'
}

const titulo = {
  marginTop: 0,
  marginBottom: '8px',
  color: '#0f172a'
}

const nombre = {
  color: '#1e3a8a',
  marginBottom: '8px'
}

const ayuda = {
  color: '#2e558b',
  marginBottom: 0
}

const comunicadosBox = {
  background: 'white',
  padding: '16px',
  borderRadius: '16px',
  boxShadow: '0 4px 12px rgba(30, 30, 32, 0.28)'
}

const comunicadoHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '12px'
}

const botonActualizar = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  padding: '8px 12px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const textoSecundario = {
  color: '#475569',
  textAlign: 'center'
}

const alertaError = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '10px',
  borderRadius: '10px',
  fontWeight: 'bold',
  marginBottom: '10px'
}

const sinComunicados = {
  background: '#f8fafc',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: '12px',
  padding: '14px',
  textAlign: 'center',
  fontWeight: 'bold'
}

const listaComunicados = {
  display: 'grid',
  gap: '12px'
}

const comunicadoCard = {
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid rgba(15,23,42,0.08)'
}

const comunicadoTop = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap'
}

const comunicadoTitulo = {
  fontSize: '16px'
}

const badge = {
  color: 'white',
  padding: '4px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 'bold'
}

const comunicadoTexto = {
  whiteSpace: 'pre-wrap',
  lineHeight: '1.45',
  marginBottom: '8px'
}

const fechaTexto = {
  margin: 0,
  fontSize: '12px',
  opacity: 0.8
}

export default Dashboard