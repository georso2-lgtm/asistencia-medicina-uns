import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react'

import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)

  const [loading, setLoading] = useState(true)

  useEffect(() => {

    obtenerSesion()

    const {
      data: listener
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {

        if (session?.user) {

          setUser(session.user)

          await cargarPerfil(session.user)

        } else {

          setUser(null)
          setPerfil(null)
        }

        setLoading(false)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }

  }, [])

  const obtenerSesion = async () => {

    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session?.user) {

      setUser(session.user)

      await cargarPerfil(session.user)

    }

    setLoading(false)
  }

  const cargarPerfil = async (usuario) => {

    try {

      console.log('USER ID:', usuario.id)
      console.log('EMAIL:', usuario.email)

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', usuario.id)
        .single()

      if (error) {

        console.error('ERROR PERFIL:', error)

        setPerfil(null)

        return
      }

      console.log('PERFIL ENCONTRADO:', data)

      setPerfil(data)

    } catch (err) {

      console.error(err)

      setPerfil(null)
    }
  }

  const login = async (email, password) => {

    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  }

  const logout = async () => {

    await supabase.auth.signOut()

    setUser(null)
    setPerfil(null)

    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}