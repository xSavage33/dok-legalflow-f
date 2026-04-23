/**
 * AuthContext.tsx - Contexto de autenticacion de React
 *
 * Este archivo implementa el patron Context de React para manejar el estado
 * de autenticacion de forma global en toda la aplicacion. Proporciona:
 *
 * - Estado del usuario actual (user)
 * - Estado de autenticacion (isAuthenticated)
 * - Estado de carga inicial (loading)
 * - Funciones para login, logout y actualizacion de usuario
 *
 * El contexto persiste la sesion utilizando tokens JWT almacenados en localStorage.
 * Al iniciar la aplicacion, verifica si existe un token valido y recupera
 * automaticamente el perfil del usuario.
 *
 * Uso: Envolver la aplicacion con <AuthProvider> y usar el hook useAuth()
 * para acceder al contexto desde cualquier componente.
 */

// Importacion de funciones y tipos de React necesarios para el contexto
// createContext: crea el objeto de contexto
// useContext: hook para consumir el contexto
// useState: hook para manejar estado local
// useEffect: hook para efectos secundarios (verificacion inicial de sesion)
// ReactNode: tipo para los componentes hijos
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Importacion del servicio de autenticacion que contiene las llamadas a la API
import { authService } from '../services/auth'

// Importacion del tipo User que define la estructura del objeto de usuario
import type { User } from '../types'

/**
 * Interface que define la estructura del contexto de autenticacion
 * Especifica todos los valores y funciones disponibles para los consumidores del contexto
 */
interface AuthContextType {
  // Usuario autenticado actual, null si no hay sesion activa
  user: User | null
  // Booleano que indica si hay un usuario autenticado
  isAuthenticated: boolean
  // Booleano que indica si se esta verificando la sesion inicial
  loading: boolean
  // Funcion asincrona para iniciar sesion con email y contrasena
  login: (email: string, password: string) => Promise<void>
  // Funcion asincrona para cerrar la sesion actual
  logout: () => Promise<void>
  // Funcion para actualizar los datos del usuario en el estado
  updateUser: (user: User) => void
}

// Creacion del contexto de autenticacion
// Se inicializa con null, el valor real se proporciona en el Provider
const AuthContext = createContext<AuthContextType | null>(null)

/**
 * AuthProvider - Componente proveedor del contexto de autenticacion
 *
 * Este componente debe envolver toda la aplicacion (o la parte que necesite
 * acceso al estado de autenticacion). Maneja:
 * - Verificacion inicial de sesion al cargar la aplicacion
 * - Login/logout de usuarios
 * - Persistencia de tokens en localStorage
 *
 * @param children - Componentes hijos que tendran acceso al contexto
 * @returns El proveedor de contexto con los componentes hijos
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Estado para almacenar el usuario autenticado actual
  // null indica que no hay usuario autenticado
  const [user, setUser] = useState<User | null>(null)

  // Estado para indicar si se esta cargando/verificando la sesion inicial
  // Comienza en true porque al montar el componente se verifica si hay token
  const [loading, setLoading] = useState(true)

  // Efecto que se ejecuta una sola vez al montar el componente
  // Verifica si existe un token de acceso guardado y recupera el perfil del usuario
  useEffect(() => {
    // Intenta obtener el token de acceso del localStorage
    const token = localStorage.getItem('access_token')

    // Si existe un token, intenta recuperar el perfil del usuario
    if (token) {
      authService
        .getProfile()  // Llama a la API para obtener los datos del usuario
        .then(setUser)  // Si tiene exito, guarda el usuario en el estado
        .catch(() => {
          // Si falla (token expirado, invalido, etc.), limpia los tokens
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setLoading(false))  // Siempre termina la carga
    } else {
      // Si no hay token, termina la carga inmediatamente
      setLoading(false)
    }
  }, [])  // Array de dependencias vacio = solo se ejecuta al montar

  /**
   * Funcion para iniciar sesion
   *
   * @param email - Email del usuario
   * @param password - Contrasena del usuario
   * @throws Error si las credenciales son invalidas o hay error de red
   */
  const login = async (email: string, password: string) => {
    // Llama al servicio de autenticacion para hacer login
    const response = await authService.login(email, password)

    // Guarda los tokens JWT en localStorage para persistir la sesion
    localStorage.setItem('access_token', response.tokens.access)   // Token de acceso (corta duracion)
    localStorage.setItem('refresh_token', response.tokens.refresh) // Token de refresco (larga duracion)

    // Actualiza el estado con los datos del usuario autenticado
    setUser(response.user)
  }

  /**
   * Funcion para cerrar sesion
   *
   * Intenta invalidar el token en el servidor y siempre limpia
   * el estado local, incluso si la llamada al servidor falla.
   */
  const logout = async () => {
    try {
      // Intenta invalidar la sesion en el servidor
      await authService.logout()
    } finally {
      // Siempre limpia los tokens y el estado local, aunque falle el servidor
      // Esto garantiza que el usuario pueda cerrar sesion incluso sin conexion
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    }
  }

  /**
   * Funcion para actualizar los datos del usuario en el estado
   * Util cuando se edita el perfil y se necesita reflejar los cambios
   *
   * @param updatedUser - Objeto con los nuevos datos del usuario
   */
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  // Renderiza el proveedor de contexto con todos los valores y funciones
  return (
    <AuthContext.Provider
      value={{
        user,                        // Usuario actual (o null)
        isAuthenticated: !!user,     // Convierte user a booleano: true si hay usuario, false si es null
        loading,                     // Estado de carga inicial
        login,                       // Funcion de login
        logout,                      // Funcion de logout
        updateUser,                  // Funcion para actualizar usuario
      }}
    >
      {/* Renderiza los componentes hijos dentro del proveedor */}
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth - Hook personalizado para acceder al contexto de autenticacion
 *
 * Proporciona una forma conveniente de acceder al contexto de autenticacion
 * desde cualquier componente funcional. Incluye validacion para asegurar
 * que se use dentro de un AuthProvider.
 *
 * @returns El objeto del contexto de autenticacion con user, isAuthenticated, loading, login, logout y updateUser
 * @throws Error si se usa fuera de un AuthProvider
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth()
 */
export function useAuth() {
  // Obtiene el valor actual del contexto
  const context = useContext(AuthContext)

  // Valida que el hook se este usando dentro de un AuthProvider
  // Si context es null, significa que no hay proveedor arriba en el arbol
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  // Retorna el contexto para que el componente pueda usar sus valores
  return context
}
