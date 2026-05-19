import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function MarcarAsistencia() {
  const [sesionId, setSesionId] = useState('')
  const [expira, setExpira] = useState(null)

  const [sesion, setSesion] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [estudianteConfirmado, setEstudianteConfirmado] = useState(null)

  const [mensaje, setMensaje] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('sesionId')
    const expiraParam = params.get('expira')

    setSesionId(id || '')
    setExpira(expiraParam ? Number(expiraParam) : null)

    if (id) {
      verificarBloqueoDispositivo(id)
      cargarSesion(id, expiraParam ? Number(expiraParam) : null)
    } else {
      setMensaje('QR inválido. No se encontró sesión.')
      setBloqueado(true)
    }
  }, [])

  const verificarBloqueoDispositivo = (id) => {
    const marca = localStorage.getItem(`asistencia_sesion_${id}`)

    if (marca) {
      try {
        const datos = JSON.parse(marca)
        setMensaje(
          `Este dispositivo ya registró asistencia en esta sesión para: ${datos.estudiante || 'estudiante registrado'}.`
        )
        setBloqueado(true)
      } catch {
        setMensaje('Este dispositivo ya registró asistencia en esta sesión.')
        setBloqueado(true)
      }
    }
  }

  const obtenerTipoSesion = (s) => {
    return s?.tipo_sesion || s?.tipo || ''
  }

  const obtenerHoraFin = (s) => {
    return s?.hora_fin || s?.hora_cierre || ''
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

  const cargarSesion = async (id, expiraValor) => {
    const { data, error } = await supabase
      .from('sesiones')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      setMensaje('No se encontró la sesión.')
      setBloqueado(true)
      return
    }

    setSesion(data)

    if (data.estado !== 'Abierta') {
      setMensaje('La sesión está cerrada. No se puede registrar asistencia.')
      setBloqueado(true)
      return
    }

    if (expiraValor && Date.now() > expiraValor) {
      setMensaje('El código QR ha expirado. Solicite nuevo QR al docente.')
      setBloqueado(true)
      return
    }
  }

  const buscarEstudiante = async (e) => {
    e.preventDefault()
    setMensaje('')
    setEstudianteConfirmado(null)

    if (!sesion) {
      setMensaje('No se encontró sesión válida.')
      return
    }

    if (bloqueado) {
      return
    }

    if (sesion.estado !== 'Abierta') {
      setMensaje('La sesión está cerrada.')
      setBloqueado(true)
      return
    }

    if (expira && Date.now() > expira) {
      setMensaje('El código QR ha expirado.')
      setBloqueado(true)
      return
    }

    const marca = localStorage.getItem(`asistencia_sesion_${sesion.id}`)

    if (marca) {
      setMensaje('Este dispositivo ya registró asistencia en esta sesión.')
      setBloqueado(true)
      return
    }

    const codigoLimpio = codigo.trim()

    if (!codigoLimpio) {
      setMensaje('Ingrese su código de estudiante.')
      return
    }

    const { data: estudiante, error: errorEstudiante } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('codigo', codigoLimpio)
      .eq('asignatura_id', sesion.asignatura_id)
      .maybeSingle()

    if (errorEstudiante || !estudiante) {
      setMensaje('El código no pertenece a la lista de estudiantes de esta asignatura.')
      return
    }

    const tipoSesion = obtenerTipoSesion(sesion)

    if (
      tipoSesion !== 'TEORIA' &&
      normalizarGrupo(estudiante.grupo) !== normalizarGrupo(sesion.grupo)
    ) {
      setMensaje('El estudiante no pertenece al grupo de esta sesión.')
      return
    }

    setEstudianteConfirmado(estudiante)
    setMensaje('Verifique sus datos antes de confirmar la asistencia.')
  }

  const confirmarRegistro = async () => {
    if (!estudianteConfirmado || !sesion) {
      setMensaje('Primero verifique el código del estudiante.')
      return
    }

    const confirmar = window.confirm(
      `¿Confirmar asistencia de ${estudianteConfirmado.nombre_completo}?`
    )

    if (!confirmar) return

    const marca = localStorage.getItem(`asistencia_sesion_${sesion.id}`)

    if (marca) {
      setMensaje('Este dispositivo ya registró asistencia en esta sesión.')
      setBloqueado(true)
      return
    }

    setRegistrando(true)

    const tipoSesion = obtenerTipoSesion(sesion)
    const estadoCalculado = calcularEstadoAsistencia(sesion)

    const registro = {
      sesion_id: sesion.id,
      codigo: estudianteConfirmado.codigo,
      estudiante: estudianteConfirmado.nombre_completo,
      grupo: estudianteConfirmado.grupo,
      tipo_sesion: tipoSesion,
      estado: estadoCalculado,
      metodo: 'QR',
      fecha_registro: new Date().toLocaleString(),
      asignatura_id: sesion.asignatura_id,
      asignatura_nombre: sesion.asignatura_nombre,
      docente_id: sesion.docente_id,
      docente_nombre: sesion.docente
    }

    const { error } = await supabase
      .from('asistencias')
      .upsert(registro, {
        onConflict: 'sesion_id,codigo'
      })

    setRegistrando(false)

    if (error) {
      setMensaje(`Error al registrar asistencia: ${error.message}`)
      return
    }

    localStorage.setItem(
      `asistencia_sesion_${sesion.id}`,
      JSON.stringify({
        codigo: estudianteConfirmado.codigo,
        estudiante: estudianteConfirmado.nombre_completo,
        fecha: new Date().toISOString()
      })
    )

    setMensaje(
      `Asistencia registrada correctamente: ${estudianteConfirmado.nombre_completo} (${estadoCalculado})`
    )

    setCodigo('')
    setBloqueado(true)
  }

  const calcularEstadoAsistencia = (s) => {
    const ahora = new Date()
    const fechaSesion = s.fecha
    const horaInicio = s.hora_inicio

    if (!fechaSesion || !horaInicio) {
      return 'Presente'
    }

    const inicio = new Date(`${fechaSesion}T${horaInicio}`)
    const diferenciaMin = Math.floor((ahora - inicio) / 60000)

    if (diferenciaMin <= 15) {
      return 'Presente'
    }

    return 'Tardanza'
  }

  const esError =
    mensaje.includes('No se') ||
    mensaje.includes('no pertenece') ||
    mensaje.includes('cerrada') ||
    mensaje.includes('expirado') ||
    mensaje.includes('Ingrese') ||
    mensaje.includes('Error') ||
    mensaje.includes('inválido') ||
    mensaje.includes('ya registró')

  return (
    <div style={page}>
      <div style={card}>
        <div style={logoBox}>
          <img
            src="/logo.png"
            alt="Logo institucional"
            style={logo}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />

          <h2 style={title}>
            Registro de Asistencia
          </h2>

          <p style={subtitle}>
            Escuela Profesional de Medicina Humana
          </p>
        </div>

        {sesion && (
          <div style={infoBox}>
            <p><strong>Asignatura:</strong> {sesion.asignatura_nombre || 'No registrada'}</p>
            <p><strong>Docente:</strong> {sesion.docente || 'No registrado'}</p>
            <p><strong>Fecha:</strong> {sesion.fecha}</p>
            <p><strong>Tipo:</strong> {obtenerTipoSesion(sesion)}</p>
            <p><strong>Grupo:</strong> {sesion.grupo}</p>
            <p><strong>Horario:</strong> {sesion.hora_inicio || '--'} - {obtenerHoraFin(sesion) || '--'}</p>
          </div>
        )}

        {mensaje && (
          <div style={{
            ...alert,
            background: esError ? '#fee2e2' : '#dcfce7',
            color: esError ? '#991b1b' : '#166534'
          }}>
            {mensaje}
          </div>
        )}

        {!bloqueado && !estudianteConfirmado && (
          <form onSubmit={buscarEstudiante} style={form}>
            <label style={label}>
              Código de estudiante
            </label>

            <input
              style={input}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                setEstudianteConfirmado(null)
              }}
              placeholder="Ingrese su código"
              autoFocus
            />

            <button
              type="submit"
              style={button}
            >
              Verificar código
            </button>
          </form>
        )}

        {!bloqueado && estudianteConfirmado && (
          <div style={confirmBox}>
            <h3 style={confirmTitle}>
              Confirmar estudiante
            </h3>

            <p style={studentName}>
              {estudianteConfirmado.nombre_completo}
            </p>

            <p style={studentDetail}>
              Código: <strong>{estudianteConfirmado.codigo}</strong>
            </p>

            <p style={studentDetail}>
              Grupo: <strong>{estudianteConfirmado.grupo}</strong>
            </p>

            <p style={warningText}>
              Verifique que sus datos sean correctos antes de registrar.
              Este dispositivo solo podrá marcar una vez para esta sesión.
            </p>

            <button
              type="button"
              onClick={confirmarRegistro}
              disabled={registrando}
              style={{
                ...button,
                opacity: registrando ? 0.7 : 1
              }}
            >
              {registrando
                ? 'Registrando...'
                : 'Confirmar asistencia'}
            </button>

            <button
              type="button"
              onClick={() => {
                setEstudianteConfirmado(null)
                setCodigo('')
                setMensaje('')
              }}
              style={secondaryButton}
            >
              Corregir código
            </button>
          </div>
        )}

        {bloqueado && (
          <p style={closeText}>
            Puede cerrar esta página.
          </p>
        )}
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  padding: '18px',
  background: '#f8fafc',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontFamily: 'Arial'
}

