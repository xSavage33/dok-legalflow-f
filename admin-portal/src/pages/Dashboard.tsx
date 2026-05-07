/**
 * =====================================================
 * COMPONENTE: Dashboard
 * =====================================================
 *
 * PROPOSITO:
 * Este componente representa la pagina principal del panel de administracion.
 * Muestra un resumen ejecutivo con estadisticas clave, casos recientes y
 * plazos proximos. Es la primera pantalla que ve el usuario al iniciar sesion.
 *
 * FUNCIONALIDADES:
 * - Muestra estadisticas de casos activos, horas trabajadas, facturacion pendiente y plazos
 * - Lista los casos mas recientes con acceso rapido a sus detalles
 * - Muestra los plazos proximos con indicadores visuales de urgencia
 * - Proporciona acciones rapidas en dispositivos moviles
 *
 * DEPENDENCIAS:
 * - React Query para manejo de estado del servidor
 * - React Router para navegacion
 * - Lucide React para iconos
 * - clsx para clases CSS condicionales
 *
 * =====================================================
 */

// Importa el hook useQuery de React Query para realizar peticiones asincronas al servidor
// y manejar estados de carga, error y datos de forma automatica
import { useQuery } from '@tanstack/react-query'

// Importa el componente Link de React Router para navegacion declarativa
// sin recargar la pagina completa (SPA - Single Page Application)
import { Link } from 'react-router-dom'

// Importa la instancia configurada de axios para realizar peticiones HTTP al backend
import api from '../services/api'

// Importa los tipos TypeScript para tipado estatico:
// - Case: estructura de un caso legal
// - PaginatedResponse: respuesta paginada del servidor
// - Deadline: estructura de un plazo/vencimiento
import type { Case, PaginatedResponse, Deadline } from '../types'

// Importa iconos de Lucide React para la interfaz visual:
// - Briefcase: icono de maletin para casos
// - Clock: icono de reloj para tiempo
// - Receipt: icono de recibo para facturacion
// - AlertTriangle: icono de alerta para plazos
// - ChevronRight: flecha derecha para indicar navegacion
// - Plus: icono de mas para crear nuevo
// - TrendingUp: icono de tendencia para metricas
// - Calendar: icono de calendario para fechas
import {
  Briefcase,
  Clock,
  Receipt,
  AlertTriangle,
  ChevronRight,
  Plus,
  TrendingUp,
  Calendar,
} from 'lucide-react'

// Importa el hook de autenticacion personalizado para acceder a los datos del usuario actual
import { useAuth } from '../context/AuthContext'

// Importa clsx para construir cadenas de clases CSS de forma condicional
// Permite combinar clases estaticas y dinamicas de manera limpia
import clsx from 'clsx'

/**
 * Interface que define la estructura de los datos del dashboard
 * que se reciben desde el endpoint de analiticas
 */
interface DashboardData {
  // Estadisticas de casos
  cases: {
    total: number      // Total de casos en el sistema
    active: number     // Casos actualmente activos
    pending: number    // Casos pendientes de accion
    closed: number     // Casos cerrados/finalizados
  }
  // Estadisticas de facturacion
  billing: {
    total_invoiced: number  // Total facturado
    total_paid: number      // Total pagado por clientes
    outstanding: number     // Monto pendiente de cobro
    overdue: number         // Monto vencido (no pagado a tiempo)
  }
  // Estadisticas de seguimiento de tiempo
  time_tracking: {
    total_hours: number     // Total de horas registradas
    billable_hours: number  // Horas facturables al cliente
    total_amount: number    // Monto total en base a horas
  }
  // Informacion de plazos
  deadlines: {
    upcoming_count: number  // Cantidad de plazos proximos a vencer
  }
}

/**
 * Mapeo de estados de casos a clases CSS de badges (etiquetas visuales)
 * Cada estado tiene un color distintivo para identificacion rapida
 */
