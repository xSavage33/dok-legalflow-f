/**
 * ARCHIVO: api.ts
 * PROPOSITO: Configuracion del cliente HTTP Axios para comunicacion con el backend.
 * Incluye interceptores para manejo automatico de tokens JWT y renovacion
 * de tokens expirados (refresh token flow).
 */

// axios - Biblioteca HTTP para realizar peticiones al servidor
import axios from 'axios'

// ========== CONFIGURACION DE URL BASE ==========

/**
 * URL base del API
 * Lee la variable de entorno VITE_API_URL o usa '/api' como fallback
 * En desarrollo: puede ser 'http://localhost:8000/api'
 * En produccion: puede ser la URL del backend desplegado
 */
const API_URL = import.meta.env.VITE_API_URL || '/api'

// ========== CREACION DE INSTANCIA AXIOS ==========

/**
 * Instancia configurada de Axios
 * Tiene configuracion base que se aplica a todas las peticiones
 */
const api = axios.create({
  // URL base que se antepone a todas las rutas relativas
  baseURL: API_URL,
  // Headers por defecto para todas las peticiones
  headers: {
    // Indica que enviamos y esperamos JSON
    'Content-Type': 'application/json',
  },
})

// ========== INTERCEPTOR DE PETICIONES (REQUEST) ==========

/**
 * Interceptor que se ejecuta antes de cada peticion
 * Agrega automaticamente el token de acceso a los headers
 */
api.interceptors.request.use((config) => {
  // Obtiene el token de acceso del localStorage
  const token = localStorage.getItem('access_token')

  // Si existe un token, lo agrega al header de autorizacion
  if (token) {
    // Formato Bearer: estandar para tokens JWT
    config.headers.Authorization = `Bearer ${token}`
  }

  // Retorna la configuracion modificada
  return config
})

// ========== INTERCEPTOR DE RESPUESTAS (RESPONSE) ==========

/**
 * Interceptor que maneja las respuestas del servidor
 * Especialmente util para manejar tokens expirados (401)
 */
api.interceptors.response.use(
  // Primer callback: respuestas exitosas (2xx)
  // Simplemente retorna la respuesta sin modificar
  (response) => response,

  // Segundo callback: maneja errores
  async (error) => {
    // Guarda la configuracion de la peticion original
    const originalRequest = error.config

    // ========== LOGICA DE REFRESH TOKEN ==========
    /**
     * Si el error es 401 (no autorizado) y no es un reintento
     * Intenta renovar el token de acceso usando el refresh token
     */
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Marca la peticion para evitar bucles infinitos de reintentos
      originalRequest._retry = true

      try {
        // Obtiene el refresh token del localStorage
        const refreshToken = localStorage.getItem('refresh_token')

        if (refreshToken) {
          // Hace peticion al endpoint de renovacion de token
          // Usa axios directamente (no la instancia api) para evitar interceptores
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          })

          // Extrae el nuevo token de acceso de la respuesta
          const { access } = response.data

          // Guarda el nuevo token en localStorage
          localStorage.setItem('access_token', access)

          // Actualiza el header de la peticion original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${access}`

          // Reintenta la peticion original con el nuevo token
          return api(originalRequest)
        }
      } catch {
        // Si falla la renovacion del token:
        // 1. Limpia los tokens almacenados
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        // 2. Redirige al usuario a la pagina de login
        window.location.href = '/login'
      }
    }

    // Si no es un error 401 o el refresh falla, rechaza la promesa
    // para que el error sea manejado por el codigo que hizo la peticion
    return Promise.reject(error)
  }
)

// ========== EXPORTACION ==========

// Exporta la instancia configurada de axios como exportacion por defecto
export default api
