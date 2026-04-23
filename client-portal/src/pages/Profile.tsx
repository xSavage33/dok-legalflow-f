/**
 * ARCHIVO: Profile.tsx
 * PROPOSITO: Pagina de perfil del usuario donde puede ver y editar
 * su informacion personal y cambiar su contrasena.
 * Contiene dos formularios independientes: perfil y contrasena.
 */

// useState - Hook para manejar estados locales de los formularios
import { useState } from 'react'

// useMutation - Hook de React Query para ejecutar mutaciones (actualizaciones)
import { useMutation } from '@tanstack/react-query'

// Hook personalizado para acceder al contexto de autenticacion
import { useAuth } from '../context/AuthContext'

// authService - Servicio con metodos de autenticacion
import { authService } from '../services/auth'

// Iconos de Lucide React
// User: icono de usuario para la seccion de perfil
// Lock: icono de candado para la seccion de contrasena
import { User, Lock } from 'lucide-react'

/**
 * Componente Profile - Pagina de perfil del usuario
 *
 * Caracteristicas:
 * - Formulario de actualizacion de datos personales
 * - Formulario de cambio de contrasena
 * - Mensajes de exito y error independientes para cada formulario
 * - Campo de email deshabilitado (no editable)
 */
export default function Profile() {
  // ========== CONTEXTO DE AUTENTICACION ==========

  // Obtiene el usuario actual y la funcion para actualizar sus datos
  const { user, updateUser } = useAuth()

  // ========== ESTADOS DEL FORMULARIO DE PERFIL ==========

  // Campo de nombre (inicializado con el valor actual o vacio)
  const [firstName, setFirstName] = useState(user?.first_name || '')

  // Campo de apellido (inicializado con el valor actual o vacio)
  const [lastName, setLastName] = useState(user?.last_name || '')

  // Campo de telefono (inicializado con el valor actual o vacio)
  const [phone, setPhone] = useState(user?.phone || '')

  // Mensaje de exito para el formulario de perfil
  const [message, setMessage] = useState('')

  // Mensaje de error para el formulario de perfil
  const [error, setError] = useState('')

  // ========== ESTADOS DEL FORMULARIO DE CONTRASENA ==========

  // Campo de contrasena actual
  const [oldPassword, setOldPassword] = useState('')

  // Campo de nueva contrasena
  const [newPassword, setNewPassword] = useState('')

  // Campo de confirmacion de nueva contrasena
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  // Mensaje de exito para el formulario de contrasena
  const [passwordMessage, setPasswordMessage] = useState('')

  // Mensaje de error para el formulario de contrasena
  const [passwordError, setPasswordError] = useState('')

  // ========== MUTACION: ACTUALIZAR PERFIL ==========

  /**
   * Mutacion para actualizar los datos del perfil
   * Envia nombre, apellido y telefono al backend
   */
  const updateProfile = useMutation({
    // Funcion que ejecuta la actualizacion
    mutationFn: () => authService.updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone
    }),
    // Callback ejecutado cuando la actualizacion es exitosa
    onSuccess: (data) => {
      // Actualiza el usuario en el contexto de autenticacion
      updateUser(data)
      // Muestra mensaje de exito
      setMessage('Perfil actualizado correctamente')
      // Limpia mensaje de error
      setError('')
    },
    // Callback ejecutado cuando hay un error
    onError: () => {
      // Muestra mensaje de error
      setError('Error al actualizar el perfil')
      // Limpia mensaje de exito
      setMessage('')
    },
  })

  // ========== MUTACION: CAMBIAR CONTRASENA ==========

  /**
   * Mutacion para cambiar la contrasena del usuario
   * Requiere contrasena actual, nueva y confirmacion
   */
  const changePassword = useMutation({
    // Funcion que ejecuta el cambio de contrasena
    mutationFn: () => authService.changePassword(
      oldPassword,
      newPassword,
      newPasswordConfirm
    ),
    // Callback ejecutado cuando el cambio es exitoso
    onSuccess: () => {
      // Muestra mensaje de exito
      setPasswordMessage('Contrasena actualizada correctamente')
      // Limpia mensaje de error
      setPasswordError('')
      // Limpia todos los campos de contrasena
      setOldPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    },
    // Callback ejecutado cuando hay un error
    onError: () => {
      // Muestra mensaje de error
      setPasswordError('Error al cambiar la contrasena')
      // Limpia mensaje de exito
      setPasswordMessage('')
    },
  })

  // ========== RENDERIZADO PRINCIPAL ==========

  return (
    // Contenedor principal con ancho maximo para mejor lectura
    <div className="space-y-6 max-w-2xl">
      {/* Titulo de la pagina */}
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>

      {/* ========== SECCION: INFORMACION PERSONAL ========== */}
      <div className="card">
        {/* Encabezado de la seccion */}
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Informacion Personal</h2>
        </div>

        {/* Mensaje de exito del formulario de perfil */}
        {message && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">{message}</div>
        )}

        {/* Mensaje de error del formulario de perfil */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Formulario de actualizacion de perfil */}
        <form
          onSubmit={(e) => {
            // Previene el comportamiento por defecto
            e.preventDefault()
            // Ejecuta la mutacion de actualizacion
            updateProfile.mutate()
          }}
          className="space-y-4"
        >
          {/* Campo de email (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            {/* Input deshabilitado con fondo gris para indicar que no es editable */}
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="input mt-1 bg-gray-100"
            />
          </div>

          {/* Campos de nombre y apellido en grid de 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Campo de nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input mt-1"
              />
            </div>

            {/* Campo de apellido */}
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

          {/* Campo de telefono */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input mt-1"
            />
          </div>

          {/* Boton de guardar cambios */}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="btn btn-primary"
          >
            {/* Texto dinamico segun estado de carga */}
            {updateProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      {/* ========== SECCION: CAMBIAR CONTRASENA ========== */}
      <div className="card">
        {/* Encabezado de la seccion */}
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Cambiar Contrasena</h2>
        </div>

        {/* Mensaje de exito del formulario de contrasena */}
        {passwordMessage && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg">{passwordMessage}</div>
        )}

        {/* Mensaje de error del formulario de contrasena */}
        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{passwordError}</div>
        )}

        {/* Formulario de cambio de contrasena */}
        <form
          onSubmit={(e) => {
            // Previene el comportamiento por defecto
            e.preventDefault()

            // Validacion: verifica que las contrasenas nuevas coincidan
            if (newPassword !== newPasswordConfirm) {
              setPasswordError('Las contrasenas no coinciden')
              return
            }

            // Ejecuta la mutacion de cambio de contrasena
            changePassword.mutate()
          }}
          className="space-y-4"
        >
          {/* Campo de contrasena actual */}
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

          {/* Campo de nueva contrasena */}
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

          {/* Campo de confirmacion de nueva contrasena */}
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

          {/* Boton de cambiar contrasena - usa estilo secundario */}
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="btn btn-secondary"
          >
            {/* Texto dinamico segun estado de carga */}
            {changePassword.isPending ? 'Cambiando...' : 'Cambiar Contrasena'}
          </button>
        </form>
      </div>
    </div>
  )
}
