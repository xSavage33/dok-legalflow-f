/**
 * ARCHIVO: Login.tsx
 * PROPOSITO: Pagina de inicio de sesion del Portal del Cliente.
 * Permite a los clientes autenticarse con su correo electronico y contrasena.
 * Incluye manejo de errores, estados de carga y redireccion automatica
 * si el usuario ya esta autenticado.
 */

// useState - Hook de React para manejar estados locales del formulario
import { useState } from 'react'

// useNavigate - Hook para navegacion programatica despues del login
// Navigate - Componente para redireccion declarativa
import { useNavigate, Navigate } from 'react-router-dom'

// Hook personalizado para acceder al contexto de autenticacion
import { useAuth } from '../context/AuthContext'

// Scale - Icono de balanza usado como logo de la aplicacion
import { Scale } from 'lucide-react'

/**
 * Componente Login - Pagina de inicio de sesion
 *
 * Caracteristicas:
 * - Formulario de login con email y contrasena
 * - Validacion basica del formulario (campos requeridos)
 * - Manejo de errores de autenticacion
 * - Estado de carga durante el proceso de login
 * - Redireccion automatica si ya esta autenticado
 */
export default function Login() {
  // ========== ESTADOS LOCALES ==========

  // Estado para el campo de correo electronico
  const [email, setEmail] = useState('')

  // Estado para el campo de contrasena
  const [password, setPassword] = useState('')

  // Estado para mensajes de error de autenticacion
  const [error, setError] = useState('')

  // Estado para indicar si el proceso de login esta en curso
  const [isLoading, setIsLoading] = useState(false)

  // ========== HOOKS ==========

  // Obtiene la funcion login y el estado de autenticacion del contexto
  const { login, isAuthenticated } = useAuth()

  // Hook para navegacion programatica
  const navigate = useNavigate()

  // ========== REDIRECCION SI YA ESTA AUTENTICADO ==========
  // Si el usuario ya inicio sesion, redirige a la pagina principal
  // replace evita agregar la pagina de login al historial
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  /**
   * Manejador del envio del formulario de login
   * @param e - Evento del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Previene el comportamiento por defecto del formulario (recarga de pagina)
    e.preventDefault()

    // Limpia errores anteriores
    setError('')

    // Activa el estado de carga
    setIsLoading(true)

    try {
      // Intenta iniciar sesion con las credenciales proporcionadas
      await login(email, password)

      // Si el login es exitoso, navega a la pagina principal
      navigate('/')
    } catch (err) {
      // Manejo de errores: muestra mensaje apropiado
      if (err instanceof Error) {
        // Si es un Error con mensaje, lo muestra
        setError(err.message)
      } else {
        // Mensaje generico para otros tipos de errores
        setError('Error al iniciar sesion. Verifique sus credenciales.')
      }
    } finally {
      // Desactiva el estado de carga independientemente del resultado
      setIsLoading(false)
    }
  }

  return (
    // Contenedor principal centrado vertical y horizontalmente
    // min-h-screen: altura minima de pantalla completa
    // flex items-center justify-center: centra el contenido
    // bg-gray-50: fondo gris claro
    // py-12 px-4: padding vertical y horizontal
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Contenedor del formulario con ancho maximo */}
      <div className="max-w-md w-full space-y-8">

        {/* ========== SECCION DEL ENCABEZADO ========== */}
        <div className="text-center">
          {/* Logo centrado */}
          <div className="flex justify-center">
            {/* Icono de balanza como logo de la aplicacion */}
            <Scale className="h-16 w-16 text-primary-600" />
          </div>
          {/* Titulo principal */}
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Portal del Cliente
          </h2>
          {/* Subtitulo con nombre de la aplicacion */}
          <p className="mt-2 text-sm text-gray-600">
            LegalFlow - Gestion Legal Inteligente
          </p>
        </div>

        {/* ========== FORMULARIO DE LOGIN ========== */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>

          {/* Mensaje de error - solo visible si hay un error */}
          {error && (
            // Contenedor de alerta con fondo rojo claro y texto rojo
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Contenedor de los campos del formulario */}
          <div className="space-y-4">

            {/* ========== CAMPO DE EMAIL ========== */}
            <div>
              {/* Etiqueta del campo */}
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electronico
              </label>
              {/* Campo de entrada para el email */}
              <input
                id="email"
                name="email"
                type="email"              // Tipo email para validacion nativa
                autoComplete="email"      // Ayuda al autocompletado del navegador
                required                   // Campo obligatorio
                value={email}             // Valor controlado por el estado
                onChange={(e) => setEmail(e.target.value)} // Actualiza el estado al cambiar
                className="input mt-1"    // Clase CSS personalizada
                placeholder="correo@ejemplo.com"
              />
            </div>

            {/* ========== CAMPO DE CONTRASENA ========== */}
            <div>
              {/* Etiqueta del campo */}
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contrasena
              </label>
              {/* Campo de entrada para la contrasena */}
              <input
                id="password"
                name="password"
                type="password"                    // Oculta los caracteres
                autoComplete="current-password"   // Ayuda al autocompletado
                required                           // Campo obligatorio
                value={password}                  // Valor controlado por el estado
                onChange={(e) => setPassword(e.target.value)} // Actualiza el estado
                className="input mt-1"
                placeholder="********"           // Placeholder con puntos
              />
            </div>
          </div>

          {/* ========== BOTON DE ENVIO ========== */}
          <button
            type="submit"
            disabled={isLoading}  // Deshabilitado durante la carga
            className="w-full btn btn-primary py-3" // Ancho completo con padding
          >
            {/* Texto dinamico segun el estado de carga */}
            {isLoading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
          </button>
        </form>

        {/* ========== MENSAJE INFORMATIVO ========== */}
        {/* Informacion para usuarios que no tienen cuenta */}
        <p className="text-center text-sm text-gray-500">
          Si no tiene una cuenta, contacte a su abogado para obtener acceso.
        </p>
      </div>
    </div>
  )
}