const statusColors: Record<string, string> = {
  active: 'badge-success',    // Verde para casos activos
  pending: 'badge-warning',   // Amarillo para casos pendientes
  on_hold: 'badge-warning',   // Amarillo para casos en espera
  closed: 'badge-gray',       // Gris para casos cerrados
}

/**
 * Mapeo de estados de casos a sus etiquetas en espanol
 * para mostrar al usuario
 */
const statusLabels: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  on_hold: 'En Espera',
  closed: 'Cerrado',
}

/**
 * Mapeo de prioridades a clases CSS de borde izquierdo
 * Los colores van de gris (baja) a rojo (critica)
 */
const priorityColors: Record<string, string> = {
  low: 'border-l-gray-400',       // Gris para prioridad baja
  medium: 'border-l-yellow-400',  // Amarillo para prioridad media
  high: 'border-l-orange-500',    // Naranja para prioridad alta
  critical: 'border-l-red-600',   // Rojo para prioridad critica
}

/**
 * Componente principal del Dashboard
 * Exportado como default para poder importarlo sin llaves
 */
export default function Dashboard() {
  // Extrae el objeto user del contexto de autenticacion
  // Contiene informacion del usuario actualmente logueado
  const { user } = useAuth()

  // Determina si el usuario tiene permisos de administrador
  // Los roles 'admin' y 'partner' (socio) tienen acceso completo
  const isAdmin = user?.role === 'admin' || user?.role === 'partner'
  void isAdmin // Reservado para uso futuro

  /**
   * Query para obtener las estadisticas del dashboard
   * useQuery maneja automaticamente:
   * - Estado de carga (isLoading)
   * - Cache de datos
   * - Revalidacion automatica
   * - Manejo de errores
   */
  const { data: analytics, isLoading: _loadingAnalytics } = useQuery({
    // Clave unica para identificar esta query en el cache
    queryKey: ['dashboard'],
    // Funcion que realiza la peticion al servidor
    queryFn: async () => {
      // Peticion GET al endpoint de analiticas del dashboard
      const response = await api.get<DashboardData>('/analytics/dashboard/')
      // Retorna solo los datos, no la respuesta completa de axios
      return response.data
    },
  })

  /**
   * Query para obtener los casos mas recientes
   * Limitado a 5 resultados para mostrar en el dashboard
   */
  const { data: recentCases } = useQuery({
    queryKey: ['recentCases'],
    queryFn: async () => {
      // Obtiene los 5 casos mas recientes del sistema
      const response = await api.get<PaginatedResponse<Case>>('/cases/?limit=5')
      // Retorna solo el array de resultados, no la metadata de paginacion
      return response.data.results
    },
  })

  /**
   * Query para obtener los plazos que vencen en los proximos 7 dias
   * Importante para que los abogados no pierdan fechas criticas
   */
  const { data: upcomingDeadlines } = useQuery({
    queryKey: ['upcomingDeadlines'],
    queryFn: async () => {
      // Obtiene plazos proximos a vencer en los siguientes 7 dias
      const response = await api.get<PaginatedResponse<Deadline>>('/deadlines/upcoming/?days=7')
      return response.data.results
    },
  })

  /**
   * Array de configuracion para las tarjetas de estadisticas
   * Cada objeto define el contenido y estilo de una tarjeta
   */
  const stats = [
    {
      name: 'Casos Activos',                              // Titulo de la tarjeta
      value: analytics?.cases?.active || 0,               // Valor a mostrar (con fallback a 0)
      icon: Briefcase,                                    // Componente de icono a usar
      iconBg: 'bg-blue-100',                              // Color de fondo del icono
      iconColor: 'text-blue-600',                         // Color del icono
      link: '/cases?status=active',                       // Ruta de navegacion al hacer clic
    },
    {
      name: 'Horas Este Mes',
      value: `${analytics?.time_tracking?.billable_hours || 0}h`,  // Formato con 'h' de horas
      icon: Clock,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      link: '/time',
    },
    {
      name: 'Por Cobrar',
      value: `$${Math.round(analytics?.billing?.outstanding || 0).toLocaleString('es-CO')}`,
      icon: Receipt,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      link: '/invoices?status=pending',
    },
    {
      name: 'Plazos Proximos',
      value: analytics?.deadlines?.upcoming_count || 0,
      icon: AlertTriangle,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      link: '/calendar',
    },
  ]

  // =====================================================
  // RENDERIZADO DEL COMPONENTE
  // =====================================================
  return (
    // Contenedor principal con espaciado vertical entre secciones
    <div className="space-y-6">

      {/* ===== SECCION: Encabezado del Dashboard ===== */}
      <div className="page-header">
        <div>
          {/* Titulo de bienvenida con el nombre del usuario */}
          <h1 className="page-title">
            Hola, {user?.first_name}
          </h1>
          {/* Subtitulo con la fecha actual en formato largo en espanol */}
          <p className="page-subtitle">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',    // Dia de la semana completo (ej: "lunes")
              year: 'numeric',   // Ano con 4 digitos
              month: 'long',     // Mes completo (ej: "enero")
              day: 'numeric',    // Dia del mes
            })}
          </p>
        </div>
        {/* Boton para crear un nuevo caso - navegacion a formulario */}
        <Link to="/cases/new" className="btn btn-primary inline-flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          {/* Texto responsivo: completo en pantallas grandes, corto en moviles */}
          <span className="hidden sm:inline">Nuevo Caso</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* ===== SECCION: Grid de Estadisticas ===== */}
      {/* Grid responsivo: 2 columnas en movil, 4 en pantallas grandes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Itera sobre el array de estadisticas para crear cada tarjeta */}
        {stats.map((stat) => (
          // Cada tarjeta es un Link clickeable que navega a la seccion correspondiente
          <Link
            key={stat.name}              // Key unica para React basada en el nombre
            to={stat.link}               // Ruta de destino
            className="card-hover group" // Clases para efecto hover y agrupacion
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Icono circular con fondo de color */}
              <div className={clsx('stat-icon', stat.iconBg)}>
                {/* Renderiza el componente de icono dinamicamente */}
                <stat.icon className={clsx('h-5 w-5 sm:h-6 sm:w-6', stat.iconColor)} />
              </div>
              {/* Contenedor del texto con truncado para textos largos */}
              <div className="min-w-0 flex-1">
                {/* Etiqueta de la estadistica */}
                <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.name}</p>
                {/* Valor de la estadistica en texto grande y negrita */}
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
            {/* Flecha de navegacion que aparece en hover (oculta en moviles) */}
            <ChevronRight className="hidden sm:block h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors absolute top-1/2 right-4 -translate-y-1/2" />
          </Link>
        ))}
      </div>

      {/* ===== SECCION: Grid de Contenido Principal ===== */}
      {/* Grid de 2 columnas en pantallas grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ----- Tarjeta de Casos Recientes ----- */}
        <div className="card">
          {/* Encabezado de la seccion con icono y enlace a ver todos */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold">Casos Recientes</h2>
            </div>
            <Link to="/cases" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver todos
            </Link>
          </div>

          {/* Contenido condicional: lista de casos o estado vacio */}
          {recentCases && recentCases.length > 0 ? (
            // Lista de casos recientes
            <div className="space-y-3">
              {recentCases.map((caseItem) => (
                // Cada caso es un enlace clickeable a su detalle
                <Link
                  key={caseItem.id}
                  to={`/cases/${caseItem.id}`}
                  className="block p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Numero de caso y badge de estado */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-primary-600">
                          {caseItem.case_number}
                        </span>
                        {/* Badge con color segun el estado del caso */}
                        <span className={clsx('badge', statusColors[caseItem.status])}>
                          {statusLabels[caseItem.status]}
                        </span>
                      </div>
                      {/* Titulo del caso con truncado si es muy largo */}
                      <p className="font-medium text-gray-900 truncate">{caseItem.title}</p>
                      {/* Nombre del cliente */}
                      <p className="text-sm text-gray-500">{caseItem.client_name}</p>
                    </div>
                    {/* Flecha indicando que es clickeable */}
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            // Estado vacio cuando no hay casos
            <div className="empty-state py-8">
              <Briefcase className="empty-state-icon" />
              <p className="empty-state-title">No hay casos</p>
              <p className="empty-state-description">Crea tu primer caso para comenzar</p>
              <Link to="/cases/new" className="btn btn-primary mt-4">
                Crear Caso
              </Link>
            </div>
          )}
        </div>

        {/* ----- Tarjeta de Proximos Plazos ----- */}
        <div className="card">
          {/* Encabezado con icono de calendario */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Proximos Plazos</h2>
            </div>
            <Link to="/calendar" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver calendario
            </Link>
          </div>

          {/* Contenido condicional: lista de plazos o estado vacio */}
          {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
            // Lista de plazos proximos
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  // Clases dinamicas: borde segun prioridad y fondo rojo si esta vencido
                  className={clsx(
                    'p-3 rounded-lg bg-gray-50 border-l-4',
                    priorityColors[deadline.priority] || 'border-l-gray-400',
                    deadline.is_overdue && 'bg-red-50'  // Fondo rojo si esta vencido
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Titulo del plazo */}
                      <p className="font-medium text-gray-900">{deadline.title}</p>
                      {/* Numero de caso asociado o "Sin caso" */}
                      <p className="text-sm text-gray-500">{deadline.case_number || 'Sin caso'}</p>
                    </div>
                    {/* Columna derecha: fecha y dias restantes */}
                    <div className="text-right flex-shrink-0">
                      {/* Fecha de vencimiento formateada */}
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(deadline.due_date).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                      {/* Indicador de dias restantes con texto condicional */}
                      {deadline.days_remaining !== undefined && (
                        <p className={clsx(
                          'text-xs',
                          deadline.is_overdue ? 'text-red-600 font-medium' : 'text-gray-500'
                        )}>
                          {/* Texto dinamico segun dias restantes */}
                          {deadline.is_overdue
                            ? `Vencido`
                            : deadline.days_remaining === 0
                            ? 'Hoy'
                            : deadline.days_remaining === 1
                            ? 'Manana'
                            : `${deadline.days_remaining} dias`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Estado vacio cuando no hay plazos proximos
            <div className="empty-state py-8">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">Sin plazos proximos</p>
              <p className="empty-state-description">No tienes plazos en los proximos 7 dias</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== SECCION: Acciones Rapidas (Solo Movil) ===== */}
      {/* Esta seccion solo se muestra en dispositivos moviles */}
      <div className="sm:hidden">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Acciones Rapidas</h3>
        {/* Grid de 2 columnas con botones de acceso rapido */}
        <div className="grid grid-cols-2 gap-3">
          {/* Boton: Nuevo Caso */}
          <Link to="/cases/new" className="card-hover text-center py-4">
            <Briefcase className="h-6 w-6 mx-auto mb-2 text-primary-600" />
            <span className="text-sm font-medium">Nuevo Caso</span>
          </Link>
          {/* Boton: Registrar Tiempo */}
          <Link to="/time" className="card-hover text-center py-4">
            <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <span className="text-sm font-medium">Registrar Tiempo</span>
          </Link>
          {/* Boton: Documentos */}
          <Link to="/documents" className="card-hover text-center py-4">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <span className="text-sm font-medium">Documentos</span>
          </Link>
          {/* Boton: Facturacion */}
          <Link to="/invoices" className="card-hover text-center py-4">
            <Receipt className="h-6 w-6 mx-auto mb-2 text-amber-600" />
            <span className="text-sm font-medium">Facturacion</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
