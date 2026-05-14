/**
 * ARCHIVO: Messages.tsx
 * PROPOSITO: Pagina del sistema de mensajeria del cliente.
 * Permite ver mensajes recibidos y enviados, leer mensajes y
 * componer nuevos mensajes para enviar al equipo legal.
 */

// useState - Hook para manejar estados locales
import { useState } from 'react'

// Hooks de React Query
// useQuery: para obtener mensajes
// useMutation: para marcar como leido y enviar mensajes
// useQueryClient: para invalidar cache
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// api - Cliente HTTP configurado
import api from '../services/api'

// Tipos TypeScript para mensajes, casos y respuestas paginadas
import type { Message, Case, PaginatedResponse } from '../types'

// Iconos de Lucide React
// MessageSquare: icono de mensaje
// Send: icono de enviar
// Inbox: icono de bandeja de entrada
// Mail: icono de correo no leido
// MailOpen: icono de correo leido
import { MessageSquare, Send, Inbox, Mail, MailOpen } from 'lucide-react'

// clsx - Utilidad para clases CSS condicionales
import clsx from 'clsx'

/**
 * Componente Messages - Sistema de mensajeria del cliente
 *
 * Caracteristicas:
 * - Vista de mensajes recibidos y enviados con tabs
 * - Lectura de mensajes con marcado automatico como leido
 * - Composicion y envio de nuevos mensajes
 * - Contador de mensajes no leidos
 * - Modal para componer mensajes
 */
