/**
 * PAGINA DE PERFIL DE USUARIO - Profile.tsx
 *
 * Este componente implementa la pagina de configuracion del perfil personal.
 * Permite a los usuarios autenticados gestionar su informacion personal:
 *
 * - Ver y editar informacion basica (nombre, apellido, telefono)
 * - Ver informacion de solo lectura (email, rol asignado)
 * - Cambiar la contrasena de acceso al sistema
 *
 * El componente esta dividido en dos secciones principales:
 * 1. Informacion Personal: datos editables del usuario
 * 2. Cambiar Contrasena: formulario seguro para actualizar credenciales
 *
 * Cada seccion tiene su propio formulario y estado de feedback
 * independiente para una mejor experiencia de usuario.
 *
 * El componente utiliza TanStack Query para las mutaciones y
 * el contexto de autenticacion para acceder y actualizar los datos del usuario.
 */

// ============================================================================
// IMPORTACIONES
// ============================================================================

// Hook de React para manejar el estado local del componente
import { useState } from 'react'

// Hook de TanStack Query para ejecutar operaciones de escritura (mutaciones)
// useMutation maneja estados de carga y errores automaticamente
import { useMutation } from '@tanstack/react-query'

// Hook personalizado para acceder al contexto de autenticacion
// Proporciona el usuario actual y funcion para actualizar sus datos
import { useAuth } from '../context/AuthContext'

// Servicio de autenticacion que contiene los metodos de API
// para actualizar perfil y cambiar contrasena
import { authService } from '../services/auth'

// Iconos de la biblioteca Lucide React para la interfaz visual
// User: icono de usuario para la seccion de informacion personal
// Lock: icono de candado para la seccion de contrasena
import { User, Lock } from 'lucide-react'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente principal de la pagina de perfil
 * Renderiza los formularios de edicion de perfil y cambio de contrasena
 */
