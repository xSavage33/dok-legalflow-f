/**
 * auth.ts - Servicio de autenticacion
 *
 * Este archivo contiene todas las funciones relacionadas con la autenticacion
 * de usuarios. Proporciona una interfaz limpia para interactuar con los
 * endpoints de autenticacion de la API del backend.
 *
 * Funcionalidades principales:
 * - Login: Autenticacion de usuarios con email y contrasena
 * - Register: Registro de nuevos usuarios
 * - Logout: Cierre de sesion (invalidacion del refresh token)
 * - getProfile: Obtener los datos del usuario autenticado
 * - updateProfile: Actualizar los datos del perfil del usuario
 * - changePassword: Cambiar la contrasena del usuario
 *
 * Todas las funciones utilizan la instancia de axios configurada en api.ts,
 * lo que significa que automaticamente incluyen el token de autenticacion
 * y manejan la renovacion de tokens.
 */

// Importacion de la instancia configurada de axios para hacer peticiones HTTP
import api from './api'

// Importacion de los tipos TypeScript para tipar correctamente los datos
// User: estructura del objeto de usuario
// AuthTokens: estructura de los tokens JWT (access y refresh)
import type { User, AuthTokens } from '../types'

/**
 * Interface que define la estructura de la respuesta del endpoint de login
 * El servidor retorna un mensaje, los datos del usuario y los tokens JWT
 */
interface LoginResponse {
  // Mensaje del servidor (ej: "Login exitoso")
  message: string
  // Datos del usuario autenticado
  user: User
  // Tokens JWT para autenticacion
  tokens: AuthTokens
}

/**
 * Interface que define los datos necesarios para registrar un nuevo usuario
 * Todos los campos son obligatorios para el registro
 */
interface RegisterData {
  // Email del nuevo usuario (debe ser unico)
  email: string
  // Contrasena del usuario
  password: string
  // Confirmacion de la contrasena (debe coincidir con password)
  password_confirm: string
  // Nombre del usuario
  first_name: string
  // Apellido del usuario
  last_name: string
}

/**
 * Objeto authService que contiene todos los metodos de autenticacion
 * Se exporta como un objeto para agrupar logicamente las funciones relacionadas
 */
export const authService = {
  /**
   * Inicia sesion con email y contrasena
   *
   * Envia las credenciales al servidor y retorna los datos del usuario
   * junto con los tokens JWT si las credenciales son validas.
   *
   * @param email - Email del usuario
   * @param password - Contrasena del usuario
   * @returns Promise con LoginResponse que contiene user y tokens
   * @throws Error si las credenciales son invalidas o hay error de conexion
   *
   * @example
   * const { user, tokens } = await authService.login('user@email.com', 'password123')
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Realiza peticion POST al endpoint de login con las credenciales
    const response = await api.post<LoginResponse>('/auth/login/', { email, password })
    // Retorna solo los datos de la respuesta (sin metadatos de axios)
    return response.data
  },

  /**
   * Registra un nuevo usuario en el sistema
   *
   * Crea una nueva cuenta de usuario con los datos proporcionados.
   * Si el registro es exitoso, el servidor retorna los datos del usuario
   * y los tokens JWT (el usuario queda autenticado automaticamente).
   *
   * @param data - Objeto RegisterData con los datos del nuevo usuario
   * @returns Promise con LoginResponse que contiene el nuevo usuario y tokens
   * @throws Error si el email ya existe, las contrasenas no coinciden, etc.
   *
   * @example
   * const { user, tokens } = await authService.register({
   *   email: 'nuevo@email.com',
   *   password: 'pass123',
   *   password_confirm: 'pass123',
   *   first_name: 'Juan',
   *   last_name: 'Perez'
   * })
   */
  async register(data: RegisterData): Promise<LoginResponse> {
    // Realiza peticion POST al endpoint de registro con todos los datos
    const response = await api.post<LoginResponse>('/auth/register/', data)
    // Retorna los datos de la respuesta
    return response.data
  },

  /**
   * Cierra la sesion del usuario actual
   *
   * Invalida el refresh token en el servidor para que no pueda ser usado
   * para obtener nuevos access tokens. Esta funcion no retorna datos,
   * el manejo de limpieza de tokens locales se hace en el AuthContext.
   *
   * @returns Promise<void>
   * @throws Error si hay problemas de conexion (se maneja en AuthContext)
   *
   * @example
   * await authService.logout()
   */
  async logout(): Promise<void> {
    // Obtiene el refresh token del localStorage
    const refreshToken = localStorage.getItem('refresh_token')
    // Solo hace la peticion si existe un refresh token
    if (refreshToken) {
      // Envia el refresh token al servidor para invalidarlo
      await api.post('/auth/logout/', { refresh: refreshToken })
    }
  },

  /**
   * Obtiene los datos del perfil del usuario autenticado
   *
   * Realiza una peticion autenticada al servidor para obtener los datos
   * actuales del usuario. Util para verificar la sesion al cargar la app
   * o para obtener datos actualizados despues de cambios.
   *
   * @returns Promise con los datos del User
   * @throws Error si el token es invalido o ha expirado
   *
   * @example
   * const user = await authService.getProfile()
   * console.log(user.full_name) // "Juan Perez"
   */
  async getProfile(): Promise<User> {
    // Realiza peticion GET al endpoint de perfil
    // El token se agrega automaticamente por el interceptor de api.ts
    const response = await api.get<User>('/auth/profile/')
    // Retorna los datos del usuario
    return response.data
  },

  /**
   * Actualiza los datos del perfil del usuario
   *
   * Permite actualizar parcialmente los datos del usuario (PATCH).
   * Solo se envian los campos que se desean modificar.
   *
   * @param data - Objeto parcial con los campos a actualizar
   * @returns Promise con el User actualizado (datos completos)
   * @throws Error si hay validaciones fallidas o error de conexion
   *
   * @example
   * const updatedUser = await authService.updateProfile({
   *   first_name: 'Juan Carlos',
   *   phone: '+1234567890'
   * })
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    // Realiza peticion PATCH (actualizacion parcial) al endpoint de perfil
    // Partial<User> indica que no todos los campos son obligatorios
    const response = await api.patch<User>('/auth/profile/', data)
    // Retorna los datos actualizados del usuario
    return response.data
  },

  /**
   * Cambia la contrasena del usuario
   *
   * Requiere la contrasena actual para verificar la identidad y la nueva
   * contrasena con su confirmacion. El servidor valida que las contrasenas
   * nuevas coincidan y cumplan con los requisitos de seguridad.
   *
   * @param oldPassword - Contrasena actual del usuario
   * @param newPassword - Nueva contrasena
   * @param newPasswordConfirm - Confirmacion de la nueva contrasena
   * @returns Promise<void>
   * @throws Error si la contrasena actual es incorrecta o las nuevas no coinciden
   *
   * @example
   * await authService.changePassword('oldPass123', 'newPass456', 'newPass456')
   */
  async changePassword(oldPassword: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
    // Realiza peticion POST al endpoint de cambio de contrasena
    await api.post('/auth/password/change/', {
      old_password: oldPassword,           // Contrasena actual para verificacion
      new_password: newPassword,            // Nueva contrasena
      new_password_confirm: newPasswordConfirm,  // Confirmacion de la nueva contrasena
    })
  },
}
