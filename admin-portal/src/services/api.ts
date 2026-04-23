/**
 * api.ts - Configuracion del cliente HTTP Axios
 *
 * Este archivo configura una instancia de Axios que se utiliza para todas
 * las llamadas HTTP a la API del backend. Proporciona:
 *
 * - Configuracion base de la URL de la API
 * - Interceptor de peticiones para agregar el token de autenticacion automaticamente
 * - Interceptor de respuestas para manejar la renovacion automatica de tokens JWT
 *
 * El sistema de tokens JWT funciona de la siguiente manera:
 * 1. El access_token es de corta duracion y se usa para autenticar cada peticion
 * 2. El refresh_token es de larga duracion y se usa para obtener nuevos access_token
 * 3. Cuando el access_token expira (error 401), se intenta renovar automaticamente
 *
 * Uso: Importar la instancia 'api' y usarla para hacer peticiones HTTP
 * Ejemplo: api.get('/usuarios'), api.post('/casos', data)
 */

// Importacion de la biblioteca axios para realizar peticiones HTTP
import axios from 'axios'

// Constante que almacena la URL base de la API
// Primero intenta obtenerla de las variables de entorno (VITE_API_URL)
// Si no esta definida, usa '/api' como valor por defecto (util para proxy en desarrollo)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Creacion de una instancia personalizada de axios
// Esto permite configurar opciones por defecto para todas las peticiones
const api = axios.create({
  // URL base que se antepondra a todas las rutas de las peticiones
  // Ejemplo: api.get('/users') se convierte en GET {API_BASE_URL}/users
  baseURL: API_BASE_URL,
  // Headers por defecto que se enviaran en todas las peticiones
  headers: {
    // Indica que el cuerpo de las peticiones estara en formato JSON
    'Content-Type': 'application/json',
  },
})

/**
 * Interceptor de peticiones (Request Interceptor)
 *
 * Este interceptor se ejecuta ANTES de que cada peticion sea enviada al servidor.
 * Su funcion principal es agregar el token de autenticacion JWT al header
 * Authorization de cada peticion.
 *
 * Flujo:
 * 1. Se obtiene el token del localStorage
 * 2. Si existe, se agrega al header Authorization con el formato "Bearer {token}"
 * 3. La peticion continua con el token agregado
 */
api.interceptors.request.use(
  // Funcion que se ejecuta para cada peticion exitosa antes de enviar
  (config) => {
    // Obtiene el token de acceso almacenado en localStorage
    const token = localStorage.getItem('access_token')

    // Si existe un token, lo agrega al header Authorization
    if (token) {
      // El formato "Bearer {token}" es el estandar para autenticacion JWT
      config.headers.Authorization = `Bearer ${token}`
    }

    // Retorna la configuracion modificada para que la peticion continue
    return config
  },
  // Funcion que se ejecuta si hay un error antes de enviar la peticion
  // Simplemente rechaza la promesa con el error
  (error) => Promise.reject(error)
)

/**
 * Interceptor de respuestas (Response Interceptor)
 *
 * Este interceptor se ejecuta DESPUES de recibir cada respuesta del servidor.
 * Su funcion principal es manejar automaticamente la renovacion de tokens
 * cuando el access_token ha expirado (error 401).
 *
 * Flujo de renovacion de token:
 * 1. Se recibe un error 401 (No autorizado / Token expirado)
 * 2. Se intenta renovar el token usando el refresh_token
 * 3. Si tiene exito, se reintenta la peticion original con el nuevo token
 * 4. Si falla, se redirige al usuario a la pagina de login
 */
api.interceptors.response.use(
  // Funcion para respuestas exitosas - simplemente las retorna sin modificar
  (response) => response,

  // Funcion para manejar errores en las respuestas
  async (error) => {
    // Guarda la configuracion de la peticion original para poder reintentarla
    const originalRequest = error.config

    // Verifica si es un error 401 (token expirado/invalido)
    // Y si no se ha intentado renovar el token ya (_retry previene bucles infinitos)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Marca la peticion como "ya intentada" para evitar bucles infinitos
      // Si la renovacion falla, no se volvera a intentar
      originalRequest._retry = true

      try {
        // Obtiene el refresh_token del localStorage
        const refreshToken = localStorage.getItem('refresh_token')

        // Solo intenta renovar si existe un refresh_token
        if (refreshToken) {
          // Hace una peticion POST al endpoint de renovacion de token
          // Nota: Usa axios directamente, no la instancia 'api', para evitar
          // que el interceptor interfiera con esta peticion
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,  // Envia el refresh_token en el cuerpo
          })

          // Extrae el nuevo access_token de la respuesta
          const { access } = response.data

          // Guarda el nuevo access_token en localStorage
          localStorage.setItem('access_token', access)

          // Actualiza el header de la peticion original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${access}`

          // Reintenta la peticion original con el nuevo token
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Si la renovacion del token falla, limpia todos los tokens
        // Esto significa que el refresh_token tambien expiro o es invalido
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        // Redirige al usuario a la pagina de login
        // Usa window.location.href para forzar una navegacion completa
        window.location.href = '/login'
      }
    }

    // Si no es un error 401 o si ya se intento renovar, rechaza con el error original
    return Promise.reject(error)
  }
)

// Exporta la instancia configurada de axios como exportacion por defecto
// Esto permite importarla como: import api from './api'
export default api
