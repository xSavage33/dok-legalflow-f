/**
 * ARCHIVO: AuthContext.tsx
 * PROPOSITO: Contexto de React para manejo global del estado de autenticacion.
 * Proporciona el usuario actual, estado de carga, y funciones de login/logout
 * a todos los componentes de la aplicacion a traves de un Provider.
 */

// Hooks de React
// createContext: crea un contexto para compartir datos entre componentes
// useContext: permite a los componentes consumir el contexto
// useState: maneja el estado local del contexto
// useEffect: ejecuta efectos secundarios (verificar autenticacion al montar)
// ReactNode: tipo para los children del Provider
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Servicio de autenticacion con metodos para login, logout, etc.
import { authService } from '../services/auth'

// Tipo User para tipar el estado del usuario
import type { User } from '../types'

// ========== INTERFAZ DEL CONTEXTO ==========

/**
 * Define la estructura del valor del contexto de autenticacion
 * Esto es lo que estara disponible para los componentes que consuman el contexto
 */
interface AuthContextType {
  // Usuario autenticado actual (null si no hay sesion)
  user: User | null

  // Indica si se esta verificando la autenticacion inicial
  isLoading: boolean

  // Indica si hay un usuario autenticado (derivado de user !== null)
  isAuthenticated: boolean

  // Funcion para iniciar sesion
  login: (email: string, password: string) => Promise<void>

  // Funcion para cerrar sesion
  logout: () => void

  // Funcion para actualizar los datos del usuario en el contexto
  updateUser: (user: User) => void
}

// ========== CREACION DEL CONTEXTO ==========

/**
 * Crea el contexto de autenticacion con valor inicial undefined
 * El tipo es AuthContextType | undefined porque inicialmente no hay valor
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ========== COMPONENTE PROVIDER ==========

/**
 * Componente AuthProvider que envuelve la aplicacion y proporciona
 * el estado de autenticacion a todos los componentes hijos
 *
 * @param children - Componentes hijos que tendran acceso al contexto
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // ========== ESTADOS ==========

  // Estado del usuario autenticado (null si no hay sesion activa)
  const [user, setUser] = useState<User | null>(null)

  // Estado de carga (true mientras se verifica la autenticacion inicial)
  const [isLoading, setIsLoading] = useState(true)

  // ========== EFECTO: INICIALIZACION DE AUTENTICACION ==========

  /**
   * useEffect que se ejecuta al montar el componente
   * Verifica si hay un token guardado y obtiene los datos del usuario
   */
  useEffect(() => {
    /**
     * Funcion asincrona para inicializar la autenticacion
     * Verifica tokens existentes y obtiene el perfil del usuario
     */
    const initAuth = async () => {
      // Obtiene el token de acceso del localStorage
      const token = localStorage.getItem('access_token')

      // Si hay un token, intenta obtener el perfil del usuario
      if (token) {
        try {
          // Obtiene los datos del usuario del backend
          const userData = await authService.getProfile()

          // IMPORTANTE: Verifica que el usuario sea un cliente
          // Este portal es exclusivo para clientes
          if (userData.role !== 'client') {
            // Si no es cliente, cierra la sesion
            authService.logout()
            setUser(null)
          } else {
            // Si es cliente, establece el usuario en el estado
            setUser(userData)
          }
        } catch {
          // Si hay error (token invalido/expirado), limpia la sesion
          authService.logout()
          setUser(null)
        }
      }

      // Finaliza el estado de carga
      setIsLoading(false)
    }

    // Ejecuta la inicializacion
    initAuth()
  }, []) // Array vacio: solo se ejecuta al montar

  // ========== FUNCION: LOGIN ==========

  /**
   * Inicia sesion con email y contrasena
   * Guarda los tokens y establece el usuario en el estado
   *
   * @param email - Correo electronico del usuario
   * @param password - Contrasena del usuario
   * @throws Error si el usuario no es un cliente
   */
  const login = async (email: string, password: string) => {
    // Llama al servicio de autenticacion
    const response = await authService.login(email, password)

    // Verifica que el usuario sea un cliente
    if (response.user.role !== 'client') {
      // Si no es cliente, lanza un error
      throw new Error('Este portal es solo para clientes')
    }

    // Guarda los tokens en localStorage
    localStorage.setItem('access_token', response.tokens.access)
    localStorage.setItem('refresh_token', response.tokens.refresh)

    // Establece el usuario en el estado
    setUser(response.user)
  }

  // ========== FUNCION: LOGOUT ==========

  /**
   * Cierra la sesion del usuario
   * Limpia los tokens y resetea el estado del usuario
   */
  const logout = () => {
    // Llama al servicio para limpiar tokens del localStorage
    authService.logout()

    // Resetea el estado del usuario a null
    setUser(null)
  }

  // ========== FUNCION: UPDATE USER ==========

  /**
   * Actualiza los datos del usuario en el contexto
   * Util despues de actualizar el perfil
   *
   * @param userData - Nuevos datos del usuario
   */
  const updateUser = (userData: User) => {
    // Actualiza el estado con los nuevos datos
    setUser(userData)
  }

  // ========== RENDERIZADO DEL PROVIDER ==========

  return (
    // El Provider envuelve a los children y les proporciona el valor del contexto
    <AuthContext.Provider
      value={{
        // Usuario actual (null si no autenticado)
        user,
        // Estado de carga durante verificacion inicial
        isLoading,
        // Booleano que indica si hay usuario (double negation: convierte a boolean)
        isAuthenticated: !!user,
        // Funcion de login
        login,
        // Funcion de logout
        logout,
        // Funcion para actualizar usuario
        updateUser,
      }}
    >
      {/* Renderiza los componentes hijos */}
      {children}
    </AuthContext.Provider>
  )
}

// ========== HOOK PERSONALIZADO ==========

/**
 * Hook personalizado para consumir el contexto de autenticacion
 * Proporciona una forma conveniente y segura de acceder al contexto
 *
 * @returns El valor del contexto de autenticacion
 * @throws Error si se usa fuera de un AuthProvider
 *
 * Ejemplo de uso:
 * const { user, login, logout } = useAuth()
 */
export function useAuth() {
  // Obtiene el valor del contexto
  const context = useContext(AuthContext)

  // Si el contexto es undefined, significa que el hook se uso fuera del Provider
  if (context === undefined) {
    // Lanza un error descriptivo para ayudar al desarrollador
    throw new Error('useAuth must be used within an AuthProvider')
  }

  // Retorna el contexto con todos sus valores y funciones
  return context
}
