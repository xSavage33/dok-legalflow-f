/**
 * PAGINA DE MENSAJES - Messages.tsx
 *
 * Este componente implementa el sistema de mensajeria interna del despacho legal.
 * Proporciona funcionalidades de comunicacion entre usuarios del sistema, permitiendo:
 * - Enviar y recibir mensajes entre miembros del equipo y clientes
 * - Organizar mensajes en bandeja de entrada y enviados
 * - Asociar mensajes a casos legales especificos
 * - Responder a mensajes existentes (hilos de conversacion)
 * - Buscar y filtrar mensajes por caso o termino de busqueda
 * - Marcar mensajes como leidos automaticamente al visualizarlos
 * - Mostrar contador de mensajes no leidos
 *
 * El componente utiliza TanStack Query para la gestion del estado del servidor
 * y un sistema de permisos basado en roles para controlar quien puede crear mensajes.
 */

// ============================================================================
// IMPORTACIONES
// ============================================================================

// Hook de React para manejar el estado local del componente
import { useState } from 'react'

// Hooks de TanStack Query para consultas y mutaciones de datos
// useQuery: obtiene datos del servidor con cache automatico
// useMutation: ejecuta operaciones de escritura (crear, actualizar)
// useQueryClient: accede al cliente de cache para invalidar queries
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Instancia configurada de Axios para realizar peticiones HTTP al backend
import api from '../services/api'

// Hook personalizado para acceder al contexto de autenticacion (usuario actual)
import { useAuth } from '../context/AuthContext'

// Utilidades del sistema de permisos basado en roles
// hasPermission: verifica si un rol tiene un permiso especifico
// Permission, Role: tipos TypeScript para tipado seguro
import { hasPermission, type Permission, type Role } from '../lib/permissions'

// Tipos TypeScript para las entidades del dominio
// Message: estructura de un mensaje
// MessageCreate: datos necesarios para crear un mensaje
// Case: caso legal asociable
// User: usuario del sistema
// PaginatedResponse: estructura de respuesta paginada del API
import type { Message, MessageCreate, Case, User, PaginatedResponse } from '../types'

// Iconos de la biblioteca Lucide React para la interfaz visual
import {
  MessageSquare, // Icono de burbuja de mensaje (no usado actualmente)
  Send,          // Icono de enviar - usado en boton enviar y pestana enviados
  Inbox,         // Icono de bandeja de entrada
  Mail,          // Icono de correo - usado cuando no hay mensajes
  Search,        // Icono de lupa para campo de busqueda
  Plus,          // Icono de mas - usado en boton nuevo mensaje
  X,             // Icono de cerrar - usado en modal
  ChevronLeft,   // Icono de flecha izquierda - usado para volver
  Reply,         // Icono de responder
  Clock,         // Icono de reloj - estado pendiente
  CheckCheck,    // Icono de doble check - mensaje leido
  Check,         // Icono de check simple - mensaje entregado
  User as UserIcon, // Icono de usuario (renombrado para evitar conflicto con tipo User)
  Briefcase,     // Icono de maletin - indica caso asociado
  AlertCircle,   // Icono de alerta - usado para mostrar errores
} from 'lucide-react'

// Utilidad para combinar clases CSS condicionalmente
import clsx from 'clsx'

// ============================================================================
// TIPOS LOCALES
// ============================================================================

/**
 * Tipo para las pestanas de navegacion
 * 'inbox': bandeja de entrada (mensajes recibidos)
 * 'sent': mensajes enviados por el usuario actual
 */
type TabType = 'inbox' | 'sent'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente principal de la pagina de mensajes
 * Renderiza la interfaz completa del sistema de mensajeria
 */
