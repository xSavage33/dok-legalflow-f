/**
 * =====================================================
 * COMPONENTE: CaseForm (Formulario de Caso)
 * =====================================================
 *
 * PROPOSITO:
 * Este componente proporciona un formulario completo para crear nuevos casos
 * legales o editar casos existentes. Maneja la recoleccion de datos del caso,
 * cliente y juzgado, con validacion y envio al servidor.
 *
 * FUNCIONALIDADES:
 * - Creacion de nuevos casos con todos los campos necesarios
 * - Edicion de casos existentes con pre-carga de datos
 * - Seleccion de cliente existente o ingreso manual de datos
 * - Seleccion de abogado responsable de una lista de abogados
 * - Validacion de campos requeridos antes del envio
 * - Feedback visual durante el proceso de guardado
 *
 * MODOS DE OPERACION:
 * - Modo creacion: cuando la URL es /cases/new
 * - Modo edicion: cuando la URL es /cases/:id/edit
 *
 * DEPENDENCIAS:
 * - React para hooks de estado y efectos
 * - React Router para navegacion y parametros
 * - React Query para fetching y mutaciones
 * - Lucide React para iconografia
 *
 * =====================================================
 */

// Importa hooks de React:
// - useState: manejo de estado local del formulario
// - useEffect: efecto secundario para cargar datos del caso al editar
import { useState, useEffect } from 'react'

// Importa hooks y componentes de React Router:
// - useNavigate: navegacion programatica despues de guardar
// - useParams: extrae el ID del caso de la URL
// - Link: enlaces de navegacion SPA
import { useNavigate, useParams, Link } from 'react-router-dom'

// Importa hooks de React Query:
// - useQuery: para obtener datos del servidor (caso, abogados, clientes)
// - useMutation: para crear/actualizar casos
// - useQueryClient: para invalidar cache despues de mutaciones
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Importa la instancia configurada de axios para peticiones HTTP
import api from '../services/api'

// Importa tipos TypeScript para tipado estatico:
// - Case: estructura de un caso
// - User: estructura de usuario (abogados, clientes)
// - PaginatedResponse: wrapper de respuesta paginada
import type { Case, User, PaginatedResponse } from '../types'

// Importa iconos de Lucide React:
// - ArrowLeft: flecha para volver
// - Save: icono de guardar
// - Loader2: spinner de carga animado
// - Briefcase: icono de maletin para seccion de caso
// - User: icono de persona para seccion de cliente
// - Scale: icono de balanza para seccion de juzgado
import { ArrowLeft, Save, Loader2, Briefcase, User as UserIcon, Scale } from 'lucide-react'

/**
 * Interface que define la estructura del estado del formulario
 * Todos los campos que se envian al servidor al crear/actualizar un caso
 */
interface CaseFormData {
  title: string              // Titulo descriptivo del caso
  description: string        // Descripcion detallada del caso
  case_type: string          // Tipo de caso (civil, penal, etc.)
  status: string             // Estado actual del caso
  priority: string           // Nivel de prioridad
  client_id: string          // ID del cliente si es existente
  client_name: string        // Nombre del cliente
  client_email: string       // Email del cliente
  client_phone: string       // Telefono del cliente
  lead_attorney_id: string   // ID del abogado responsable
  jurisdiction: string       // Jurisdiccion del caso
  court: string              // Juzgado asignado
  billing_type: string       // Tipo de facturacion
  opened_date: string        // Fecha de apertura (formato YYYY-MM-DD)
}

/**
 * Valores iniciales del formulario para cuando se crea un nuevo caso
 * Proporciona defaults razonables para cada campo
 */
const initialFormData: CaseFormData = {
  title: '',
  description: '',
  case_type: 'civil',                              // Por defecto: caso civil
  status: 'active',                                 // Por defecto: activo
  priority: 'medium',                               // Por defecto: prioridad media
  client_id: '',
  client_name: '',
  client_email: '',
  client_phone: '',
  lead_attorney_id: '',
  jurisdiction: '',
  court: '',
  billing_type: 'hourly',                           // Por defecto: facturacion por hora
  opened_date: new Date().toISOString().split('T')[0],  // Fecha de hoy en formato ISO
}

/**
 * Array de tipos de caso disponibles
 * Cada objeto tiene value (para el backend) y label (para mostrar)
 */