export default function Messages() {
  // ========== ESTADOS LOCALES ==========

  // Tab activo: 'inbox' (recibidos) o 'sent' (enviados)
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')

  // Mensaje actualmente seleccionado para leer
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)

  // Estado del formulario de nuevo mensaje
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: '',
    case_id: '',
    case_number: ''
  })

  // Controla si el modal de composicion esta visible
  const [showCompose, setShowCompose] = useState(false)

  // Cliente de React Query para invalidar cache
  const queryClient = useQueryClient()

  // ========== CONSULTA DE CASOS ==========

  /**
   * Consulta para obtener los casos del cliente (para el selector)
   */
  const { data: cases } = useQuery({
    queryKey: ['my-cases'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Case>>('/portal/my-cases/')
      return response.data
    },
  })

  // ========== CONSULTA DE MENSAJES ==========

  /**
   * Consulta para obtener todos los mensajes del cliente
   */
  const { data: messages, isLoading } = useQuery({
    queryKey: ['my-messages'],
    queryFn: async () => {
      // Peticion GET al endpoint de mensajes
      const response = await api.get<PaginatedResponse<Message>>('/portal/messages/')
      return response.data
    },
  })

  // ========== MUTACION: MARCAR COMO LEIDO ==========

  /**
   * Mutacion para marcar un mensaje como leido
   * Se ejecuta automaticamente al seleccionar un mensaje no leido
   */
  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      // Peticion POST para marcar como leido
      await api.post(`/portal/messages/${messageId}/mark-read/`)
    },
    onSuccess: () => {
      // Invalida el cache para refrescar la lista de mensajes
      queryClient.invalidateQueries({ queryKey: ['my-messages'] })
    },
  })

  // ========== MUTACION: ENVIAR MENSAJE ==========

  /**
   * Mutacion para enviar un nuevo mensaje
   */
  const sendMessage = useMutation({
    mutationFn: async (data: { subject: string; content: string; case_id?: string; case_number?: string }) => {
      // Filtrar campos vacios antes de enviar
      const payload: Record<string, string> = {
        subject: data.subject,
        content: data.content
      }
      if (data.case_id) {
        payload.case_id = data.case_id
        payload.case_number = data.case_number || ''
      }
      // Peticion POST con el contenido del mensaje
      await api.post('/portal/messages/', payload)
    },
    onSuccess: () => {
      // Invalida el cache para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['my-messages'] })
      // Limpia el formulario
      setNewMessage({ subject: '', content: '', case_id: '', case_number: '' })
      // Cierra el modal de composicion
      setShowCompose(false)
    },
  })

  // ========== FILTRADO DE MENSAJES ==========

  /**
   * Filtra mensajes recibidos (donde el cliente es destinatario)
   * recipient_id existente indica que el mensaje fue recibido
   */
  const inboxMessages = messages?.results.filter((m) => !!m.recipient_id) || []

  /**
   * Filtra mensajes enviados (donde el cliente es remitente)
   * sender_id existente indica que el mensaje fue enviado
   */
  const sentMessages = messages?.results.filter((m) => !!m.sender_id) || []

  // Mensajes a mostrar segun el tab activo
  const displayMessages = activeTab === 'inbox' ? inboxMessages : sentMessages

  // ========== CONTADOR DE NO LEIDOS ==========

  /**
   * Cuenta mensajes no leidos en la bandeja de entrada
   * Un mensaje no leido tiene read_at como null o undefined
   */
  const unreadCount = inboxMessages.filter((m) => !m.read_at).length

  // ========== MANEJADOR DE SELECCION ==========

  /**
   * Maneja la seleccion de un mensaje
   * Si el mensaje no esta leido y esta en inbox, lo marca como leido
   */
  const handleSelectMessage = (message: Message) => {
    // Establece el mensaje seleccionado
    setSelectedMessage(message)

    // Si esta en inbox y no esta leido, marcarlo como leido
    if (activeTab === 'inbox' && !message.read_at) {
      markAsRead.mutate(message.id)
    }
  }

  // ========== ESTADO DE CARGA ==========

  // Muestra spinner mientras se cargan los datos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // ========== RENDERIZADO PRINCIPAL ==========

  return (
    <div className="space-y-6">

      {/* ========== ENCABEZADO CON TITULO Y BOTON ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Titulo de la pagina */}
        <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
        {/* Boton para abrir modal de composicion */}
        <button
          onClick={() => setShowCompose(true)}
          className="btn btn-primary inline-flex items-center"
        >
          <Send className="h-5 w-5 mr-2" />
          Nuevo Mensaje
        </button>
      </div>

      {/* ========== MODAL DE COMPOSICION ========== */}
      {/* Solo visible cuando showCompose es true */}
      {showCompose && (
        // Overlay oscuro de fondo
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          {/* Contenedor del modal */}
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            {/* Encabezado del modal */}
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Nuevo Mensaje</h2>
            </div>

            {/* Formulario de mensaje */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                // Envia el mensaje usando la mutacion
                sendMessage.mutate(newMessage)
              }}
              className="p-4 space-y-4"
            >
              {/* Selector de caso (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Caso relacionado <span className="text-gray-400">(opcional)</span>
                </label>
                <select
                  value={newMessage.case_id}
                  onChange={(e) => {
                    const selectedCase = cases?.results.find(c => c.id === e.target.value)
                    setNewMessage({
                      ...newMessage,
                      case_id: e.target.value,
                      case_number: selectedCase?.case_number || ''
                    })
                  }}
                  className="input mt-1"
                >
                  <option value="">-- Sin caso especifico --</option>
                  {cases?.results.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.case_number} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo de asunto */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Asunto</label>
                <input
                  type="text"
                  value={newMessage.subject}
                  // Actualiza el estado manteniendo los otros campos
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  className="input mt-1"
                  required
                />
              </div>

              {/* Campo de contenido del mensaje */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  // h-32: altura fija, resize-none: no redimensionable
                  className="input mt-1 h-32 resize-none"
                  required
                />
              </div>

              {/* Botones de accion */}
              <div className="flex justify-end gap-3">
                {/* Boton cancelar - cierra el modal */}
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                {/* Boton enviar - deshabilitado durante el envio */}
                <button
                  type="submit"
                  disabled={sendMessage.isPending}
                  className="btn btn-primary"
                >
                  {sendMessage.isPending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== CONTENIDO PRINCIPAL: GRID DE 2 SECCIONES ========== */}
      {/* 1 columna en movil, 3 columnas en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========== LISTA DE MENSAJES (1 COLUMNA) ========== */}
        <div className="lg:col-span-1 card">

          {/* ========== TABS: RECIBIDOS / ENVIADOS ========== */}
          <div className="flex border-b mb-4">
            {/* Tab: Recibidos */}
            <button
              onClick={() => setActiveTab('inbox')}
              className={clsx(
                'flex-1 py-2 text-sm font-medium border-b-2 -mb-px',
                // Estilos condicionales segun si esta activo
                activeTab === 'inbox'
                  ? 'border-primary-600 text-primary-600'   // Activo
                  : 'border-transparent text-gray-500 hover:text-gray-700' // Inactivo
              )}
            >
              <Inbox className="h-4 w-4 inline mr-2" />
              Recibidos
              {/* Badge con contador de no leidos */}
              {unreadCount > 0 && (
                <span className="ml-2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Tab: Enviados */}
            <button
              onClick={() => setActiveTab('sent')}
              className={clsx(
                'flex-1 py-2 text-sm font-medium border-b-2 -mb-px',
                activeTab === 'sent'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Send className="h-4 w-4 inline mr-2" />
              Enviados
            </button>
          </div>

          {/* ========== LISTA DE MENSAJES O ESTADO VACIO ========== */}
          {displayMessages.length === 0 ? (
            // Estado vacio
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No hay mensajes</p>
            </div>
          ) : (
            // Lista de mensajes con scroll
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayMessages.map((message) => (
                // Cada mensaje es un boton clickeable
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={clsx(
                    'w-full text-left p-3 rounded-lg transition-colors',
                    // Estilos condicionales segun seleccion y lectura
                    selectedMessage?.id === message.id
                      ? 'bg-primary-50 border border-primary-200' // Seleccionado
                      : 'hover:bg-gray-50',
                    // Fondo azul claro para no leidos en inbox
                    !message.read_at && activeTab === 'inbox' && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icono de correo: cerrado si no leido, abierto si leido */}
                    {activeTab === 'inbox' && !message.read_at ? (
                      <Mail className="h-4 w-4 text-primary-600 mt-1" />
                    ) : (
                      <MailOpen className="h-4 w-4 text-gray-400 mt-1" />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Asunto del mensaje */}
                      <p className={clsx(
                        'text-sm truncate',
                        // Texto mas grueso si no esta leido
                        !message.read_at && activeTab === 'inbox' ? 'font-semibold' : 'font-medium'
                      )}>
                        {message.subject}
                      </p>
                      {/* Nombre del remitente o destinatario segun el tab */}
                      <p className="text-xs text-gray-500 truncate">
                        {activeTab === 'inbox' ? message.sender_name : message.recipient_name}
                      </p>
                      {/* Fecha del mensaje */}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ========== DETALLE DEL MENSAJE (2 COLUMNAS) ========== */}
        <div className="lg:col-span-2 card">
          {selectedMessage ? (
            // Mostrar mensaje seleccionado
            <div>
              {/* Encabezado del mensaje */}
              <div className="border-b pb-4 mb-4">
                {/* Asunto */}
                <h2 className="text-lg font-semibold">{selectedMessage.subject}</h2>

                {/* Linea con remitente/destinatario y fecha */}
                <div className="flex items-center justify-between mt-2">
                  {/* Muestra "De:" para inbox, "Para:" para enviados */}
                  <p className="text-sm text-gray-500">
                    {activeTab === 'inbox' ? 'De:' : 'Para:'}{' '}
                    <span className="font-medium text-gray-700">
                      {activeTab === 'inbox'
                        ? selectedMessage.sender_name
                        : selectedMessage.recipient_name}
                    </span>
                  </p>
                  {/* Fecha y hora del mensaje */}
                  <p className="text-sm text-gray-500">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Numero de caso asociado (si existe) */}
                {selectedMessage.case_number && (
                  <p className="text-sm text-gray-500 mt-1">
                    Caso: <span className="font-medium">{selectedMessage.case_number}</span>
                  </p>
                )}
              </div>

              {/* Contenido del mensaje */}
              <div className="prose prose-sm max-w-none">
                {/* whitespace-pre-wrap: preserva saltos de linea */}
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>
          ) : (
            // Estado: ningun mensaje seleccionado
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Seleccione un mensaje para leer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
