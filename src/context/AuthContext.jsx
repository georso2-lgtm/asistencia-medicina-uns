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

    if (error || !data) {
      console.error('Error o perfil no encontrado:', error)
      setPerfil(null)
      return null
    }

    if (data.estado && data.estado !== 'Activo') {
      setPerfil(null)
      return null
    }

    setPerfil(data)
    return data
  }

  const verificarSesion = async () => {
    try {
      setLoading(true)

      const resultado = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo agotado verificando sesión')), 6000)
        )
      ])

      const sesionActual = resultado?.data?.session

      if (!sesionActual?.user) {
        setSession(null)
        setUser(null)
        setPerfil(null)
        setLoading(false)
        return
      }

      setSession(sesionActual)
      setUser(sesionActual.user)

      await cargarPerfil(sesionActual.user)

      setLoading(false)
    } catch (error) {
      console.error('verificarSesion:', error)

      setSession(null)
      setUser(null)
      setPerfil(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    verificarSesion()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setTimeout(async () => {
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
      }, 0)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    try {
      setLoading(false)

      const resultado = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo agotado al iniciar sesión')), 8000)
        )
      ])

      if (resultado.error) {
        return {
          ok: false,
          error: resultado.error.message
        }
      }

      const usuario = resultado.data.user
      const sesionNueva = resultado.data.session

      const perfilUsuario = await cargarPerfil(usuario)

      if (!perfilUsuario) {
        return {
          ok: false,
          error: 'Usuario sin perfil asignado.'
        }
      }

      setSession(sesionNueva)
      setUser(usuario)
      setPerfil(perfilUsuario)

      return {
        ok: true,
        perfil: perfilUsuario
      }
    } catch (error) {
      console.error('login:', error)

      return {
        ok: false,
        error: error.message
      }
    }
  }

  const logout = async () => {
    try {
      localStorage.clear()
      sessionStorage.clear()

      setSession(null)
      setUser(null)
      setPerfil(null)
      setLoading(false)

      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 1500))
      ])

      window.location.replace('/login')
    } catch (error) {
      console.error('logout:', error)

      localStorage.clear()
      sessionStorage.clear()

      setSession(null)
      setUser(null)
      setPerfil(null)
      setLoading(false)

      window.location.replace('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        perfil,
        loading,
        login,
        logout,
        verificarSesion,
        cargarPerfil
      }}
    >
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