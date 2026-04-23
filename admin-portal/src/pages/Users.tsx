/**
 * PAGINA DE GESTION DE USUARIOS - Users.tsx
 *
 * Este componente implementa la interfaz de administracion de usuarios del sistema.
 * Proporciona funcionalidades completas de CRUD (Crear, Leer, Actualizar, Eliminar)
 * para gestionar el equipo del despacho legal:
 *
 * - Listado de usuarios con busqueda y filtrado por rol
 * - Creacion de nuevos usuarios con asignacion de rol
 * - Edicion de datos de usuarios existentes
 * - Desactivacion de cuentas de usuario (soft delete)
 * - Vista responsive con tarjetas en movil y tabla en desktop
 *
 * El acceso a las diferentes funcionalidades esta controlado por el sistema
 * de permisos basado en roles:
 * - users.create: permite crear nuevos usuarios
 * - users.edit: permite editar usuarios existentes
 * - users.delete: permite desactivar usuarios
 *
 * El componente utiliza TanStack Query para la gestion del estado del servidor
 * y proporciona feedback visual inmediato para todas las operaciones.
 */

// ============================================================================
// IMPORTACIONES
// ============================================================================

// Hook de React para manejar el estado local del componente
import { useState } from 'react'

// Hooks de TanStack Query para consultas y mutaciones de datos
// useQuery: obtiene datos del servidor con cache automatico
// useMutation: ejecuta operaciones de escritura (crear, actualizar, eliminar)
// useQueryClient: accede al cliente de cache para invalidar queries
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Instancia configurada de Axios para realizar peticiones HTTP al backend
import api from '../services/api'

// Tipos TypeScript para las entidades del dominio
// User: estructura de un usuario del sistema
// UserCreate: datos necesarios para crear un usuario
// PaginatedResponse: estructura de respuesta paginada del API
import type { User, UserCreate, PaginatedResponse } from '../types'

// Hook personalizado para acceder al contexto de autenticacion (usuario actual)
import { useAuth } from '../context/AuthContext'

// Utilidades del sistema de permisos basado en roles
// hasPermission: verifica si un rol tiene un permiso especifico
// Role: tipo TypeScript para los roles del sistema
import { hasPermission, type Role } from '../lib/permissions'

// Iconos de la biblioteca Lucide React para la interfaz visual
import { Plus, Search, Edit2, UserX, UserCheck, X, Loader2, ShieldAlert } from 'lucide-react'

// Utilidad para combinar clases CSS condicionalmente
import clsx from 'clsx'

// ============================================================================
// CONSTANTES DE CONFIGURACION
// ============================================================================

/**
 * Mapeo de roles internos a etiquetas en espanol para mostrar en la UI
 * Traduce los identificadores tecnicos a nombres legibles
 */
const roleLabels: Record<string, string> = {
  admin: 'Administrador',    // Acceso total al sistema
  partner: 'Socio',          // Socio del despacho, acceso a analytics
  associate: 'Asociado',     // Abogado asociado
  paralegal: 'Paralegal',    // Asistente legal
  client: 'Cliente',         // Cliente del despacho
}

/**
 * Mapeo de roles a clases CSS para badges con colores distintivos
 * Cada rol tiene un color unico para identificacion visual rapida
 */
const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',     // Purpura para admin
  partner: 'bg-blue-100 text-blue-800',       // Azul para socios
  associate: 'bg-green-100 text-green-800',   // Verde para asociados
  paralegal: 'bg-yellow-100 text-yellow-800', // Amarillo para paralegales
  client: 'bg-gray-100 text-gray-800',        // Gris para clientes
}

// ============================================================================
// INTERFACES LOCALES
// ============================================================================

/**
 * Interface para los datos del formulario de usuario
 * Define la estructura de datos manejada en el formulario de creacion/edicion
 */
interface UserFormData {
  email: string       // Correo electronico (identificador unico)
  password: string    // Contrasena (solo requerida en creacion)
  first_name: string  // Nombre del usuario
  last_name: string   // Apellido del usuario
  phone: string       // Telefono de contacto (opcional)
  role: string        // Rol asignado en el sistema
  is_active: boolean  // Estado de la cuenta (activo/inactivo)
}

/**
 * Valores iniciales del formulario
 * Se usan al abrir el modal de creacion o al resetear el formulario
 */
const initialFormData: UserFormData = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  phone: '',
  role: 'associate',  // Rol por defecto: Asociado
  is_active: true,    // Usuarios nuevos estan activos por defecto
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente principal de la pagina de gestion de usuarios
 * Renderiza la interfaz completa de administracion del equipo
 */
