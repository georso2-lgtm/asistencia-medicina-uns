import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

function Reportes() {
  const { perfil } = useAuth()

  const [sesiones, setSesiones] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [asignaturas, setAsignaturas] = useState([])

  const [filtros, setFiltros] = useState({
    asignaturaId: '',
    grupo: '',
    docenteId: ''
  })

  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

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
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })

    if (perfil?.rol === 'DOCENTE') {
      querySesiones = querySesiones.eq('docente_id', perfil.docente_id)
    }

    const { data: sesionesData, error: errorSesiones } = await querySesiones

    if (errorSesiones) {
      setMensaje(`Error al cargar sesiones: ${errorSesiones.message}`)
      setCargando(false)
      return
    }

    const sesionesPermitidas = sesionesData || []
    const idsSesiones = sesionesPermitidas.map(s => s.id)

    let asistenciasData = []

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

      asistenciasData = data || []
    }

    const asignaturaIds = [
      ...new Set(
        sesionesPermitidas
          .map(s => s.asignatura_id)
          .filter(Boolean)
      )
    ]

    let estudiantesQuery = supabase
      .from('estudiantes')
      .select('*')
      .order('grupo', { ascending: true })
      .order('nombre_completo', { ascending: true })

    if (asignaturaIds.length > 0) {
      estudiantesQuery = estudiantesQuery.in('asignatura_id', asignaturaIds)
    }

    const { data: estudiantesData, error: errorEstudiantes } = await estudiantesQuery

    if (errorEstudiantes) {
      setMensaje(`Error al cargar estudiantes: ${errorEstudiantes.message}`)
      setCargando(false)
      return
    }

    const asignaturasUnicas = []
    const mapaAsignaturas = new Map()

    sesionesPermitidas.forEach(s => {
      if (s.asignatura_id && !mapaAsignaturas.has(s.asignatura_id)) {
        mapaAsignaturas.set(s.asignatura_id, true)

        asignaturasUnicas.push({
          id: s.asignatura_id,
          nombre: s.asignatura_nombre || 'Sin nombre'
        })
      }
    })

    setSesiones(sesionesPermitidas)
    setAsistencias(asistenciasData)
    setEstudiantes(estudiantesData || [])
    setAsignaturas(asignaturasUnicas)
    setCargando(false)
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

  const sesionesFiltradas = sesiones.filter(s => {
    if (
      filtros.asignaturaId &&
      s.asignatura_id?.toString() !== filtros.asignaturaId
    ) {
      return false
    }

    if (
      filtros.docenteId &&
      s.docente_id?.toString() !== filtros.docenteId
    ) {
      return false
    }

    return true
  })

  const idsSesionesFiltradas = sesionesFiltradas.map(s => s.id)

  const asistenciasFiltradas = asistencias.filter(a =>
    idsSesionesFiltradas.includes(a.sesion_id)
  )

  const estudiantesFiltrados = estudiantes.filter(e => {
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

  const gruposDisponibles = [
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

  const docentesDisponibles = [
    ...new Map(
      sesiones
        .filter(s => s.docente_id)
        .map(s => [
          s.docente_id,
          {
            id: s.docente_id,
            nombre: s.docente || 'Sin docente'
          }
        ])
    ).values()
  ]

  const calcularReporte = () => {
    return estudiantesFiltrados.map(est => {
      const sesionesDeEstudiante = sesionesFiltradas.filter(s => {
        if (s.asignatura_id !== est.asignatura_id) return false

        const tipoSesion = obtenerTipoSesion(s)

        if (tipoSesion === 'TEORIA') return true

        return normalizarGrupo(s.grupo) === normalizarGrupo(est.grupo)
      })

      const registros = asistenciasFiltradas.filter(a =>
        a.codigo === est.codigo &&
        sesionesDeEstudiante.some(s => s.id === a.sesion_id)
      )

      const presentes = registros.filter(r => r.estado === 'Presente').length
      const tardanzas = registros.filter(r => r.estado === 'Tardanza').length
      const justificados = registros.filter(r => r.estado === 'Justificado').length
      const faltasRegistradas = registros.filter(r => r.estado === 'Falta').length

      const totalSesiones = sesionesDeEstudiante.length
      const asistenciasValidas = presentes + tardanzas + justificados

      const faltasCalculadas = Math.max(
        totalSesiones - asistenciasValidas,
        faltasRegistradas
      )

      const porcentaje = totalSesiones > 0
        ? ((asistenciasValidas / totalSesiones) * 100).toFixed(1)
        : '0.0'

      return {
        codigo: est.codigo,
        estudiante: est.nombre_completo,
        grupo: est.grupo,
        asignatura: est.asignatura_nombre,
        totalSesiones,
        presentes,
        tardanzas,
        justificados,
        faltas: faltasCalculadas,
        porcentaje
      }
    })
  }

  const reporte = calcularReporte()

  const descargarExcel = () => {
    const datos = [
      ['REPORTE DE ASISTENCIA - ESCUELA PROFESIONAL DE MEDICINA HUMANA'],
      ['Universidad Nacional del Santa'],
      [''],
      [`Fecha de emisión: ${new Date().toLocaleString()}`],
      [`Usuario: ${perfil?.nombre || ''}`],
      [`Rol: ${perfil?.rol || ''}`],
      [`Total sesiones consideradas: ${sesionesFiltradas.length}`],
      [''],
      [
        'Código',
        'Estudiante',
        'Grupo',
        'Asignatura',
        'Sesiones',
        'Presentes',
        'Tardanzas',
        'Justificados',
        'Faltas',
        '% Asistencia'
      ],
      ...reporte.map(item => [
        item.codigo,
        item.estudiante,
        item.grupo,
        item.asignatura,
        item.totalSesiones,
        item.presentes,
        item.tardanzas,
        item.justificados,
        item.faltas,
        `${item.porcentaje}%`
      ])
    ]

    const hoja = XLSX.utils.aoa_to_sheet(datos)

    hoja['!cols'] = [
      { wch: 16 },
      { wch: 42 },
      { wch: 14 },
      { wch: 36 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 }
    ]

    hoja['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }
    ]

    const estiloTitulo = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }

    const estiloSubtitulo = {
      font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0369A1' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }

    const estiloEncabezado = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0284C7' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borde
    }

    const estiloCelda = {
      alignment: { vertical: 'center', wrapText: true },
      border: borde
    }

    const estiloCentro = {
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borde
    }

    hoja['A1'].s = estiloTitulo
    hoja['A2'].s = estiloSubtitulo

    aplicarEstilo(hoja, 8, 8, 0, 9, estiloEncabezado)
    aplicarEstilo(hoja, 9, datos.length - 1, 0, 9, estiloCelda)
    aplicarEstilo(hoja, 9, datos.length - 1, 2, 9, estiloCentro)

    hoja['!rows'] = [
      { hpt: 28 },
      { hpt: 24 },
      { hpt: 8 },
      { hpt: 22 },
      { hpt: 22 },
      { hpt: 22 },
      { hpt: 22 },
      { hpt: 8 },
      { hpt: 32 }
    ]

    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte asistencia')

    XLSX.writeFile(libro, 'reporte_asistencia_medicina_uns.xlsx')
  }

  const esError =
    mensaje.includes('Error')

  return (
    <div style={page}>
      <h2>
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
        <h3 style={{ marginTop: 0 }}>
          Filtros
        </h3>

        <select
          value={filtros.asignaturaId}
          onChange={(e) =>
            setFiltros({
              ...filtros,
              asignaturaId: e.target.value,
              grupo: ''
            })
          }
          style={input}
        >
          <option value="">
            Todas las asignaturas
          </option>

          {asignaturas.map(item => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtros.grupo}
          onChange={(e) =>
            setFiltros({
              ...filtros,
              grupo: e.target.value
            })
          }
          style={input}
        >
          <option value="">
            Todos los grupos
          </option>

          {gruposDisponibles.map(grupo => (
            <option key={grupo} value={grupo}>
              Grupo {grupo}
            </option>
          ))}
        </select>

        {(perfil?.rol === 'COORDINADOR' || perfil?.rol === 'ADMINISTRADOR') && (
          <select
            value={filtros.docenteId}
            onChange={(e) =>
              setFiltros({
                ...filtros,
                docenteId: e.target.value
              })
            }
            style={input}
          >
            <option value="">
              Todos los docentes
            </option>

            {docentesDisponibles.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={statsFila}>
        <Resumen titulo="Sesiones" valor={sesionesFiltradas.length} fondo="#e0f2fe" />
        <Resumen titulo="Estudiantes" valor={reporte.length} fondo="#dcfce7" />
        <Resumen titulo="Registros" valor={asistenciasFiltradas.length} fondo="#fef9c3" />
      </div>

      <div style={actions}>
        <button onClick={cargarDatos} style={botonAzul}>
          Actualizar
        </button>

        <button onClick={descargarExcel} style={botonVerde}>
          Descargar Excel
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
                <th style={th}>Presentes</th>
                <th style={th}>Tardanzas</th>
                <th style={th}>Justificados</th>
                <th style={th}>Faltas</th>
                <th style={th}>%</th>
              </tr>
            </thead>

            <tbody>
              {reporte.map(item => (
                <tr key={`${item.codigo}-${item.asignatura}`}>
                  <td style={td}>{item.codigo}</td>
                  <td style={td}>{item.estudiante}</td>
                  <td style={td}>{item.grupo}</td>
                  <td style={td}>{item.asignatura}</td>
                  <td style={tdCenter}>{item.totalSesiones}</td>
                  <td style={tdCenter}>{item.presentes}</td>
                  <td style={tdCenter}>{item.tardanzas}</td>
                  <td style={tdCenter}>{item.justificados}</td>
                  <td style={tdCenter}>{item.faltas}</td>
                  <td style={tdCenter}>
                    <strong>{item.porcentaje}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function aplicarEstilo(hoja, filaInicio, filaFin, colInicio, colFin, estilo) {
  for (let fila = filaInicio; fila <= filaFin; fila++) {
    for (let col = colInicio; col <= colFin; col++) {
      const celda = XLSX.utils.encode_cell({ r: fila, c: col })

      if (!hoja[celda]) {
        hoja[celda] = { t: 's', v: '' }
      }

      hoja[celda].s = estilo
    }
  }
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

      <p style={{
        fontSize: '22px',
        margin: '5px 0 0',
        fontWeight: 'bold'
      }}>
        {valor}
      </p>
    </div>
  )
}

const borde = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
}

const page = {
  padding: '18px 12px 30px',
  fontFamily: 'Arial'
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
  display: 'grid',
  gap: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
}

const input = {
  width: '100%',
  padding: '11px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  boxSizing: 'border-box'
}

const statsFila = {
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