export default function Messages() {
  // ==========================================================================
  // AUTENTICACION Y PERMISOS
  // ==========================================================================

  // Obtiene el usuario autenticado del contexto de autenticacion
  const { user } = useAuth()

  // Obtiene el cliente de queries para invalidar cache cuando sea necesario
  const queryClient = useQueryClient()

  // Extrae el rol del usuario para verificacion de permisos
  const userRole = user?.role as Role | undefined

  // Verifica si el usuario tiene permiso para crear mensajes
  // Este permiso controla la visibilidad del boton "Nuevo mensaje"
  const canCreate = hasPermission(userRole, 'messages.create' as Permission)

  // ==========================================================================
  // ESTADOS LOCALES
  // ==========================================================================

  // Pestana activa: 'inbox' para recibidos, 'sent' para enviados
  const [activeTab, setActiveTab] = useState<TabType>('inbox')

  // Termino de busqueda para filtrar mensajes
  const [searchTerm, setSearchTerm] = useState('')

  // ID del caso seleccionado para filtrar mensajes por caso
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')

  // Controla la visibilidad del modal de redaccion de mensaje
  const [showComposeModal, setShowComposeModal] = useState(false)

  // Mensaje seleccionado para ver en detalle (null = vista de lista)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  // Mensaje al que se esta respondiendo (null = mensaje nuevo)
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)

  // Estado del formulario de redaccion de mensaje
  // Contiene todos los campos necesarios para crear un mensaje
  const [composeForm, setComposeForm] = useState<{
    recipient_id: string      // ID del destinatario
    recipient_name: string    // Nombre del destinatario (para mostrar)
    case_id: string          // ID del caso asociado (opcional)
    case_number: string      // Numero del caso (para mostrar)
    subject: string          // Asunto del mensaje
    content: string          // Contenido/cuerpo del mensaje
    parent_message_id?: string // ID del mensaje padre (si es respuesta)
  }>({
    recipient_id: '',
    recipient_name: '',
    case_id: '',
    case_number: '',
    subject: '',
    content: '',
  })

  // ==========================================================================
  // CONSULTAS DE DATOS (QUERIES)
  // ==========================================================================

  /**
   * Query para obtener la lista de mensajes
   * Se refetch automaticamente cuando cambian los filtros
   */
  const { data: messagesData, isLoading } = useQuery({
    // Clave unica que incluye los filtros para cache granular
    queryKey: ['messages', selectedCaseId, searchTerm],
    queryFn: async () => {
      // Construye los parametros de consulta dinamicamente
      const params = new URLSearchParams()
      if (selectedCaseId) params.append('case_id', selectedCaseId)
      if (searchTerm) params.append('search', searchTerm)

      // Realiza la peticion GET al endpoint de mensajes del portal
      const response = await api.get<PaginatedResponse<Message>>(`/portal/messages/?${params}`)
      return response.data
    },
  })

  /**
   * Query para obtener la lista de usuarios del sistema
   * Se usa para el selector de destinatarios al redactar mensajes
   */
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<User>>('/auth/users/')
      return response.data
    },
  })

  /**
   * Query para obtener la lista de casos legales
   * Se usa para asociar mensajes a casos y para filtrar
   */
  const { data: casesData } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Case>>('/cases/')
      return response.data
    },
  })

  /**
   * Query para obtener el conteo de mensajes no leidos
   * Se usa para mostrar el badge en la pestana de bandeja de entrada
   */
  const { data: unreadData } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Message>>('/portal/messages/unread/')
      return response.data
    },
  })

  // ==========================================================================
  // MUTACIONES (OPERACIONES DE ESCRITURA)
  // ==========================================================================

  /**
   * Mutacion para enviar un nuevo mensaje
   * Al completarse exitosamente, invalida el cache y cierra el modal
   */
  const sendMessageMutation = useMutation({
    mutationFn: async (data: MessageCreate) => {
      const response = await api.post('/portal/messages/', data)
      return response.data
    },
    onSuccess: () => {
      // Invalida todas las queries de mensajes para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      // Cierra el modal de redaccion
      setShowComposeModal(false)
      // Limpia el estado de respuesta
      setReplyToMessage(null)
      // Resetea el formulario
      resetComposeForm()
    },
  })

  /**
   * Mutacion para marcar un mensaje como leido
   * Se ejecuta automaticamente al abrir un mensaje no leido
   */
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/portal/messages/${id}/read/`)
      return response.data
    },
    onSuccess: () => {
      // Invalida el cache para actualizar el contador de no leidos
      queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  // ==========================================================================
  // FUNCIONES AUXILIARES
  // ==========================================================================

  /**
   * Resetea todos los campos del formulario de redaccion a sus valores iniciales
   */
  const resetComposeForm = () => {
    setComposeForm({
      recipient_id: '',
      recipient_name: '',
      case_id: '',
      case_number: '',
      subject: '',
      content: '',
    })
  }

  /**
   * Abre el modal de redaccion de mensaje
   * Si se proporciona un mensaje, configura el formulario para responder
   * @param replyTo - Mensaje opcional al que se esta respondiendo
   */
  const handleOpenCompose = (replyTo?: Message) => {
    if (replyTo) {
      // Modo respuesta: prellenar datos del mensaje original
      setReplyToMessage(replyTo)
      setComposeForm({
        // El destinatario es el remitente del mensaje original
        recipient_id: replyTo.sender_id,
        recipient_name: replyTo.sender_name,
        // Mantiene la asociacion al caso si existe
        case_id: replyTo.case_id || '',
        case_number: replyTo.case_number || '',
        // Agrega prefijo "Re: " al asunto si no lo tiene
        subject: replyTo.subject.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject}`,
        content: '',
        // Establece el ID del mensaje padre para el hilo
        parent_message_id: replyTo.id,
      })
    } else {
      // Modo nuevo mensaje: formulario vacio
      setReplyToMessage(null)
      resetComposeForm()
    }
    setShowComposeModal(true)
  }

  /**
   * Envia el mensaje con los datos del formulario
   * Valida que los campos requeridos esten completos antes de enviar
   */
  const handleSendMessage = () => {
    // Validacion: destinatario, asunto y contenido son obligatorios
    if (!composeForm.recipient_id || !composeForm.subject || !composeForm.content) return

    // Ejecuta la mutacion con los datos del formulario
    sendMessageMutation.mutate({
      recipient_id: composeForm.recipient_id,
      recipient_name: composeForm.recipient_name,
      // Convierte strings vacios a undefined para campos opcionales
      case_id: composeForm.case_id || undefined,
      case_number: composeForm.case_number || undefined,
      subject: composeForm.subject,
      content: composeForm.content,
      parent_message_id: composeForm.parent_message_id,
    })
  }

  /**
   * Maneja el cambio de destinatario en el formulario
   * Actualiza tanto el ID como el nombre del destinatario
   * @param userId - ID del usuario seleccionado
   */
  const handleRecipientChange = (userId: string) => {
    // Busca el usuario en la lista para obtener su nombre
    const selectedUser = usersData?.results.find(u => u.id === userId)
    setComposeForm({
      ...composeForm,
      recipient_id: userId,
      // Usa el nombre completo o el email como fallback
      recipient_name: selectedUser?.full_name || selectedUser?.email || '',
    })
  }

  /**
   * Maneja el cambio de caso asociado en el formulario
   * Actualiza tanto el ID como el numero del caso
   * @param caseId - ID del caso seleccionado
   */
  const handleCaseChange = (caseId: string) => {
    // Busca el caso en la lista para obtener su numero
    const selectedCase = casesData?.results.find(c => c.id === caseId)
    setComposeForm({
      ...composeForm,
      case_id: caseId,
      case_number: selectedCase?.case_number || '',
    })
  }

  /**
   * Maneja la visualizacion de un mensaje
   * Muestra el detalle y marca como leido si es un mensaje recibido no leido
   * @param message - Mensaje a visualizar
   */
  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message)
    // Solo marca como leido si el usuario actual es el destinatario
    // y el mensaje aun no ha sido leido
    if (message.recipient_id === user?.id && message.status !== 'read') {
      markAsReadMutation.mutate(message.id)
    }
  }

  /**
   * Filtra los mensajes segun la pestana activa
   * 'inbox': muestra mensajes donde el usuario actual es destinatario
   * 'sent': muestra mensajes donde el usuario actual es remitente
   */
  const filteredMessages = messagesData?.results.filter(message => {
    if (activeTab === 'inbox') {
      return message.recipient_id === user?.id
    } else {
      return message.sender_id === user?.id
    }
  }) || []

  // Extrae el conteo de mensajes no leidos de los datos
  const unreadCount = unreadData?.count || 0

  /**
   * Retorna el icono apropiado segun el estado del mensaje
   * @param status - Estado del mensaje ('read', 'delivered', 'pending')
   * @returns Componente de icono con color apropiado
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        // Doble check azul indica mensaje leido
        return <CheckCheck className="h-4 w-4 text-blue-500" />
      case 'delivered':
        // Check simple gris indica mensaje entregado pero no leido
        return <Check className="h-4 w-4 text-gray-500" />
      default:
        // Reloj gris claro indica mensaje pendiente de entrega
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  /**
   * Formatea una fecha de manera relativa y amigable para el usuario
   * @param dateStr - String de fecha en formato ISO
   * @returns String formateado (ej: "10:30", "Ayer", "lunes", "15 ene")
   */
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    // Calcula la diferencia en milisegundos
    const diffTime = Math.abs(now.getTime() - date.getTime())
    // Convierte a dias
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Hoy: muestra solo la hora
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      // Ayer: muestra "Ayer"
      return 'Ayer'
    } else if (diffDays < 7) {
      // Dentro de la semana: muestra el dia de la semana
      return date.toLocaleDateString('es-ES', { weekday: 'long' })
    } else {
      // Mas de una semana: muestra dia y mes abreviado
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    }
  }

  // ==========================================================================
  // RENDERIZADO DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* CABECERA DE LA PAGINA */}
      {/* Contiene el titulo, descripcion y boton de nuevo mensaje */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {/* Titulo principal de la pagina */}
          <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
          {/* Subtitulo descriptivo */}
          <p className="text-gray-500">Comunicacion interna y con clientes</p>
        </div>
        {/* Boton de nuevo mensaje - solo visible si tiene permiso */}
        {canCreate && (
          <button
            onClick={() => handleOpenCompose()}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nuevo mensaje
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENIDO PRINCIPAL - Layout de dos columnas */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ================================================================ */}
        {/* BARRA LATERAL - Navegacion y filtros */}
        {/* ================================================================ */}
        <div className="lg:w-64 space-y-4">

          {/* -------------------------------------------------------------- */}
          {/* PESTANAS DE NAVEGACION */}
          {/* Permite alternar entre bandeja de entrada y enviados */}
          {/* -------------------------------------------------------------- */}
          <div className="bg-white rounded-lg shadow-sm p-2">
            {/* Boton de Bandeja de entrada */}
            <button
              onClick={() => setActiveTab('inbox')}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                // Estilos condicionales segun pestana activa
                activeTab === 'inbox'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Inbox className="h-5 w-5" />
              <span className="flex-1 text-left">Recibidos</span>
              {/* Badge de mensajes no leidos */}
              {unreadCount > 0 && (
                <span className="bg-primary-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Boton de Mensajes enviados */}
            <button
              onClick={() => setActiveTab('sent')}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                activeTab === 'sent'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Send className="h-5 w-5" />
              <span className="flex-1 text-left">Enviados</span>
            </button>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* FILTROS DE BUSQUEDA */}
          {/* -------------------------------------------------------------- */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Filtros</h3>

            {/* Campo de busqueda por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar mensajes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            {/* Selector de filtro por caso */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Caso</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Todos los casos</option>
                {/* Mapea los casos disponibles como opciones */}
                {casesData?.results.map(caseItem => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* AREA PRINCIPAL DE CONTENIDO */}
        {/* Muestra la lista de mensajes o el detalle de un mensaje */}
        {/* ================================================================ */}
        <div className="flex-1">
          {selectedMessage ? (
            /* ============================================================ */
            /* VISTA DE DETALLE DE MENSAJE */
            /* Se muestra cuando hay un mensaje seleccionado */
            /* ============================================================ */
            <div className="bg-white rounded-lg shadow-sm">
              {/* Barra superior con boton de volver */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Volver
                </button>
              </div>

              {/* Contenido del mensaje */}
              <div className="p-6 space-y-4">
                {/* Cabecera: asunto, caso asociado y estado */}
                <div className="flex items-start justify-between">
                  <div>
                    {/* Asunto del mensaje */}
                    <h2 className="text-xl font-semibold text-gray-900">{selectedMessage.subject}</h2>
                    {/* Caso asociado (si existe) */}
                    {selectedMessage.case_number && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Briefcase className="h-4 w-4" />
                        {selectedMessage.case_number}
                      </div>
                    )}
                  </div>
                  {/* Icono de estado del mensaje */}
                  {getStatusIcon(selectedMessage.status)}
                </div>

                {/* Informacion del remitente */}
                <div className="flex items-center gap-4 py-3 border-y border-gray-100">
                  <div className="flex items-center gap-3">
                    {/* Avatar del remitente */}
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      {/* Nombre del remitente */}
                      <p className="font-medium text-gray-900">{selectedMessage.sender_name}</p>
                      {/* Rol del remitente */}
                      <p className="text-sm text-gray-500 capitalize">{selectedMessage.sender_role}</p>
                    </div>
                  </div>
                  {/* Fecha y hora del mensaje */}
                  <div className="text-sm text-gray-500 ml-auto">
                    {new Date(selectedMessage.created_at).toLocaleString('es-ES')}
                  </div>
                </div>

                {/* Cuerpo del mensaje */}
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{selectedMessage.content}</p>
                </div>

                {/* Boton de responder - solo si tiene permiso y no es el remitente */}
                {canCreate && selectedMessage.sender_id !== user?.id && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenCompose(selectedMessage)}
                      className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                    >
                      <Reply className="h-5 w-5" />
                      Responder
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* LISTA DE MENSAJES */
            /* Se muestra cuando no hay mensaje seleccionado */
            /* ============================================================ */
            <div className="bg-white rounded-lg shadow-sm">
              {/* Cabecera de la lista */}
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'inbox' ? 'Bandeja de entrada' : 'Mensajes enviados'}
                </h2>
              </div>

              {/* Estado de carga */}
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : filteredMessages.length === 0 ? (
                /* Estado vacio - no hay mensajes */
                <div className="p-8 text-center">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No hay mensajes</p>
                </div>
              ) : (
                /* Lista de mensajes */
                <div className="divide-y divide-gray-100">
                  {filteredMessages.map(message => (
                    <div
                      key={message.id}
                      onClick={() => handleViewMessage(message)}
                      className={clsx(
                        'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                        // Fondo azul claro para mensajes no leidos en inbox
                        activeTab === 'inbox' && message.status !== 'read' && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar del contacto */}
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Fila superior: nombre y fecha */}
                          <div className="flex items-center justify-between gap-2">
                            <p className={clsx(
                              'font-medium truncate',
                              // Texto mas oscuro para no leidos
                              activeTab === 'inbox' && message.status !== 'read' ? 'text-gray-900' : 'text-gray-700'
                            )}>
                              {/* Muestra remitente en inbox, destinatario en enviados */}
                              {activeTab === 'inbox' ? message.sender_name : message.recipient_name}
                            </p>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatDate(message.created_at)}
                            </span>
                          </div>

                          {/* Asunto del mensaje */}
                          <p className={clsx(
                            'text-sm truncate',
                            activeTab === 'inbox' && message.status !== 'read' ? 'font-medium text-gray-900' : 'text-gray-600'
                          )}>
                            {message.subject}
                          </p>

                          {/* Vista previa del contenido */}
                          <p className="text-sm text-gray-500 truncate">{message.content}</p>

                          {/* Fila inferior: caso asociado e icono de estado */}
                          <div className="flex items-center gap-2 mt-1">
                            {/* Numero de caso si existe */}
                            {message.case_number && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Briefcase className="h-3 w-3" />
                                {message.case_number}
                              </span>
                            )}
                            {/* Icono de estado solo en pestana de enviados */}
                            {activeTab === 'sent' && (
                              <span className="ml-auto">{getStatusIcon(message.status)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL DE REDACCION DE MENSAJE */}
      {/* Se muestra cuando showComposeModal es true */}
      {/* ==================================================================== */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

            {/* Cabecera del modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {/* Titulo dinamico segun si es respuesta o nuevo mensaje */}
                {replyToMessage ? 'Responder mensaje' : 'Nuevo mensaje'}
              </h2>
              {/* Boton de cerrar */}
              <button
                onClick={() => {
                  setShowComposeModal(false)
                  setReplyToMessage(null)
                  resetComposeForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Cuerpo del formulario */}
            <div className="p-6 space-y-4">

              {/* Campo de destinatario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Para *
                </label>
                {replyToMessage ? (
                  /* En modo respuesta, muestra el destinatario como texto no editable */
                  <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                    {composeForm.recipient_name}
                  </div>
                ) : (
                  /* En modo nuevo mensaje, muestra selector de usuarios */
                  <select
                    value={composeForm.recipient_id}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Seleccionar destinatario</option>
                    {/* Filtra para no mostrar al usuario actual */}
                    {usersData?.results
                      .filter(u => u.id !== user?.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.email}) - {u.role}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Campo de caso asociado (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caso (opcional)
                </label>
                {replyToMessage && composeForm.case_id ? (
                  /* En modo respuesta con caso, muestra como texto no editable */
                  <div className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">
                    {composeForm.case_number}
                  </div>
                ) : (
                  /* Selector de casos */
                  <select
                    value={composeForm.case_id}
                    onChange={(e) => handleCaseChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sin caso asociado</option>
                    {casesData?.results.map(caseItem => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.case_number} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Campo de asunto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Asunto del mensaje"
                  required
                />
              </div>

              {/* Campo de contenido del mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje *
                </label>
                <textarea
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-[200px]"
                  placeholder="Escriba su mensaje aqui..."
                  required
                />
              </div>

              {/* Mensaje de error si la mutacion falla */}
              {sendMessageMutation.isError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">Error al enviar el mensaje. Intente de nuevo.</p>
                </div>
              )}
            </div>

            {/* Pie del modal con botones de accion */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              {/* Boton de cancelar */}
              <button
                onClick={() => {
                  setShowComposeModal(false)
                  setReplyToMessage(null)
                  resetComposeForm()
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>

              {/* Boton de enviar */}
              <button
                onClick={handleSendMessage}
                // Deshabilitado si faltan campos requeridos o esta enviando
                disabled={!composeForm.recipient_id || !composeForm.subject || !composeForm.content || sendMessageMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMessageMutation.isPending ? (
                  /* Estado de carga mientras envia */
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Enviando...
                  </>
                ) : (
                  /* Estado normal */
                  <>
                    <Send className="h-4 w-4" />
                    Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