const caseTypes = [
  { value: 'civil', label: 'Civil' },
  { value: 'criminal', label: 'Penal' },
  { value: 'family', label: 'Familia' },
  { value: 'labor', label: 'Laboral' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'administrative', label: 'Administrativo' },
  { value: 'tax', label: 'Tributario' },
  { value: 'constitutional', label: 'Constitucional' },
  { value: 'other', label: 'Otro' },
]

/**
 * Array de estados de caso disponibles
 */
const statusOptions = [
  { value: 'active', label: 'Activo' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'on_hold', label: 'En Espera' },
  { value: 'closed', label: 'Cerrado' },
]

/**
 * Array de niveles de prioridad disponibles
 */
const priorityOptions = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
]

/**
 * Array de tipos de facturacion disponibles
 */
const billingTypes = [
  { value: 'hourly', label: 'Por Hora' },
  { value: 'fixed', label: 'Tarifa Fija' },
  { value: 'contingency', label: 'Contingencia' },
  { value: 'mixed', label: 'Mixto' },
]

/**
 * Componente principal del formulario de casos
 * Maneja tanto la creacion como la edicion de casos
 */
export default function CaseForm() {
  // Extrae el ID del caso de los parametros de la URL
  // Sera undefined para casos nuevos, o un ID para edicion
  const { id } = useParams()

  // Hook para navegacion programatica
  // Se usa para redirigir despues de guardar exitosamente
  const navigate = useNavigate()

  // Cliente de React Query para manipular el cache
  // Se usa para invalidar queries despues de mutaciones
  const queryClient = useQueryClient()

  // Determina si estamos en modo edicion
  // true si hay un ID y no es 'new'
  const isEditing = id && id !== 'new'

  // Estado local del formulario con los datos del caso
  const [formData, setFormData] = useState<CaseFormData>(initialFormData)

  // Estado para mensajes de error de validacion o del servidor
  const [error, setError] = useState('')

  /**
   * Query para obtener la lista de abogados disponibles
   * Filtra usuarios con rol 'partner' (socio) o 'associate' (asociado)
   */
  const { data: attorneys } = useQuery({
    queryKey: ['attorneys'],
    queryFn: async () => {
      // Obtiene usuarios con rol de abogado (socios y asociados)
      const response = await api.get<PaginatedResponse<User>>('/auth/users/?role=partner&role=associate')
      return response.data.results
    },
  })

  /**
   * Query para obtener la lista de clientes disponibles
   * Filtra usuarios con rol 'client'
   */
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // Obtiene usuarios con rol de cliente
      const response = await api.get<PaginatedResponse<User>>('/auth/users/?role=client')
      return response.data.results
    },
  })

  /**
   * Query para obtener los datos del caso cuando estamos editando
   * Solo se ejecuta si isEditing es true (enabled: !!isEditing)
   */
  const { data: caseData, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: async () => {
      // Obtiene los datos completos del caso a editar
      const response = await api.get<Case>(`/cases/${id}/`)
      return response.data
    },
    // Solo ejecuta la query si estamos en modo edicion
    enabled: !!isEditing,
  })

  /**
   * Efecto que se ejecuta cuando caseData cambia
   * Llena el formulario con los datos del caso existente
   */
  useEffect(() => {
    // Solo actualiza si hay datos del caso
    if (caseData) {
      setFormData({
        title: caseData.title,
        description: caseData.description || '',
        case_type: caseData.case_type,
        status: caseData.status,
        priority: caseData.priority,
        client_id: caseData.client_id || '',
        client_name: caseData.client_name,
        client_email: caseData.client_email || '',
        client_phone: caseData.client_phone || '',
        lead_attorney_id: caseData.lead_attorney_id || '',
        jurisdiction: caseData.jurisdiction || '',
        court: caseData.court || '',
        billing_type: caseData.billing_type || 'hourly',
        opened_date: caseData.opened_date,
      })
    }
  }, [caseData])  // Dependencia: se ejecuta cuando caseData cambia

  /**
   * Mutacion para crear un nuevo caso
   * Envia los datos del formulario al endpoint POST /cases/
   */
  const createMutation = useMutation({
    // Funcion que realiza la peticion
    mutationFn: async (data: CaseFormData) => {
      const response = await api.post('/cases/', data)
      return response.data
    },
    // Callback de exito: invalida cache y navega a la lista
    onSuccess: () => {
      // Invalida la query de casos para forzar refetch
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      // Navega a la lista de casos
      navigate('/cases')
    },
    // Callback de error: muestra mensaje al usuario
    onError: (err: any) => {
      // Intenta extraer mensaje de error del backend, o usa uno generico
      setError(err.response?.data?.detail || 'Error al crear el caso')
    },
  })

  /**
   * Mutacion para actualizar un caso existente
   * Envia los datos del formulario al endpoint PUT /cases/:id/
   */
  const updateMutation = useMutation({
    mutationFn: async (data: CaseFormData) => {
      // PUT para actualizacion completa del recurso
      const response = await api.put(`/cases/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      // Invalida multiples queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', id] })
      // Navega al detalle del caso actualizado
      navigate(`/cases/${id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al actualizar el caso')
    },
  })

  /**
   * Manejador del envio del formulario
   * Valida los datos y llama a la mutacion apropiada
   */
  const handleSubmit = (e: React.FormEvent) => {
    // Previene el comportamiento por defecto del form (recarga de pagina)
    e.preventDefault()
    // Limpia errores anteriores
    setError('')

    // Validacion: el titulo es requerido
    if (!formData.title.trim()) {
      setError('El titulo es requerido')
      return
    }

    // Validacion: debe tener cliente (seleccionado o manual)
    if (!formData.client_name.trim() && !formData.client_id) {
      setError('Debe seleccionar o ingresar un cliente')
      return
    }

    // Llama a la mutacion segun el modo (edicion o creacion)
    if (isEditing) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  /**
   * Manejador generico para cambios en inputs del formulario
   * Actualiza el campo correspondiente en el estado
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Actualiza solo el campo que cambio, manteniendo los demas
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  /**
   * Manejador especial para la seleccion de cliente existente
   * Al seleccionar un cliente, rellena automaticamente sus datos
   */
  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value

    if (clientId) {
      // Busca el cliente seleccionado en la lista
      const client = clients?.find(c => c.id === clientId)
      if (client) {
        // Rellena los campos del cliente con sus datos
        setFormData(prev => ({
          ...prev,
          client_id: client.id,
          client_name: client.full_name,
          client_email: client.email,
          client_phone: client.phone || '',
        }))
      }
    } else {
      // Si se deselecciona, limpia los campos del cliente
      setFormData(prev => ({
        ...prev,
        client_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
      }))
    }
  }

  // Determina si alguna mutacion esta en progreso para deshabilitar botones
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  // =====================================================
  // ESTADO DE CARGA INICIAL
  // =====================================================

  // Muestra spinner mientras se cargan los datos del caso en modo edicion
  if (isEditing && isLoadingCase) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // =====================================================
  // RENDERIZADO DEL FORMULARIO
  // =====================================================
  return (
    // Contenedor principal con espaciado responsivo
    <div className="space-y-4 sm:space-y-6">

      {/* ===== SECCION: Encabezado ===== */}
      <div className="flex items-center gap-4">
        {/* Boton para volver a la lista de casos */}
        <Link to="/cases" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {/* Titulo dinamico segun el modo */}
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Caso' : 'Nuevo Caso'}
        </h1>
      </div>

      {/* ===== FORMULARIO PRINCIPAL ===== */}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

        {/* ----- Mensaje de Error ----- */}
        {/* Solo se muestra si hay un error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* ===== TARJETA: Informacion del Caso ===== */}
        <div className="card">
          {/* Encabezado de seccion con icono */}
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Informacion del Caso</h2>
          </div>

          {/* Grid responsivo para los campos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Campo: Titulo del Caso (ocupa ancho completo) */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titulo del Caso *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Demanda por incumplimiento de contrato"
              />
            </div>

            {/* Campo: Tipo de Caso (dropdown) */}
            <div>
              <label htmlFor="case_type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Caso
              </label>
              <select id="case_type" name="case_type" value={formData.case_type} onChange={handleChange} className="input">
                {/* Genera opciones dinamicamente desde el array caseTypes */}
                {caseTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Campo: Estado (dropdown) */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className="input">
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Campo: Prioridad (dropdown) */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select id="priority" name="priority" value={formData.priority} onChange={handleChange} className="input">
                {priorityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Campo: Fecha de Apertura (date picker nativo) */}
            <div>
              <label htmlFor="opened_date" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Apertura
              </label>
              <input
                type="date"
                id="opened_date"
                name="opened_date"
                value={formData.opened_date}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Campo: Tipo de Facturacion (dropdown) */}
            <div>
              <label htmlFor="billing_type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Facturacion
              </label>
              <select id="billing_type" name="billing_type" value={formData.billing_type} onChange={handleChange} className="input">
                {billingTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Campo: Abogado Responsable (dropdown con datos del servidor) */}
            <div>
              <label htmlFor="lead_attorney_id" className="block text-sm font-medium text-gray-700 mb-1">
                Abogado Responsable
              </label>
              <select
                id="lead_attorney_id"
                name="lead_attorney_id"
                value={formData.lead_attorney_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Seleccionar abogado...</option>
                {/* Lista de abogados cargados desde el servidor */}
                {attorneys?.map(attorney => (
                  <option key={attorney.id} value={attorney.id}>
                    {/* Muestra nombre y rol entre parentesis */}
                    {attorney.full_name} ({attorney.role === 'partner' ? 'Socio' : 'Asociado'})
                  </option>
                ))}
              </select>
            </div>

            {/* Campo: Descripcion (textarea, ocupa ancho completo) */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="input"
                placeholder="Descripcion detallada del caso..."
              />
            </div>
          </div>
        </div>

        {/* ===== TARJETA: Informacion del Cliente ===== */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Informacion del Cliente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Campo: Selector de Cliente Registrado */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="client_select" className="block text-sm font-medium text-gray-700 mb-1">
                Cliente Registrado
              </label>
              <select
                id="client_select"
                value={formData.client_id}
                onChange={handleClientSelect}  // Usa manejador especial que rellena datos
                className="input"
              >
                <option value="">Seleccionar cliente existente o ingresar datos manualmente...</option>
                {/* Lista de clientes registrados en el sistema */}
                {clients?.map(client => (
                  <option key={client.id} value={client.id}>{client.full_name} ({client.email})</option>
                ))}
              </select>
            </div>

            {/* Campo: Nombre del Cliente (manual o auto-llenado) */}
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                id="client_name"
                name="client_name"
                value={formData.client_name}
                onChange={handleChange}
                className="input"
                placeholder="Nombre completo"
              />
            </div>

            {/* Campo: Email del Cliente */}
            <div>
              <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="client_email"
                name="client_email"
                value={formData.client_email}
                onChange={handleChange}
                className="input"
                placeholder="cliente@email.com"
              />
            </div>

            {/* Campo: Telefono del Cliente */}
            <div>
              <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <input
                type="tel"
                id="client_phone"
                name="client_phone"
                value={formData.client_phone}
                onChange={handleChange}
                className="input"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
        </div>

        {/* ===== TARJETA: Informacion del Juzgado ===== */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold">Informacion del Juzgado</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Campo: Jurisdiccion */}
            <div>
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700 mb-1">
                Jurisdiccion
              </label>
              <input
                type="text"
                id="jurisdiction"
                name="jurisdiction"
                value={formData.jurisdiction}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Federal, Estatal, Municipal"
              />
            </div>

            {/* Campo: Juzgado */}
            <div>
              <label htmlFor="court" className="block text-sm font-medium text-gray-700 mb-1">
                Juzgado
              </label>
              <input
                type="text"
                id="court"
                name="court"
                value={formData.court}
                onChange={handleChange}
                className="input"
                placeholder="Nombre del juzgado"
              />
            </div>
          </div>
        </div>

        {/* ===== SECCION: Botones de Accion ===== */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {/* Boton Cancelar: vuelve a la lista de casos */}
          <Link to="/cases" className="btn btn-secondary w-full sm:w-auto text-center">
            Cancelar
          </Link>
          {/* Boton Guardar: envia el formulario */}
          <button
            type="submit"
            disabled={isSubmitting}  // Deshabilitado mientras se guarda
            className="btn btn-primary w-full sm:w-auto inline-flex items-center justify-center"
          >
            {/* Icono dinamico: spinner durante carga, disco de guardar normalmente */}
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            {/* Texto dinamico segun el modo */}
            {isEditing ? 'Guardar Cambios' : 'Crear Caso'}
          </button>
        </div>
      </form>
    </div>
  )
}