const card = {
  width: '100%',
  maxWidth: '440px',
  background: 'white',
  borderRadius: '20px',
  padding: '20px',
  boxShadow: '0 8px 22px rgba(0,0,0,0.10)',
  border: '1px solid #e2e8f0'
}

const logoBox = {
  textAlign: 'center',
  marginBottom: '12px'
}

const logo = {
  width: '82px',
  height: '82px',
  objectFit: 'contain',
  marginBottom: '8px'
}

const title = {
  textAlign: 'center',
  color: '#0f172a',
  margin: '4px 0',
  fontSize: '23px'
}

const subtitle = {
  color: '#0369a1',
  margin: 0,
  fontWeight: 'bold',
  fontSize: '14px'
}

const infoBox = {
  background: '#e0f2fe',
  color: '#0f172a',
  padding: '12px',
  borderRadius: '12px',
  fontSize: '14px',
  marginBottom: '14px',
  border: '1px solid #bae6fd'
}

const alert = {
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '14px',
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '14px'
}

const form = {
  display: 'grid',
  gap: '12px'
}

const label = {
  fontWeight: 'bold',
  color: '#334155'
}

const input = {
  width: '100%',
  padding: '13px',
  borderRadius: '10px',
  border: '1px solid #94a3b8',
  fontSize: '16px',
  boxSizing: 'border-box',
  textAlign: 'center',
  color: '#0f172a',
  background: 'white'
}

const button = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '14px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '15px',
  width: '100%'
}

const secondaryButton = {
  background: '#475569',
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px',
  width: '100%',
  marginTop: '8px'
}

const confirmBox = {
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '14px',
  padding: '14px',
  textAlign: 'center'
}

const confirmTitle = {
  marginTop: 0,
  color: '#334155'
}

const studentName = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#0f172a',
  marginBottom: '8px'
}

const studentDetail = {
  fontSize: '14px',
  color: '#334155',
  margin: '5px 0'
}

const warningText = {
  background: '#fef9c3',
  color: '#854d0e',
  padding: '10px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 'bold',
  margin: '12px 0'
}

const closeText = {
  textAlign: 'center',
  color: '#475569',
  fontSize: '13px'
}

export default MarcarAsistencia