/**
 * PAGINA DE INICIO DE SESION - Login.tsx
 *
 * Este componente implementa la pantalla de autenticacion del sistema LegalFlow.
 * Es la puerta de entrada al panel de administracion del despacho legal.
 *
 * Caracteristicas principales:
 * - Formulario de inicio de sesion con email y contrasena
 * - Validacion de campos requeridos
 * - Manejo de errores de autenticacion con mensajes claros
 * - Redireccion automatica si el usuario ya esta autenticado
 * - Diseno dividido (split screen) en desktop: branding a la izquierda, formulario a la derecha
 * - Vista adaptativa para dispositivos moviles
 * - Incluye credenciales de demo para facilitar pruebas
 *
 * El componente utiliza el contexto de autenticacion para:
 * - Verificar si el usuario ya esta logueado
 * - Ejecutar la funcion de login con las credenciales
 *
 * Flujo de autenticacion:
 * 1. Usuario ingresa email y contrasena
 * 2. Al enviar, se llama a login() del AuthContext
 * 3. Si es exitoso, se redirige al dashboard principal
 * 4. Si falla, se muestra mensaje de error
 */

// ============================================================================
// IMPORTACIONES
// ============================================================================

// Hook de React para manejar el estado local del componente
import { useState } from 'react'

// Hooks de React Router para navegacion
// useNavigate: permite navegar programaticamente a otras rutas
// Navigate: componente para redireccion declarativa
import { useNavigate, Navigate } from 'react-router-dom'

// Hook personalizado para acceder al contexto de autenticacion
// Proporciona el estado de autenticacion y la funcion de login
import { useAuth } from '../context/AuthContext'

// Iconos de la biblioteca Lucide React para la interfaz visual
// Scale: icono de balanza - representa justicia/legal (logo de la app)
// Mail: icono de sobre - usado en campo de email
// Lock: icono de candado - usado en campo de contrasena
// Loader2: icono de carga con animacion de giro
import { Scale, Mail, Lock, Loader2 } from 'lucide-react'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente principal de la pagina de login
 * Renderiza el formulario de inicio de sesion con diseno split-screen
 */
