/**
 * PAGINA DE ANALYTICS - Analytics.tsx
 *
 * Este componente implementa el panel de analiticas del despacho legal.
 * Proporciona metricas clave de rendimiento (KPIs) para la gestion del negocio:
 * - Total de casos gestionados y su distribucion por estado
 * - Ingresos totales y montos por cobrar
 * - Horas facturables registradas
 * - Metricas de rentabilidad y eficiencia
 *
 * El acceso esta restringido a usuarios con rol de administrador o socio,
 * ya que contiene informacion financiera sensible del despacho.
 *
 * El componente utiliza TanStack Query para obtener datos del servicio
 * de analytics del backend, que consolida informacion de multiples fuentes.
 */

// ============================================================================
// IMPORTACIONES
// ============================================================================

// Hook de TanStack Query para realizar consultas de datos al servidor
// useQuery maneja automaticamente el cache, estados de carga y errores
import { useQuery } from '@tanstack/react-query'

// Instancia configurada de Axios para realizar peticiones HTTP al backend
import api from '../services/api'

// Hook personalizado para acceder al contexto de autenticacion
// Proporciona informacion del usuario actual, incluyendo su rol
import { useAuth } from '../context/AuthContext'

// Iconos de la biblioteca Lucide React para la interfaz visual
// Cada icono representa visualmente una metrica especifica
import { BarChart3, TrendingUp, DollarSign, Briefcase, Clock, AlertTriangle } from 'lucide-react'

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente principal de la pagina de Analytics
 * Renderiza el dashboard con metricas clave del despacho
 */
