/**
 * =====================================================
 * COMPONENTE: Cases (Lista de Casos)
 * =====================================================
 *
 * PROPOSITO:
 * Este componente muestra la lista completa de casos legales del sistema.
 * Permite buscar, filtrar por estado y navegar al detalle de cada caso.
 * Es la vista principal para la gestion de casos del despacho juridico.
 *
 * FUNCIONALIDADES:
 * - Listado paginado de todos los casos
 * - Busqueda por texto libre (titulo, numero de caso, cliente)
 * - Filtrado por estado (activo, pendiente, en espera, cerrado)
 * - Navegacion al detalle y formulario de creacion
 * - Indicadores visuales de estado con badges de colores
 *
 * DEPENDENCIAS:
 * - React Query para fetching de datos con cache
 * - React Router para navegacion
 * - Lucide React para iconografia
 * - clsx para clases CSS condicionales
 *
 * =====================================================
 */

// Importa useQuery de React Query para realizar peticiones HTTP
// con manejo automatico de cache, estados de carga y errores
import { useQuery } from '@tanstack/react-query'

// Importa Link de React Router para navegacion SPA
// (Single Page Application) sin recarga de pagina
import { Link } from 'react-router-dom'

// Importa la instancia de axios configurada con la URL base
// y los interceptores de autenticacion
import api from '../services/api'

// Importa los tipos TypeScript para tipado estatico:
// - Case: estructura de datos de un caso legal
// - PaginatedResponse: wrapper de respuesta paginada del API
import type { Case, PaginatedResponse } from '../types'

// Importa iconos de Lucide React:
// - Plus: icono de signo mas para boton de crear
// - Search: icono de lupa para campo de busqueda
// - ChevronRight: flecha derecha para indicar navegacion
import { Plus, Search, ChevronRight } from 'lucide-react'

// Importa useState de React para manejar estado local del componente
// Usado para los valores de busqueda y filtros
import { useState } from 'react'

// Importa clsx para construir strings de clases CSS condicionalmente
// Facilita aplicar clases basadas en condiciones booleanas
import clsx from 'clsx'

/**
 * Mapeo de estados de casos a sus clases CSS de Tailwind
 * Define los colores de fondo y texto para cada badge de estado
 */
const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',     // Verde para casos activos
  pending: 'bg-yellow-100 text-yellow-800',  // Amarillo para pendientes
  on_hold: 'bg-orange-100 text-orange-800',  // Naranja para en espera
  closed: 'bg-gray-100 text-gray-800',       // Gris para cerrados
  archived: 'bg-red-100 text-red-800',       // Rojo para archivados
}

/**
 * Mapeo de estados de casos a etiquetas legibles en espanol
 * para mostrar al usuario final
 */
const statusLabels: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  on_hold: 'En Espera',
  closed: 'Cerrado',
  archived: 'Archivado',
}

/**
 * Componente principal de la pagina de casos
 * Muestra la lista filtrable de todos los casos del sistema
 */