export default function Login() {
  // ==========================================================================
  // AUTENTICACION Y CONTEXTO
  // ==========================================================================

  // Obtiene el estado de autenticacion y la funcion de login del contexto
  // isAuthenticated: booleano que indica si hay un usuario logueado
  // login: funcion asincrona para autenticar con email y contrasena
  const { isAuthenticated, login } = useAuth()

  // Hook para navegar programaticamente despues del login exitoso
  const navigate = useNavigate()

  // ==========================================================================
  // ESTADOS LOCALES
  // ==========================================================================

  // Estado para el campo de email
  const [email, setEmail] = useState('')

  // Estado para el campo de contrasena
  const [password, setPassword] = useState('')

  // Estado para mensajes de error de autenticacion
  const [error, setError] = useState('')

  // Estado para indicar que el login esta en proceso
  // Se usa para deshabilitar el boton y mostrar spinner
  const [loading, setLoading] = useState(false)

  // ==========================================================================
  // REDIRECCION SI YA ESTA AUTENTICADO
  // ==========================================================================

  /**
   * Si el usuario ya esta autenticado, redirige al dashboard
   * Esto previene que usuarios logueados vean la pantalla de login
   */
  if (isAuthenticated) {
    return <Navigate to="/" />
  }

  // ==========================================================================
  // FUNCIONES AUXILIARES
  // ==========================================================================

  /**
   * Maneja el envio del formulario de login
   * Ejecuta la autenticacion y maneja los posibles resultados
   * @param e - Evento del formulario
   */
  const handleSubmit = async (e: React.FormEvent) => {
    // Previene el comportamiento por defecto del formulario (recargar pagina)
    e.preventDefault()

    // Limpia cualquier error previo antes de intentar login
    setError('')

    // Activa el estado de carga
    setLoading(true)

    try {
      // Intenta autenticar con las credenciales proporcionadas
      await login(email, password)

      // Si el login es exitoso, navega al dashboard principal
      navigate('/')
    } catch (err: any) {
      // Si falla, muestra el mensaje de error del servidor o uno generico
      // El backend puede retornar errores especificos en response.data.detail
      setError(err.response?.data?.detail || 'Credenciales invalidas. Por favor intenta de nuevo.')
    } finally {
      // Siempre desactiva el estado de carga, exito o error
      setLoading(false)
    }
  }

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="min-h-screen flex">

      {/* ==================================================================== */}
      {/* LADO IZQUIERDO - BRANDING (solo visible en desktop) */}
      {/* Seccion con gradiente que muestra la identidad de la marca */}
      {/* ==================================================================== */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 p-12 flex-col justify-between">

        {/* Logo y nombre de la aplicacion en la parte superior */}
        <div>
          <div className="flex items-center gap-3">
            {/* Contenedor del icono con fondo semi-transparente */}
            <div className="p-2 bg-white/10 rounded-xl">
              {/* Icono de balanza - representa justicia/legal */}
              <Scale className="h-8 w-8 text-white" />
            </div>
            {/* Nombre de la aplicacion */}
            <span className="text-2xl font-bold text-white">LegalFlow</span>
          </div>
        </div>

        {/* Contenido central - Mensaje de valor de la aplicacion */}
        <div className="space-y-6">
          {/* Titulo principal con salto de linea para mejor legibilidad */}
          <h1 className="text-4xl font-bold text-white leading-tight">
            Gestion Legal<br />Simplificada
          </h1>
          {/* Descripcion breve del producto */}
          <p className="text-primary-200 text-lg max-w-md">
            La plataforma integral para despachos de abogados. Administra casos, documentos, tiempo y facturacion en un solo lugar.
          </p>
        </div>

        {/* Copyright en la parte inferior */}
        <div className="text-primary-300 text-sm">
          2024 LegalFlow. Todos los derechos reservados.
        </div>
      </div>

      {/* ==================================================================== */}
      {/* LADO DERECHO - FORMULARIO DE LOGIN */}
      {/* Seccion principal con el formulario de inicio de sesion */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md">

          {/* ---------------------------------------------------------------- */}
          {/* LOGO MOVIL */}
          {/* Solo visible en pantallas pequenas donde no se muestra el panel izquierdo */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 justify-center">
              <div className="p-2 bg-primary-900 rounded-xl">
                <Scale className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-primary-900">LegalFlow</span>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CONTENIDO PRINCIPAL DEL FORMULARIO */}
          {/* ---------------------------------------------------------------- */}
          <div className="space-y-6">

            {/* Cabecera con mensaje de bienvenida */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Bienvenido
              </h2>
              <p className="mt-2 text-gray-600">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* FORMULARIO */}
            {/* -------------------------------------------------------------- */}
            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Mensaje de error de autenticacion */}
              {/* Solo se muestra si hay un error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-slide-in">
                  {error}
                </div>
              )}

              {/* Campos del formulario */}
              <div className="space-y-4">

                {/* Campo: Correo electronico */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electronico
                  </label>
                  {/* Contenedor relativo para posicionar el icono */}
                  <div className="relative">
                    {/* Icono de correo posicionado a la izquierda */}
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"  // Padding izquierdo para el icono
                      placeholder="tu@email.com"
                      autoComplete="email"  // Ayuda al navegador a autocompletar
                    />
                  </div>
                </div>

                {/* Campo: Contrasena */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contrasena
                  </label>
                  {/* Contenedor relativo para posicionar el icono */}
                  <div className="relative">
                    {/* Icono de candado posicionado a la izquierda */}
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10"  // Padding izquierdo para el icono
                      placeholder="********"  // Placeholder visual de caracteres ocultos
                      autoComplete="current-password"  // Ayuda al navegador
                    />
                  </div>
                </div>
              </div>

              {/* Boton de inicio de sesion */}
              <button
                type="submit"
                disabled={loading}  // Deshabilitado mientras se procesa
                className="w-full btn btn-primary py-3 inline-flex items-center justify-center"
              >
                {loading ? (
                  /* Estado de carga: muestra spinner y texto de carga */
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Iniciando sesion...
                  </>
                ) : (
                  /* Estado normal: solo texto */
                  'Iniciar sesion'
                )}
              </button>
            </form>

            {/* -------------------------------------------------------------- */}
            {/* CREDENCIALES DE DEMO */}
            {/* Caja informativa con credenciales para pruebas */}
            {/* -------------------------------------------------------------- */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {/* Credenciales de demostración para facilitar pruebas */}
                <strong>Demo:</strong> admin@legalflow.com / Admin123!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
