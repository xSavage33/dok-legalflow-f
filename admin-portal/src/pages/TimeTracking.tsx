/**
 * =====================================================================
 * COMPONENTE: TimeTracking (Control de Tiempo)
 * =====================================================================
 *
 * Proposito: Este componente gestiona el registro y seguimiento del tiempo
 * de trabajo en un despacho de abogados. Permite a los usuarios:
 * - Iniciar, pausar, reanudar y detener temporizadores
 * - Crear entradas de tiempo manuales
 * - Filtrar y visualizar entradas de tiempo existentes
 * - Ver resumenes de horas trabajadas y montos facturables
 *
 * Este componente es fundamental para la facturacion por horas en el
 * ejercicio de la abogacia.
 * =====================================================================
 */

// =====================================================================
// IMPORTACIONES
// =====================================================================

// Importacion de hooks de TanStack Query para manejo de estado del servidor
// useQuery: Para obtener datos del servidor (GET)
// useMutation: Para modificar datos en el servidor (POST, PUT, DELETE)
// useQueryClient: Para invalidar y refrescar caches de consultas
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Importacion del servicio de API configurado con Axios
// Este modulo contiene la instancia de axios con interceptores y configuracion base
import api from '../services/api'

// Importacion de tipos TypeScript para tipado estatico
// TimeEntry: Representa una entrada de tiempo registrada
// Timer: Representa un temporizador activo
// Case: Representa un caso legal
// PaginatedResponse: Wrapper para respuestas paginadas del backend
import type { TimeEntry, Timer, Case, PaginatedResponse } from '../types'

// Importacion de iconos de la libreria Lucide React
// Cada icono representa una accion o estado visual en la interfaz
import {
  Play,           // Icono para iniciar/reanudar temporizador
  Square,         // Icono para detener temporizador
  Plus,           // Icono para agregar nuevos elementos
  Clock,          // Icono de reloj para representar tiempo
  Pause,          // Icono para pausar temporizador
  X,              // Icono para cerrar modales/cancelar
  Filter,         // Icono para mostrar filtros
  Briefcase,      // Icono de maletin para representar casos
  DollarSign,     // Icono de dolar para elementos facturables
  CheckCircle,    // Icono de check para confirmar acciones
  AlertCircle,    // Icono de alerta para errores
  Loader2,        // Icono de carga animado (spinner)
  ChevronDown,    // Icono de flecha hacia abajo
  Trash2,         // Icono de papelera para eliminar
  Edit,           // Icono de lapiz para editar
} from 'lucide-react'

// Importacion de hooks de React
// useState: Para manejar estado local del componente
// useEffect: Para ejecutar efectos secundarios (temporizador, sincronizacion)
import { useState, useEffect } from 'react'

// Importacion de utilidad clsx para combinar clases CSS condicionalmente
// Permite escribir clases dinamicas de forma legible
import clsx from 'clsx'

// Importacion del sistema de permisos personalizado
// hasPermission: Funcion que verifica si un rol tiene un permiso especifico
// Role: Tipo TypeScript que define los roles posibles del sistema
import { hasPermission, type Role } from '../lib/permissions'

// Importacion del hook de autenticacion personalizado
// Proporciona acceso al usuario actual y funciones de autenticacion
import { useAuth } from '../context/AuthContext'

// =====================================================================
// CONSTANTES DE CONFIGURACION
// =====================================================================

/**
 * ACTIVITY_TYPES: Define los tipos de actividades que se pueden registrar
 * Cada actividad tiene:
 * - value: Identificador interno usado en la base de datos
 * - label: Texto visible para el usuario en espanol
 */
const ACTIVITY_TYPES = [
  { value: 'research', label: 'Investigacion' },        // Investigacion juridica
  { value: 'drafting', label: 'Redaccion' },            // Redaccion de documentos
  { value: 'review', label: 'Revision' },               // Revision de documentos
  { value: 'meeting', label: 'Reunion' },               // Reuniones con clientes o colegas
  { value: 'court', label: 'Audiencia/Juzgado' },       // Comparecencias judiciales
  { value: 'call', label: 'Llamada' },                  // Llamadas telefonicas
  { value: 'email', label: 'Correo electronico' },      // Gestion de correos
  { value: 'travel', label: 'Desplazamiento' },         // Viajes relacionados con casos
  { value: 'administrative', label: 'Administrativo' }, // Tareas administrativas
  { value: 'other', label: 'Otro' },                    // Categoria generica
]

/**
 * STATUS_LABELS: Mapeo de estados internos a etiquetas en espanol
 * Los estados representan el ciclo de vida de una entrada de tiempo
 */