export default function Users() {
  // ==========================================================================
  // AUTENTICACION Y PERMISOS
  // ==========================================================================

  // Obtiene el usuario autenticado actual del contexto
  // Se usa para evitar que un usuario se desactive a si mismo
  const { user: currentUser } = useAuth()

  // Extrae el rol del usuario para verificacion de permisos
  const userRole = currentUser?.role as Role | undefined

  // Obtiene el cliente de queries para invalidar cache despues de mutaciones
  const queryClient = useQueryClient()

  // Verifica los permisos del usuario actual para las diferentes acciones
  // Estos flags controlan la visibilidad de botones y funcionalidades
  const canCreate = hasPermission(userRole, 'users.create')  // Puede crear usuarios
  const canEdit = hasPermission(userRole, 'users.edit')      // Puede editar usuarios
  const canDelete = hasPermission(userRole, 'users.delete')  // Puede desactivar usuarios

  // ==========================================================================
  // ESTADOS LOCALES
  // ==========================================================================

  // Termino de busqueda para filtrar usuarios por nombre o email
  const [search, setSearch] = useState('')

  // Filtro por rol seleccionado (vacio = todos los roles)
  const [roleFilter, setRoleFilter] = useState('')

  // Controla la visibilidad del modal de creacion/edicion
  const [showModal, setShowModal] = useState(false)

  // Controla la visibilidad del modal de confirmacion de desactivacion
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Usuario seleccionado para desactivar (null = ninguno)
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null)

  // Usuario que se esta editando (null = modo creacion)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Datos del formulario de creacion/edicion
  const [formData, setFormData] = useState<UserFormData>(initialFormData)

  // Mensaje de error del formulario
  const [formError, setFormError] = useState('')

  // ==========================================================================
  // CONSULTAS DE DATOS (QUERIES)
  // ==========================================================================

  /**
   * Query para obtener la lista de usuarios
   * Se refetch automaticamente cuando cambian los filtros
   */
  const { data, isLoading } = useQuery({
    // Clave que incluye los filtros para cache granular
    queryKey: ['users', search, roleFilter],
    queryFn: async () => {
      // Construye los parametros de consulta dinamicamente
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (roleFilter) params.append('role', roleFilter)

      // Realiza peticion GET al endpoint de usuarios
      const response = await api.get<PaginatedResponse<User>>(`/auth/users/?${params}`)
      return response.data
    },
  })

  // ==========================================================================
  // MUTACIONES (OPERACIONES DE ESCRITURA)
  // ==========================================================================

  /**
   * Mutacion para crear un nuevo usuario
   * Al completarse, invalida el cache y cierra el modal
   */
  const createMutation = useMutation({
    mutationFn: async (data: UserCreate) => {
      const response = await api.post('/auth/users/', data)
      return response.data
    },
    onSuccess: () => {
      // Refresca la lista de usuarios
      queryClient.invalidateQueries({ queryKey: ['users'] })
      // Cierra el modal y limpia el formulario
      closeModal()
    },
    onError: (err: any) => {
      // Muestra mensaje de error especifico o generico
      // Prioriza errores de email duplicado del backend
      setFormError(err.response?.data?.email?.[0] || err.response?.data?.detail || 'Error al crear usuario')
    },
  })

  /**
   * Mutacion para actualizar un usuario existente
   * Solo envia los campos que han cambiado
   */
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const response = await api.put(`/auth/users/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      closeModal()
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || 'Error al actualizar usuario')
    },
  })

  /**
   * Mutacion para desactivar (eliminar logicamente) un usuario
   * El usuario no se elimina fisicamente, solo se marca como inactivo
   */
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/users/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      // Cierra el modal de confirmacion
      setShowConfirmModal(false)
      setUserToDeactivate(null)
    },
  })

  // ==========================================================================
  // FUNCIONES AUXILIARES - MANEJO DE MODALES
  // ==========================================================================

  /**
   * Abre el modal en modo creacion de nuevo usuario
   * Resetea todos los campos del formulario a sus valores iniciales
   */
  const openCreateModal = () => {
    // Solo permite abrir si tiene permiso de creacion
    if (!canCreate) return
    setEditingUser(null)           // Modo creacion (no edicion)
    setFormData(initialFormData)   // Valores por defecto
    setFormError('')               // Limpia errores previos
    setShowModal(true)             // Muestra el modal
  }

  /**
   * Abre el modal en modo edicion con los datos del usuario seleccionado
   * @param user - Usuario a editar
   */
  const openEditModal = (user: User) => {
    // Solo permite abrir si tiene permiso de edicion
    if (!canEdit) return
    setEditingUser(user)           // Guarda referencia al usuario
    // Carga los datos del usuario en el formulario
    setFormData({
      email: user.email,
      password: '',                // La contrasena no se carga por seguridad
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active,
    })
    setFormError('')
    setShowModal(true)
  }

  /**
   * Abre el modal de confirmacion para desactivar un usuario
   * @param user - Usuario a desactivar
   */
  const openDeactivateConfirm = (user: User) => {
    if (!canDelete) return
    setUserToDeactivate(user)
    setShowConfirmModal(true)
  }

  /**
   * Cierra el modal de creacion/edicion y limpia el estado
   */
  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
    setFormData(initialFormData)
    setFormError('')
  }

  // ==========================================================================
  // FUNCIONES AUXILIARES - MANEJO DE FORMULARIO
  // ==========================================================================

  /**
   * Maneja el envio del formulario de creacion/edicion
   * Valida los datos y ejecuta la mutacion correspondiente
   * @param e - Evento del formulario
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Validacion: nombre y apellido son obligatorios
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('Nombre y apellido son requeridos')
      return
    }

    if (editingUser) {
      // MODO EDICION: actualizar usuario existente
      if (!canEdit) return

      // Prepara solo los campos editables (no el email)
      const updateData: Partial<UserFormData> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active,
      }

      // Solo incluye la contrasena si se proporciono una nueva
      if (formData.password) {
        updateData.password = formData.password
      }

      updateMutation.mutate({ id: editingUser.id, data: updateData })
    } else {
      // MODO CREACION: crear nuevo usuario
      if (!canCreate) return

      // Validacion adicional para creacion
      if (!formData.email || !formData.password) {
        setFormError('Email y contrasena son requeridos')
        return
      }

      createMutation.mutate(formData as UserCreate)
    }
  }

  /**
   * Maneja los cambios en los campos del formulario
   * Soporta campos de texto y checkboxes
   * @param e - Evento del input
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      // Para checkboxes usa el valor checked, para otros usa value
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  // Flag que indica si alguna mutacion esta en progreso
  // Se usa para deshabilitar el boton de submit y mostrar loading
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* CABECERA DE LA PAGINA */}
      {/* Contiene el titulo, descripcion y boton de nuevo usuario */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {/* Titulo de la pagina */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Equipo</h1>
          {/* Subtitulo contextual segun permisos del usuario */}
          <p className="text-sm text-gray-500 mt-1">
            {canCreate ? 'Gestiona el equipo del despacho' : 'Directorio del equipo'}
          </p>
        </div>
        {/* Boton de nuevo usuario - solo visible si tiene permiso */}
        {canCreate && (
          <button onClick={openCreateModal} className="btn btn-primary inline-flex items-center justify-center">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BANNER INFORMATIVO PARA USUARIOS SIN PERMISOS */}
      {/* Muestra un mensaje explicativo si el usuario solo puede ver */}
      {/* ------------------------------------------------------------------ */}
      {!canEdit && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Solo puedes ver el directorio de usuarios. Contacta a un administrador para realizar cambios.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* BARRA DE FILTROS */}
      {/* Permite buscar y filtrar la lista de usuarios */}
      {/* ------------------------------------------------------------------ */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Campo de busqueda por texto */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Selector de filtro por rol */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="partner">Socios</option>
            <option value="associate">Asociados</option>
            <option value="paralegal">Paralegales</option>
            <option value="client">Clientes</option>
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* LISTA DE USUARIOS */}
      {/* Vista condicional: tarjetas en movil, tabla en desktop */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        /* Estado de carga */
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* VISTA MOVIL - Tarjetas apiladas */}
          {/* Solo visible en pantallas pequenas (sm:hidden) */}
          {/* ============================================================== */}
          <div className="sm:hidden space-y-3">
            {data?.results.map((user) => (
              <div key={user.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Nombre y estado del usuario */}
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                      {/* Icono de estado: verde si activo, rojo si inactivo */}
                      {user.is_active ? (
                        <UserCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <UserX className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    {/* Email del usuario */}
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    {/* Badge del rol con color distintivo */}
                    <div className="mt-2">
                      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', roleColors[user.role])}>
                        {roleLabels[user.role]}
                      </span>
                    </div>
                  </div>

                  {/* Botones de accion - solo si tiene permisos */}
                  {(canEdit || canDelete) && (
                    <div className="flex gap-1 ml-2">
                      {/* Boton de editar */}
                      {canEdit && (
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {/* Boton de desactivar - no disponible para el usuario actual ni usuarios ya inactivos */}
                      {canDelete && user.is_active && user.id !== currentUser?.id && (
                        <button
                          onClick={() => openDeactivateConfirm(user)}
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-gray-100 rounded-lg"
                          title="Desactivar usuario"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ============================================================== */}
          {/* VISTA DESKTOP - Tabla */}
          {/* Solo visible en pantallas medianas y grandes (hidden sm:block) */}
          {/* ============================================================== */}
          <div className="hidden sm:block card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                {/* Cabecera de la tabla */}
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    {/* Columna de acciones solo si tiene permisos */}
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    )}
                  </tr>
                </thead>

                {/* Cuerpo de la tabla */}
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.results.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      {/* Columna: Usuario (nombre y email) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>

                      {/* Columna: Rol con badge de color */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', roleColors[user.role])}>
                          {roleLabels[user.role]}
                        </span>
                      </td>

                      {/* Columna: Telefono */}
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {user.phone || '-'}
                      </td>

                      {/* Columna: Estado (activo/inactivo) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <UserCheck className="h-4 w-4" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <UserX className="h-4 w-4" />
                            Inactivo
                          </span>
                        )}
                      </td>

                      {/* Columna: Acciones (editar/desactivar) */}
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(user)}
                              className="text-primary-600 hover:text-primary-800 mr-3"
                              title="Editar usuario"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                          )}
                          {canDelete && user.is_active && user.id !== currentUser?.id && (
                            <button
                              onClick={() => openDeactivateConfirm(user)}
                              className="text-orange-600 hover:text-orange-800"
                              title="Desactivar usuario"
                            >
                              <UserX className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mensaje cuando no hay resultados */}
            {data?.results.length === 0 && (
              <div className="text-center py-12 text-gray-500">No se encontraron usuarios</div>
            )}
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE CREACION/EDICION DE USUARIO */}
      {/* Formulario completo para crear o editar usuarios */}
      {/* ==================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-4">
            {/* Overlay oscuro - cierra el modal al hacer click */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal} />

            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">

              {/* Cabecera del modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-500">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Cuerpo del modal - Formulario */}
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 space-y-4">

                  {/* Mensaje de error */}
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}

                  {/* Campos de nombre y apellido (en dos columnas) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellido *</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        className="input"
                        required
                      />
                    </div>
                  </div>

                  {/* Campo de email - deshabilitado en modo edicion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email {!editingUser && '*'}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input"
                      disabled={!!editingUser}  // No se puede cambiar el email
                      required={!editingUser}
                    />
                  </div>

                  {/* Campo de contrasena */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contrasena {!editingUser && '*'}
                      {/* Nota para modo edicion */}
                      {editingUser && <span className="text-gray-400 font-normal"> (dejar vacio para no cambiar)</span>}
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input"
                      required={!editingUser}  // Solo requerido en creacion
                      minLength={8}
                    />
                  </div>

                  {/* Campos de telefono y rol (en dos columnas) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="input"
                        required
                      >
                        <option value="admin">Administrador</option>
                        <option value="partner">Socio</option>
                        <option value="associate">Asociado</option>
                        <option value="paralegal">Paralegal</option>
                        <option value="client">Cliente</option>
                      </select>
                    </div>
                  </div>

                  {/* Checkbox de usuario activo */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_active"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Usuario activo
                    </label>
                  </div>
                </div>

                {/* Pie del modal con botones de accion */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                  <button type="button" onClick={closeModal} className="btn btn-secondary w-full sm:w-auto">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center"
                  >
                    {/* Spinner de carga si esta enviando */}
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DE CONFIRMACION DE DESACTIVACION */}
      {/* Pide confirmacion antes de desactivar un usuario */}
      {/* ==================================================================== */}
      {showConfirmModal && userToDeactivate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowConfirmModal(false)} />

            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
              <div className="p-6">
                {/* Icono y titulo */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <UserX className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Desactivar Usuario</h3>
                </div>

                {/* Mensaje de confirmacion */}
                <p className="text-gray-600 mb-6">
                  Estas seguro de que deseas desactivar a <strong>{userToDeactivate.full_name}</strong>?
                  <br />
                  <span className="text-sm text-gray-500">
                    El usuario no podra acceder al sistema pero sus datos se conservaran.
                  </span>
                </p>

                {/* Botones de accion */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="btn btn-secondary w-full sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => deactivateMutation.mutate(userToDeactivate.id)}
                    disabled={deactivateMutation.isPending}
                    className="btn bg-orange-600 text-white hover:bg-orange-700 w-full sm:w-auto inline-flex items-center justify-center"
                  >
                    {deactivateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Desactivar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
