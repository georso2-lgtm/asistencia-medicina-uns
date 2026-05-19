import { useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../supabaseClient'

function GenerarQR() {
  const [sesiones, setSesiones] = useState([])
  const [sesionSeleccionada, setSesionSeleccionada] = useState('')
  const [datosQR, setDatosQR] = useState('')
  const [expiraEn, setExpiraEn] = useState(null)

  useEffect(() => {
    cargarSesiones()
  }, [])

  const cargarSesiones = async () => {
    const { data, error } = await supabase
      .from('sesiones')
      .select('*')
      .eq('estado', 'Abierta')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })

    if (!error) {
      setSesiones(data || [])
    }
  }

  const generarQR = () => {
    if (!sesionSeleccionada) {
      alert('Seleccione una sesión.')
      return
    }

    const expira = Date.now() + 15 * 60 * 1000

    const url = `${window.location.origin}/marcar-asistencia?sesionId=${sesionSeleccionada}&expira=${expira}`

    setDatosQR(url)
    setExpiraEn(expira)
  }

  const sesion = sesiones.find(
    s => s.id.toString() === sesionSeleccionada
  )

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial' }}>
      <h2>Generar Código QR</h2>

      <div style={{ maxWidth: '500px', marginBottom: '25px' }}>
        <label style={{ fontWeight: 'bold' }}>Seleccione sesión</label>

        <select
          value={sesionSeleccionada}
          onChange={(e) => {
            setSesionSeleccionada(e.target.value)
            setDatosQR('')
            setExpiraEn(null)
          }}
          style={{ width: '100%', padding: '12px', marginTop: '8px' }}
        >
          <option value="">Seleccione...</option>

          {sesiones.map((sesion) => (
            <option key={sesion.id} value={sesion.id}>
              {sesion.fecha} - {sesion.tipo} - {sesion.grupo}
            </option>
          ))}
        </select>
      </div>

      {sesion && (
        <div style={{
          background: '#e0f2fe',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          maxWidth: '500px'
        }}>
          <p><strong>Fecha:</strong> {sesion.fecha}</p>
          <p><strong>Tipo:</strong> {sesion.tipo}</p>
          <p><strong>Grupo:</strong> {sesion.tipo === 'Teoría' ? 'Todos los grupos' : sesion.grupo}</p>
          <p><strong>Docente:</strong> {sesion.docente}</p>
        </div>
      )}

      <button
        onClick={generarQR}
        style={{
          padding: '14px 20px',
          background: '#0284c7',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer'
        }}
      >
        Generar QR válido por 15 minutos
      </button>

      {datosQR && (
        <div style={{
          marginTop: '40px',
          background: 'white',
          padding: '30px',
          borderRadius: '16px',
          width: 'fit-content',
          boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        }}>
          <QRCodeCanvas
            value={datosQR}
            size={300}
            bgColor="#ffffff"
            fgColor="#000000"
            level="H"
          />

          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>
            QR de asistencia generado
          </p>

          <p style={{ textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>
            Válido hasta: {new Date(expiraEn).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  )
}

export default GenerarQR