export default function Cases() {
  // Estado local para el termino de busqueda ingresado por el usuario
  // Se usa para filtrar casos por titulo, numero o cliente
  const [search, setSearch] = useState('')

  // Estado local para el filtro de estado seleccionado
  // Valor vacio significa "todos los estados"
  const [statusFilter, setStatusFilter] = useState('')

  /**
   * Query principal para obtener la lista de casos
   *
   * La queryKey incluye los filtros para que React Query:
   * - Refetch automaticamente cuando cambien los filtros
   * - Mantenga cache separado para cada combinacion de filtros
   */
  const { data, isLoading } = useQuery({
    // Array de dependencias: la query se re-ejecuta si cualquiera cambia
    queryKey: ['cases', search, statusFilter],
    // Funcion asincrona que realiza la peticion al backend
    queryFn: async () => {
      // Construye los parametros de query string dinamicamente
      const params = new URLSearchParams()

      // Solo agrega el parametro de busqueda si hay texto
      if (search) params.append('search', search)

      // Solo agrega el filtro de estado si esta seleccionado
      if (statusFilter) params.append('status', statusFilter)

      // Realiza la peticion GET al endpoint de casos con los parametros
      const response = await api.get<PaginatedResponse<Case>>(`/cases/?${params}`)

      // Retorna la data completa (incluye results, count, next, previous)
      return response.data
    },
  })

  // =====================================================
  // RENDERIZADO DEL COMPONENTE
  // =====================================================
  return (
    // Contenedor principal con espaciado vertical entre secciones
    <div className="space-y-6">

      {/* ===== SECCION: Encabezado de la Pagina ===== */}
      {/* Flex container responsivo: columna en movil, fila en desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Titulo de la pagina */}
        <h1 className="text-2xl font-bold text-gray-900">Casos</h1>
        {/* Boton para crear nuevo caso - navega al formulario */}
        <Link to="/cases/new" className="btn btn-primary inline-flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Caso
        </Link>
      </div>

      {/* ===== SECCION: Filtros de Busqueda ===== */}
      <div className="card">
        {/* Container flex responsivo para los controles de filtro */}
        <div className="flex flex-col sm:flex-row gap-4">

          {/* ----- Campo de Busqueda ----- */}
          {/* Container relativo para posicionar el icono dentro del input */}
          <div className="flex-1 relative">
            {/* Icono de busqueda posicionado absolutamente dentro del input */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            {/* Input de texto con padding izquierdo para el icono */}
            <input
              type="text"
              placeholder="Buscar casos..."
              value={search}
              // Actualiza el estado con cada tecla presionada
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"  // pl-10 da espacio para el icono
            />
          </div>

          {/* ----- Selector de Estado ----- */}
          {/* Ancho fijo en desktop (w-48), completo en movil */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            {/* Opcion por defecto que muestra todos los casos */}
            <option value="">Todos los estados</option>
            {/* Opciones de filtro por estado individual */}
            <option value="active">Activos</option>
            <option value="pending">Pendientes</option>
            <option value="on_hold">En Espera</option>
            <option value="closed">Cerrados</option>
          </select>
        </div>
      </div>

      {/* ===== SECCION: Lista de Casos ===== */}
      {/* Renderizado condicional basado en el estado de carga */}
      {isLoading ? (
        // Estado de carga: muestra un spinner centrado
        <div className="flex items-center justify-center h-64">
          {/* Spinner animado con CSS de Tailwind */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        // Estado con datos: muestra la lista de casos
        // overflow-hidden evita que los bordes redondeados se rompan
        // p-0 remueve el padding interno de la card
        <div className="card overflow-hidden p-0">
          {/* Lista no ordenada con separadores entre items */}
          <ul className="divide-y divide-gray-200">
            {/* Itera sobre los resultados de casos */}
            {data?.results.map((caseItem) => (
              // Cada item de la lista
              <li key={caseItem.id}>
                {/* Link clickeable que lleva al detalle del caso */}
                <Link
                  to={`/cases/${caseItem.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  {/* Contenido del item con padding y flex layout */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    {/* Columna izquierda: informacion del caso */}
                    <div className="flex-1 min-w-0">
                      {/* Fila con numero de caso y badge de estado */}
                      <div className="flex items-center gap-3">
                        {/* Numero de caso en color primario */}
                        <span className="text-sm font-medium text-primary-600">
                          {caseItem.case_number}
                        </span>
                        {/* Badge de estado con colores dinamicos */}
                        <span
                          className={clsx(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            statusColors[caseItem.status]
                          )}
                        >
                          {/* Muestra la etiqueta traducida del estado */}
                          {statusLabels[caseItem.status]}
                        </span>
                      </div>
                      {/* Titulo del caso con truncado para textos largos */}
                      <p className="mt-1 font-medium text-gray-900 truncate">
                        {caseItem.title}
                      </p>
                      {/* Nombre del cliente en texto mas pequeno */}
                      <p className="mt-1 text-sm text-gray-500">
                        Cliente: {caseItem.client_name}
                      </p>
                    </div>
                    {/* Columna derecha: icono de navegacion */}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}

            {/* Estado vacio: se muestra cuando no hay resultados */}
            {data?.results.length === 0 && (
              <li className="px-6 py-12 text-center text-gray-500">
                No se encontraron casos
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
