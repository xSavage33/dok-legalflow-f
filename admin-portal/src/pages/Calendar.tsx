/**
 * =====================================================================
 * COMPONENTE: Calendar (Calendario)
 * =====================================================================
 *
 * Proposito: Este componente gestiona el calendario de eventos y plazos
 * procesales del despacho de abogados. Permite a los usuarios:
 * - Ver eventos proximos (audiencias, reuniones, fechas judiciales)
 * - Gestionar plazos procesales con calculos de dias habiles
 * - Crear nuevos eventos y plazos
 * - Completar o extender plazos
 * - Recibir alertas de plazos vencidos
 *
 * Los plazos procesales son criticos en la practica legal, ya que su
 * incumplimiento puede tener consecuencias graves para los casos.
 * =====================================================================
 */

// =====================================================================
// IMPORTACIONES
// =====================================================================

// Hooks de TanStack Query para manejo de estado del servidor
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Instancia de API configurada con Axios
import api from '../services/api'

// Tipos TypeScript para tipado estatico
// Event: Estructura de un evento del calendario
// Deadline: Estructura de un plazo procesal
// Case: Estructura de un caso legal
// User: Estructura de un usuario
// PaginatedResponse: Wrapper para respuestas paginadas
import type { Event, Deadline, Case, User, PaginatedResponse } from '../types'

// Iconos de Lucide React para la interfaz visual
import {
  Plus,             // Icono para agregar nuevos elementos
  Calendar as CalendarIcon, // Icono de calendario (renombrado para evitar conflicto)
  AlertTriangle,    // Icono de alerta para plazos vencidos
  MapPin,           // Icono de ubicacion
  X,                // Icono para cerrar modales
  Loader2,          // Icono de carga animado
  CheckCircle,      // Icono de confirmacion
  AlertCircle,      // Icono de alerta para errores
  Users,            // Icono de usuarios para asignaciones
  Briefcase,        // Icono de maletin para casos
  Check,            // Icono de check para completar
  RotateCcw,        // Icono para extender/renovar
} from 'lucide-react'

// Hook useState de React para manejar estado local
import { useState } from 'react'

// Utilidad clsx para combinar clases CSS condicionalmente
import clsx from 'clsx'

// Sistema de permisos personalizado
import { hasPermission, type Role } from '../lib/permissions'

// Hook de autenticacion para acceder al usuario actual
import { useAuth } from '../context/AuthContext'

// =====================================================================
// CONSTANTES DE CONFIGURACION
// =====================================================================

/**
 * EVENT_TYPES: Define los tipos de eventos disponibles
 * Cada tipo tiene un identificador interno y una etiqueta en espanol
 */
const EVENT_TYPES = [
  { value: 'hearing', label: 'Audiencia' },        // Audiencias judiciales
  { value: 'meeting', label: 'Reunion' },          // Reuniones generales
  { value: 'court_date', label: 'Fecha Judicial' }, // Fechas importantes en juzgado
  { value: 'filing', label: 'Radicacion' },        // Presentacion de documentos
  { value: 'reminder', label: 'Recordatorio' },    // Recordatorios generales
  { value: 'other', label: 'Otro' },               // Otros tipos de eventos
]

/**
 * _EVENT_STATUSES: Define los estados posibles de un evento
 * Prefijo _ indica que se mantiene para referencia futura
 */
const _EVENT_STATUSES = [
  { value: 'scheduled', label: 'Programado' },     // Evento programado
  { value: 'confirmed', label: 'Confirmado' },     // Evento confirmado
  { value: 'completed', label: 'Completado' },     // Evento realizado
  { value: 'cancelled', label: 'Cancelado' },      // Evento cancelado
  { value: 'rescheduled', label: 'Reprogramado' }, // Evento reprogramado
]
void _EVENT_STATUSES

/**
 * PRIORITIES: Define los niveles de prioridad para plazos
 * Cada prioridad tiene un color asociado para visualizacion
 */
const PRIORITIES = [
  { value: 'low', label: 'Baja', color: 'border-gray-300 bg-gray-50' },
  { value: 'medium', label: 'Media', color: 'border-yellow-400 bg-yellow-50' },
  { value: 'high', label: 'Alta', color: 'border-orange-500 bg-orange-50' },
  { value: 'critical', label: 'Critica', color: 'border-red-600 bg-red-50' },
]

