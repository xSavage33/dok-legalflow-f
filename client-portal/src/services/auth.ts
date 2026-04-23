/**
 * ARCHIVO: auth.ts
 * PROPOSITO: Servicio de autenticacion que proporciona metodos para
 * login, obtener perfil, actualizar perfil, cambiar contrasena y logout.
 * Utiliza la instancia configurada de Axios (api) para las peticiones HTTP.
 */

// api - Instancia configurada de Axios con interceptores
import api from './api'

// Tipos TypeScript para respuestas de autenticacion y usuario
import type { AuthResponse, User } from '../types'

// ========== SERVICIO DE AUTENTICACION ==========

/**
 * Objeto que contiene todos los metodos relacionados con autenticacion
 * Exportado como constante nombrada para uso en toda la aplicacion
 */
export const authService = {

  // ========== LOGIN ==========

  /**
   * Inicia sesion con email y contrasena
   *
   * @param email - Correo electronico del usuario
   * @param password - Contrasena del usuario
   * @returns Promesa con la respuesta de autenticacion (usuario y tokens)
   *
   * La respuesta AuthResponse incluye:
   * - message: mensaje de confirmacion
   * - user: datos del usuario autenticado
   * - tokens: { access: string, refresh: string }
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Peticion POST al endpoint de login con credenciales
    const response = await api.post<AuthResponse>('/auth/login/', { email, password })
    // Retorna los datos de la respuesta
    return response.data
  },

  // ========== OBTENER PERFIL ==========

  /**
   * Obtiene los datos del perfil del usuario autenticado
   *
   * @returns Promesa con los datos del usuario
   *
   * Requiere que el usuario este autenticado (token valido)
   * El token se agrega automaticamente por el interceptor de api.ts
   */
  async getProfile(): Promise<User> {
    // Peticion GET al endpoint de perfil
    const response = await api.get<User>('/auth/profile/')
    // Retorna los datos del usuario
    return response.data
  },

  // ========== ACTUALIZAR PERFIL ==========

  /**
   * Actualiza los datos del perfil del usuario
   *
   * @param data - Datos parciales del usuario a actualizar
   * @returns Promesa con los datos actualizados del usuario
   *
   * Partial<User> permite enviar solo los campos que se quieren actualizar:
   * - first_name: nombre
   * - last_name: apellido
   * - phone: telefono
   * etc.
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    // Peticion PUT al endpoint de perfil con los datos a actualizar
    const response = await api.put<User>('/auth/profile/', data)
    // Retorna los datos actualizados
    return response.data
  },

  // ========== CAMBIAR CONTRASENA ==========

  /**
   * Cambia la contrasena del usuario autenticado
   *
   * @param old_password - Contrasena actual del usuario
   * @param new_password - Nueva contrasena deseada
   * @param new_password_confirm - Confirmacion de la nueva contrasena
   * @returns Promesa void (sin valor de retorno)
   *
   * El backend validara que:
   * - La contrasena actual sea correcta
   * - Las nuevas contrasenas coincidan
   * - La nueva contrasena cumpla requisitos de seguridad
   */
  async changePassword(
    old_password: string,
    new_password: string,
    new_password_confirm: string
  ): Promise<void> {
    // Peticion POST al endpoint de cambio de contrasena
    await api.post('/auth/password/change/', {
      old_password,
      new_password,
      new_password_confirm
    })
    // No retorna nada (void)
  },

  // ========== LOGOUT ==========

  /**
   * Cierra la sesion del usuario
   *
   * Esta funcion es sincrona y solo limpia el almacenamiento local.
   * No hace peticion al servidor ya que los tokens JWT se invalidan
   * automaticamente por expiracion.
   *
   * Elimina:
   * - access_token: token de acceso para peticiones autenticadas
   * - refresh_token: token para renovar el access_token
   */
  logout(): void {
    // Elimina el token de acceso
    localStorage.removeItem('access_token')
    // Elimina el token de refresco
    localStorage.removeItem('refresh_token')
  },
}
