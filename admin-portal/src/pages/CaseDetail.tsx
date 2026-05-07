/**
 * =====================================================
 * COMPONENTE: CaseDetail (Detalle de Caso)
 * =====================================================
 *
 * PROPOSITO:
 * Este componente muestra la informacion detallada de un caso legal especifico.
 * Presenta toda la informacion relevante del caso y proporciona accesos rapidos
 * a documentos, registro de tiempo y facturas relacionadas.
 *
 * FUNCIONALIDADES:
 * - Visualizacion completa de datos del caso (estado, tipo, prioridad, fechas)
 * - Informacion del cliente asociado (nombre, email)
 * - Descripcion detallada del caso
 * - Acciones rapidas para navegar a modulos relacionados
 * - Enlace para editar el caso
 *
 * PARAMETROS DE URL:
 * - id: Identificador unico del caso (obtenido de useParams)
 *
 * DEPENDENCIAS:
 * - React Router para navegacion y parametros de URL
 * - React Query para fetching de datos con cache
 * - Lucide React para iconografia
 * - clsx para clases CSS condicionales
 *
 * =====================================================
 */

// Importa hooks de React Router:
// - useParams: extrae parametros de la URL (en este caso, el ID del caso)
// - Link: componente para navegacion SPA sin recarga
import { useParams, Link } from 'react-router-dom'

// Importa useQuery de React Query para realizar la peticion del caso
// con manejo automatico de cache, estados de carga y errores
import { useQuery } from '@tanstack/react-query'

// Importa la instancia configurada de axios para peticiones HTTP
import api from '../services/api'

// Importa el tipo Case que define la estructura de datos de un caso
import type { Case } from '../types'

// Importa iconos de Lucide React para la interfaz:
// - ArrowLeft: flecha para volver atras
// - Edit: icono de lapiz para editar
// - FileText: icono de documento
// - Clock: icono de reloj para tiempo
// - Receipt: icono de recibo para facturas
import { ArrowLeft, Edit, FileText, Clock, Receipt } from 'lucide-react'

/**
 * Componente principal de la pagina de detalle de caso
 * Muestra toda la informacion de un caso especifico
 */