export default function Profile() {
  // ==========================================================================
  // AUTENTICACION Y CONTEXTO
  // ==========================================================================

  // Obtiene el usuario actual y la funcion para actualizar sus datos del contexto
  // user: datos del usuario autenticado
  // updateUser: funcion para actualizar el usuario en el contexto global
  const { user, updateUser } = useAuth()

  // ==========================================================================
  // ESTADOS LOCALES - SECCION DE INFORMACION PERSONAL
  // ==========================================================================

  // Estados para los campos editables del perfil
  // Se inicializan con los valores actuales del usuario o string vacio
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [phone, setPhone] = useState(user?.phone || '')

  // Estados para mensajes de feedback de la seccion de perfil
  const [message, setMessage] = useState('')  // Mensaje de exito
  const [error, setError] = useState('')      // Mensaje de error

  // ==========================================================================
  // ESTADOS LOCALES - SECCION DE CAMBIO DE CONTRASENA
  // ==========================================================================

  // Estados para los campos del formulario de cambio de contrasena
  const [oldPassword, setOldPassword] = useState('')           // Contrasena actual
  const [newPassword, setNewPassword] = useState('')           // Nueva contrasena
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('') // Confirmacion

  // Estados para mensajes de feedback de la seccion de contrasena
  const [passwordMessage, setPasswordMessage] = useState('')   // Mensaje de exito
  const [passwordError, setPasswordError] = useState('')       // Mensaje de error

  // ==========================================================================
  // MUTACIONES (OPERACIONES DE ESCRITURA)
  // ==========================================================================

  /**
   * Mutacion para actualizar la informacion del perfil
   * Envia los datos editables al backend y actualiza el contexto al completarse
   */
  const updateProfile = useMutation({
    // Funcion que ejecuta la peticion al API
    mutationFn: () => authService.updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone
    }),
    onSuccess: (data) => {
      // Actualiza los datos del usuario en el contexto global
      // Esto propaga los cambios a toda la aplicacion
      updateUser(data)
      // Muestra mensaje de exito
      setMessage('Perfil actualizado correctamente')
      // Limpia cualquier error previo
      setError('')
    },
    onError: () => {
      // Muestra mensaje de error generico
      setError('Error al actualizar el perfil')
      // Limpia cualquier mensaje de exito previo
      setMessage('')
    },
  })

  /**
   * Mutacion para cambiar la contrasena del usuario
   * Requiere la contrasena actual y la nueva contrasena confirmada
   */
  const changePassword = useMutation({
    // Funcion que ejecuta la peticion al API
    mutationFn: () => authService.changePassword(oldPassword, newPassword, newPasswordConfirm),
    onSuccess: () => {
      // Muestra mensaje de exito
      setPasswordMessage('Contrasena actualizada correctamente')
      // Limpia cualquier error previo
      setPasswordError('')
      // Limpia los campos del formulario por seguridad
      setOldPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    },
    onError: () => {
      // Muestra mensaje de error generico
      setPasswordError('Error al cambiar la contrasena')
      // Limpia cualquier mensaje de exito previo
      setPasswordMessage('')
    },
  })

  // ==========================================================================
  // CONSTANTES DE CONFIGURACION
  // ==========================================================================

  /**
   * Mapeo de roles internos a etiquetas en espanol para mostrar en la UI
   * Los roles son de solo lectura y no pueden ser modificados por el usuario
   */
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',    // Acceso total al sistema
    partner: 'Socio',          // Socio del despacho
    associate: 'Asociado',     // Abogado asociado
    paralegal: 'Paralegal',    // Asistente legal
    client: 'Cliente',         // Cliente del despacho
  }

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ------------------------------------------------------------------ */}
      {/* TITULO DE LA PAGINA */}
      {/* ------------------------------------------------------------------ */}
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>

      {/* ==================================================================== */}
      {/* SECCION: INFORMACION PERSONAL */}
      {/* Formulario para editar datos basicos del perfil */}
      {/* ==================================================================== */}
      <div className="card">
        {/* Cabecera de la seccion con icono */}
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Informacion Personal</h2>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* MENSAJES DE FEEDBACK */}
        {/* Muestran el resultado de la operacion de actualizacion */}
        {/* -------------------------------------------------------------- */}

        {/* Mensaje de exito - fondo verde */}
        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">{message}</div>
        )}

        {/* Mensaje de error - fondo rojo */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* FORMULARIO DE INFORMACION PERSONAL */}
        {/* -------------------------------------------------------------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            // Ejecuta la mutacion de actualizacion de perfil
            updateProfile.mutate()
          }}
          className="space-y-4"
        >
          {/* Campo: Email (solo lectura) */}
          {/* El email es el identificador unico y no puede cambiarse */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled  // Campo deshabilitado - solo lectura
              className="input mt-1 bg-gray-100"  // Fondo gris indica solo lectura
            />
          </div>

          {/* Campo: Rol (solo lectura) */}
          {/* El rol solo puede ser cambiado por un administrador */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <input
              type="text"
              // Traduce el rol interno a etiqueta legible
              value={roleLabels[user?.role || 'associate']}
              disabled  // Campo deshabilitado - solo lectura
              className="input mt-1 bg-gray-100"
            />
          </div>

          {/* Campos: Nombre y Apellido (editables, en dos columnas) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo: Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input mt-1"
              />
            </div>

            {/* Campo: Apellido */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Apellido</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input mt-1"
              />
            </div>
          </div>

          {/* Campo: Telefono (editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input mt-1"
            />
          </div>

          {/* Boton de envio del formulario */}
          <button
            type="submit"
            disabled={updateProfile.isPending}  // Deshabilitado mientras se procesa
            className="btn btn-primary"
          >
            {/* Texto dinamico segun estado de la mutacion */}
            {updateProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* ==================================================================== */}
      {/* SECCION: CAMBIAR CONTRASENA */}
      {/* Formulario seguro para actualizar credenciales de acceso */}
      {/* ==================================================================== */}
      <div className="card">
        {/* Cabecera de la seccion con icono de candado */}
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Cambiar Contrasena</h2>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* MENSAJES DE FEEDBACK */}
        {/* Muestran el resultado de la operacion de cambio de contrasena */}
        {/* -------------------------------------------------------------- */}

        {/* Mensaje de exito - fondo verde */}
        {passwordMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">{passwordMessage}</div>
        )}

        {/* Mensaje de error - fondo rojo */}
        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{passwordError}</div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* FORMULARIO DE CAMBIO DE CONTRASENA */}
        {/* -------------------------------------------------------------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault()

            // Validacion del lado del cliente: las contrasenas deben coincidir
            if (newPassword !== newPasswordConfirm) {
              setPasswordError('Las contrasenas no coinciden')
              return
            }

            // Ejecuta la mutacion de cambio de contrasena
            changePassword.mutate()
          }}
          className="space-y-4"
        >
          {/* Campo: Contrasena actual */}
          {/* Requerida para verificar la identidad del usuario */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Contrasena Actual</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="input mt-1"
              required
            />
          </div>

          {/* Campo: Nueva contrasena */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Nueva Contrasena</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input mt-1"
              required
            />
          </div>

          {/* Campo: Confirmar nueva contrasena */}
          {/* Previene errores de escritura al requerir doble entrada */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirmar Nueva Contrasena</label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className="input mt-1"
              required
            />
          </div>

          {/* Boton de envio del formulario */}
          {/* Usa estilo secundario para diferenciarlo del formulario principal */}
          <button
            type="submit"
            disabled={changePassword.isPending}  // Deshabilitado mientras se procesa
            className="btn btn-secondary"
          >
            {/* Texto dinamico segun estado de la mutacion */}
            {changePassword.isPending ? 'Cambiando...' : 'Cambiar Contrasena'}
          </button>
        </form>
      </div>
    </div>
  )
}