/**
 * eventTypeColors: Mapeo de tipos de evento a clases CSS de color
 */
const eventTypeColors: Record<string, string> = {
  hearing: 'bg-purple-100 text-purple-800',     // Morado para audiencias
  meeting: 'bg-blue-100 text-blue-800',         // Azul para reuniones
  court_date: 'bg-red-100 text-red-800',        // Rojo para fechas judiciales
  filing: 'bg-green-100 text-green-800',        // Verde para radicaciones
  reminder: 'bg-gray-100 text-gray-800',        // Gris para recordatorios
  other: 'bg-gray-100 text-gray-800',           // Gris para otros
}

/**
 * priorityColors: Mapeo de prioridades a clases CSS de borde izquierdo
 */
const priorityColors: Record<string, string> = {
  low: 'border-l-gray-300',      // Gris para prioridad baja
  medium: 'border-l-yellow-400', // Amarillo para prioridad media
  high: 'border-l-orange-500',   // Naranja para prioridad alta
  critical: 'border-l-red-600',  // Rojo para prioridad critica
}

// =====================================================================
// COMPONENTE PRINCIPAL
// =====================================================================

/**
 * Calendar: Componente principal de la pagina de calendario
 * Exportado como default para uso en el router
 */
export default function Calendar() {
  // ===================================================================
  // AUTENTICACION Y PERMISOS
  // ===================================================================

  // Obtiene el usuario actual del contexto de autenticacion
  const { user } = useAuth()

  // Extrae y castea el rol del usuario
  const userRole = user?.role as Role | undefined

  // Verifica permisos de creacion y edicion de eventos/plazos
  const canCreate = hasPermission(userRole, 'calendar.create')
  const canEdit = hasPermission(userRole, 'calendar.edit')

  // Cliente de query para invalidar caches
  const queryClient = useQueryClient()

  // ===================================================================
  // ESTADOS LOCALES
  // ===================================================================

  // Tab activa: 'all' (todos), 'events' (solo eventos), 'deadlines' (solo plazos)
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'deadlines'>('all')

  // Estados para mostrar/ocultar modales
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)
  const [showExtendModal, setShowExtendModal] = useState(false)

  // Plazo seleccionado para extender
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null)

  // Rango de dias a mostrar (7, 15, 30, 60 o 90 dias)
  const [daysRange, setDaysRange] = useState(30)

  // ===================================================================
  // ESTADO DEL FORMULARIO DE EVENTO
  // ===================================================================

  /**
   * eventForm: Datos para crear un nuevo evento
   */
  const [eventForm, setEventForm] = useState({
    title: '',              // Titulo del evento
    description: '',        // Descripcion del evento
    event_type: 'meeting',  // Tipo de evento por defecto
    case_id: '',            // ID del caso asociado
    case_number: '',        // Numero del caso
    start_datetime: '',     // Fecha/hora de inicio
    end_datetime: '',       // Fecha/hora de fin
    all_day: false,         // Si es evento de todo el dia
    location: '',           // Ubicacion del evento
  })

  // ===================================================================
  // ESTADO DEL FORMULARIO DE PLAZO
  // ===================================================================

  /**
   * deadlineForm: Datos para crear un nuevo plazo procesal
   */
  const [deadlineForm, setDeadlineForm] = useState({
    title: '',              // Titulo del plazo
    description: '',        // Descripcion del plazo
    priority: 'medium',     // Prioridad por defecto
    case_id: '',            // ID del caso asociado
    case_number: '',        // Numero del caso
    due_date: '',           // Fecha de vencimiento
    business_days_only: true, // Solo contar dias habiles
    assigned_to_id: '',     // ID del usuario asignado
    assigned_to_name: '',   // Nombre del usuario asignado
  })

  // ===================================================================
  // ESTADO DE EXTENSION DE PLAZO
  // ===================================================================

  // Nueva fecha para extender un plazo
  const [extendDate, setExtendDate] = useState('')

  // ===================================================================
  // ESTADO DEL CALCULADOR DE FECHAS
  // ===================================================================

  /**
   * calcForm: Datos para calcular fecha de vencimiento
   * Permite calcular una fecha sumando dias habiles a una fecha inicial
   */
  const [calcForm, setCalcForm] = useState({
    start_date: new Date().toISOString().split('T')[0], // Fecha inicial (hoy)
    business_days: 15, // Dias habiles a sumar
  })

  // Fecha calculada por el servidor
  const [calculatedDate, setCalculatedDate] = useState<string | null>(null)

  // ===================================================================
  // CONSULTAS DE DATOS (QUERIES)
  // ===================================================================

  /**
   * Query para obtener eventos proximos
   * Filtra por el rango de dias seleccionado
   */
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['events', daysRange],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Event>>(`/events/upcoming/?days=${daysRange}`)
      return response.data
    },
  })

  /**
   * Query para obtener plazos proximos
   * Filtra por el rango de dias seleccionado
   */
  const { data: deadlines, isLoading: loadingDeadlines } = useQuery({
    queryKey: ['deadlines', daysRange],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Deadline>>(`/deadlines/upcoming/?days=${daysRange}`)
      return response.data
    },
  })

  /**
   * Query para obtener plazos vencidos
   * Se muestran siempre como alerta importante
   */
  const { data: overdueDeadlines } = useQuery({
    queryKey: ['overdueDeadlines'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Deadline>>('/deadlines/overdue/')
      return response.data
    },
  })

  /**
   * Query para obtener casos disponibles para el dropdown
   */
  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Case>>('/cases/?status=active&limit=100')
      return response.data.results
    },
  })

  /**
   * Query para obtener usuarios disponibles para asignacion
   */
  const { data: usersData } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<User>>('/auth/users/?limit=100')
      return response.data.results
    },
  })

  // ===================================================================
  // MUTACIONES (OPERACIONES DE ESCRITURA)
  // ===================================================================

  /**
   * Mutacion para crear un nuevo evento
   */
  const createEventMutation = useMutation({
    mutationFn: async (data: typeof eventForm) => {
      const response = await api.post('/events/', data)
      return response.data
    },
    onSuccess: () => {
      // Invalida cache de eventos para refrescar lista
      queryClient.invalidateQueries({ queryKey: ['events'] })
      // Cierra modal y resetea formulario
      setShowEventModal(false)
      resetEventForm()
    },
  })

  /**
   * Mutacion para crear un nuevo plazo
   * Incluye la fecha de vencimiento original para historial
   */
  const createDeadlineMutation = useMutation({
    mutationFn: async (data: typeof deadlineForm) => {
      const response = await api.post('/deadlines/', {
        ...data,
        original_due_date: data.due_date, // Guarda fecha original
      })
      return response.data
    },
    onSuccess: () => {
      // Invalida caches de plazos
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      queryClient.invalidateQueries({ queryKey: ['overdueDeadlines'] })
      // Cierra modal y resetea formulario
      setShowDeadlineModal(false)
      resetDeadlineForm()
    },
  })

  /**
   * Mutacion para marcar un plazo como completado
   */
  const completeDeadlineMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/deadlines/${id}/complete/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      queryClient.invalidateQueries({ queryKey: ['overdueDeadlines'] })
    },
  })

  /**
   * Mutacion para extender un plazo a una nueva fecha
   */
  const extendDeadlineMutation = useMutation({
    mutationFn: async ({ id, new_due_date }: { id: string; new_due_date: string }) => {
      const response = await api.post(`/deadlines/${id}/extend/`, { new_due_date })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] })
      queryClient.invalidateQueries({ queryKey: ['overdueDeadlines'] })
      // Cierra modal y limpia estados
      setShowExtendModal(false)
      setSelectedDeadline(null)
      setExtendDate('')
    },
  })

  // ===================================================================
  // FUNCIONES AUXILIARES
  // ===================================================================

  /**
   * Calcula la fecha de vencimiento basada en dias habiles
   * Hace una peticion al servidor que considera festivos
   */
  const calculateDeadline = async () => {
    try {
      const response = await api.post('/deadlines/calculate/', calcForm)
      // Guarda la fecha calculada
      setCalculatedDate(response.data.due_date)
      // Auto-llena el campo de fecha de vencimiento
      setDeadlineForm((prev) => ({ ...prev, due_date: response.data.due_date }))
    } catch (error) {
      console.error('Error calculating deadline:', error)
    }
  }

  /**
   * Resetea el formulario de evento a sus valores iniciales
   */
  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      event_type: 'meeting',
      case_id: '',
      case_number: '',
      start_datetime: '',
      end_datetime: '',
      all_day: false,
      location: '',
    })
  }

  /**
   * Resetea el formulario de plazo a sus valores iniciales
   */
  const resetDeadlineForm = () => {
    setDeadlineForm({
      title: '',
      description: '',
      priority: 'medium',
      case_id: '',
      case_number: '',
      due_date: '',
      business_days_only: true,
      assigned_to_id: '',
      assigned_to_name: '',
    })
    // Limpia la fecha calculada
    setCalculatedDate(null)
  }

  /**
   * Maneja la seleccion de un caso para el formulario de evento
   *
   * @param caseId - ID del caso seleccionado
   */
  const handleCaseSelectEvent = (caseId: string) => {
    const caseItem = casesData?.find((c) => c.id === caseId)
    setEventForm((prev) => ({
      ...prev,
      case_id: caseId,
      case_number: caseItem?.case_number || '',
    }))
  }

  /**
   * Maneja la seleccion de un caso para el formulario de plazo
   *
   * @param caseId - ID del caso seleccionado
   */
  const handleCaseSelectDeadline = (caseId: string) => {
    const caseItem = casesData?.find((c) => c.id === caseId)
    setDeadlineForm((prev) => ({
      ...prev,
      case_id: caseId,
      case_number: caseItem?.case_number || '',
    }))
  }

  /**
   * Maneja la seleccion de un usuario para asignacion del plazo
   *
   * @param userId - ID del usuario seleccionado
   */
  const handleUserSelect = (userId: string) => {
    const userItem = usersData?.find((u) => u.id === userId)
    setDeadlineForm((prev) => ({
      ...prev,
      assigned_to_id: userId,
      assigned_to_name: userItem?.full_name || '',
    }))
  }

  /**
   * Obtiene la etiqueta en espanol de un tipo de evento
   *
   * @param type - Valor interno del tipo de evento
   * @returns Etiqueta en espanol
   */
  const getEventTypeLabel = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.label || type
  }

  /**
   * Obtiene la etiqueta en espanol de una prioridad
   *
   * @param priority - Valor interno de la prioridad
   * @returns Etiqueta en espanol
   */
  const getPriorityLabel = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.label || priority
  }
  void getPriorityLabel // Reservado para uso futuro

  /**
   * Formatea una fecha/hora en formato legible
   *
   * @param datetime - Fecha en formato ISO
   * @returns String formateado (ej: "lun, 15 ene, 14:30")
   */
  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('es-ES', {
      weekday: 'short',    // Dia de la semana abreviado
      day: 'numeric',      // Dia del mes
      month: 'short',      // Mes abreviado
      hour: '2-digit',     // Hora con 2 digitos
      minute: '2-digit',   // Minutos con 2 digitos
    })
  }

  /**
   * Formatea una fecha en formato legible (sin hora)
   *
   * @param date - Fecha en formato ISO
   * @returns String formateado (ej: "lun, 15 ene")
   */
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  // ===================================================================
  // DATOS COMBINADOS
  // ===================================================================

  // Combina plazos vencidos con plazos proximos para mostrar todos
  const allOverdue = overdueDeadlines?.results || []
  const allDeadlines = [...allOverdue, ...(deadlines?.results || [])]

  // ===================================================================
  // RENDERIZADO DEL COMPONENTE
  // ===================================================================

  return (
    <div className="space-y-6">
      {/* =============================================================
          SECCION: ENCABEZADO DE LA PAGINA
          Contiene titulo y botones de crear evento/plazo
          ============================================================= */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendario</h1>
          <p className="page-subtitle">Gestiona eventos y plazos procesales</p>
        </div>
        {/* Botones de creacion - solo si tiene permiso */}
        {canCreate && (
          <div className="flex gap-2">
            {/* Boton para crear evento */}
            <button
              onClick={() => setShowEventModal(true)}
              className="btn btn-secondary inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Evento</span>
            </button>
            {/* Boton para crear plazo */}
            <button
              onClick={() => setShowDeadlineModal(true)}
              className="btn btn-primary inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="hidden sm:inline">Plazo</span>
            </button>
          </div>
        )}
      </div>

      {/* =============================================================
          SECCION: ALERTA DE PLAZOS VENCIDOS
          Solo se muestra si hay plazos vencidos
          ============================================================= */}
      {allOverdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            {/* Icono de alerta */}
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              {/* Mensaje principal con conteo de plazos */}
              <p className="font-semibold text-red-800">
                {allOverdue.length} plazo{allOverdue.length > 1 ? 's' : ''} vencido
                {allOverdue.length > 1 ? 's' : ''}
              </p>
              {/* Mensaje secundario */}
              <p className="text-sm text-red-600">
                Revisa los plazos vencidos y toma accion
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          SECCION: TABS Y FILTROS
          Permite cambiar entre ver todo, solo eventos o solo plazos
          ============================================================= */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          {/* Tabs de navegacion */}
          <div className="flex gap-2">
            {/* Tab: Todo */}
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'all'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Todo
            </button>
            {/* Tab: Eventos */}
            <button
              onClick={() => setActiveTab('events')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'events'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Eventos
            </button>
            {/* Tab: Plazos */}
            <button
              onClick={() => setActiveTab('deadlines')}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'deadlines'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Plazos
            </button>
          </div>
          {/* Selector de rango de dias */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Mostrar proximos:</span>
            <select
              value={daysRange}
              onChange={(e) => setDaysRange(parseInt(e.target.value))}
              className="input w-32"
            >
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* =============================================================
          SECCION: CONTENIDO PRINCIPAL
          Grid con eventos a la izquierda y plazos a la derecha
          ============================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* =============================================================
            SUBSECCION: LISTA DE EVENTOS
            Solo visible si tab es 'all' o 'events'
            ============================================================= */}
        {(activeTab === 'all' || activeTab === 'events') && (
          <div className="card">
            {/* Encabezado de la seccion */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Proximos Eventos</h2>
              </div>
              {/* Contador de eventos */}
              <span className="text-sm text-gray-500">
                {events?.results.length || 0} eventos
              </span>
            </div>

            {/* Estado de carga */}
            {loadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : events?.results && events.results.length > 0 ? (
              // Lista de eventos
              <div className="space-y-3">
                {events.results.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Titulo y tipo de evento */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{event.title}</h3>
                          {/* Badge de tipo de evento */}
                          <span
                            className={clsx(
                              'text-xs px-2 py-0.5 rounded-full',
                              eventTypeColors[event.event_type] || 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {getEventTypeLabel(event.event_type)}
                          </span>
                        </div>
                        {/* Numero de caso si existe */}
                        {event.case_number && (
                          <p className="text-sm text-primary-600 mb-1">
                            <Briefcase className="h-3 w-3 inline mr-1" />
                            {event.case_number}
                          </p>
                        )}
                        {/* Ubicacion si existe */}
                        {event.location && (
                          <p className="text-sm text-gray-500">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      {/* Fecha/hora del evento */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDateTime(event.start_datetime)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Estado vacio
              <div className="empty-state py-8">
                <CalendarIcon className="empty-state-icon" />
                <p className="empty-state-title">No hay eventos proximos</p>
                <p className="empty-state-description">
                  No tienes eventos programados en los proximos {daysRange} dias
                </p>
              </div>
            )}
          </div>
        )}

        {/* =============================================================
            SUBSECCION: LISTA DE PLAZOS
            Solo visible si tab es 'all' o 'deadlines'
            ============================================================= */}
        {(activeTab === 'all' || activeTab === 'deadlines') && (
          <div className="card">
            {/* Encabezado de la seccion */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Plazos</h2>
              </div>
              {/* Contador de plazos */}
              <span className="text-sm text-gray-500">
                {allDeadlines.length} plazos
              </span>
            </div>

            {/* Estado de carga */}
            {loadingDeadlines ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : allDeadlines.length > 0 ? (
              // Lista de plazos
              <div className="space-y-3">
                {allDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    className={clsx(
                      'p-4 rounded-lg border-l-4 transition-colors',
                      priorityColors[deadline.priority],
                      // Fondo rojo si esta vencido, gris normal si no
                      deadline.is_overdue ? 'bg-red-50' : 'bg-gray-50 hover:bg-gray-100'
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Titulo y badge de vencido */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{deadline.title}</h3>
                          {/* Badge de vencido si aplica */}
                          {deadline.is_overdue && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                              Vencido
                            </span>
                          )}
                        </div>
                        {/* Numero de caso si existe */}
                        {deadline.case_number && (
                          <p className="text-sm text-primary-600 mb-1">
                            <Briefcase className="h-3 w-3 inline mr-1" />
                            {deadline.case_number}
                          </p>
                        )}
                        {/* Usuario asignado si existe */}
                        {deadline.assigned_to_name && (
                          <p className="text-sm text-gray-500">
                            <Users className="h-3 w-3 inline mr-1" />
                            {deadline.assigned_to_name}
                          </p>
                        )}
                      </div>
                      {/* Fecha de vencimiento y acciones */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(deadline.due_date)}
                        </p>
                        {/* Dias restantes o dias vencido */}
                        {deadline.days_remaining !== null && (
                          <p
                            className={clsx(
                              'text-xs',
                              deadline.is_overdue ? 'text-red-600 font-medium' : 'text-gray-500'
                            )}
                          >
                            {deadline.is_overdue
                              ? `Vencido hace ${Math.abs(deadline.days_remaining ?? 0)} dias`
                              : deadline.days_remaining === 0
                              ? 'Hoy'
                              : `${deadline.days_remaining} dias restantes`}
                          </p>
                        )}
                        {/* Botones de accion para plazos pendientes */}
                        {canEdit && deadline.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1 mt-2">
                            {/* Boton completar */}
                            <button
                              onClick={() => completeDeadlineMutation.mutate(deadline.id)}
                              disabled={completeDeadlineMutation.isPending}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Completar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            {/* Boton extender */}
                            <button
                              onClick={() => {
                                setSelectedDeadline(deadline)
                                setExtendDate('')
                                setShowExtendModal(true)
                              }}
                              className="p-1 text-amber-600 hover:bg-amber-100 rounded"
                              title="Extender"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Estado vacio
              <div className="empty-state py-8">
                <AlertTriangle className="empty-state-icon" />
                <p className="empty-state-title">No hay plazos proximos</p>
                <p className="empty-state-description">
                  No tienes plazos pendientes en los proximos {daysRange} dias
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =============================================================
          MODAL: CREAR EVENTO
          Formulario para crear un nuevo evento del calendario
          ============================================================= */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowEventModal(false)} />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Nuevo Evento</h2>
                <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Campo: Titulo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="input"
                    placeholder="Titulo del evento"
                  />
                </div>

                {/* Campos: Tipo de evento y Caso */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={eventForm.event_type}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, event_type: e.target.value }))}
                      className="input"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caso</label>
                    <select
                      value={eventForm.case_id}
                      onChange={(e) => handleCaseSelectEvent(e.target.value)}
                      className="input"
                    >
                      <option value="">Sin caso</option>
                      {casesData?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.case_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Campos: Fecha/hora inicio y fin */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha/Hora Inicio *</label>
                    <input
                      type="datetime-local"
                      value={eventForm.start_datetime}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, start_datetime: e.target.value }))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha/Hora Fin</label>
                    <input
                      type="datetime-local"
                      value={eventForm.end_datetime}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, end_datetime: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                {/* Campo: Ubicacion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicacion</label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="input"
                    placeholder="Direccion o sala"
                  />
                </div>

                {/* Campo: Descripcion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="input"
                    rows={2}
                    placeholder="Notas adicionales"
                  />
                </div>

                {/* Checkbox: Todo el dia */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventForm.all_day}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, all_day: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Todo el dia</span>
                </label>
              </div>

              {/* Mensaje de error */}
              {createEventMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al crear el evento. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion */}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowEventModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={() => createEventMutation.mutate(eventForm)}
                  disabled={!eventForm.title || !eventForm.start_datetime || createEventMutation.isPending}
                  className="btn btn-primary inline-flex items-center"
                >
                  {createEventMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Crear Evento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: CREAR PLAZO
          Formulario para crear un nuevo plazo procesal
          ============================================================= */}
      {showDeadlineModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowDeadlineModal(false)} />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Nuevo Plazo</h2>
                <button onClick={() => setShowDeadlineModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Campo: Titulo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
                  <input
                    type="text"
                    value={deadlineForm.title}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="input"
                    placeholder="Titulo del plazo"
                  />
                </div>

                {/* Campos: Prioridad y Caso */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad *</label>
                    <select
                      value={deadlineForm.priority}
                      onChange={(e) => setDeadlineForm((prev) => ({ ...prev, priority: e.target.value }))}
                      className="input"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caso</label>
                    <select
                      value={deadlineForm.case_id}
                      onChange={(e) => handleCaseSelectDeadline(e.target.value)}
                      className="input"
                    >
                      <option value="">Sin caso</option>
                      {casesData?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.case_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Seccion: Calculadora de fecha de vencimiento */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Calcular fecha de vencimiento</p>
                  <div className="flex gap-3 items-end">
                    {/* Campo: Fecha inicial */}
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Desde</label>
                      <input
                        type="date"
                        value={calcForm.start_date}
                        onChange={(e) => setCalcForm((prev) => ({ ...prev, start_date: e.target.value }))}
                        className="input"
                      />
                    </div>
                    {/* Campo: Dias habiles */}
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">Dias habiles</label>
                      <input
                        type="number"
                        min="1"
                        value={calcForm.business_days}
                        onChange={(e) =>
                          setCalcForm((prev) => ({ ...prev, business_days: parseInt(e.target.value) || 1 }))
                        }
                        className="input"
                      />
                    </div>
                    {/* Boton calcular */}
                    <button
                      type="button"
                      onClick={calculateDeadline}
                      className="btn btn-secondary btn-sm"
                    >
                      Calcular
                    </button>
                  </div>
                  {/* Muestra fecha calculada */}
                  {calculatedDate && (
                    <p className="text-sm text-green-600 mt-2">
                      Fecha calculada: {formatDate(calculatedDate)}
                    </p>
                  )}
                </div>

                {/* Campo: Fecha de vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    value={deadlineForm.due_date}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    className="input"
                  />
                </div>

                {/* Campo: Usuario asignado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
                  <select
                    value={deadlineForm.assigned_to_id}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    className="input"
                  >
                    <option value="">Sin asignar</option>
                    {usersData?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo: Descripcion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                  <textarea
                    value={deadlineForm.description}
                    onChange={(e) => setDeadlineForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="input"
                    rows={2}
                    placeholder="Notas adicionales"
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {createDeadlineMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al crear el plazo. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion */}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowDeadlineModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={() => createDeadlineMutation.mutate(deadlineForm)}
                  disabled={!deadlineForm.title || !deadlineForm.due_date || createDeadlineMutation.isPending}
                  className="btn btn-primary inline-flex items-center"
                >
                  {createDeadlineMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Crear Plazo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: EXTENDER PLAZO
          Formulario para extender la fecha de vencimiento de un plazo
          ============================================================= */}
      {showExtendModal && selectedDeadline && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowExtendModal(false)} />
            {/* Contenedor del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Extender Plazo</h2>
                <button onClick={() => setShowExtendModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Informacion del plazo actual */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Plazo actual</p>
                  <p className="font-semibold">{selectedDeadline.title}</p>
                  <p className="text-sm text-gray-500 mt-2">Vencimiento actual</p>
                  <p className="font-medium">{formatDate(selectedDeadline.due_date)}</p>
                </div>

                {/* Campo: Nueva fecha de vencimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Fecha de Vencimiento *</label>
                  <input
                    type="date"
                    value={extendDate}
                    onChange={(e) => setExtendDate(e.target.value)}
                    min={selectedDeadline.due_date} // No puede ser anterior a la fecha actual
                    className="input"
                  />
                </div>
              </div>

              {/* Mensaje de error */}
              {extendDeadlineMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al extender el plazo. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion */}
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowExtendModal(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    extendDeadlineMutation.mutate({
                      id: selectedDeadline.id,
                      new_due_date: extendDate,
                    })
                  }
                  disabled={!extendDate || extendDeadlineMutation.isPending}
                  className="btn btn-primary inline-flex items-center"
                >
                  {extendDeadlineMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Extendiendo...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Extender
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