const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',       // Entrada creada pero no enviada
  submitted: 'Enviado',    // Entrada enviada para aprobacion
  approved: 'Aprobado',    // Entrada aprobada por supervisor
  billed: 'Facturado',     // Entrada incluida en una factura
  rejected: 'Rechazado',   // Entrada rechazada por supervisor
}

/**
 * statusColors: Mapeo de estados a clases CSS para badges
 * Define los colores visuales segun el estado de la entrada
 */
const statusColors: Record<string, string> = {
  draft: 'badge-gray',      // Gris para borradores
  submitted: 'badge-warning', // Amarillo para enviados
  approved: 'badge-success',  // Verde para aprobados
  billed: 'badge-primary',    // Azul para facturados
  rejected: 'badge-danger',   // Rojo para rechazados
}

// =====================================================================
// COMPONENTE PRINCIPAL
// =====================================================================

/**
 * TimeTracking: Componente principal de la pagina de control de tiempo
 * Exportado como default para uso en el router de la aplicacion
 */
export default function TimeTracking() {
  // ===================================================================
  // AUTENTICACION Y PERMISOS
  // ===================================================================

  // Obtiene el usuario actual del contexto de autenticacion
  const { user } = useAuth()

  // Extrae el rol del usuario y lo castea al tipo Role
  // El operador ?. maneja el caso donde user puede ser undefined
  const userRole = user?.role as Role | undefined

  // Verifica si el usuario tiene permiso para crear entradas de tiempo
  const canCreate = hasPermission(userRole, 'time.create')

  // Verifica si el usuario tiene permiso para editar entradas de tiempo
  const canEdit = hasPermission(userRole, 'time.edit')

  // ===================================================================
  // CONFIGURACION DE REACT QUERY
  // ===================================================================

  // Obtiene el cliente de query para invalidar caches manualmente
  const queryClient = useQueryClient()

  // ===================================================================
  // ESTADOS LOCALES DEL COMPONENTE
  // ===================================================================

  // Estado para el tiempo transcurrido mostrado en el temporizador (en segundos)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Estado para mostrar/ocultar el panel de configuracion del temporizador
  const [showTimerSettings, setShowTimerSettings] = useState(false)

  // Estado para mostrar/ocultar el modal de entrada manual
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Estado para mostrar/ocultar el panel de filtros
  const [showFilters, setShowFilters] = useState(false)

  // Estado para almacenar la entrada que se esta editando (null si es nueva)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // ===================================================================
  // ESTADOS DE FILTROS
  // ===================================================================

  // Filtro por fecha de inicio (formato YYYY-MM-DD)
  const [dateFrom, setDateFrom] = useState('')

  // Filtro por fecha de fin (formato YYYY-MM-DD)
  const [dateTo, setDateTo] = useState('')

  // Filtro por estado de la entrada
  const [statusFilter, setStatusFilter] = useState('')

  // Filtro por caso asociado (ID del caso)
  const [caseFilter, setCaseFilter] = useState('')

  // ===================================================================
  // ESTADO DEL FORMULARIO DEL TEMPORIZADOR
  // ===================================================================

  /**
   * timerForm: Contiene los datos del temporizador antes de iniciarlo
   * Se usa para asociar el tiempo con un caso y actividad especificos
   */
  const [timerForm, setTimerForm] = useState({
    case_id: '',          // ID del caso asociado
    case_number: '',      // Numero del caso (para mostrar)
    description: '',      // Descripcion del trabajo
    activity_type: 'other', // Tipo de actividad
    is_billable: true,    // Si el tiempo es facturable
  })

  // ===================================================================
  // ESTADO DEL FORMULARIO DE ENTRADA MANUAL
  // ===================================================================

  /**
   * entryForm: Contiene los datos para crear una entrada de tiempo manual
   * Permite especificar fecha, duracion y detalles del trabajo realizado
   */
  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    hours: 0,              // Horas trabajadas
    minutes: 0,            // Minutos trabajados
    description: '',       // Descripcion del trabajo
    activity_type: 'other', // Tipo de actividad
    case_id: '',           // ID del caso asociado
    is_billable: true,     // Si el tiempo es facturable
  })

  // ===================================================================
  // ESTADO DEL TEMPORIZADOR EN EJECUCION
  // ===================================================================

  // Estado para rastrear si el temporizador esta corriendo
  // Se usa para determinar el intervalo de refetch de datos
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // ===================================================================
  // CONSULTAS DE DATOS (QUERIES)
  // ===================================================================

  /**
   * Query para obtener el temporizador actual del usuario
   * Si no hay temporizador activo, retorna null
   * Se refresca cada 5 segundos cuando el temporizador esta corriendo
   */
  const { data: currentTimer } = useQuery({
    // Clave unica para identificar esta query en el cache
    queryKey: ['currentTimer'],
    // Funcion que realiza la peticion al servidor
    queryFn: async () => {
      try {
        // Intenta obtener el temporizador actual del endpoint
        const response = await api.get<Timer>('/timers/current/')
        return response.data
      } catch {
        // Si no hay temporizador activo o hay error, retorna null
        return null
      }
    },
    // Intervalo de refresco: 5 segundos si esta corriendo, desactivado si no
    refetchInterval: isTimerRunning ? 5000 : false,
  })

  /**
   * Efecto para sincronizar el estado isTimerRunning con el temporizador actual
   * Se ejecuta cada vez que cambia el estado is_running del temporizador
   */
  useEffect(() => {
    // Actualiza el estado local basado en el temporizador del servidor
    // El operador ?? proporciona false como valor por defecto
    setIsTimerRunning(currentTimer?.is_running ?? false)
  }, [currentTimer?.is_running])

  /**
   * Query para obtener la lista de entradas de tiempo
   * Se filtra por los parametros seleccionados por el usuario
   */
  const { data: timeEntries, isLoading: loadingEntries } = useQuery({
    // La clave incluye los filtros para que se refetch cuando cambien
    queryKey: ['timeEntries', dateFrom, dateTo, statusFilter, caseFilter],
    queryFn: async () => {
      // Construye los parametros de consulta dinamicamente
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      if (statusFilter) params.append('status', statusFilter)
      if (caseFilter) params.append('case_id', caseFilter)
      // Realiza la peticion con los filtros aplicados
      const response = await api.get<PaginatedResponse<TimeEntry>>(`/time-entries/?${params}`)
      return response.data
    },
  })

  /**
   * Query para obtener los casos disponibles para el dropdown
   * Solo obtiene casos activos con un limite de 100 para rendimiento
   */
  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown'],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Case>>('/cases/?status=active&limit=100')
      // Retorna solo el array de resultados, no la estructura paginada completa
      return response.data.results
    },
  })

  /**
   * Query para obtener el resumen de tiempo (horas totales, facturables, etc.)
   * Se filtra por el rango de fechas seleccionado
   */
  const { data: summary } = useQuery({
    queryKey: ['timeSummary', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      const response = await api.get(`/time-entries/summary/?${params}`)
      return response.data
    },
  })

  // ===================================================================
  // MUTACIONES (OPERACIONES DE ESCRITURA)
  // ===================================================================

  /**
   * Mutacion para iniciar un nuevo temporizador
   * Envia los datos del formulario al servidor y actualiza el cache
   */
  const startTimerMutation = useMutation({
    // Funcion que realiza la peticion POST
    mutationFn: async (data: typeof timerForm) => {
      const response = await api.post<Timer>('/timers/start/', data)
      return response.data
    },
    // Callback ejecutado despues de una operacion exitosa
    onSuccess: () => {
      // Invalida el cache del temporizador para forzar refresco
      queryClient.invalidateQueries({ queryKey: ['currentTimer'] })
      // Oculta el panel de configuracion
      setShowTimerSettings(false)
      // Resetea el formulario del temporizador a valores iniciales
      setTimerForm({
        case_id: '',
        case_number: '',
        description: '',
        activity_type: 'other',
        is_billable: true,
      })
    },
  })

  /**
   * Mutacion para detener el temporizador actual
   * Opcionalmente crea una entrada de tiempo con el tiempo registrado
   */
  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      // create_time_entry: true indica que se debe crear una entrada de tiempo
      const response = await api.post('/timers/stop/', { create_time_entry: true })
      return response.data
    },
    onSuccess: () => {
      // Invalida multiples caches ya que se creo una nueva entrada
      queryClient.invalidateQueries({ queryKey: ['currentTimer'] })
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      queryClient.invalidateQueries({ queryKey: ['timeSummary'] })
    },
  })

  /**
   * Mutacion para pausar el temporizador actual
   * El tiempo pausado se conserva y puede reanudarse
   */
  const pauseTimerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/timers/${id}/pause/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTimer'] })
    },
  })

  /**
   * Mutacion para reanudar un temporizador pausado
   * Continua desde donde se detuvo
   */
  const resumeTimerMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/timers/${id}/resume/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTimer'] })
    },
  })

  /**
   * Mutacion para descartar un temporizador sin guardar
   * Elimina el temporizador sin crear entrada de tiempo
   */
  const discardTimerMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/timers/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTimer'] })
    },
  })

  /**
   * Mutacion para crear una nueva entrada de tiempo manual
   * Usada cuando el usuario registra tiempo sin usar el temporizador
   */
  const createEntryMutation = useMutation({
    mutationFn: async (data: {
      date: string
      duration_minutes: number
      description: string
      activity_type: string
      case_id?: string
      is_billable: boolean
    }) => {
      const response = await api.post('/time-entries/', data)
      return response.data
    },
    onSuccess: () => {
      // Invalida caches relacionados para mostrar la nueva entrada
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      queryClient.invalidateQueries({ queryKey: ['timeSummary'] })
      // Cierra el modal y resetea el formulario
      setShowManualEntry(false)
      resetEntryForm()
    },
  })

  /**
   * Mutacion para actualizar una entrada de tiempo existente
   * Solo permite modificar entradas en estado borrador
   */
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TimeEntry> }) => {
      // PATCH para actualizacion parcial
      const response = await api.patch(`/time-entries/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      queryClient.invalidateQueries({ queryKey: ['timeSummary'] })
      // Limpia el estado de edicion
      setEditingEntry(null)
    },
  })

  /**
   * Mutacion para eliminar una entrada de tiempo
   * Solo permite eliminar entradas en estado borrador
   */
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/time-entries/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      queryClient.invalidateQueries({ queryKey: ['timeSummary'] })
    },
  })

  // ===================================================================
  // EFECTOS SECUNDARIOS
  // ===================================================================

  /**
   * Efecto para actualizar el tiempo transcurrido cada segundo
   * Maneja tres estados: temporizador corriendo, pausado o detenido
   */
  useEffect(() => {
    // Si el temporizador no esta corriendo
    if (!currentTimer?.is_running) {
      if (currentTimer) {
        // Si esta pausado, muestra el tiempo acumulado
        setElapsedTime(currentTimer.elapsed_seconds || 0)
      } else {
        // Si no hay temporizador, resetea a cero
        setElapsedTime(0)
      }
      return // Salir sin crear intervalo
    }

    // Si el temporizador esta corriendo, sincroniza con el valor del servidor
    setElapsedTime(currentTimer.elapsed_seconds || 0)

    // Crea un intervalo que incrementa el tiempo cada segundo
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    // Funcion de limpieza: elimina el intervalo cuando el componente se desmonta
    // o cuando cambia el estado del temporizador
    return () => clearInterval(interval)
  }, [currentTimer]) // Dependencia: se re-ejecuta cuando cambia currentTimer

  // ===================================================================
  // FUNCIONES AUXILIARES
  // ===================================================================

  /**
   * Resetea el formulario de entrada manual a sus valores por defecto
   * Se llama despues de crear/actualizar una entrada o cancelar
   */
  const resetEntryForm = () => {
    setEntryForm({
      date: new Date().toISOString().split('T')[0], // Fecha actual
      hours: 0,
      minutes: 0,
      description: '',
      activity_type: 'other',
      case_id: '',
      is_billable: true,
    })
  }

  /**
   * Maneja el inicio del temporizador
   * Si hay datos de caso o descripcion, inicia directamente
   * Si no, muestra el panel de configuracion
   */
  const handleStartTimer = () => {
    if (timerForm.case_id || timerForm.description) {
      // Si hay datos, inicia el temporizador
      startTimerMutation.mutate(timerForm)
    } else {
      // Si no hay datos, muestra el panel para configurar
      setShowTimerSettings(true)
    }
  }
  void handleStartTimer // Reservado para uso futuro

  /**
   * Inicia el temporizador rapidamente sin configuracion adicional
   * Util para cuando el usuario quiere empezar a trabajar inmediatamente
   */
  const handleQuickStart = () => {
    startTimerMutation.mutate(timerForm)
  }

  /**
   * Maneja la seleccion de un caso en el dropdown
   * Actualiza tanto el ID como el numero del caso para mostrar
   */
  const handleCaseSelect = (caseId: string) => {
    // Busca el caso seleccionado en la lista de casos
    const selectedCase = casesData?.find((c) => c.id === caseId)
    // Actualiza el estado del formulario con los datos del caso
    setTimerForm((prev) => ({
      ...prev,
      case_id: caseId,
      case_number: selectedCase?.case_number || '',
    }))
  }

  /**
   * Maneja la creacion de una entrada de tiempo manual
   * Valida los datos y ejecuta la mutacion
   */
  const handleCreateEntry = () => {
    // Calcula la duracion total en minutos
    const duration_minutes = entryForm.hours * 60 + entryForm.minutes
    // Validacion: debe tener duracion y descripcion
    if (duration_minutes <= 0 || !entryForm.description) return

    // Ejecuta la mutacion con los datos del formulario
    createEntryMutation.mutate({
      date: entryForm.date,
      duration_minutes,
      description: entryForm.description,
      activity_type: entryForm.activity_type,
      case_id: entryForm.case_id || undefined, // undefined si esta vacio
      is_billable: entryForm.is_billable,
    })
  }

  /**
   * Formatea segundos a formato de tiempo HH:MM:SS
   * Usado para mostrar el temporizador principal
   *
   * @param seconds - Tiempo en segundos a formatear
   * @returns String en formato "00:00:00"
   */
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)           // Calcula horas
    const minutes = Math.floor((seconds % 3600) / 60)  // Calcula minutos restantes
    const secs = seconds % 60                          // Calcula segundos restantes
    // Retorna con padding de ceros para formato consistente
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * Formatea minutos a formato legible (ej: "2h 30min")
   * Usado para mostrar duracion de entradas de tiempo
   *
   * @param minutes - Tiempo en minutos a formatear
   * @returns String en formato "Xh Xmin"
   */
  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)  // Calcula horas completas
    const m = minutes % 60              // Calcula minutos restantes
    // Casos especiales para formato mas limpio
    if (h === 0) return `${m}min`        // Solo minutos
    if (m === 0) return `${h}h`          // Solo horas
    return `${h}h ${m}min`               // Horas y minutos
  }

  /**
   * Obtiene la etiqueta en espanol de un tipo de actividad
   *
   * @param value - Valor interno del tipo de actividad
   * @returns Etiqueta en espanol o el valor original si no se encuentra
   */
  const getActivityLabel = (value: string) => {
    return ACTIVITY_TYPES.find((a) => a.value === value)?.label || value
  }

  // ===================================================================
  // RENDERIZADO DEL COMPONENTE
  // ===================================================================

  return (
    <div className="space-y-6">
      {/* =============================================================
          SECCION: ENCABEZADO DE LA PAGINA
          Contiene el titulo y el boton de entrada manual
          ============================================================= */}
      <div className="page-header">
        <div>
          {/* Titulo principal de la pagina */}
          <h1 className="page-title">Control de Tiempo</h1>
          {/* Subtitulo descriptivo */}
          <p className="page-subtitle">Registra y gestiona tu tiempo de trabajo</p>
        </div>
        {/* Boton de entrada manual - solo visible si el usuario tiene permiso */}
        {canCreate && (
          <button
            onClick={() => setShowManualEntry(true)}
            className="btn btn-secondary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            {/* Texto responsive: completo en pantallas grandes, corto en movil */}
            <span className="hidden sm:inline">Entrada Manual</span>
            <span className="sm:hidden">Manual</span>
          </button>
        )}
      </div>

      {/* =============================================================
          SECCION: TARJETA DEL TEMPORIZADOR
          Muestra el temporizador principal con controles y configuracion
          ============================================================= */}
      <div className="card bg-gradient-to-br from-primary-900 to-primary-800 text-white">
        {/* Contenedor flex para alinear temporizador y controles */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Lado izquierdo: Icono y display del tiempo */}
          <div className="flex items-center gap-6">
            {/* Icono de reloj con fondo semi-transparente */}
            <div className="p-4 bg-white/10 rounded-full">
              <Clock className="h-10 w-10" />
            </div>
            <div className="text-center lg:text-left">
              {/* Display principal del tiempo en formato grande */}
              <p className="text-5xl font-mono font-bold tracking-tight">
                {formatTime(elapsedTime)}
              </p>
              {/* Estado del temporizador en texto */}
              <p className="text-primary-200 mt-1">
                {currentTimer?.is_running
                  ? 'Temporizador activo'
                  : currentTimer
                  ? 'Temporizador pausado'
                  : 'Temporizador detenido'}
              </p>
              {/* Informacion adicional cuando hay temporizador activo */}
              {currentTimer && (
                <div className="mt-2 flex flex-wrap items-center gap-2 justify-center lg:justify-start">
                  {/* Badge con numero de caso si esta asociado */}
                  {currentTimer.case_number && (
                    <span className="inline-flex items-center gap-1 text-sm bg-white/10 px-2 py-1 rounded">
                      <Briefcase className="h-3 w-3" />
                      {currentTimer.case_number}
                    </span>
                  )}
                  {/* Descripcion del trabajo si existe */}
                  {currentTimer.description && (
                    <span className="text-sm text-primary-200 truncate max-w-[200px]">
                      {currentTimer.description}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lado derecho: Botones de control del temporizador */}
          <div className="flex items-center gap-3">
            {/* Renderizado condicional basado en el estado del temporizador */}
            {currentTimer?.is_running ? (
              // Estado: Temporizador corriendo - Muestra pausar y guardar
              <>
                {/* Boton de pausar */}
                <button
                  onClick={() => pauseTimerMutation.mutate(currentTimer.id)}
                  disabled={pauseTimerMutation.isPending}
                  className="btn bg-white/20 hover:bg-white/30 text-white inline-flex items-center"
                  title="Pausar"
                >
                  <Pause className="h-5 w-5" />
                </button>
                {/* Boton de guardar (detener y crear entrada) */}
                <button
                  onClick={() => stopTimerMutation.mutate()}
                  disabled={stopTimerMutation.isPending}
                  className="btn bg-white text-primary-900 hover:bg-primary-50 inline-flex items-center"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Guardar
                </button>
              </>
            ) : currentTimer ? (
              // Estado: Temporizador pausado - Muestra reanudar, guardar y descartar
              <>
                {/* Boton de reanudar */}
                <button
                  onClick={() => resumeTimerMutation.mutate(currentTimer.id)}
                  disabled={resumeTimerMutation.isPending}
                  className="btn bg-white/20 hover:bg-white/30 text-white inline-flex items-center"
                  title="Continuar"
                >
                  <Play className="h-5 w-5" />
                </button>
                {/* Boton de guardar */}
                <button
                  onClick={() => stopTimerMutation.mutate()}
                  disabled={stopTimerMutation.isPending}
                  className="btn bg-white text-primary-900 hover:bg-primary-50 inline-flex items-center"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Guardar
                </button>
                {/* Boton de descartar (eliminar sin guardar) */}
                <button
                  onClick={() => discardTimerMutation.mutate(currentTimer.id)}
                  disabled={discardTimerMutation.isPending}
                  className="btn bg-red-600/50 hover:bg-red-600 text-white inline-flex items-center"
                  title="Descartar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            ) : canCreate ? (
              // Estado: Sin temporizador activo - Muestra iniciar y configurar
              <div className="flex items-center gap-2">
                {/* Boton de inicio rapido */}
                <button
                  onClick={handleQuickStart}
                  disabled={startTimerMutation.isPending}
                  className="btn bg-white text-primary-900 hover:bg-primary-50 inline-flex items-center"
                >
                  {/* Muestra spinner mientras se procesa */}
                  {startTimerMutation.isPending ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  Iniciar
                </button>
                {/* Boton para expandir/contraer configuracion */}
                <button
                  onClick={() => setShowTimerSettings(!showTimerSettings)}
                  className="btn bg-white/20 hover:bg-white/30 text-white inline-flex items-center"
                  title="Configurar"
                >
                  {/* Icono rota cuando esta expandido */}
                  <ChevronDown
                    className={clsx('h-5 w-5 transition-transform', showTimerSettings && 'rotate-180')}
                  />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* =============================================================
            SUBSECCION: Panel de configuracion del temporizador
            Solo visible cuando showTimerSettings es true y no hay temporizador
            ============================================================= */}
        {showTimerSettings && !currentTimer && (
          <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Selector de caso */}
            <div>
              <label className="block text-sm font-medium text-primary-200 mb-1">Caso</label>
              <select
                value={timerForm.case_id}
                onChange={(e) => handleCaseSelect(e.target.value)}
                className="input bg-white/10 border-white/20 text-white placeholder-white/50"
              >
                <option value="" className="text-gray-900">
                  Sin caso
                </option>
                {/* Mapea la lista de casos a opciones del select */}
                {casesData?.map((c) => (
                  <option key={c.id} value={c.id} className="text-gray-900">
                    {c.case_number} - {c.title}
                  </option>
                ))}
              </select>
            </div>
            {/* Selector de tipo de actividad */}
            <div>
              <label className="block text-sm font-medium text-primary-200 mb-1">Actividad</label>
              <select
                value={timerForm.activity_type}
                onChange={(e) => setTimerForm((prev) => ({ ...prev, activity_type: e.target.value }))}
                className="input bg-white/10 border-white/20 text-white"
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="text-gray-900">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Campo de descripcion */}
            <div>
              <label className="block text-sm font-medium text-primary-200 mb-1">Descripcion</label>
              <input
                type="text"
                value={timerForm.description}
                onChange={(e) => setTimerForm((prev) => ({ ...prev, description: e.target.value }))}
                className="input bg-white/10 border-white/20 text-white placeholder-white/50"
                placeholder="Que estas haciendo?"
              />
            </div>
            {/* Checkbox de facturable */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerForm.is_billable}
                  onChange={(e) => setTimerForm((prev) => ({ ...prev, is_billable: e.target.checked }))}
                  className="h-4 w-4 rounded border-white/20 text-primary-600 focus:ring-primary-500"
                />
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Facturable</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* =============================================================
          SECCION: TARJETAS DE RESUMEN
          Muestra estadisticas del tiempo registrado
          ============================================================= */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tarjeta: Total de horas */}
          <div className="card">
            <p className="text-sm text-gray-500">Total Horas</p>
            <p className="text-2xl font-bold text-gray-900">{summary.total_hours || 0}h</p>
          </div>
          {/* Tarjeta: Horas facturables */}
          <div className="card">
            <p className="text-sm text-gray-500">Horas Facturables</p>
            <p className="text-2xl font-bold text-green-600">
              {Math.round((summary.billable_minutes || 0) / 60)}h
            </p>
          </div>
          {/* Tarjeta: Horas no facturables */}
          <div className="card">
            <p className="text-sm text-gray-500">No Facturables</p>
            <p className="text-2xl font-bold text-gray-600">
              {Math.round((summary.non_billable_minutes || 0) / 60)}h
            </p>
          </div>
          {/* Tarjeta: Monto total */}
          <div className="card">
            <p className="text-sm text-gray-500">Monto Total</p>
            <p className="text-2xl font-bold text-primary-600">
              ${Math.round(summary.total_amount || 0).toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      )}

      {/* =============================================================
          SECCION: PANEL DE FILTROS
          Permite filtrar las entradas de tiempo por varios criterios
          ============================================================= */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Boton para mostrar/ocultar filtros */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'btn inline-flex items-center',
              showFilters ? 'btn-primary' : 'btn-secondary'
            )}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </button>
          {/* Boton para limpiar filtros - solo visible cuando hay filtros activos */}
          {(dateFrom || dateTo || statusFilter || caseFilter) && (
            <button
              onClick={() => {
                setDateFrom('')
                setDateTo('')
                setStatusFilter('')
                setCaseFilter('')
              }}
              className="btn btn-secondary text-sm"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro: Fecha desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input"
              />
            </div>
            {/* Filtro: Fecha hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input"
              />
            </div>
            {/* Filtro: Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">Todos</option>
                <option value="draft">Borrador</option>
                <option value="submitted">Enviado</option>
                <option value="approved">Aprobado</option>
                <option value="billed">Facturado</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
            {/* Filtro: Caso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caso</label>
              <select
                value={caseFilter}
                onChange={(e) => setCaseFilter(e.target.value)}
                className="input"
              >
                <option value="">Todos los casos</option>
                {casesData?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* =============================================================
          SECCION: LISTA DE ENTRADAS DE TIEMPO
          Tabla con todas las entradas de tiempo filtradas
          ============================================================= */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Entradas de Tiempo</h2>

        {/* Estado de carga */}
        {loadingEntries ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : timeEntries?.results && timeEntries.results.length > 0 ? (
          // Tabla de entradas con scroll horizontal en movil
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              {/* Encabezados de la tabla */}
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Fecha
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Descripcion
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Caso
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Duracion
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Estado
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                    Monto
                  </th>
                  {/* Columna de acciones solo si el usuario puede editar */}
                  {canEdit && (
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              {/* Cuerpo de la tabla */}
              <tbody className="divide-y">
                {timeEntries.results.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    {/* Columna: Fecha y tipo de actividad */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {new Date(entry.date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getActivityLabel(entry.activity_type)}
                      </div>
                    </td>
                    {/* Columna: Descripcion */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {entry.description || 'Sin descripcion'}
                      </p>
                    </td>
                    {/* Columna: Numero de caso */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.case_number ? (
                        <span className="text-sm font-medium text-primary-600">
                          {entry.case_number}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    {/* Columna: Duracion con indicador de facturable */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDuration(entry.duration_minutes)}
                        </span>
                        {entry.is_billable && (
                          <span title="Facturable"><DollarSign className="h-4 w-4 text-green-500" /></span>
                        )}
                      </div>
                    </td>
                    {/* Columna: Estado con badge de color */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx('badge', statusColors[entry.status] || 'badge-gray')}>
                        {STATUS_LABELS[entry.status] || entry.status}
                      </span>
                    </td>
                    {/* Columna: Monto */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {entry.amount ? (
                        <span className="text-sm font-medium text-gray-900">
                          ${Math.round(entry.amount).toLocaleString('es-CO')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    {/* Columna: Acciones (solo para entradas en borrador) */}
                    {canEdit && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {entry.status === 'draft' && (
                          <div className="flex items-center justify-end gap-2">
                            {/* Boton de editar */}
                            <button
                              onClick={() => {
                                // Configura el formulario con los datos de la entrada
                                setEditingEntry(entry)
                                setEntryForm({
                                  date: entry.date,
                                  hours: Math.floor(entry.duration_minutes / 60),
                                  minutes: entry.duration_minutes % 60,
                                  description: entry.description,
                                  activity_type: entry.activity_type,
                                  case_id: entry.case_id || '',
                                  is_billable: entry.is_billable,
                                })
                                setShowManualEntry(true)
                              }}
                              className="p-1 text-gray-400 hover:text-primary-600"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {/* Boton de eliminar con confirmacion */}
                            <button
                              onClick={() => {
                                if (confirm('Estas seguro de eliminar esta entrada?')) {
                                  deleteEntryMutation.mutate(entry.id)
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Estado vacio: No hay entradas
          <div className="empty-state py-12">
            <Clock className="empty-state-icon" />
            <p className="empty-state-title">No hay entradas de tiempo</p>
            <p className="empty-state-description">
              {dateFrom || dateTo || statusFilter || caseFilter
                ? 'No se encontraron entradas con los filtros aplicados'
                : 'Inicia el temporizador o crea una entrada manual'}
            </p>
          </div>
        )}
      </div>

      {/* =============================================================
          MODAL: ENTRADA MANUAL DE TIEMPO
          Formulario para crear o editar entradas de tiempo
          ============================================================= */}
      {showManualEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay oscuro que cierra el modal al hacer clic */}
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => {
                setShowManualEntry(false)
                setEditingEntry(null)
                resetEntryForm()
              }}
            />
            {/* Contenido del modal */}
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              {/* Encabezado del modal */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {/* Titulo dinamico segun si es edicion o creacion */}
                  {editingEntry ? 'Editar Entrada' : 'Nueva Entrada de Tiempo'}
                </h2>
                {/* Boton de cerrar */}
                <button
                  onClick={() => {
                    setShowManualEntry(false)
                    setEditingEntry(null)
                    resetEntryForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Formulario del modal */}
              <div className="space-y-4">
                {/* Fila: Fecha y Duracion */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Campo: Fecha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                    <input
                      type="date"
                      value={entryForm.date}
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="input"
                    />
                  </div>
                  {/* Campo: Duracion (horas y minutos separados) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duracion *</label>
                    <div className="flex gap-2">
                      {/* Input de horas */}
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          value={entryForm.hours}
                          onChange={(e) =>
                            setEntryForm((prev) => ({ ...prev, hours: parseInt(e.target.value) || 0 }))
                          }
                          className="input"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Horas</span>
                      </div>
                      {/* Input de minutos */}
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={entryForm.minutes}
                          onChange={(e) =>
                            setEntryForm((prev) => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))
                          }
                          className="input"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500 mt-1 block">Minutos</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campo: Descripcion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion *</label>
                  <textarea
                    value={entryForm.description}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="input"
                    rows={3}
                    placeholder="Describe el trabajo realizado"
                  />
                </div>

                {/* Fila: Tipo de actividad y Caso */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Selector: Tipo de actividad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Actividad
                    </label>
                    <select
                      value={entryForm.activity_type}
                      onChange={(e) =>
                        setEntryForm((prev) => ({ ...prev, activity_type: e.target.value }))
                      }
                      className="input"
                    >
                      {ACTIVITY_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Selector: Caso asociado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Caso</label>
                    <select
                      value={entryForm.case_id}
                      onChange={(e) => setEntryForm((prev) => ({ ...prev, case_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">Sin caso</option>
                      {casesData?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.case_number} - {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checkbox: Tiempo facturable */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entryForm.is_billable}
                    onChange={(e) =>
                      setEntryForm((prev) => ({ ...prev, is_billable: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">Tiempo facturable</span>
                </label>
              </div>

              {/* Mensaje de error si la mutacion falla */}
              {(createEntryMutation.isError || updateEntryMutation.isError) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Error al guardar. Intenta de nuevo.</span>
                </div>
              )}

              {/* Botones de accion del modal */}
              <div className="mt-6 flex justify-end gap-3">
                {/* Boton cancelar */}
                <button
                  onClick={() => {
                    setShowManualEntry(false)
                    setEditingEntry(null)
                    resetEntryForm()
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                {/* Boton guardar/actualizar */}
                <button
                  onClick={() => {
                    if (editingEntry) {
                      // Modo edicion: actualiza la entrada existente
                      updateEntryMutation.mutate({
                        id: editingEntry.id,
                        data: {
                          date: entryForm.date,
                          duration_minutes: entryForm.hours * 60 + entryForm.minutes,
                          description: entryForm.description,
                          activity_type: entryForm.activity_type,
                          case_id: entryForm.case_id || undefined,
                          is_billable: entryForm.is_billable,
                        },
                      })
                    } else {
                      // Modo creacion: crea nueva entrada
                      handleCreateEntry()
                    }
                  }}
                  // Deshabilita el boton si faltan datos requeridos o esta procesando
                  disabled={
                    entryForm.hours * 60 + entryForm.minutes <= 0 ||
                    !entryForm.description ||
                    createEntryMutation.isPending ||
                    updateEntryMutation.isPending
                  }
                  className="btn btn-primary inline-flex items-center"
                >
                  {/* Muestra spinner mientras se procesa */}
                  {createEntryMutation.isPending || updateEntryMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {editingEntry ? 'Actualizar' : 'Guardar'}
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