export default function CaseDetail() {
  // Extrae el parametro 'id' de la URL usando el hook useParams
  // Este id se usa para cargar los datos del caso correcto
  const { id } = useParams()

  /**
   * Query para obtener los datos completos del caso
   *
   * Configuracion:
   * - queryKey: identificador unico que incluye el ID del caso
   * - queryFn: funcion que realiza la peticion al backend
   */
  const { data: caseData, isLoading } = useQuery({
    // La key incluye el id para que cada caso tenga su propia entrada en cache
    queryKey: ['case', id],
    queryFn: async () => {
      // Peticion GET al endpoint de detalle del caso
      // El slash final es importante para algunos backends (Django)
      const response = await api.get<Case>(`/cases/${id}/`)
      return response.data
    },
  })

  // =====================================================
  // ESTADOS DE CARGA Y ERROR
  // =====================================================

  // Estado de carga: muestra un spinner mientras se obtienen los datos
  if (isLoading) {
    return (
      // Contenedor centrado verticalmente con altura fija
      <div className="flex items-center justify-center h-64">
        {/* Spinner animado con CSS de Tailwind */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Estado de error/no encontrado: muestra mensaje cuando el caso no existe
  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Caso no encontrado</p>
        {/* Enlace para volver a la lista de casos */}
        <Link to="/cases" className="text-primary-600 hover:underline mt-2 inline-block">
          Volver a casos
        </Link>
      </div>
    )
  }

  // =====================================================
  // RENDERIZADO PRINCIPAL DEL COMPONENTE
  // =====================================================
  return (
    // Contenedor principal con espaciado vertical
    <div className="space-y-6">

      {/* ===== SECCION: Encabezado con Navegacion ===== */}
      <div className="flex items-center justify-between">
        {/* Lado izquierdo: boton volver + info del caso */}
        <div className="flex items-center gap-4">
          {/* Enlace para volver a la lista de casos */}
          <Link to="/cases" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            {/* Numero de caso en color primario */}
            <p className="text-sm text-primary-600 font-medium">{caseData.case_number}</p>
            {/* Titulo del caso como encabezado principal */}
            <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
          </div>
        </div>
        {/* Lado derecho: boton de editar */}
        <Link to={`/cases/${id}/edit`} className="btn btn-secondary inline-flex items-center">
          <Edit className="h-5 w-5 mr-2" />
          Editar
        </Link>
      </div>

      {/* ===== SECCION: Grid de Contenido ===== */}
      {/* Grid de 3 columnas en desktop, el contenido principal ocupa 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ----- Columna Principal (2/3 del ancho) ----- */}
        <div className="lg:col-span-2 space-y-6">

          {/* Tarjeta: Informacion del Caso */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Informacion del Caso</h2>
            {/* Grid de definiciones (pares etiqueta-valor) */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campo: Estado */}
              <div>
                <dt className="text-sm text-gray-500">Estado</dt>
                {/* capitalize convierte la primera letra a mayuscula */}
                <dd className="mt-1 font-medium capitalize">{caseData.status}</dd>
              </div>
              {/* Campo: Tipo de caso */}
              <div>
                <dt className="text-sm text-gray-500">Tipo</dt>
                <dd className="mt-1 font-medium capitalize">{caseData.case_type}</dd>
              </div>
              {/* Campo: Prioridad */}
              <div>
                <dt className="text-sm text-gray-500">Prioridad</dt>
                <dd className="mt-1 font-medium capitalize">{caseData.priority}</dd>
              </div>
              {/* Campo: Fecha de apertura */}
              <div>
                <dt className="text-sm text-gray-500">Fecha de Apertura</dt>
                {/* Formatea la fecha usando toLocaleDateString */}
                <dd className="mt-1 font-medium">{new Date(caseData.opened_date).toLocaleDateString()}</dd>
              </div>
            </dl>

            {/* Seccion de descripcion (solo si existe) */}
            {caseData.description && (
              // Separador visual con linea y padding
              <div className="mt-4 pt-4 border-t">
                <dt className="text-sm text-gray-500">Descripcion</dt>
                <dd className="mt-1">{caseData.description}</dd>
              </div>
            )}
          </div>

          {/* Tarjeta: Informacion del Cliente */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Cliente</h2>
            {/* Lista vertical de datos del cliente */}
            <dl className="space-y-2">
              {/* Campo: Nombre del cliente */}
              <div>
                <dt className="text-sm text-gray-500">Nombre</dt>
                <dd className="font-medium">{caseData.client_name}</dd>
              </div>
              {/* Campo: Email (solo si existe) */}
              {caseData.client_email && (
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd>{caseData.client_email}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* ----- Columna Lateral (Sidebar - 1/3 del ancho) ----- */}
        <div className="space-y-6">

          {/* Tarjeta: Acciones Rapidas */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Acciones Rapidas</h2>
            {/* Lista de enlaces a modulos relacionados */}
            <div className="space-y-2">

              {/* Enlace: Ver Documentos del caso */}
              <Link
                to={`/documents?case_id=${id}`}  // Pasa el ID como query param
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                <span>Ver Documentos</span>
              </Link>

              {/* Enlace: Ver registro de Tiempo del caso */}
              <Link
                to={`/time?case_id=${id}`}
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Clock className="h-5 w-5 text-gray-400 mr-3" />
                <span>Ver Tiempo</span>
              </Link>

              {/* Enlace: Ver Facturas del caso */}
              <Link
                to={`/invoices?case_id=${id}`}
                className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Receipt className="h-5 w-5 text-gray-400 mr-3" />
                <span>Ver Facturas</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