export default function Analytics() {
  // ==========================================================================
  // AUTENTICACION Y PERMISOS
  // ==========================================================================

  // Obtiene el usuario autenticado del contexto de autenticacion
  const { user } = useAuth()

  // Verifica si el usuario tiene rol de administrador o socio
  // Solo estos roles pueden acceder a las metricas de analytics
  // ya que contienen informacion financiera sensible
  const isAdmin = user?.role === 'admin' || user?.role === 'partner'

  // ==========================================================================
  // CONSULTAS DE DATOS (QUERIES)
  // ==========================================================================

  /**
   * Query para obtener los datos del dashboard principal
   * Incluye metricas consolidadas de casos, facturacion y tiempo
   * Solo se ejecuta si el usuario tiene permisos (enabled: isAdmin)
   */
  const { data: dashboard, isLoading } = useQuery({
    // Clave unica para identificar esta query en el cache
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      // Realiza peticion GET al endpoint de dashboard de analytics
      const response = await api.get('/analytics/dashboard/')
      return response.data
    },
    // Solo ejecuta la query si el usuario es admin o socio
    // Esto evita llamadas innecesarias al API para usuarios sin permiso
    enabled: isAdmin,
  })

  /**
   * Query para obtener las metricas de rentabilidad
   * Incluye tasas de cobro, ingresos efectivos y tarifa por hora
   * Solo se ejecuta si el usuario tiene permisos
   */
  const { data: profitability } = useQuery({
    queryKey: ['analytics-profitability'],
    queryFn: async () => {
      // Realiza peticion GET al endpoint de rentabilidad
      const response = await api.get('/analytics/profitability/')
      return response.data
    },
    // Solo ejecuta si el usuario tiene permisos de visualizacion
    enabled: isAdmin,
  })

  // ==========================================================================
  // RENDERIZADO CONDICIONAL - RESTRICCION DE ACCESO
  // ==========================================================================

  /**
   * Si el usuario no es admin o socio, muestra mensaje de acceso restringido
   * Esto proporciona feedback claro sobre por que no puede ver el contenido
   */
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        {/* Icono de grafico para indicar visualmente la seccion */}
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        {/* Titulo del mensaje de restriccion */}
        <h2 className="text-lg font-semibold text-gray-900">Acceso Restringido</h2>
        {/* Explicacion de quien puede acceder */}
        <p className="text-gray-500">Solo administradores y socios pueden ver analytics.</p>
      </div>
    )
  }

  // ==========================================================================
  // RENDERIZADO CONDICIONAL - ESTADO DE CARGA
  // ==========================================================================

  /**
   * Muestra indicador de carga mientras se obtienen los datos
   * Proporciona feedback visual de que la pagina esta funcionando
   */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        {/* Spinner animado con los colores de la marca */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // ==========================================================================
  // RENDERIZADO PRINCIPAL DEL COMPONENTE
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* TITULO DE LA PAGINA */}
      {/* ------------------------------------------------------------------ */}
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      {/* ------------------------------------------------------------------ */}
      {/* TARJETAS DE KPIs PRINCIPALES */}
      {/* Grid responsive: 1 columna en movil, 2 en tablet, 4 en desktop */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* ================================================================ */}
        {/* KPI: TOTAL DE CASOS */}
        {/* Muestra el numero total de casos en el sistema */}
        {/* ================================================================ */}
        <div className="card">
          <div className="flex items-center">
            {/* Icono con fondo azul */}
            <div className="p-3 bg-blue-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              {/* Etiqueta descriptiva */}
              <p className="text-sm text-gray-500">Total Casos</p>
              {/* Valor numerico con formato grande */}
              {/* Usa operador || 0 para mostrar 0 si no hay datos */}
              <p className="text-2xl font-bold">{dashboard?.cases?.total || 0}</p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* KPI: INGRESOS TOTALES */}
        {/* Muestra el total de pagos recibidos */}
        {/* ================================================================ */}
        <div className="card">
          <div className="flex items-center">
            {/* Icono con fondo verde - indica dinero/ingresos positivos */}
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              {/* Formato peso colombiano sin decimales */}
              <p className="text-2xl font-bold">${Math.round(dashboard?.billing?.total_paid || 0).toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* KPI: HORAS FACTURABLES */}
        {/* Muestra el total de horas registradas como facturables */}
        {/* ================================================================ */}
        <div className="card">
          <div className="flex items-center">
            {/* Icono con fondo amarillo - indica tiempo/reloj */}
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Horas Facturables</p>
              {/* Muestra horas con sufijo 'h' */}
              <p className="text-2xl font-bold">{dashboard?.time_tracking?.billable_hours || 0}h</p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* KPI: MONTOS POR COBRAR */}
        {/* Muestra el total de facturas pendientes de pago */}
        {/* ================================================================ */}
        <div className="card">
          <div className="flex items-center">
            {/* Icono con fondo rojo - indica alerta/pendiente */}
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Por Cobrar</p>
              {/* Formato peso colombiano sin decimales */}
              <p className="text-2xl font-bold">${Math.round(dashboard?.billing?.outstanding || 0).toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECCION DE METRICAS DETALLADAS */}
      {/* Grid de 2 columnas en desktop para mostrar rentabilidad y casos */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================================================================ */}
        {/* TARJETA DE RENTABILIDAD */}
        {/* Muestra metricas financieras detalladas */}
        {/* ================================================================ */}
        <div className="card">
          {/* Titulo de la seccion */}
          <h2 className="text-lg font-semibold mb-4">Rentabilidad</h2>

          {/* Lista de metricas de rentabilidad */}
          <div className="space-y-4">

            {/* Metrica: Ingresos Totales (facturados) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Ingresos Totales</span>
              {/* Formato peso colombiano sin decimales */}
              <span className="font-medium">${Math.round(profitability?.total_revenue || 0).toLocaleString('es-CO')}</span>
            </div>

            {/* Metrica: Ingresos Cobrados (efectivamente recibidos) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Ingresos Cobrados</span>
              <span className="font-medium">${Math.round(profitability?.collected_revenue || 0).toLocaleString('es-CO')}</span>
            </div>

            {/* Metrica: Tasa de Cobro (porcentaje de facturas cobradas) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Tasa de Cobro</span>
              {/* Formatea como porcentaje con 1 decimal */}
              <span className="font-medium">{(profitability?.collection_rate || 0).toFixed(1)}%</span>
            </div>

            {/* Metrica: Tarifa Efectiva por Hora */}
            {/* Calcula el ingreso real por hora trabajada */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Tarifa Efectiva por Hora</span>
              {/* Formato peso colombiano sin decimales */}
              <span className="font-medium">${Math.round(profitability?.effective_hourly_rate || 0).toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TARJETA DE CASOS POR ESTADO */}
        {/* Muestra la distribucion de casos segun su estado */}
        {/* ================================================================ */}
        <div className="card">
          {/* Titulo de la seccion */}
          <h2 className="text-lg font-semibold mb-4">Casos por Estado</h2>

          {/* Lista de conteos por estado */}
          <div className="space-y-4">

            {/* Conteo: Casos Activos (en trabajo actual) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Activos</span>
              <span className="font-medium">{dashboard?.cases?.active || 0}</span>
            </div>

            {/* Conteo: Casos Pendientes (esperando accion) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Pendientes</span>
              <span className="font-medium">{dashboard?.cases?.pending || 0}</span>
            </div>

            {/* Conteo: Casos Cerrados (finalizados) */}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Cerrados</span>
              <span className="font-medium">{dashboard?.cases?.closed || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
