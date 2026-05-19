import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargarPerfil = async (usuario) => {
    if (!usuario?.id) {
      setPerfil(null)
      return null
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    if (error) {
      console.error('Error cargando perfil:', error)
      setPerfil(null)
      return null
    }

    if (!data) {
      console.warn('Usuario sin perfil asignado:', usuario.email)
      setPerfil(null)
      return null
    }

    if (data.estado && data.estado !== 'Activo') {
      console.warn('Usuario inactivo:', usuario.email)
      setPerfil(null)
      return null
    }

    setPerfil(data)
    return data
  }

  const verificarSesion = async () => {
    let timeoutSeguridad

    try {
      setLoading(true)

      timeoutSeguridad = setTimeout(() => {
        console.warn('Timeout de seguridad en autenticación')

        setSession(null)
        setUser(null)
        setPerfil(null)
        setLoading(false)
      }, 6000)

      const {
        data: { session: sesionActual },
        error
      } = await supabase.auth.getSession()

      if (error) {
        console.error('Error obteniendo sesión:', error)

        clearTimeout(timeoutSeguridad)

        setSession(null)
        setUser(null)
        setPerfil(null)
        setLoading(false)

        return
      }

      if (!sesionActual?.user) {
        clearTimeout(timeoutSeguridad)

        setSession(null)
        setUser(null)
        setPerfil(null)
        setLoading(false)

        return
      }

      setSession(sesionActual)
      setUser(sesionActual.user)

      await cargarPerfil(sesionActual.user)

      clearTimeout(timeoutSeguridad)

      setLoading(false)
    } catch (error) {
      console.error('Error inesperado verificando sesión:', error)

      clearTimeout(timeoutSeguridad)

      setSession(null)
      setUser(null)
      setPerfil(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    let activo = true
    let timeoutSeguridad

    const iniciar = async () => {
      try {
        setLoading(true)

        timeoutSeguridad = setTimeout(() => {
          if (!activo) return

          console.warn('Timeout inicial de autenticación')

          setSession(null)
          setUser(null)
          setPerfil(null)
          setLoading(false)
        }, 6000)

        const {
          data: { session: sesionInicial },
          error
        } = await supabase.auth.getSession()

        if (!activo) return

        if (error) {
          console.error('Error sesión inicial:', error)

          clearTimeout(timeoutSeguridad)

          setSession(null)
          setUser(null)
          setPerfil(null)
          setLoading(false)

          return
        }

        if (!sesionInicial?.user) {
          clearTimeout(timeoutSeguridad)

          setSession(null)
          setUser(null)
          setPerfil(null)
          setLoading(false)

          return
        }

        setSession(sesionInicial)
        setUser(sesionInicial.user)

        await cargarPerfil(sesionInicial.user)

        if (!activo) return

        clearTimeout(timeoutSeguridad)

        setLoading(false)
      } catch (error) {
        if (!activo) return

        console.error('Error inicial AuthContext:', error)

        clearTimeout(timeoutSeguridad)

        setSession(null)
        setUser(null)
        setPerfil(null)
        setLoading(false)
      }
    }

    iniciar()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, nuevaSesion) => {
      if (!activo) return

      setLoading(true)

      if (!nuevaSesion?.user) {
        setSession(null)
        setUser(null)
        setPerfil(null)
        setLoading(false)
        return
      }

      setSession(nuevaSesion)
      setUser(nuevaSesion.user)

      await cargarPerfil(nuevaSesion.user)

      setLoading(false)
    })

    return () => {
      activo = false

      if (timeoutSeguridad) {
        clearTimeout(timeoutSeguridad)
      }

      subscription?.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setLoading(false)
      return {
        ok: false,
        error: error.message
      }
    }

    const perfilUsuario = await cargarPerfil(data.user)

    setSession(data.session)
    setUser(data.user)
    setLoading(false)

    if (!perfilUsuario) {
      return {
        ok: false,
        error: 'Usuario sin perfil asignado.'
      }
    }

    return {
      ok: true,
      perfil: perfilUsuario
    }
  }

  const logout = async () => {
    try {
      setLoading(true)

      localStorage.clear()
      sessionStorage.clear()

      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 1500))
      ])

      setSession(null)
      setUser(null)
      setPerfil(null)
      setLoading(false)

      window.location.replace('/login')
    } catch (error) {
      console.error('Error cerrando sesión:', error)

      setSession(null)
      setUser(null)
      setPerfil(null)
      setLoading(false)

      window.location.replace('/login')
    }
  }

  const value = {
    session,
    user,
    perfil,
    loading,
    login,
    logout,
    verificarSesion,
    cargarPerfil
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}