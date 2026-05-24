import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function Reportes() {
  const { perfil } = useAuth()

  const [sesiones, setSesiones] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  const [filtros, setFiltros] = useState({
    asignaturaId: '',
    unidad: '',
    grupo: '',
    estadoSesion: ''
  })

  useEffect(() => {
    if (perfil) {
      cargarDatos()
    }
  }, [perfil])

  const cargarDatos = async () => {
    setCargando(true)
    setMensaje('')

    let querySesiones = supabase
      .from('sesiones')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (perfil?.rol === 'DOCENTE') {
      querySesiones = querySesiones.eq('docente_id', perfil.docente_id)
    }

    const { data: sesionesData, error: errorSesiones } = await querySesiones

    if (errorSesiones) {
      setMensaje(`Error al cargar sesiones: ${errorSesiones.message}`)
      setCargando(false)
      return
    }

    const sesionesLista = sesionesData || []
    const idsSesiones = sesionesLista.map(s => s.id)

    let asistenciasLista = []

    if (idsSesiones.length > 0) {
      const { data, error } = await supabase
        .from('asistencias')
        .select('*')
        .in('sesion_id', idsSesiones)

      if (error) {
        setMensaje(`Error al cargar asistencias: ${error.message}`)
        setCargando(false)
        return
      }

      asistenciasLista = data || []
    }

    const asignaturaIds = [
      ...new Set(
        sesionesLista
          .map(s => s.asignatura_id)
          .filter(Boolean)
      )
    ]

    let queryEstudiantes = supabase
      .from('estudiantes')
      .select('*')
      .order('grupo', { ascending: true })
      .order('nombre_completo', { ascending: true })

    if (asignaturaIds.length > 0) {
      queryEstudiantes = queryEstudiantes.in('asignatura_id', asignaturaIds)
    }

    const { data: estudiantesData, error: errorEstudiantes } = await queryEstudiantes

    if (errorEstudiantes) {
      setMensaje(`Error al cargar estudiantes: ${errorEstudiantes.message}`)
      setCargando(false)
      return
    }

    setSesiones(sesionesLista)
    setAsistencias(asistenciasLista)
    setEstudiantes(estudiantesData || [])
    setCargando(false)
  }

  const obtenerUnidad = (sesion) => {
    return sesion?.unidad || 'Sin unidad'
  }

  const obtenerTipoSesion = (sesion) => {
    return sesion?.tipo_sesion || sesion?.tipo || ''
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

  const obtenerCodigoAsistencia = (a) => {
    return a.codigo || a.codigo_estudiante || ''
  }

  const obtenerNombreAsistencia = (a) => {
    return a.estudiante || a.apellidos_nombres || ''
  }

  const asignaturasDisponibles = useMemo(() => {
    const mapa = new Map()

    sesiones.forEach(s => {
      if (s.asignatura_id) {
        mapa.set(s.asignatura_id, {
          id: s.asignatura_id,
          nombre: s.asignatura_nombre || 'Sin nombre'
        })
      }
    })

    return Array.from(mapa.values())
  }, [sesiones])

  const gruposDisponibles = useMemo(() => {
    return [
      ...new Set(
        estudiantes
          .filter(e => {
            if (
              filtros.asignaturaId &&
              e.asignatura_id?.toString() !== filtros.asignaturaId
            ) {
              return false
            }

            return true
          })
          .map(e => e.grupo)
          .filter(Boolean)
      )
    ].sort()
  }, [estudiantes, filtros.asignaturaId])

  const sesionesFiltradas = useMemo(() => {
    return sesiones.filter(s => {
      if (
        filtros.asignaturaId &&
        s.asignatura_id?.toString() !== filtros.asignaturaId
      ) {
        return false
      }

      if (
        filtros.unidad &&
        obtenerUnidad(s) !== filtros.unidad
      ) {
        return false
      }

      if (
        filtros.estadoSesion &&
        s.estado !== filtros.estadoSesion
      ) {
        return false
      }

      return true
    })
  }, [sesiones, filtros])

  const estudiantesFiltrados = useMemo(() => {
    return estudiantes.filter(e => {
      if (
        filtros.asignaturaId &&
        e.asignatura_id?.toString() !== filtros.asignaturaId
      ) {
        return false
      }

      if (
        filtros.grupo &&
        normalizarGrupo(e.grupo) !== normalizarGrupo(filtros.grupo)
      ) {
        return false
      }

      return true
    })
  }, [estudiantes, filtros])

  const mapaAsistencias = useMemo(() => {
    const mapa = new Map()

    asistencias.forEach(a => {
      const codigo = obtenerCodigoAsistencia(a)
      const clave = `${a.sesion_id}_${codigo}`
      mapa.set(clave, a)
    })

    return mapa
  }, [asistencias])

  const sesionesParaEstudiante = (estudiante) => {
    return sesionesFiltradas.filter(s => {
      if (s.asignatura_id !== estudiante.asignatura_id) return false

      const tipo = obtenerTipoSesion(s)

      if (tipo === 'TEORIA') return true

      return normalizarGrupo(s.grupo) === normalizarGrupo(estudiante.grupo)
    })
  }

  const abreviarEstado = (estado) => {
    if (estado === 'Presente') return 'P'
    if (estado === 'Tardanza') return 'T'
    if (estado === 'Justificado') return 'J'
    return 'F'
  }

  const obtenerEstadoEstudianteSesion = (estudiante, sesion) => {
    const clave = `${sesion.id}_${estudiante.codigo}`
    const registro = mapaAsistencias.get(clave)

    if (!registro) return 'F'

    return abreviarEstado(registro.estado)
  }

  const reporteMatriz = useMemo(() => {
    return estudiantesFiltrados.map(est => {
      const sesionesValidas = sesionesParaEstudiante(est)

      let totalP = 0
      let totalT = 0
      let totalF = 0
      let totalJ = 0

      const estados = {}

      sesionesValidas.forEach(sesion => {
        const estado = obtenerEstadoEstudianteSesion(est, sesion)
        estados[sesion.id] = estado

        if (estado === 'P') totalP++
        if (estado === 'T') totalT++
        if (estado === 'F') totalF++
        if (estado === 'J') totalJ++
      })

      const totalSesiones = sesionesValidas.length
      const totalValidas = totalP + totalT + totalJ

      const porcentaje = totalSesiones > 0
        ? ((totalValidas / totalSesiones) * 100).toFixed(1)
        : '0.0'

      return {
        codigo: est.codigo,
        estudiante: est.nombre_completo,
        grupo: est.grupo,
        asignatura: est.asignatura_nombre,
        estados,
        totalSesiones,
        totalP,
        totalT,
        totalF,
        totalJ,
        porcentaje
      }
    })
  }, [estudiantesFiltrados, sesionesFiltradas, mapaAsistencias])

  const construirEncabezadoSesion = (sesion, index) => {
    const unidad = obtenerUnidad(sesion).replace('Unidad ', 'U')
    const fecha = sesion.fecha || ''
    const tema = sesion.tema || 'Sin tema'
    const tipo = obtenerTipoSesion(sesion)

    return `${index + 1}. ${unidad} | ${fecha} | ${tipo} | ${tema}`
  }

  const autoAjustarColumnas = (datos) => {
    if (!datos || datos.length === 0) return []

    const cantidadColumnas = Math.max(...datos.map(fila => fila.length))

    return Array.from({ length: cantidadColumnas }).map((_, colIndex) => {
      const max = datos.reduce((acc, fila) => {
        const valor = fila[colIndex] ? fila[colIndex].toString() : ''
        return Math.max(acc, valor.length)
      }, 10)

      return {
        wch: Math.min(Math.max(max + 2, 10), 45)
      }
    })
  }

  const descargarExcel = () => {
    if (sesionesFiltradas.length === 0) {
      setMensaje('No hay sesiones para generar reporte.')
      return
    }

    if (reporteMatriz.length === 0) {
      setMensaje('No hay estudiantes para generar reporte.')
      return
    }

    const sesionesOrdenadas = [...sesionesFiltradas].sort((a, b) => {
      const fa = `${a.fecha || ''} ${a.hora_inicio || ''}`
      const fb = `${b.fecha || ''} ${b.hora_inicio || ''}`
      return fa.localeCompare(fb)
    })

    const encabezadoMatriz = [
      'Código',
      'Estudiante',
      'Grupo',
      'Asignatura',
      ...sesionesOrdenadas.map((s, i) => construirEncabezadoSesion(s, i)),
      'Total sesiones',
      'P',
      'T',
      'J',
      'F',
      '% asistencia'
    ]

    const datosMatriz = [
      ['REPORTE DETALLADO DE ASISTENCIA - MEDICINA HUMANA UNS'],
      [`Fecha de emisión: ${new Date().toLocaleString()}`],
      [`Usuario: ${perfil?.nombre || ''} | Rol: ${perfil?.rol || ''}`],
      ['Leyenda: P = Presente | T = Tardanza | J = Justificado | F = Falta'],
      [],
      encabezadoMatriz,
      ...reporteMatriz.map(item => [
        item.codigo,
        item.estudiante,
        item.grupo,
        item.asignatura,
        ...sesionesOrdenadas.map(s => item.estados[s.id] || 'F'),
        item.totalSesiones,
        item.totalP,
        item.totalT,
        item.totalJ,
        item.totalF,
        `${item.porcentaje}%`
      ])
    ]

    const resumen = [
      ['RESUMEN DE ASISTENCIA - MEDICINA HUMANA UNS'],
      [`Fecha de emisión: ${new Date().toLocaleString()}`],
      [`Sesiones consideradas: ${sesionesOrdenadas.length}`],
      [`Estudiantes considerados: ${reporteMatriz.length}`],
      [],
      [
        'Código',
        'Estudiante',
        'Grupo',
        'Asignatura',
        'Total sesiones',
        'Presentes',
        'Tardanzas',
        'Justificados',
        'Faltas',
        '% asistencia'
      ],
      ...reporteMatriz.map(item => [
        item.codigo,
        item.estudiante,
        item.grupo,
        item.asignatura,
        item.totalSesiones,
        item.totalP,
        item.totalT,
        item.totalJ,
        item.totalF,
        `${item.porcentaje}%`
      ])
    ]

    const detalleSesiones = [
      ['DETALLE DE SESIONES CONSIDERADAS'],
      [],
      [
        'N°',
        'Unidad',
        'Fecha',
        'Hora inicio',
        'Hora fin',
        'Asignatura',
        'Tipo',
        'Grupo',
        'Tema',
        'Estado'
      ],
      ...sesionesOrdenadas.map((s, index) => [
        index + 1,
        obtenerUnidad(s),
        s.fecha || '',
        s.hora_inicio || '',
        s.hora_fin || s.hora_cierre || '',
        s.asignatura_nombre || '',
        obtenerTipoSesion(s),
        s.grupo || '',
        s.tema || '',
        s.estado || ''
      ])
    ]

    const libro = XLSX.utils.book_new()

    const hojaMatriz = XLSX.utils.aoa_to_sheet(datosMatriz)
    hojaMatriz['!cols'] = autoAjustarColumnas(datosMatriz)
    hojaMatriz['!freeze'] = { xSplit: 4, ySplit: 6 }

    const hojaResumen = XLSX.utils.aoa_to_sheet(resumen)
    hojaResumen['!cols'] = autoAjustarColumnas(resumen)

    const hojaSesiones = XLSX.utils.aoa_to_sheet(detalleSesiones)
    hojaSesiones['!cols'] = autoAjustarColumnas(detalleSesiones)

    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen')
    XLSX.utils.book_append_sheet(libro, hojaMatriz, 'Detalle por sesión')
    XLSX.utils.book_append_sheet(libro, hojaSesiones, 'Sesiones')

    XLSX.writeFile(libro, 'reporte_asistencia_detallado_uns.xlsx')
  }

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('No hay')

  return (
    <div style={page}>
      <h2 style={titulo}>
        Reportes de asistencia
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

      <div style={card}>
        <h3 style={subtitulo}>
          Filtros del reporte
        </h3>

        <div style={gridFiltros}>
          <select
            style={input}
            value={filtros.asignaturaId}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                asignaturaId: e.target.value,
                grupo: ''
              })
            }
          >
            <option value="">Todas las asignaturas</option>
            {asignaturasDisponibles.map(a => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>

          <select
            style={input}
            value={filtros.unidad}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                unidad: e.target.value
              })
            }
          >
            <option value="">Todas las unidades</option>
            <option value="Unidad I">Unidad I</option>
            <option value="Unidad II">Unidad II</option>
            <option value="Unidad III">Unidad III</option>
          </select>

          <select
            style={input}
            value={filtros.grupo}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                grupo: e.target.value
              })
            }
          >
            <option value="">Todos los grupos</option>
            {gruposDisponibles.map(grupo => (
              <option key={grupo} value={grupo}>
                Grupo {grupo}
              </option>
            ))}
          </select>

          <select
            style={input}
            value={filtros.estadoSesion}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                estadoSesion: e.target.value
              })
            }
          >
            <option value="">Todas las sesiones</option>
            <option value="Abierta">Abiertas</option>
            <option value="Cerrada">Cerradas</option>
          </select>
        </div>
      </div>

      <div style={statsGrid}>
        <Resumen titulo="Sesiones" valor={sesionesFiltradas.length} fondo="#e0f2fe" />
        <Resumen titulo="Estudiantes" valor={reporteMatriz.length} fondo="#dcfce7" />
        <Resumen titulo="Registros" valor={asistencias.length} fondo="#fef9c3" />
      </div>

      <div style={actions}>
        <button onClick={cargarDatos} style={botonAzul}>
          Actualizar
        </button>

        <button onClick={descargarExcel} style={botonVerde}>
          Descargar Excel detallado
        </button>
      </div>

      {cargando ? (
        <p>Cargando reporte...</p>
      ) : (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Código</th>
                <th style={th}>Estudiante</th>
                <th style={th}>Grupo</th>
                <th style={th}>Asignatura</th>
                <th style={th}>Sesiones</th>
                <th style={th}>P</th>
                <th style={th}>T</th>
                <th style={th}>J</th>
                <th style={th}>F</th>
                <th style={th}>%</th>
              </tr>
            </thead>

            <tbody>
              {reporteMatriz.map(item => (
                <tr key={`${item.codigo}-${item.asignatura}`}>
                  <td style={td}>{item.codigo}</td>
                  <td style={td}>{item.estudiante}</td>
                  <td style={td}>{item.grupo}</td>
                  <td style={td}>{item.asignatura}</td>
                  <td style={tdCenter}>{item.totalSesiones}</td>
                  <td style={tdCenter}>{item.totalP}</td>
                  <td style={tdCenter}>{item.totalT}</td>
                  <td style={tdCenter}>{item.totalJ}</td>
                  <td style={tdCenter}>{item.totalF}</td>
                  <td style={tdCenter}><strong>{item.porcentaje}%</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Resumen({ titulo, valor, fondo }) {
  return (
    <div style={{
      background: fondo,
      padding: '10px',
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

const page = {
  padding: '18px 12px 30px',
  fontFamily: 'Arial'
}

const titulo = {
  textAlign: 'center',
  marginBottom: '16px'
}

const subtitulo = {
  marginTop: 0,
  textAlign: 'center',
  color: '#334155'
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
  marginBottom: '14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
}

const gridFiltros = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  marginBottom: '14px'
}

const actions = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginBottom: '14px'
}

const botonAzul = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '10px 14px',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const botonVerde = {
  background: '#16a34a',
  color: 'white',
  border: 'none',
  padding: '10px 14px',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const tableWrap = {
  background: 'white',
  borderRadius: '14px',
  padding: '10px',
  border: '1px solid #e2e8f0',
  overflowX: 'auto'
}

const table = {
  width: '100%',
  minWidth: '850px',
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
  borderBottom: '1px solid #e2e8f0'
}

const tdCenter = {
  ...td,
  textAlign: 'center'
}

export default Reportes