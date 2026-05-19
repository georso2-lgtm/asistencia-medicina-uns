import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { supabase } from '../supabaseClient'

function Estudiantes() {
  const [asignaturas, setAsignaturas] = useState([])
  const [asignaturaId, setAsignaturaId] = useState('')
  const [estudiantes, setEstudiantes] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)

  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    codigo: '',
    nombre_completo: '',
    grupo: ''
  })

  useEffect(() => {
    cargarAsignaturas()
  }, [])

  useEffect(() => {
    if (asignaturaId) {
      cargarEstudiantes()
    } else {
      setEstudiantes([])
    }
  }, [asignaturaId])

  const cargarAsignaturas = async () => {
    const { data, error } = await supabase
      .from('asignaturas')
      .select('*')
      .eq('estado', 'Activo')
      .order('nombre')

    if (error) {
      setMensaje(`Error al cargar asignaturas: ${error.message}`)
      return
    }

    setAsignaturas(data || [])
  }

  const asignaturaSeleccionada = asignaturas.find(
    item => item.id.toString() === asignaturaId.toString()
  )

  const cargarEstudiantes = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('asignatura_id', Number(asignaturaId))
      .order('grupo', { ascending: true })
      .order('nombre_completo', { ascending: true })

    if (error) {
      setMensaje(`Error al cargar estudiantes: ${error.message}`)
      setCargando(false)
      return
    }

    setEstudiantes(data || [])
    setCargando(false)
  }

  const normalizarTexto = (valor) => {
    return valor ? valor.toString().trim() : ''
  }

  const normalizarGrupo = (valor) => {
    const texto = normalizarTexto(valor).toUpperCase()
    if (!texto) return 'GRUPO ÚNICO'

    if (texto.startsWith('GRUPO')) return texto

    return texto
  }

  const importarExcel = (e) => {
    const archivo = e.target.files[0]

    if (!archivo) return

    if (!asignaturaId || !asignaturaSeleccionada) {
      setMensaje('Seleccione una asignatura antes de importar estudiantes.')
      e.target.value = ''
      return
    }

    const lector = new FileReader()

    lector.onload = async (evento) => {
      try {
        const datos = new Uint8Array(evento.target.result)
        const libro = XLSX.read(datos, { type: 'array' })
        const hojaNombre = libro.SheetNames[0]
        const hoja = libro.Sheets[hojaNombre]

        const filas = XLSX.utils.sheet_to_json(hoja, {
          header: 1,
          defval: ''
        })

        if (filas.length < 2) {
          setMensaje('El archivo no contiene estudiantes.')
          return
        }

        const listaBase = filas
          .slice(1)
          .map((fila) => {
            const codigo = normalizarTexto(fila[0])
            const nombreCompleto = normalizarTexto(fila[1]).toUpperCase()
            const grupo = normalizarGrupo(fila[2])

            return {
              codigo,
              nombre_completo: nombreCompleto,
              grupo,
              asignatura_id: Number(asignaturaId),
              asignatura_nombre: asignaturaSeleccionada.nombre
            }
          })
          .filter(item => item.codigo && item.nombre_completo)

        const mapaUnicos = new Map()

        listaBase.forEach(item => {
          const clave = `${item.codigo}-${item.asignatura_id}`
          mapaUnicos.set(clave, item)
        })

        const lista = Array.from(mapaUnicos.values())

        if (lista.length === 0) {
          setMensaje('No se encontraron estudiantes válidos.')
          e.target.value = ''
          return
        }

        const { error } = await supabase
          .from('estudiantes')
          .upsert(lista, {
            onConflict: 'codigo,asignatura_id',
            ignoreDuplicates: false
          })

        if (error) {
          setMensaje(`Error al importar estudiantes: ${error.message}`)
          e.target.value = ''
          return
        }

        const duplicados = listaBase.length - lista.length

        setMensaje(
          duplicados > 0
            ? `Se importaron o actualizaron ${lista.length} estudiantes. Se omitieron ${duplicados} duplicados del archivo.`
            : `Se importaron o actualizaron ${lista.length} estudiantes.`
        )

        e.target.value = ''
        cargarEstudiantes()

      } catch (error) {
        setMensaje('Error al leer el archivo Excel.')
        e.target.value = ''
      }
    }

    lector.readAsArrayBuffer(archivo)
  }

  const guardarEstudianteManual = async (e) => {
    e.preventDefault()
    setMensaje('')

    if (!asignaturaId || !asignaturaSeleccionada) {
      setMensaje('Seleccione una asignatura antes de agregar estudiante.')
      return
    }

    const codigo = normalizarTexto(nuevoEstudiante.codigo)
    const nombreCompleto = normalizarTexto(nuevoEstudiante.nombre_completo).toUpperCase()
    const grupo = normalizarGrupo(nuevoEstudiante.grupo)

    if (!codigo || !nombreCompleto) {
      setMensaje('Ingrese código y nombre completo del estudiante.')
      return
    }

    const registro = {
      codigo,
      nombre_completo: nombreCompleto,
      grupo,
      asignatura_id: Number(asignaturaId),
      asignatura_nombre: asignaturaSeleccionada.nombre
    }

    const { error } = await supabase
      .from('estudiantes')
      .upsert([registro], {
        onConflict: 'codigo,asignatura_id',
        ignoreDuplicates: false
      })

    if (error) {
      setMensaje(`Error al guardar estudiante: ${error.message}`)
      return
    }

    setMensaje('Estudiante registrado o actualizado correctamente.')

    setNuevoEstudiante({
      codigo: '',
      nombre_completo: '',
      grupo: ''
    })

    cargarEstudiantes()
  }

  const eliminarEstudiante = async (id) => {
    const confirmar = window.confirm('¿Eliminar este estudiante?')
    if (!confirmar) return

    const { error } = await supabase
      .from('estudiantes')
      .delete()
      .eq('id', id)

    if (error) {
      setMensaje(`Error al eliminar estudiante: ${error.message}`)
      return
    }

    setMensaje('Estudiante eliminado.')
    cargarEstudiantes()
  }

  const eliminarTodosAsignatura = async () => {
    if (!asignaturaId) {
      setMensaje('Seleccione una asignatura.')
      return
    }

    const confirmar = window.confirm(
      '¿Eliminar todos los estudiantes de esta asignatura?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('estudiantes')
      .delete()
      .eq('asignatura_id', Number(asignaturaId))

    if (error) {
      setMensaje(`Error al eliminar estudiantes: ${error.message}`)
      return
    }

    setMensaje('Estudiantes eliminados de esta asignatura.')
    cargarEstudiantes()
  }

  const gruposActuales = [
    ...new Set(estudiantes.map(item => item.grupo).filter(Boolean))
  ].sort()

  const esError =
    mensaje.includes('Error') ||
    mensaje.includes('Seleccione') ||
    mensaje.includes('Ingrese') ||
    mensaje.includes('No se') ||
    mensaje.includes('no contiene')

  return (
    <div style={page}>
      <h2 style={titulo}>Estudiantes por asignatura</h2>

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
        <label style={label}>
          Seleccione asignatura
        </label>

        <select
          value={asignaturaId}
          onChange={(e) => {
            setAsignaturaId(e.target.value)
            setMensaje('')
            setNuevoEstudiante({
              codigo: '',
              nombre_completo: '',
              grupo: ''
            })
          }}
          style={input}
        >
          <option value="">Seleccione...</option>

          {asignaturas.map(item => (
            <option key={item.id} value={item.id}>
              {item.nombre} {item.ciclo ? `- ${item.ciclo}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>
          Importar lista Excel
        </h3>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={importarExcel}
          style={input}
        />

        <p style={ayuda}>
          Formato requerido: columna A = código, columna B = apellidos y nombres, columna C = grupo.
        </p>

        {asignaturaSeleccionada && (
          <p style={asignaturaBox}>
            Asignatura seleccionada: {asignaturaSeleccionada.nombre}
          </p>
        )}
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>
          Agregar estudiante manualmente
        </h3>

        <form onSubmit={guardarEstudianteManual} style={form}>
          <input
            style={input}
            placeholder="Código del estudiante"
            value={nuevoEstudiante.codigo}
            onChange={(e) =>
              setNuevoEstudiante({
                ...nuevoEstudiante,
                codigo: e.target.value
              })
            }
          />

          <input
            style={input}
            placeholder="Apellidos y nombres"
            value={nuevoEstudiante.nombre_completo}
            onChange={(e) =>
              setNuevoEstudiante({
                ...nuevoEstudiante,
                nombre_completo: e.target.value
              })
            }
          />

          <input
            style={input}
            placeholder="Grupo. Ejemplo: A, B, C o Grupo A"
            value={nuevoEstudiante.grupo}
            onChange={(e) =>
              setNuevoEstudiante({
                ...nuevoEstudiante,
                grupo: e.target.value
              })
            }
          />

          {gruposActuales.length > 0 && (
            <div style={grupoSugerencias}>
              <strong>Grupos existentes:</strong>{' '}
              {gruposActuales.map(grupo => (
                <button
                  key={grupo}
                  type="button"
                  onClick={() =>
                    setNuevoEstudiante({
                      ...nuevoEstudiante,
                      grupo
                    })
                  }
                  style={chip}
                >
                  {grupo}
                </button>
              ))}
            </div>
          )}

          <button type="submit" style={botonAzul}>
            Guardar estudiante
          </button>
        </form>
      </div>

      {asignaturaId && (
        <div style={resumenGrid}>
          <Resumen titulo="Estudiantes" valor={estudiantes.length} fondo="#e0f2fe" />

          <button
            onClick={eliminarTodosAsignatura}
            style={botonRojo}
          >
            Eliminar lista
          </button>
        </div>
      )}

      {cargando ? (
        <p>Cargando estudiantes...</p>
      ) : (
        estudiantes.length > 0 && (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Código</th>
                  <th style={th}>Estudiante</th>
                  <th style={th}>Grupo</th>
                  <th style={th}>Asignatura</th>
                  <th style={th}>Acción</th>
                </tr>
              </thead>

              <tbody>
                {estudiantes.map(item => (
                  <tr key={item.id}>
                    <td style={td}>{item.codigo}</td>
                    <td style={td}>{item.nombre_completo}</td>
                    <td style={td}>{item.grupo}</td>
                    <td style={td}>{item.asignatura_nombre}</td>
                    <td style={td}>
                      <button
                        onClick={() => eliminarEstudiante(item.id)}
                        style={botonEliminar}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
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

const alert = {
  padding: '12px',
  borderRadius: '10px',
  marginBottom: '14px',
  fontWeight: 'bold',
  textAlign: 'center'
}

const card = {
  background: 'white',
  borderRadius: '14px',
  padding: '14px',
  marginBottom: '14px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
}

const label = {
  display: 'block',
  fontWeight: 'bold',
  marginBottom: '8px',
  textAlign: 'center'
}

const input = {
  width: '100%',
  padding: '12px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  fontSize: '14px',
  boxSizing: 'border-box'
}

const ayuda = {
  color: '#475569',
  fontSize: '13px',
  textAlign: 'center'
}

const asignaturaBox = {
  background: '#e0f2fe',
  padding: '10px',
  borderRadius: '10px',
  fontWeight: 'bold',
  textAlign: 'center'
}

const form = {
  display: 'grid',
  gap: '10px'
}

const grupoSugerencias = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '10px',
  fontSize: '13px'
}

const chip = {
  margin: '4px',
  padding: '5px 9px',
  borderRadius: '999px',
  border: '1px solid #0284c7',
  background: '#e0f2fe',
  color: '#075985',
  cursor: 'pointer',
  fontWeight: 'bold'
}

const resumenGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '10px',
  marginBottom: '14px'
}

const botonAzul = {
  background: '#0284c7',
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '10px',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const botonRojo = {
  background: '#dc2626',
  color: 'white',
  border: 'none',
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
  minWidth: '620px',
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

const botonEliminar = {
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '7px 10px',
  cursor: 'pointer'
}

export default Estudiantes